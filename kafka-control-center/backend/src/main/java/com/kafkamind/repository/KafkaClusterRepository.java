package com.kafkamind.repository;

import com.kafkamind.model.KafkaCluster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface KafkaClusterRepository extends JpaRepository<KafkaCluster, Long> {
    List<KafkaCluster> findByOwnerIdAndActiveTrue(Long userId);
    Optional<KafkaCluster> findByIdAndOwnerId(Long id, Long userId);
}
