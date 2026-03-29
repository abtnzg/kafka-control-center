package com.kafkamind.controller;

import com.kafkamind.model.StreamPipeline;
import com.kafkamind.model.User;
import com.kafkamind.repository.StreamPipelineRepository;
import com.kafkamind.service.AuthService;
import com.kafkamind.streaming.StreamingEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/streaming")
@RequiredArgsConstructor
public class StreamingController {

    private final StreamingEngine engine;
    private final StreamPipelineRepository repo;
    private final AuthService authService;

    // ─── CRUD Pipelines ─────────────────────────────────────────

    @GetMapping
    public ResponseEntity<?> list(@AuthenticationPrincipal UserDetails ud) {
        var user = getUser(ud);
        var pipelines = repo.findByOwnerId(user.getId());

        return ResponseEntity.ok(
            pipelines.stream().map(this::toResponse).toList()
        );
    }

    @PostMapping
    public ResponseEntity<?> create(
        @AuthenticationPrincipal UserDetails ud,
        @RequestBody PipelineRequest req
    ) {
        var user = getUser(ud);

        var pipeline = StreamPipeline.builder()
            .name(req.name())
            .description(req.description() != null ? req.description() : "")
            .sourceClusterId(req.sourceClusterId())
            .sourceTopic(req.sourceTopic())
            .destClusterId(req.destClusterId())
            .destTopic(req.destTopic())
            .mode(req.mode() != null
                ? StreamPipeline.PipelineMode.valueOf(req.mode())
                : StreamPipeline.PipelineMode.REPLICATE)
            .guarantee(req.guarantee() != null
                ? StreamPipeline.DeliveryGuarantee.valueOf(req.guarantee())
                : StreamPipeline.DeliveryGuarantee.AT_LEAST_ONCE)
            .filterExpression(req.filterExpression())
            .transformScript(req.transformScript())
            .startOffset(req.startOffset() != null ? req.startOffset() : "latest")
            .owner(user)
            .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(pipeline));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @RequestBody PipelineRequest req
    ) {
        var user = getUser(ud);
        var pipeline = getPipeline(id, user.getId());

        if (pipeline.getStatus() == StreamPipeline.PipelineStatus.RUNNING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Arrêtez le pipeline avant modification");
        }

        pipeline.setName(req.name());
        pipeline.setDescription(req.description());
        pipeline.setSourceClusterId(req.sourceClusterId());
        pipeline.setSourceTopic(req.sourceTopic());
        pipeline.setDestClusterId(req.destClusterId());
        pipeline.setDestTopic(req.destTopic());
        pipeline.setFilterExpression(req.filterExpression());
        pipeline.setTransformScript(req.transformScript());
        pipeline.setStartOffset(req.startOffset());

        return ResponseEntity.ok(repo.save(pipeline));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) {
        var user = getUser(ud);
        var pipeline = getPipeline(id, user.getId());

        if (engine.isRunning(id)) engine.stop(id);

        repo.delete(pipeline);

        return ResponseEntity.ok(new MessageResponse("Pipeline supprimé"));
    }

    // ─── Contrôle ─────────────────────────────────────────

    @PostMapping("/{id}/start")
    public ResponseEntity<?> start(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) {
        var user = getUser(ud);
        var pipeline = getPipeline(id, user.getId());

        if (engine.isRunning(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Pipeline déjà en cours");
        }

        engine.start(pipeline);

        return ResponseEntity.ok(new StatusResponse("Pipeline démarré", "RUNNING"));
    }

    @PostMapping("/{id}/stop")
    public ResponseEntity<?> stop(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) {
        var user = getUser(ud);
        getPipeline(id, user.getId());

        engine.stop(id);

        return ResponseEntity.ok(new StatusResponse("Pipeline arrêté", "STOPPED"));
    }

    @PostMapping("/{id}/pause")
    public ResponseEntity<?> pause(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) {
        var user = getUser(ud);
        getPipeline(id, user.getId());

        engine.pause(id);

        return ResponseEntity.ok(new StatusResponse("Pipeline en pause", "PAUSED"));
    }

    // ─── Métriques ─────────────────────────────────────────

    @GetMapping("/{id}/metrics")
    public ResponseEntity<?> metrics(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) {
        var user = getUser(ud);
        var pipeline = getPipeline(id, user.getId());
        var m = engine.getMetrics(id);

        return ResponseEntity.ok(new MetricsResponse(
            id,
            pipeline.getStatus(),
            engine.isRunning(id),
            m != null ? m.getTransferred().get() : pipeline.getMessagesTransferred(),
            m != null ? m.getFiltered().get() : pipeline.getMessagesFiltered(),
            m != null ? m.getErrors().get() : pipeline.getErrors(),
            m != null ? m.getThroughput() : 0,
            m != null ? m.getLastError() : null,
            pipeline.getLastMessageAt()
        ));
    }

    // ─── Helpers ─────────────────────────────────────────

    private PipelineResponse toResponse(StreamPipeline p) {
        var m = engine.getMetrics(p.getId());

        return new PipelineResponse(
            p.getId(),
            p.getName(),
            p.getDescription(),
            p.getSourceClusterId(),
            p.getSourceTopic(),
            p.getDestClusterId(),
            p.getDestTopic(),
            p.getMode(),
            p.getGuarantee(),
            p.getStatus(),
            engine.isRunning(p.getId()),
            m != null ? m.getTransferred().get() : p.getMessagesTransferred(),
            m != null ? m.getThroughput() : 0,
            m != null ? m.getErrors().get() : p.getErrors(),
            p.getFilterExpression(),
            p.getTransformScript(),
            p.getStartOffset(),
            p.getCreatedAt(),
            p.getLastMessageAt()
        );
    }

    private User getUser(UserDetails ud) {
        return authService.getByEmail(ud.getUsername());
    }

    private StreamPipeline getPipeline(Long id, Long userId) {
        return repo.findByIdAndOwnerId(id, userId)
            .orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Pipeline introuvable"));
    }

    // ─── DTOs ─────────────────────────────────────────

    public record PipelineRequest(
        String name,
        String description,
        Long sourceClusterId,
        String sourceTopic,
        Long destClusterId,
        String destTopic,
        String mode,
        String guarantee,
        String filterExpression,
        String transformScript,
        String startOffset
    ) {}

    public record PipelineResponse(
        Long id,
        String name,
        String description,
        Long sourceClusterId,
        String sourceTopic,
        Long destClusterId,
        String destTopic,
        StreamPipeline.PipelineMode mode,
        StreamPipeline.DeliveryGuarantee guarantee,
        StreamPipeline.PipelineStatus status,
        boolean running,
        long transferred,
        double throughput,
        long errors,
        String filterExpression,
        String transformScript,
        String startOffset,
        Object createdAt,
        Object lastMessageAt
    ) {}

    public record MetricsResponse(
        Long pipelineId,
        StreamPipeline.PipelineStatus status,
        boolean running,
        long transferred,
        long filtered,
        long errors,
        double throughput,
        String lastError,
        Object lastMessageAt
    ) {}

    public record MessageResponse(String message) {}

    public record StatusResponse(String message, String status) {}
}