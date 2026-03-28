package com.kafkamind.dto.kafka;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ClusterHealthDto {
    private int brokersCount;
    private int controllerId;
    private int topicsCount;
    private String bootstrapServers;
}
