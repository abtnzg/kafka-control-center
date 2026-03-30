package com.kafkamind.controller;

import com.kafkamind.model.KafkaCluster;
import com.kafkamind.repository.KafkaClusterRepository;
import com.kafkamind.service.AuthService;
import com.kafkamind.service.MessageActionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/clusters")
@RequiredArgsConstructor
public class MessageActionController {

    private final MessageActionService actionService;
    private final KafkaClusterRepository clusterRepo;
    private final AuthService authService;

    // ─── Replay ──────────────────────────────────────────────────────────────
    @PostMapping("/{id}/topics/{topic}/replay")
    public ResponseEntity<?> replay(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @PathVariable String topic,
        @RequestBody ReplayRequest req
    ) throws Exception {
        var cluster = getCluster(ud, id);
        var messages = actionService.replay(cluster, topic,
            req.startFrom() != null ? req.startFrom() : "earliest",
            req.limit() > 0 ? req.limit() : 100);
        return ResponseEntity.ok(Map.of("messages", messages, "count", messages.size()));
    }

    // ─── Produire ─────────────────────────────────────────────────────────────
    @PostMapping("/{id}/topics/{topic}/produce")
    public ResponseEntity<?> produce(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @PathVariable String topic,
        @RequestBody ProduceRequest req
    ) throws Exception {
        var cluster = getCluster(ud, id);
        actionService.produce(cluster, topic, req.key(), req.value(), req.headers());
        return ResponseEntity.ok(Map.of("message", "Message produit avec succès", "topic", topic));
    }

    // ─── DLQ ─────────────────────────────────────────────────────────────────
    @GetMapping("/{id}/dlq")
    public ResponseEntity<?> listDlq(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) throws Exception {
        var cluster = getCluster(ud, id);
        var topics = actionService.listDlqTopics(cluster);
        return ResponseEntity.ok(Map.of("dlqTopics", topics, "count", topics.size()));
    }

    @GetMapping("/{id}/topics/{topic}/dlq")
    public ResponseEntity<?> getDlqMessages(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @PathVariable String topic,
        @RequestParam(defaultValue = "50") int limit
    ) throws Exception {
        var cluster = getCluster(ud, id);
        var messages = actionService.getDlqMessages(cluster, topic, limit);
        return ResponseEntity.ok(Map.of("messages", messages, "count", messages.size()));
    }

    // ─── Recherche ────────────────────────────────────────────────────────────
    @GetMapping("/{id}/topics/{topic}/search")
    public ResponseEntity<?> search(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @PathVariable String topic,
        @RequestParam String q,
        @RequestParam(defaultValue = "100") int limit
    ) throws Exception {
        var cluster = getCluster(ud, id);
        var results = actionService.search(cluster, topic, q, limit);
        return ResponseEntity.ok(Map.of("results", results, "count", results.size(), "query", q));
    }

    // ─── Export ───────────────────────────────────────────────────────────────
    @GetMapping("/{id}/topics/{topic}/export")
    public ResponseEntity<?> export(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @PathVariable String topic,
        @RequestParam(defaultValue = "json") String format,
        @RequestParam(defaultValue = "500") int limit
    ) throws Exception {
        var cluster = getCluster(ud, id);

        if ("csv".equalsIgnoreCase(format)) {
            String csv = actionService.exportCsv(cluster, topic, limit);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + topic + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
        } else {
            var messages = actionService.exportJson(cluster, topic, limit);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                    "attachment; filename=\"" + topic + ".json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(messages);
        }
    }

    // ─── Validation schéma ────────────────────────────────────────────────────
    @PostMapping("/{id}/topics/{topic}/validate")
    public ResponseEntity<?> validate(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @PathVariable String topic,
        @RequestBody ValidateRequest req
    ) throws Exception {
        var cluster = getCluster(ud, id);
        var results = actionService.validateSchema(cluster, topic,
            req.schema(), req.limit() > 0 ? req.limit() : 50);
        long valid   = results.stream().filter(r -> r.valid()).count();
        long invalid = results.size() - valid;
        return ResponseEntity.ok(Map.of(
            "results", results,
            "total",   results.size(),
            "valid",   valid,
            "invalid", invalid,
            "score",   results.isEmpty() ? 100 : (int)(valid * 100 / results.size())
        ));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    private KafkaCluster getCluster(UserDetails ud, Long clusterId) {
        var user = authService.getByEmail(ud.getUsername());
        return clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
    }

    record ReplayRequest(String startFrom, int limit) {}
    record ProduceRequest(String key, String value, java.util.Map<String, String> headers) {}
    record ValidateRequest(String schema, int limit) {}
}
