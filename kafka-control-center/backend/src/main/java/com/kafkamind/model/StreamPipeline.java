package com.kafkamind.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "stream_pipelines")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class StreamPipeline {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String description;

    // Source
    @Column(nullable = false)
    private Long sourceClusterId;

    @Column(nullable = false)
    private String sourceTopic;

    // Destination
    @Column(nullable = false)
    private Long destClusterId;

    @Column(nullable = false)
    private String destTopic;

    // Comportement
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PipelineMode mode = PipelineMode.REPLICATE;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private DeliveryGuarantee guarantee = DeliveryGuarantee.AT_LEAST_ONCE;

    // Filtre/Transform (JSON)
    @Column(columnDefinition = "TEXT")
    private String filterExpression;  // ex: "$.event == 'order.placed'"

    @Column(columnDefinition = "TEXT")
    private String transformScript;   // ex: renommer des champs

    // Position
    private String startOffset;  // "earliest" | "latest" | offset numérique

    // État
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PipelineStatus status = PipelineStatus.STOPPED;

    // Métriques
    @Builder.Default private long messagesTransferred = 0L;
    @Builder.Default private long messagesFiltered    = 0L;
    @Builder.Default private long errors              = 0L;
    private LocalDateTime lastMessageAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum PipelineMode {
        REPLICATE,   // Copie simple
        MIGRATE,     // Migration avec dual-write + cutover
        FAN_OUT,     // 1 source → N destinations
        FILTER,      // Filtre et copie
        REPLAY       // Rejoue depuis un offset
    }

    public enum DeliveryGuarantee {
        AT_LEAST_ONCE,  // Commit offset après ACK destination
        EXACTLY_ONCE    // Transactions Kafka
    }

    public enum PipelineStatus {
        RUNNING, STOPPED, PAUSED, ERROR
    }
}
