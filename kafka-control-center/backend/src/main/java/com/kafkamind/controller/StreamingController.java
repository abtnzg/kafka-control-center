
// package com.kafkamind.controller;

// import com.kafkamind.model.StreamPipeline;
// import com.kafkamind.model.User;
// import com.kafkamind.repository.StreamPipelineRepository;
// import com.kafkamind.service.AuthService;
// import com.kafkamind.service.KafkaService;
// import com.kafkamind.repository.KafkaClusterRepository;
// import com.kafkamind.streaming.StreamingEngine;
// import lombok.RequiredArgsConstructor;
// import org.springframework.http.*;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.security.core.userdetails.UserDetails;
// import org.springframework.web.bind.annotation.*;
// import org.springframework.web.server.ResponseStatusException;

// @RestController
// @RequestMapping("/streaming")
// @RequiredArgsConstructor
// public class StreamingController {

//     private final StreamingEngine engine;
//     private final StreamPipelineRepository repo;
//     private final AuthService authService;
//     private final KafkaService kafkaService;
//     private final KafkaClusterRepository clusterRepo;

//     // ─── LIST ─────────────────────────────
//     @GetMapping
//     public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
//         var user = getUser(ud);

//         return ResponseEntity.ok(
//             repo.findByOwnerId(user.getId())
//                 .stream()
//                 .map(this::toResponse)
//                 .toList()
//         );
//     }

//     // ─── CREATE ───────────────────────────
//     @PostMapping
//     public ResponseEntity<?> create(@AuthenticationPrincipal UserDetails ud,
//                                    @RequestBody PipelineRequest req) {
//         var user = getUser(ud);

//         var pipeline = StreamPipeline.builder()
//             .name(req.name())
//             .description(req.description() != null ? req.description() : "")
//             .sourceClusterId(req.sourceClusterId())
//             .sourceTopic(req.sourceTopic())
//             .destClusterId(req.destClusterId())
//             .destTopic(req.destTopic())
//             .mode(req.mode() != null
//                 ? StreamPipeline.PipelineMode.valueOf(req.mode())
//                 : StreamPipeline.PipelineMode.REPLICATE)
//             .guarantee(req.guarantee() != null
//                 ? StreamPipeline.DeliveryGuarantee.valueOf(req.guarantee())
//                 : StreamPipeline.DeliveryGuarantee.AT_LEAST_ONCE)
//             .filterExpression(req.filterExpression())
//             .transformScript(req.transformScript())
//             .startOffset(req.startOffset() != null ? req.startOffset() : "latest")
//             .owner(user)
//             .build();

//         return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(pipeline));
//     }

//     // ─── UPDATE ───────────────────────────
//     @PutMapping("/{id}")
//     public ResponseEntity<?> update(@AuthenticationPrincipal UserDetails ud,
//                                    @PathVariable Long id,
//                                    @RequestBody PipelineRequest req) {

//         var user = getUser(ud);
//         var pipeline = getPipeline(id, user.getId());

//         if (pipeline.getStatus() == StreamPipeline.PipelineStatus.RUNNING) {
//             throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
//                 "Arrêtez le pipeline avant modification");
//         }

//         pipeline.setName(req.name());
//         pipeline.setDescription(req.description());
//         pipeline.setSourceClusterId(req.sourceClusterId());
//         pipeline.setSourceTopic(req.sourceTopic());
//         pipeline.setDestClusterId(req.destClusterId());
//         pipeline.setDestTopic(req.destTopic());
//         pipeline.setFilterExpression(req.filterExpression());
//         pipeline.setTransformScript(req.transformScript());
//         pipeline.setStartOffset(req.startOffset());

//         return ResponseEntity.ok(repo.save(pipeline));
//     }

//     // ─── DELETE ───────────────────────────
//     @DeleteMapping("/{id}")
//     public ResponseEntity<?> delete(@AuthenticationPrincipal UserDetails ud,
//                                    @PathVariable Long id) {

//         var user = getUser(ud);
//         var pipeline = getPipeline(id, user.getId());

//         if (engine.isRunning(id)) engine.stop(id);
//         repo.delete(pipeline);

//         return ResponseEntity.ok(new MessageResponse("Pipeline supprimé"));
//     }

//     // ─── START ────────────────────────────
//     @PostMapping("/{id}/start")
//     public ResponseEntity<?> start(@AuthenticationPrincipal UserDetails ud,
//                                   @PathVariable Long id) {

//         var user = getUser(ud);
//         var pipeline = getPipeline(id, user.getId());

//         if (engine.isRunning(id)) {
//             throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Déjà en cours");
//         }

//         engine.start(pipeline);
//         return ResponseEntity.ok(new StatusResponse("Pipeline démarré", "RUNNING"));
//     }

//     // ─── STOP ─────────────────────────────
//     @PostMapping("/{id}/stop")
//     public ResponseEntity<?> stop(@AuthenticationPrincipal UserDetails ud,
//                                  @PathVariable Long id) {

//         var user = getUser(ud);
//         getPipeline(id, user.getId());

//         engine.stop(id);
//         return ResponseEntity.ok(new StatusResponse("Pipeline arrêté", "STOPPED"));
//     }

//     // ─── PAUSE ────────────────────────────
//     @PostMapping("/{id}/pause")
//     public ResponseEntity<?> pause(@AuthenticationPrincipal UserDetails ud,
//                                   @PathVariable Long id) {

//         var user = getUser(ud);
//         getPipeline(id, user.getId());

//         engine.pause(id);
//         return ResponseEntity.ok(new StatusResponse("Pipeline en pause", "PAUSED"));
//     }

//     // ─── METRICS ──────────────────────────
//     @GetMapping("/{id}/metrics")
//     public ResponseEntity<?> metrics(@AuthenticationPrincipal UserDetails ud,
//                                     @PathVariable Long id) {

//         var user = getUser(ud);
//         var pipeline = getPipeline(id, user.getId());
//         var m = engine.getMetrics(id);

//         return ResponseEntity.ok(new MetricsResponse(
//             id,
//             pipeline.getStatus(),
//             engine.isRunning(id),
//             m != null ? m.getTransferred().get() : pipeline.getMessagesTransferred(),
//             m != null ? m.getFiltered().get() : pipeline.getMessagesFiltered(),
//             m != null ? m.getErrors().get() : pipeline.getErrors(),
//             m != null ? m.getThroughput() : 0,
//             m != null ? m.getLastError() : null,
//             pipeline.getLastMessageAt()
//         ));
//     }

//     // ─── TOPICS ───────────────────────────
//     @GetMapping("/cluster-topics/{clusterId}")
//     public ResponseEntity<?> topics(@AuthenticationPrincipal UserDetails ud,
//                                    @PathVariable Long clusterId) throws Exception {

//         var user = getUser(ud);
//         var cluster = clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
//             .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cluster introuvable"));

//         return ResponseEntity.ok(
//             kafkaService.listTopics(cluster).stream().map(t -> t.getName()).toList()
//         );
//     }

//     // ─── HELPERS ──────────────────────────
//     private PipelineResponse toResponse(StreamPipeline p) {
//         var m = engine.getMetrics(p.getId());

//         return new PipelineResponse(
//             p.getId(), p.getName(), p.getDescription(),
//             p.getSourceClusterId(), p.getSourceTopic(),
//             p.getDestClusterId(), p.getDestTopic(),
//             p.getMode(), p.getGuarantee(), p.getStatus(),
//             engine.isRunning(p.getId()),
//             m != null ? m.getTransferred().get() : p.getMessagesTransferred(),
//             m != null ? m.getThroughput() : 0,
//             m != null ? m.getErrors().get() : p.getErrors(),
//             p.getFilterExpression(), p.getTransformScript(),
//             p.getStartOffset(), p.getCreatedAt(), p.getLastMessageAt()
//         );
//     }

//     private User getUser(UserDetails ud) {
//         return authService.getByEmail(ud.getUsername());
//     }

//     private StreamPipeline getPipeline(Long id, Long userId) {
//         return repo.findByIdAndOwnerId(id, userId)
//             .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pipeline introuvable"));
//     }

//     // ─── DTO ──────────────────────────────
//     public record PipelineRequest(
//         String name, String description,
//         Long sourceClusterId, String sourceTopic,
//         Long destClusterId, String destTopic,
//         String mode, String guarantee,
//         String filterExpression, String transformScript,
//         String startOffset
//     ) {}

//     public record PipelineResponse(
//         Long id, String name, String description,
//         Long sourceClusterId, String sourceTopic,
//         Long destClusterId, String destTopic,
//         StreamPipeline.PipelineMode mode,
//         StreamPipeline.DeliveryGuarantee guarantee,
//         StreamPipeline.PipelineStatus status,
//         boolean running,
//         long transferred, double throughput, long errors,
//         String filterExpression, String transformScript,
//         String startOffset,
//         Object createdAt, Object lastMessageAt
//     ) {}

//     public record MetricsResponse(
//         Long pipelineId,
//         StreamPipeline.PipelineStatus status,
//         boolean running,
//         long transferred,
//         long filtered,
//         long errors,
//         double throughput,
//         String lastError,
//         Object lastMessageAt
//     ) {}

//     public record MessageResponse(String message) {}
//     public record StatusResponse(String message, String status) {}
// }
package com.kafkamind.controller;

import com.kafkamind.model.StreamPipeline;
import com.kafkamind.model.User;
import com.kafkamind.repository.KafkaClusterRepository;
import com.kafkamind.repository.StreamPipelineRepository;
import com.kafkamind.service.AuthService;
import com.kafkamind.service.KafkaService;
import com.kafkamind.streaming.StreamingEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/streaming")
@RequiredArgsConstructor
public class StreamingController {

    private final StreamingEngine          engine;
    private final StreamPipelineRepository repo;
    private final AuthService              authService;
    private final KafkaService             kafkaService;
    private final KafkaClusterRepository   clusterRepo;

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        var user = getUser(ud);
        return ResponseEntity.ok(repo.findByOwnerId(user.getId()).stream()
            .map(this::toMap).toList());
    }

    @PostMapping
    public ResponseEntity<?> create(@AuthenticationPrincipal UserDetails ud,
                                     @RequestBody PipelineRequest req) {
        var user = getUser(ud);
        var p = StreamPipeline.builder()
            .name(req.name()).description(req.description() != null ? req.description() : "")
            .sourceClusterId(req.sourceClusterId()).sourceTopic(req.sourceTopic())
            .destClusterId(req.destClusterId()).destTopic(req.destTopic())
            .mode(req.mode() != null ? StreamPipeline.PipelineMode.valueOf(req.mode()) : StreamPipeline.PipelineMode.REPLICATE)
            .guarantee(req.guarantee() != null ? StreamPipeline.DeliveryGuarantee.valueOf(req.guarantee()) : StreamPipeline.DeliveryGuarantee.AT_LEAST_ONCE)
            .filterExpression(req.filterExpression())
            .transformScript(req.transformScript())
            .startOffset(req.startOffset() != null ? req.startOffset() : "latest")
            .owner(user).build();
        return ResponseEntity.status(201).body(toMap(repo.save(p)));
    }

    // ── Duplication ───────────────────────────────────────────────────────────
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<?> duplicate(@AuthenticationPrincipal UserDetails ud,
                                        @PathVariable Long id) {
        var user     = getUser(ud);
        var original = getPipeline(id, user.getId());
        var copy = StreamPipeline.builder()
            .name("Copie de " + original.getName())
            .description(original.getDescription())
            .sourceClusterId(original.getSourceClusterId())
            .sourceTopic(original.getSourceTopic())
            .destClusterId(original.getDestClusterId())
            .destTopic(original.getDestTopic() + "-copy")
            .mode(original.getMode())
            .guarantee(original.getGuarantee())
            .filterExpression(original.getFilterExpression())
            .transformScript(original.getTransformScript())
            .startOffset(original.getStartOffset())
            .status(StreamPipeline.PipelineStatus.STOPPED)
            .owner(user).build();
        return ResponseEntity.status(201).body(toMap(repo.save(copy)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@AuthenticationPrincipal UserDetails ud,
                                     @PathVariable Long id, @RequestBody PipelineRequest req) {
        var user = getUser(ud);
        var p = getPipeline(id, user.getId());
        if (p.getStatus() == StreamPipeline.PipelineStatus.RUNNING)
            return ResponseEntity.badRequest().body(Map.of("error", "Arrêtez le pipeline avant de le modifier"));
        p.setName(req.name()); p.setDescription(req.description());
        p.setSourceClusterId(req.sourceClusterId()); p.setSourceTopic(req.sourceTopic());
        p.setDestClusterId(req.destClusterId()); p.setDestTopic(req.destTopic());
        p.setFilterExpression(req.filterExpression());
        p.setTransformScript(req.transformScript());
        p.setStartOffset(req.startOffset());
        return ResponseEntity.ok(toMap(repo.save(p)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) {
        var user = getUser(ud);
        var p = getPipeline(id, user.getId());
        if (engine.isRunning(id)) engine.stop(id);
        repo.delete(p);
        return ResponseEntity.ok(Map.of("message", "Pipeline supprimé"));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> start(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) {
        var user = getUser(ud);
        var p = getPipeline(id, user.getId());
        if (engine.isRunning(id)) return ResponseEntity.badRequest().body(Map.of("error", "Déjà en cours"));
        engine.start(p);
        return ResponseEntity.ok(Map.of("message", "Pipeline démarré", "status", "RUNNING"));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<?> stop(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) {
        getUser(ud); getPipeline(id, getUser(ud).getId());
        engine.stop(id);
        return ResponseEntity.ok(Map.of("message", "Pipeline arrêté", "status", "STOPPED"));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<?> pause(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) {
        getUser(ud); getPipeline(id, getUser(ud).getId());
        engine.pause(id);
        return ResponseEntity.ok(Map.of("message", "Pipeline en pause", "status", "PAUSED"));
    }

    @GetMapping("/{id}/metrics")
    public ResponseEntity<?> metrics(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) {
        var user = getUser(ud);
        var p = getPipeline(id, user.getId());
        var m = engine.getMetrics(id);
        return ResponseEntity.ok(Map.of(
            "pipelineId",    id,
            "status",        p.getStatus(),
            "running",       engine.isRunning(id),
            "transferred",   m != null ? m.getTransferred().get() : p.getMessagesTransferred(),
            "filtered",      m != null ? m.getFiltered().get()    : p.getMessagesFiltered(),
            "errors",        m != null ? m.getErrors().get()      : p.getErrors(),
            "throughput",    m != null ? m.getThroughput()        : 0,
            "lastMessageAt", p.getLastMessageAt()
        ));
    }

    // ── Topics dynamiques pour le formulaire ──────────────────────────────────
    @GetMapping("/cluster-topics/{clusterId}")
    public ResponseEntity<?> topicsForCluster(@AuthenticationPrincipal UserDetails ud,
                                               @PathVariable Long clusterId) throws Exception {
        var user    = getUser(ud);
        var cluster = clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
        return ResponseEntity.ok(kafkaService.listTopics(cluster).stream()
            .map(t -> t.getName()).toList());
    }

    // ── Helper sérialisation sans Map.of() > 10 entrées ──────────────────────
    private Map<String, Object> toMap(StreamPipeline p) {
        var m   = engine.getMetrics(p.getId());
        var map = new HashMap<String, Object>();
        map.put("id",              p.getId());
        map.put("name",            p.getName());
        map.put("description",     p.getDescription() != null ? p.getDescription() : "");
        map.put("sourceClusterId", p.getSourceClusterId());
        map.put("sourceTopic",     p.getSourceTopic());
        map.put("destClusterId",   p.getDestClusterId());
        map.put("destTopic",       p.getDestTopic());
        map.put("mode",            p.getMode());
        map.put("guarantee",       p.getGuarantee());
        map.put("status",          p.getStatus());
        map.put("running",         engine.isRunning(p.getId()));
        map.put("transferred",     m != null ? m.getTransferred().get() : p.getMessagesTransferred());
        map.put("throughput",      m != null ? m.getThroughput()        : 0L);
        map.put("errors",          m != null ? m.getErrors().get()      : p.getErrors());
        map.put("filterExpression",p.getFilterExpression() != null ? p.getFilterExpression() : "");
        map.put("transformScript", p.getTransformScript()  != null ? p.getTransformScript()  : "");
        map.put("startOffset",     p.getStartOffset());
        map.put("createdAt",       p.getCreatedAt());
        map.put("lastMessageAt",   p.getLastMessageAt());
        return map;
    }

    private User getUser(UserDetails ud) { return authService.getByEmail(ud.getUsername()); }
    private StreamPipeline getPipeline(Long id, Long userId) {
        return repo.findByIdAndOwnerId(id, userId)
            .orElseThrow(() -> new RuntimeException("Pipeline introuvable"));
    }

    record PipelineRequest(
        String name, String description,
        Long sourceClusterId, String sourceTopic,
        Long destClusterId,   String destTopic,
        String mode, String guarantee,
        String filterExpression, String transformScript, String startOffset
    ) {}
}
