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

    // ─── Messages paginés ─────────────────────────────────────────────────────
    @GetMapping("/{id}/topics/{topic}/messages/paged")
    public ResponseEntity<?> pagedMessages(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id, @PathVariable String topic,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) throws Exception {
        return ResponseEntity.ok(actionService.getPagedMessages(getCluster(ud, id), topic, page, pageSize));
    }

    // ─── Replay ──────────────────────────────────────────────────────────────
    @PostMapping("/{id}/topics/{topic}/replay")
    public ResponseEntity<?> replay(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id, @PathVariable String topic,
        @RequestBody ReplayRequest req
    ) throws Exception {
        var msgs = actionService.replay(getCluster(ud, id), topic,
            req.startFrom() != null ? req.startFrom() : "earliest",
            req.limit() > 0 ? req.limit() : 100);
        return ResponseEntity.ok(Map.of("messages", msgs, "count", msgs.size()));
    }

    // ─── Produire ─────────────────────────────────────────────────────────────
    @PostMapping("/{id}/topics/{topic}/produce")
    public ResponseEntity<?> produce(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id, @PathVariable String topic,
        @RequestBody ProduceRequest req
    ) throws Exception {
        actionService.produce(getCluster(ud, id), topic, req.key(), req.value(), req.headers());
        return ResponseEntity.ok(Map.of("message", "Message produit avec succès", "topic", topic));
    }

    // ─── DLQ ─────────────────────────────────────────────────────────────────
    @GetMapping("/{id}/dlq")
    public ResponseEntity<?> listDlq(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) throws Exception {
        var topics = actionService.listDlqTopics(getCluster(ud, id));
        return ResponseEntity.ok(Map.of("dlqTopics", topics, "count", topics.size()));
    }

    @GetMapping("/{id}/topics/{topic}/dlq")
    public ResponseEntity<?> getDlqMessages(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id, @PathVariable String topic,
        @RequestParam(defaultValue = "50") int limit
    ) throws Exception {
        var msgs = actionService.getDlqMessages(getCluster(ud, id), topic, limit);
        return ResponseEntity.ok(Map.of("messages", msgs, "count", msgs.size()));
    }

    // ─── Recherche avec regex ─────────────────────────────────────────────────
    @GetMapping("/{id}/topics/{topic}/search")
    public ResponseEntity<?> search(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id, @PathVariable String topic,
        @RequestParam String q,
        @RequestParam(defaultValue = "false") boolean regex,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int pageSize
    ) throws Exception {
        var result = actionService.search(getCluster(ud, id), topic, q, regex, page, pageSize);
        return ResponseEntity.ok(result);
    }

    // ─── Export ───────────────────────────────────────────────────────────────
    @GetMapping("/{id}/topics/{topic}/export")
    public ResponseEntity<?> export(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id, @PathVariable String topic,
        @RequestParam(defaultValue = "json") String format,
        @RequestParam(defaultValue = "500") int limit
    ) throws Exception {
        var cluster = getCluster(ud, id);
        if ("csv".equalsIgnoreCase(format)) {
            String csv = actionService.exportCsv(cluster, topic, limit);
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + topic + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
        }
        var msgs = actionService.exportJson(cluster, topic, limit);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + topic + ".json\"")
            .contentType(MediaType.APPLICATION_JSON)
            .body(msgs);
    }

    // ─── Validation ───────────────────────────────────────────────────────────
    @PostMapping("/{id}/topics/{topic}/validate")
    public ResponseEntity<?> validate(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id, @PathVariable String topic,
        @RequestBody ValidateRequest req
    ) throws Exception {
        var results = actionService.validateSchema(getCluster(ud, id), topic,
            req.schema(), req.limit() > 0 ? req.limit() : 50);
        long valid   = results.stream().filter(r -> r.valid()).count();
        long invalid = results.size() - valid;
        return ResponseEntity.ok(Map.of(
            "results", results, "total", results.size(),
            "valid", valid, "invalid", invalid,
            "score", results.isEmpty() ? 100 : (int)(valid * 100 / results.size())
        ));
    }

    private KafkaCluster getCluster(UserDetails ud, Long clusterId) {
        var user = authService.getByEmail(ud.getUsername());
        return clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
    }

    record ReplayRequest(String startFrom, int limit) {}
    record ProduceRequest(String key, String value, java.util.Map<String, String> headers) {}
    record ValidateRequest(String schema, int limit) {}
}
