package com.kafkamind.service;

import com.kafkamind.dto.kafka.AclDto;
import com.kafkamind.dto.kafka.BrokerDto;
import com.kafkamind.model.KafkaCluster;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.acl.*;
import org.apache.kafka.common.config.ConfigResource;
import org.apache.kafka.common.resource.*;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class BrokerAclService {

    private AdminClient buildAdminClient(KafkaCluster cluster) {
        Map<String, Object> props = new HashMap<>();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, cluster.getBootstrapServers());
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG, 5000);
        props.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, 10000);
        if (cluster.getSaslMechanism() != null) {
            props.put("security.protocol", "SASL_SSL");
            props.put("sasl.mechanism", cluster.getSaslMechanism());
            props.put("sasl.jaas.config",
                "org.apache.kafka.common.security.plain.PlainLoginModule required " +
                "username=\"" + cluster.getSaslUsername() + "\" " +
                "password=\"" + cluster.getSaslPassword() + "\";");
        }
        return AdminClient.create(props);
    }

    // ─── Brokers ──────────────────────────────────────────────────────────────

    public List<BrokerDto> listBrokers(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var description = admin.describeCluster();
            var nodes       = description.nodes().get();
            var controllerId = description.controller().get().id();

            // Récupérer les configs de chaque broker
            var resources = nodes.stream()
                .map(n -> new ConfigResource(ConfigResource.Type.BROKER, String.valueOf(n.id())))
                .collect(Collectors.toList());

            Map<ConfigResource, Config> brokerConfigs = new HashMap<>();
            try {
                brokerConfigs = admin.describeConfigs(resources).all().get();
            } catch (Exception e) {
                log.warn("Impossible de récupérer les configs broker : {}", e.getMessage());
            }

            final Map<ConfigResource, Config> finalConfigs = brokerConfigs;

            return nodes.stream().map(n -> {
                var resource = new ConfigResource(ConfigResource.Type.BROKER, String.valueOf(n.id()));
                var cfg = finalConfigs.get(resource);
                Map<String, String> importantConfigs = new TreeMap<>();
                if (cfg != null) {
                    List.of(
                        "log.retention.hours", "log.retention.bytes",
                        "num.partitions", "default.replication.factor",
                        "min.insync.replicas", "compression.type",
                        "message.max.bytes", "num.network.threads",
                        "num.io.threads", "log.dirs",
                        "auto.create.topics.enable", "delete.topic.enable"
                    ).forEach(key -> {
                        var entry = cfg.get(key);
                        if (entry != null) importantConfigs.put(key, entry.value());
                    });
                }
                return BrokerDto.builder()
                    .id(n.id())
                    .host(n.host())
                    .port(n.port())
                    .rack(n.rack())
                    .controller(n.id() == controllerId)
                    .configs(importantConfigs)
                    .build();
            }).sorted(Comparator.comparingInt(BrokerDto::getId)).collect(Collectors.toList());
        }
    }

    // ─── ACLs ─────────────────────────────────────────────────────────────────

    public List<AclDto> listAcls(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var filter = AclBindingFilter.ANY;
            var acls = admin.describeAcls(filter).values().get();
            return acls.stream().map(acl -> AclDto.builder()
                .resourceType(acl.pattern().resourceType().name())
                .resourceName(acl.pattern().name())
                .patternType(acl.pattern().patternType().name())
                .principal(acl.entry().principal())
                .host(acl.entry().host())
                .operation(acl.entry().operation().name())
                .permissionType(acl.entry().permissionType().name())
                .build()
            ).collect(Collectors.toList());
        }
    }

    public void createAcl(KafkaCluster cluster, AclDto dto) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var pattern = new ResourcePattern(
                ResourceType.fromString(dto.getResourceType()),
                dto.getResourceName(),
                PatternType.fromString(dto.getPatternType())
            );
            var entry = new AccessControlEntry(
                dto.getPrincipal(),
                dto.getHost() != null ? dto.getHost() : "*",
                AclOperation.fromString(dto.getOperation()),
                AclPermissionType.fromString(dto.getPermissionType())
            );
            admin.createAcls(List.of(new AclBinding(pattern, entry))).all().get();
        }
    }

    public void deleteAcl(KafkaCluster cluster, AclDto dto) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var patternFilter = new ResourcePatternFilter(
                ResourceType.fromString(dto.getResourceType()),
                dto.getResourceName(),
                PatternType.fromString(dto.getPatternType())
            );
            var entryFilter = new AccessControlEntryFilter(
                dto.getPrincipal(), dto.getHost() != null ? dto.getHost() : "*",
                AclOperation.fromString(dto.getOperation()),
                AclPermissionType.fromString(dto.getPermissionType())
            );
            admin.deleteAcls(List.of(new AclBindingFilter(patternFilter, entryFilter))).all().get();
        }
    }
}
