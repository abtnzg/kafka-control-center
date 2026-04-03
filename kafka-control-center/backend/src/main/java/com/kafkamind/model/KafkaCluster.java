package com.kafkamind.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "kafka_clusters")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class KafkaCluster {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String bootstrapServers;

    // ── Auth SASL ─────────────────────────────────────────────────────────────
    private String saslMechanism;    // PLAIN, SCRAM-SHA-256, SCRAM-SHA-512
    private String saslUsername;
    private String saslPassword;

    // ── Auth AWS IAM (MSK) ────────────────────────────────────────────────────
    @Builder.Default
    private boolean awsIam = false;
    private String awsRegion;        // ex: eu-west-1

    // ── TLS ───────────────────────────────────────────────────────────────────
    @Builder.Default
    private boolean tlsEnabled = false;

    // ── Schema Registry ───────────────────────────────────────────────────────
    private String schemaRegistryUrl;

    // ── Soft delete ───────────────────────────────────────────────────────────
    @Builder.Default
    private boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;
}
