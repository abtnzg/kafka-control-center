package com.kafkamind.dto.kafka;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ConsumerGroupDto {
    private String groupId;
    private String state;
    private int members;
}
