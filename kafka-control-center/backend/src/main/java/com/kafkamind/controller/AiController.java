package com.kafkamind.controller;

import com.kafkamind.model.KafkaCluster;
import com.kafkamind.repository.KafkaClusterRepository;
import com.kafkamind.service.AnthropicService;
import com.kafkamind.service.AuthService;
import com.kafkamind.service.KafkaService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final AnthropicService ai;
    private final KafkaService kafkaService;
    private final KafkaClusterRepository clusterRepo;
    private final AuthService authService;
    private final ObjectMapper mapper;

    // ── Analyse messages ─────────────────────────────────────────────────────
    @PostMapping("/analyze-messages")
    public ResponseEntity<?> analyzeMessages(
        @AuthenticationPrincipal UserDetails ud,
        @RequestBody Map<String, Object> req
    ) throws Exception {
        var cluster = getCluster(ud, toLong(req.get("clusterId")));
        String topic = (String) req.get("topic");
        int limit = req.containsKey("limit") ? (int) req.get("limit") : 20;

        var messages = kafkaService.peekMessages(cluster, topic, limit);
        String messagesJson = mapper.writeValueAsString(messages);
        String result = ai.analyzeMessages(topic, messagesJson);

        return ResponseEntity.ok(Map.of("analysis", result, "messageCount", messages.size()));
    }

    // ── Health Report ─────────────────────────────────────────────────────────
    @PostMapping("/health-report")
    public ResponseEntity<?> healthReport(
        @AuthenticationPrincipal UserDetails ud,
        @RequestBody Map<String, Object> req
    ) throws Exception {
        var cluster = getCluster(ud, toLong(req.get("clusterId")));

        var health = kafkaService.getClusterHealth(cluster);
        var topics = kafkaService.listTopics(cluster);
        var groups = kafkaService.listConsumerGroups(cluster);

        String report = ai.generateHealthReport(
            mapper.writeValueAsString(health),
            mapper.writeValueAsString(topics),
            mapper.writeValueAsString(groups)
        );

        return ResponseEntity.ok(Map.of("report", report));
    }

    // ── Génération Producer ───────────────────────────────────────────────────
    @PostMapping("/generate-producer")
    public ResponseEntity<?> generateProducer(
        @AuthenticationPrincipal UserDetails ud,
        @RequestBody Map<String, Object> req
    ) {
        String topic    = (String) req.getOrDefault("topic",    "my-topic");
        String language = (String) req.getOrDefault("language", "Java");
        String schema   = (String) req.getOrDefault("schema",   "{}");

        String code = ai.generateProducer(topic, language, schema);
        return ResponseEntity.ok(Map.of("code", code));
    }

    // ── Génération Consumer ───────────────────────────────────────────────────
    @PostMapping("/generate-consumer")
    public ResponseEntity<?> generateConsumer(
        @AuthenticationPrincipal UserDetails ud,
        @RequestBody Map<String, Object> req
    ) {
        String topic    = (String) req.getOrDefault("topic",    "my-topic");
        String groupId  = (String) req.getOrDefault("groupId",  "my-group");
        String language = (String) req.getOrDefault("language", "Java");

        String code = ai.generateConsumer(topic, groupId, language);
        return ResponseEntity.ok(Map.of("code", code));
    }

    // ── Détection anomalies ───────────────────────────────────────────────────
    @PostMapping("/detect-anomalies")
    public ResponseEntity<?> detectAnomalies(
        @AuthenticationPrincipal UserDetails ud,
        @RequestBody Map<String, Object> req
    ) throws Exception {
        var cluster = getCluster(ud, toLong(req.get("clusterId")));
        var groups  = kafkaService.listConsumerGroups(cluster);

        var lagMap = new java.util.HashMap<String, Object>();
        for (var g : groups) {
            try {
                lagMap.put(g.getGroupId(), kafkaService.getConsumerGroupLag(cluster, g.getGroupId()));
            } catch (Exception ignored) {}
        }

        String result = ai.detectAnomalies(mapper.writeValueAsString(lagMap));
        return ResponseEntity.ok(Map.of("anomalies", result));
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    private KafkaCluster getCluster(UserDetails ud, Long clusterId) {
        var user = authService.getByEmail(ud.getUsername());
        return clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
    }

    private Long toLong(Object val) {
        if (val instanceof Integer i) return i.longValue();
        if (val instanceof Long l) return l;
        return Long.parseLong(val.toString());
    }
}
