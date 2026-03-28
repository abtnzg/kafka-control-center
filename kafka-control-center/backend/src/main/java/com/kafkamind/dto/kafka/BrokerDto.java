package com.kafkamind.dto.kafka;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BrokerDto {
    private int id;
    private String host;
    private int port;
    private String rack;
    private boolean controller;
    private java.util.Map<String, String> configs;
}
