package com.kafkamind.dto.kafka;

import lombok.*;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TopicDto {
    private String name;
    private int partitions;
    private int replicationFactor;
}
