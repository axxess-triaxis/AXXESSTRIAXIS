package com.triaxis.axxess.opennlp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import java.util.Map;
import org.junit.jupiter.api.Test;

class EnrichHandlerTest {
  private final EnrichHandler handler = new EnrichHandler(new EnrichService(null, EnrichService.loadGazetteers()), "test-key");

  private static APIGatewayV2HTTPEvent event(String method, String path, Map<String, String> headers, String body) {
    var http = APIGatewayV2HTTPEvent.RequestContext.Http.builder().withMethod(method).withPath(path).build();
    return APIGatewayV2HTTPEvent.builder()
        .withRawPath(path)
        .withHeaders(headers)
        .withBody(body)
        .withRequestContext(APIGatewayV2HTTPEvent.RequestContext.builder().withHttp(http).build())
        .build();
  }

  @Test
  void enrichesWithValidKey() {
    var response = handler.handleRequest(event("POST", "/enrich", Map.of("X-OpenNLP-Key", "test-key"), "{\"text\":\"Visit to Kamrup. Done.\"}"), null);
    assertEquals(200, response.getStatusCode());
    assertTrue(response.getBody().contains("\"Kamrup\""));
  }

  @Test
  void rejectsMissingOrWrongKey() {
    assertEquals(401, handler.handleRequest(event("POST", "/enrich", Map.of(), "{\"text\":\"x\"}"), null).getStatusCode());
    assertEquals(401, handler.handleRequest(event("POST", "/enrich", Map.of("x-opennlp-key", "nope"), "{\"text\":\"x\"}"), null).getStatusCode());
  }

  @Test
  void rejectsWhenServerKeyUnset() {
    var open = new EnrichHandler(new EnrichService(null, EnrichService.loadGazetteers()), "");
    assertEquals(401, open.handleRequest(event("POST", "/enrich", Map.of("x-opennlp-key", ""), "{\"text\":\"x\"}"), null).getStatusCode());
  }

  @Test
  void badBodyDoesNotEchoText() {
    var response = handler.handleRequest(event("POST", "/enrich", Map.of("x-opennlp-key", "test-key"), "secret-text-not-json"), null);
    assertEquals(400, response.getStatusCode());
    assertFalse(response.getBody().contains("secret-text"));
  }

  @Test
  void healthAndRouting() {
    assertEquals(200, handler.handleRequest(event("GET", "/health", Map.of(), null), null).getStatusCode());
    assertEquals(404, handler.handleRequest(event("POST", "/other", Map.of(), null), null).getStatusCode());
    assertEquals(405, handler.handleRequest(event("GET", "/enrich", Map.of(), null), null).getStatusCode());
  }
}
