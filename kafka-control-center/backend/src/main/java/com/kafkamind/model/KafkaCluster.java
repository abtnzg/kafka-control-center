package com.kafkamind.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "kafka_clusters")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KafkaCluster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String bootstrapServers;

    // Auth SASL
    private String saslMechanism;
    private String saslUsername;
    private String saslPassword;  // À chiffrer en prod avec @Convert

    // Schema Registry
    private String schemaRegistryUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private boolean active = true;
}
