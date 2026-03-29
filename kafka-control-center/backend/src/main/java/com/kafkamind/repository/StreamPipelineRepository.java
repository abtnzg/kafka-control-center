package com.kafkamind.repository;

import com.kafkamind.model.StreamPipeline;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StreamPipelineRepository extends JpaRepository<StreamPipeline, Long> {
    List<StreamPipeline> findByOwnerId(Long userId);
    Optional<StreamPipeline> findByIdAndOwnerId(Long id, Long userId);
    List<StreamPipeline> findByStatus(StreamPipeline.PipelineStatus status);
}
