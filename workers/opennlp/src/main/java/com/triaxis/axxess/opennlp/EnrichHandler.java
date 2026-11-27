package com.triaxis.axxess.opennlp;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Map;
import java.util.function.Supplier;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.services.secretsmanager.SecretsManagerClient;

/** Lambda function URL handler: POST /enrich {"text": "..."} with header x-opennlp-key. */
public final class EnrichHandler implements RequestHandler<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> {
  private static final ObjectMapper JSON = new ObjectMapper();
  // Built once per execution environment (and captured by SnapStart).
  private static final EnrichService SERVICE = new EnrichService();

  private final EnrichService service;
  private final Supplier<String> keySupplier;
  private volatile String expectedKey;

  public EnrichHandler() {
    this(SERVICE, EnrichHandler::readKeyFromSecretsManager);
  }

  EnrichHandler(EnrichService service, String expectedKey) {
    this(service, () -> expectedKey);
  }

  EnrichHandler(EnrichService service, Supplier<String> keySupplier) {
    this.service = service;
    this.keySupplier = keySupplier;
  }

  // Read lazily on the first request, after any SnapStart restore, so the secret is not baked into a snapshot.
  private static String readKeyFromSecretsManager() {
    String arn = System.getenv("OPENNLP_KEY_SECRET_ARN");
    if (arn == null || arn.isBlank()) return null;
    try (var client = SecretsManagerClient.builder().httpClient(UrlConnectionHttpClient.create()).build()) {
      return client.getSecretValue(b -> b.secretId(arn)).secretString().strip();
    }
  }

  private String expectedKey() {
    String key = expectedKey;
    if (key == null) {
      key = keySupplier.get();
      expectedKey = key;
    }
    return key;
  }

  @Override
  public APIGatewayV2HTTPResponse handleRequest(APIGatewayV2HTTPEvent event, Context context) {
    var http = event.getRequestContext() == null ? null : event.getRequestContext().getHttp();
    String method = http == null ? "" : http.getMethod();
    String path = event.getRawPath() == null ? "" : event.getRawPath();

    if ("GET".equals(method) && "/health".equals(path)) return json(200, Map.of("ok", true));
    if (!"/enrich".equals(path)) return json(404, Map.of("error", "not_found"));
    if (!"POST".equals(method)) return json(405, Map.of("error", "method_not_allowed"));
    if (!authorized(header(event, "x-opennlp-key"))) return json(401, Map.of("error", "unauthorized"));

    try {
      String body = event.getBody() == null ? "" : event.getBody();
      if (event.getIsBase64Encoded()) body = new String(Base64.getDecoder().decode(body), StandardCharsets.UTF_8);
      JsonNode text = JSON.readTree(body).get("text");
      if (text == null || !text.isTextual()) return json(400, Map.of("error", "text_required"));
      return json(200, service.enrich(text.asText()));
    } catch (Exception e) {
      // Never echo document text back in errors or logs.
      return json(400, Map.of("error", "bad_request"));
    }
  }

  private boolean authorized(String provided) {
    String key = expectedKey();
    if (key == null || key.isBlank() || provided == null) return false;
    return MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8), provided.getBytes(StandardCharsets.UTF_8));
  }

  private static String header(APIGatewayV2HTTPEvent event, String name) {
    if (event.getHeaders() == null) return null;
    for (var entry : event.getHeaders().entrySet()) {
      if (entry.getKey().equalsIgnoreCase(name)) return entry.getValue();
    }
    return null;
  }

  private static APIGatewayV2HTTPResponse json(int status, Object body) {
    try {
      return APIGatewayV2HTTPResponse.builder()
          .withStatusCode(status)
          .withHeaders(Map.of("content-type", "application/json"))
          .withBody(JSON.writeValueAsString(body))
          .build();
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
