package com.triaxis.axxess.opennlp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class EnrichServiceTest {
  private static final String TEXT =
      "Audit observation for Kamrup district. Management response came from District Hospital and Gauhati Medical College Hospital. "
          + "Closure is due 2026-12-01 with a budget of ₹ 4.5 crore.";

  private final EnrichService service = new EnrichService(null, EnrichService.loadGazetteers());

  @Test
  void splitsSentencesWithRuleFallbackWhenNoModel() {
    assertEquals(3, service.sentences(TEXT).size());
    assertEquals(List.of(), service.sentences("   "));
  }

  @Test
  @SuppressWarnings("unchecked")
  void findsGazetteerEntitiesDatesAndMoney() {
    Map<String, Object> result = service.enrich(TEXT);
    Map<String, List<String>> entities = (Map<String, List<String>>) result.get("entities");
    assertEquals(List.of("Kamrup"), entities.get("locations"));
    assertTrue(entities.get("organizations").contains("District Hospital"));
    assertTrue(entities.get("organizations").contains("Gauhati Medical College Hospital"));
    assertEquals(List.of("2026-12-01"), entities.get("dates"));
    assertEquals(List.of("₹ 4.5 crore"), entities.get("money"));
    assertEquals(List.of(), entities.get("people"));
    assertTrue((int) result.get("tokensCount") > 20);
  }

  @Test
  @SuppressWarnings("unchecked")
  void reportsRuleFallbackInsteadOfClaimingAModel() {
    Map<String, String> versions = (Map<String, String>) service.enrich(TEXT).get("modelVersions");
    assertEquals("rule-fallback", versions.get("sentdetect"));
  }

  @Test
  void dictionaryMatchIsCaseInsensitive() {
    @SuppressWarnings("unchecked")
    Map<String, List<String>> entities = (Map<String, List<String>>) service.enrich("visit to SHILLONG next week.").get("entities");
    assertEquals(List.of("SHILLONG"), entities.get("locations"));
  }
}
