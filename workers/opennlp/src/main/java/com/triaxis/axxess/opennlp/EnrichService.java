package com.triaxis.axxess.opennlp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import opennlp.tools.dictionary.Dictionary;
import opennlp.tools.namefind.DictionaryNameFinder;
import opennlp.tools.sentdetect.SentenceDetectorME;
import opennlp.tools.sentdetect.SentenceModel;
import opennlp.tools.tokenize.SimpleTokenizer;
import opennlp.tools.util.Span;
import opennlp.tools.util.StringList;

/**
 * OpenNLP enrichment for RAG ingestion. Model-free parts (tokenizer, dictionary and regex name finders) always run.
 * The statistical sentence model is optional: put it on the classpath at {@code models/en-sent.bin}; without it a
 * rule-based split is used and {@code modelVersions.sentdetect} says so, so nothing is silently claimed.
 */
public final class EnrichService {
  static final String SENTENCE_MODEL_RESOURCE = "models/en-sent.bin";
  static final int MAX_TEXT_CHARS = 200_000;

  private static final Pattern RULE_SENTENCE_SPLIT = Pattern.compile("(?<=[.!?])\\s+");
  // Same patterns as src/services/nlp/localNlp.ts, on raw sentence text (SimpleTokenizer splits 2026-12-01 apart).
  private static final Pattern DATE = Pattern.compile(
      "\\b(?:Q[1-4]\\sFY\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s\\d{4})\\b");
  private static final Pattern MONEY = Pattern.compile(
      "(?:₹|\\$)\\s?\\d+(?:\\.\\d+)?(?:\\s?(?:crore|lakh|million|M)\\b)?", Pattern.CASE_INSENSITIVE);

  private final SentenceModel sentenceModel;
  private final String sentenceModelVersion;
  private final DictionaryNameFinder organizationFinder;
  private final DictionaryNameFinder locationFinder;

  public EnrichService() {
    this(loadSentenceModel(), loadGazetteers());
  }

  EnrichService(SentenceModel sentenceModel, Map<String, List<String>> gazetteers) {
    this.sentenceModel = sentenceModel;
    this.sentenceModelVersion = sentenceModel == null ? "rule-fallback" : "opennlp-" + sentenceModel.getVersion();
    this.organizationFinder = new DictionaryNameFinder(dictionary(gazetteers.get("organizations")), "organization");
    this.locationFinder = new DictionaryNameFinder(dictionary(gazetteers.get("locations")), "location");
  }

  public Map<String, Object> enrich(String rawText) {
    String text = rawText == null ? "" : rawText.length() > MAX_TEXT_CHARS ? rawText.substring(0, MAX_TEXT_CHARS) : rawText;
    List<String> sentences = sentences(text);
    Set<String> organizations = new LinkedHashSet<>();
    Set<String> locations = new LinkedHashSet<>();
    Set<String> dates = new LinkedHashSet<>();
    Set<String> money = new LinkedHashSet<>();
    int tokensCount = 0;

    for (String sentence : sentences) {
      String[] tokens = SimpleTokenizer.INSTANCE.tokenize(sentence);
      tokensCount += tokens.length;
      collect(organizationFinder.find(tokens), tokens, organizations);
      collect(locationFinder.find(tokens), tokens, locations);
      matches(DATE, sentence, dates);
      matches(MONEY, sentence, money);
    }

    Map<String, Object> entities = new LinkedHashMap<>();
    // Statistical person NER is not part of this pass (no confirmed 3.x English person model); kept empty on purpose.
    entities.put("people", List.of());
    entities.put("organizations", List.copyOf(organizations));
    entities.put("locations", List.copyOf(locations));
    entities.put("dates", List.copyOf(dates));
    entities.put("money", List.copyOf(money));

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("sentences", sentences);
    result.put("tokensCount", tokensCount);
    result.put("entities", entities);
    result.put("modelVersions", Map.of("sentdetect", sentenceModelVersion, "tokenizer", "opennlp-simple", "opennlp", "3.0.0"));
    return result;
  }

  List<String> sentences(String text) {
    String trimmed = text.strip();
    if (trimmed.isEmpty()) return List.of();
    String[] parts = sentenceModel == null
        ? RULE_SENTENCE_SPLIT.split(trimmed)
        : new SentenceDetectorME(sentenceModel).sentDetect(trimmed);
    List<String> out = new ArrayList<>();
    for (String part : parts) {
      String sentence = part.strip();
      if (!sentence.isEmpty()) out.add(sentence);
    }
    return out;
  }

  private static void collect(Span[] spans, String[] tokens, Set<String> into) {
    for (Span span : spans) {
      into.add(String.join(" ", java.util.Arrays.copyOfRange(tokens, span.getStart(), span.getEnd())));
    }
  }

  private static void matches(Pattern pattern, String text, Set<String> into) {
    var matcher = pattern.matcher(text);
    while (matcher.find()) into.add(matcher.group().strip());
  }

  private static Dictionary dictionary(List<String> entries) {
    Dictionary dictionary = new Dictionary(false);
    if (entries != null) {
      for (String entry : entries) {
        dictionary.put(new StringList(SimpleTokenizer.INSTANCE.tokenize(entry)));
      }
    }
    return dictionary;
  }

  static SentenceModel loadSentenceModel() {
    try (InputStream in = EnrichService.class.getClassLoader().getResourceAsStream(SENTENCE_MODEL_RESOURCE)) {
      return in == null ? null : new SentenceModel(in);
    } catch (IOException e) {
      throw new UncheckedIOException("Sentence model at " + SENTENCE_MODEL_RESOURCE + " could not be read", e);
    }
  }

  static Map<String, List<String>> loadGazetteers() {
    try (InputStream in = EnrichService.class.getClassLoader().getResourceAsStream("gazetteers.json")) {
      if (in == null) throw new IllegalStateException("gazetteers.json missing from classpath");
      JsonNode root = new ObjectMapper().readTree(in);
      Map<String, List<String>> out = new LinkedHashMap<>();
      root.fieldNames().forEachRemaining(key -> {
        List<String> values = new ArrayList<>();
        root.get(key).forEach(node -> values.add(node.asText()));
        out.put(key, values);
      });
      return out;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
