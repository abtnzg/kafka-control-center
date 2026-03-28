package com.kafkamind.dto.kafka;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class MessageDto {
    private int partition;
    private long offset;
    private String key;
    private String value;
    private long timestamp;
}
