package com.kafkamind.dto.kafka;
import lombok.*;
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AclDto {
    private String resourceType;
    private String resourceName;
    private String patternType;
    private String principal;
    private String host;
    private String operation;
    private String permissionType;
}
