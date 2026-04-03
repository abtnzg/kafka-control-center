// package com.kafkamind.service;

// import com.kafkamind.dto.kafka.*;
// import com.kafkamind.model.KafkaCluster;
// import lombok.extern.slf4j.Slf4j;
// import org.apache.kafka.clients.admin.*;
// import org.apache.kafka.clients.consumer.*;
// import org.apache.kafka.common.*;
// import org.apache.kafka.common.config.ConfigResource;
// import org.springframework.stereotype.Service;

// import java.time.Duration;
// import java.util.*;
// import java.util.stream.Collectors;

// @Service
// @Slf4j
// public class KafkaService {

//     private static final int MAX_MESSAGES_LIMIT = 500;
//     private static final int CONNECT_TIMEOUT_MS = 3000;
//     private static final int API_TIMEOUT_MS     = 5000;

//     private AdminClient buildAdminClient(KafkaCluster cluster) {
//         Map<String, Object> props = new HashMap<>();
//         props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG,        cluster.getBootstrapServers());
//         props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG,       CONNECT_TIMEOUT_MS);
//         props.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG,   API_TIMEOUT_MS);
//         props.put(AdminClientConfig.RETRIES_CONFIG,                  1);
//         if (cluster.isAwsIam()) {
//             props.put("security.protocol", "SASL_SSL");
//             props.put("sasl.mechanism",    "AWS_MSK_IAM");
//             props.put("sasl.jaas.config",  "software.amazon.msk.auth.iam.IAMLoginModule required;");
//             props.put("sasl.client.callback.handler.class", "software.amazon.msk.auth.iam.IAMClientCallbackHandler");
//         } else if (cluster.getSaslMechanism() != null) {
//             props.put("security.protocol", cluster.isTlsEnabled() ? "SASL_SSL" : "SASL_PLAINTEXT");
//             props.put("sasl.mechanism",    cluster.getSaslMechanism());
//             props.put("sasl.jaas.config",  "org.apache.kafka.common.security.plain.PlainLoginModule required username=\"" + cluster.getSaslUsername() + "\" password=\"" + cluster.getSaslPassword() + "\";"  );
//         } else if (cluster.isTlsEnabled()) {
//             props.put("security.protocol", "SSL");
//         }
//         return AdminClient.create(props);
//     }

//     // ─── Topics ──────────────────────────────────────────────────────────────

//     public List<TopicDto> listTopics(KafkaCluster cluster) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             var names = admin.listTopics(new ListTopicsOptions().listInternal(false))
//                 .names().get();
//             var descriptions = admin.describeTopics(names).allTopicNames().get();
//             return descriptions.values().stream().map(td -> TopicDto.builder()
//                 .name(td.name())
//                 .partitions(td.partitions().size())
//                 .replicationFactor(td.partitions().isEmpty() ? 0 : td.partitions().get(0).replicas().size())
//                 .build()
//             ).sorted(Comparator.comparing(TopicDto::getName)).collect(Collectors.toList());
//         } catch (Exception e) {
//             throw new RuntimeException(buildErrorMessage(cluster, e), e);
//         }
//     }

//     public void createTopic(KafkaCluster cluster, String name, int partitions, short replication) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             admin.createTopics(List.of(new NewTopic(name, partitions, replication))).all().get();
//         } catch (Exception e) {
//             throw new RuntimeException(buildErrorMessage(cluster, e), e);
//         }
//     }

//     public void deleteTopic(KafkaCluster cluster, String name) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             admin.deleteTopics(List.of(name)).all().get();
//         } catch (Exception e) {
//             throw new RuntimeException(buildErrorMessage(cluster, e), e);
//         }
//     }

//     // ─── Topic Config ─────────────────────────────────────────────────────────

//     public Map<String, String> getTopicConfig(KafkaCluster cluster, String topicName) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
//             var configs  = admin.describeConfigs(List.of(resource)).all().get();
//             return configs.get(resource).entries().stream()
//                 .filter(e -> !e.isDefault())
//                 .collect(Collectors.toMap(ConfigEntry::name, ConfigEntry::value, (a, b) -> a, TreeMap::new));
//         }
//     }

//     public Map<String, String> getAllTopicConfig(KafkaCluster cluster, String topicName) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
//             var configs  = admin.describeConfigs(List.of(resource)).all().get();
//             return configs.get(resource).entries().stream()
//                 .collect(Collectors.toMap(ConfigEntry::name, ConfigEntry::value, (a, b) -> a, TreeMap::new));
//         }
//     }

//     public void updateTopicConfig(KafkaCluster cluster, String topicName, Map<String, String> configs) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
//             var entries  = configs.entrySet().stream()
//                 .map(e -> new ConfigEntry(e.getKey(), e.getValue()))
//                 .collect(Collectors.toList());
//             admin.alterConfigs(Map.of(resource, new Config(entries))).all().get();
//         }
//     }

//     // ─── Consumer Groups ─────────────────────────────────────────────────────

//     public List<ConsumerGroupDto> listConsumerGroups(KafkaCluster cluster) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             var groups   = admin.listConsumerGroups().all().get();
//             var groupIds = groups.stream().map(ConsumerGroupListing::groupId).collect(Collectors.toList());
//             if (groupIds.isEmpty()) return List.of();
//             var descriptions = admin.describeConsumerGroups(groupIds).all().get();
//             return descriptions.values().stream().map(desc -> ConsumerGroupDto.builder()
//                 .groupId(desc.groupId()).state(desc.state().toString()).members(desc.members().size()).build()
//             ).sorted(Comparator.comparing(ConsumerGroupDto::getGroupId)).collect(Collectors.toList());
//         } catch (Exception e) {
//             throw new RuntimeException(buildErrorMessage(cluster, e), e);
//         }
//     }

//     public Map<String, Long> getConsumerGroupLag(KafkaCluster cluster, String groupId) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             var offsets = admin.listConsumerGroupOffsets(groupId).partitionsToOffsetAndMetadata().get();
//             if (offsets.isEmpty()) return Map.of();
//             Map<TopicPartition, OffsetSpec> latestRequest = new HashMap<>();
//             offsets.keySet().forEach(tp -> latestRequest.put(tp, OffsetSpec.latest()));
//             var latestOffsets = admin.listOffsets(latestRequest).all().get();
//             Map<String, Long> lag = new LinkedHashMap<>();
//             offsets.forEach((tp, om) -> {
//                 long latest = latestOffsets.get(tp).offset();
//                 lag.put(tp.topic() + "-" + tp.partition(), Math.max(0, latest - om.offset()));
//             });
//             return lag;
//         }
//     }

//     // ─── Cluster Health ───────────────────────────────────────────────────────

//     public ClusterHealthDto getClusterHealth(KafkaCluster cluster) throws Exception {
//         try (var admin = buildAdminClient(cluster)) {
//             var description = admin.describeCluster();
//             var nodes       = description.nodes().get();
//             var controller  = description.controller().get();
//             var topics      = admin.listTopics().names().get();
//             return ClusterHealthDto.builder()
//                 .brokersCount(nodes.size()).controllerId(controller.id())
//                 .topicsCount(topics.size()).bootstrapServers(cluster.getBootstrapServers())
//                 .build();
//         } catch (Exception e) {
//             throw new RuntimeException(buildErrorMessage(cluster, e), e);
//         }
//     }

//     // ─── Messages — assign direct au lieu de subscribe ────────────────────────

//     public List<MessageDto> peekMessages(KafkaCluster cluster, String topic, int maxMessages) throws Exception {
//         int limit = Math.min(maxMessages, MAX_MESSAGES_LIMIT);

//         Properties props = new Properties();
//         props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,          cluster.getBootstrapServers());
//         props.put(ConsumerConfig.GROUP_ID_CONFIG,                   "kafkamind-peek-" + UUID.randomUUID());
//         props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,     "org.apache.kafka.common.serialization.StringDeserializer");
//         props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,   "org.apache.kafka.common.serialization.StringDeserializer");
//         props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,         false);
//         props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG,           limit);
//         props.put(ConsumerConfig.FETCH_MAX_BYTES_CONFIG,            5 * 1024 * 1024);
//         props.put(ConsumerConfig.MAX_PARTITION_FETCH_BYTES_CONFIG,  1024 * 1024);
//         props.put(ConsumerConfig.REQUEST_TIMEOUT_MS_CONFIG,         CONNECT_TIMEOUT_MS);

//         List<MessageDto> messages = new ArrayList<>();

//         try (var admin = buildAdminClient(cluster);
//              var consumer = new KafkaConsumer<String, String>(props)) {

//             // Récupère toutes les partitions du topic
//             var descriptions = admin.describeTopics(List.of(topic)).allTopicNames().get();
//             var topicDesc    = descriptions.get(topic);
//             if (topicDesc == null) throw new RuntimeException("Topic introuvable : " + topic);

//             // Assigne manuellement toutes les partitions — pas de subscribe()
//             var partitions = topicDesc.partitions().stream()
//                 .map(p -> new TopicPartition(topic, p.partition()))
//                 .collect(Collectors.toList());

//             consumer.assign(partitions);

//             // Récupère les offsets earliest et latest pour chaque partition
//             var beginOffsets = consumer.beginningOffsets(partitions);
//             var endOffsets   = consumer.endOffsets(partitions);

//             // Calcule le nombre total de messages disponibles
//             long totalMessages = endOffsets.entrySet().stream()
//                 .mapToLong(e -> e.getValue() - beginOffsets.getOrDefault(e.getKey(), 0L))
//                 .sum();

//             if (totalMessages == 0) return List.of(); // topic vide → retour immédiat

//             // Positionne sur earliest de chaque partition
//             partitions.forEach(tp -> consumer.seek(tp, beginOffsets.getOrDefault(tp, 0L)));

//             // Poll jusqu'à avoir le nombre de messages voulus ou épuiser le topic
//             long deadline = System.currentTimeMillis() + 8000;
//             while (messages.size() < limit && System.currentTimeMillis() < deadline) {
//                 var records = consumer.poll(Duration.ofMillis(500));
//                 if (records.isEmpty()) break;
//                 for (var r : records) {
//                     messages.add(MessageDto.builder()
//                         .partition(r.partition())
//                         .offset(r.offset())
//                         .key(r.key())
//                         .value(r.value())
//                         .timestamp(r.timestamp())
//                         .build());
//                     if (messages.size() >= limit) break;
//                 }
//             }

//         } catch (Exception e) {
//             throw new RuntimeException("Erreur lecture messages : " + e.getMessage(), e);
//         }

//         return messages;
//     }

//     // ─── Helper erreurs ───────────────────────────────────────────────────────

//     private String buildErrorMessage(KafkaCluster cluster, Exception e) {
//         String cause = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
//         if (cause != null && (cause.contains("Connection refused") || cause.contains("ECONNREFUSED"))) {
//             return String.format("Impossible de joindre '%s' sur %s — vérifiez que Kafka est démarré.",
//                 cluster.getName(), cluster.getBootstrapServers());
//         }
//         if (cause != null && cause.contains("TimeoutException")) {
//             return String.format("Timeout sur '%s' (%s) — réseau ou broker injoignable.",
//                 cluster.getName(), cluster.getBootstrapServers());
//         }
//         return "Erreur Kafka : " + (cause != null ? cause : e.getMessage());
//     }
// }
package com.kafkamind.service;

import com.kafkamind.dto.kafka.*;
import com.kafkamind.model.KafkaCluster;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.common.*;
import org.apache.kafka.common.config.ConfigResource;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class KafkaService {

    private static final int MAX_MESSAGES_LIMIT = 500;
    private static final int CONNECT_TIMEOUT_MS = 3000;
    private static final int API_TIMEOUT_MS     = 5000;

    private AdminClient buildAdminClient(KafkaCluster cluster) {
        Map<String, Object> props = new HashMap<>();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG,        cluster.getBootstrapServers());
        props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG,       CONNECT_TIMEOUT_MS);
        props.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG,   API_TIMEOUT_MS);
        props.put(AdminClientConfig.RETRIES_CONFIG,                  1);
        if (cluster.isAwsIam()) {
            props.put("security.protocol", "SASL_SSL");
            props.put("sasl.mechanism",    "AWS_MSK_IAM");
            props.put("sasl.jaas.config",  "software.amazon.msk.auth.iam.IAMLoginModule required;");
            props.put("sasl.client.callback.handler.class",
                      "software.amazon.msk.auth.iam.IAMClientCallbackHandler");
            props.put("ssl.truststore.type", "JKS");
        } else if (cluster.getSaslMechanism() != null && !cluster.getSaslMechanism().isBlank()) {
            props.put("security.protocol", cluster.isTlsEnabled() ? "SASL_SSL" : "SASL_PLAINTEXT");
            props.put("sasl.mechanism",    cluster.getSaslMechanism());
            String loginModule = cluster.getSaslMechanism().startsWith("SCRAM")
                ? "org.apache.kafka.common.security.scram.ScramLoginModule"
                : "org.apache.kafka.common.security.plain.PlainLoginModule";
            props.put("sasl.jaas.config", loginModule + " required " +
                "username=\"" + cluster.getSaslUsername() + "\" " +
                "password=\"" + cluster.getSaslPassword() + "\";");
        } else if (cluster.isTlsEnabled()) {
            props.put("security.protocol", "SSL");
        }
        return AdminClient.create(props);
    }

    // ─── Topics ──────────────────────────────────────────────────────────────

    public List<TopicDto> listTopics(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var names = admin.listTopics(new ListTopicsOptions().listInternal(false))
                .names().get();
            var descriptions = admin.describeTopics(names).allTopicNames().get();
            return descriptions.values().stream().map(td -> TopicDto.builder()
                .name(td.name())
                .partitions(td.partitions().size())
                .replicationFactor(td.partitions().isEmpty() ? 0 : td.partitions().get(0).replicas().size())
                .build()
            ).sorted(Comparator.comparing(TopicDto::getName)).collect(Collectors.toList());
        } catch (Exception e) {
            throw new RuntimeException(buildErrorMessage(cluster, e), e);
        }
    }

    public void createTopic(KafkaCluster cluster, String name, int partitions, short replication) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            admin.createTopics(List.of(new NewTopic(name, partitions, replication))).all().get();
        } catch (Exception e) {
            throw new RuntimeException(buildErrorMessage(cluster, e), e);
        }
    }

    public void deleteTopic(KafkaCluster cluster, String name) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            admin.deleteTopics(List.of(name)).all().get();
        } catch (Exception e) {
            throw new RuntimeException(buildErrorMessage(cluster, e), e);
        }
    }

    // ─── Topic Config ─────────────────────────────────────────────────────────

    public Map<String, String> getTopicConfig(KafkaCluster cluster, String topicName) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
            var configs  = admin.describeConfigs(List.of(resource)).all().get();
            return configs.get(resource).entries().stream()
                .filter(e -> !e.isDefault())
                .collect(Collectors.toMap(ConfigEntry::name, ConfigEntry::value, (a, b) -> a, TreeMap::new));
        }
    }

    public Map<String, String> getAllTopicConfig(KafkaCluster cluster, String topicName) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
            var configs  = admin.describeConfigs(List.of(resource)).all().get();
            return configs.get(resource).entries().stream()
                .collect(Collectors.toMap(ConfigEntry::name, ConfigEntry::value, (a, b) -> a, TreeMap::new));
        }
    }

    public void updateTopicConfig(KafkaCluster cluster, String topicName, Map<String, String> configs) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
            var entries  = configs.entrySet().stream()
                .map(e -> new ConfigEntry(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
            admin.alterConfigs(Map.of(resource, new Config(entries))).all().get();
        }
    }

    // ─── Consumer Groups ─────────────────────────────────────────────────────

    public List<ConsumerGroupDto> listConsumerGroups(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var groups   = admin.listConsumerGroups().all().get();
            var groupIds = groups.stream().map(ConsumerGroupListing::groupId).collect(Collectors.toList());
            if (groupIds.isEmpty()) return List.of();
            var descriptions = admin.describeConsumerGroups(groupIds).all().get();
            return descriptions.values().stream().map(desc -> ConsumerGroupDto.builder()
                .groupId(desc.groupId()).state(desc.state().toString()).members(desc.members().size()).build()
            ).sorted(Comparator.comparing(ConsumerGroupDto::getGroupId)).collect(Collectors.toList());
        } catch (Exception e) {
            throw new RuntimeException(buildErrorMessage(cluster, e), e);
        }
    }

    public Map<String, Long> getConsumerGroupLag(KafkaCluster cluster, String groupId) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var offsets = admin.listConsumerGroupOffsets(groupId).partitionsToOffsetAndMetadata().get();
            if (offsets.isEmpty()) return Map.of();
            Map<TopicPartition, OffsetSpec> latestRequest = new HashMap<>();
            offsets.keySet().forEach(tp -> latestRequest.put(tp, OffsetSpec.latest()));
            var latestOffsets = admin.listOffsets(latestRequest).all().get();
            Map<String, Long> lag = new LinkedHashMap<>();
            offsets.forEach((tp, om) -> {
                long latest = latestOffsets.get(tp).offset();
                lag.put(tp.topic() + "-" + tp.partition(), Math.max(0, latest - om.offset()));
            });
            return lag;
        }
    }

    // ─── Cluster Health ───────────────────────────────────────────────────────

    public ClusterHealthDto getClusterHealth(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var description = admin.describeCluster();
            var nodes       = description.nodes().get();
            var controller  = description.controller().get();
            var topics      = admin.listTopics().names().get();
            return ClusterHealthDto.builder()
                .brokersCount(nodes.size()).controllerId(controller.id())
                .topicsCount(topics.size()).bootstrapServers(cluster.getBootstrapServers())
                .build();
        } catch (Exception e) {
            throw new RuntimeException(buildErrorMessage(cluster, e), e);
        }
    }

    // ─── Messages — assign direct au lieu de subscribe ────────────────────────

    public List<MessageDto> peekMessages(KafkaCluster cluster, String topic, int maxMessages) throws Exception {
        int limit = Math.min(maxMessages, MAX_MESSAGES_LIMIT);

        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,          cluster.getBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG,                   "kafkamind-peek-" + UUID.randomUUID());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,     "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,   "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,         false);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG,           limit);
        props.put(ConsumerConfig.FETCH_MAX_BYTES_CONFIG,            5 * 1024 * 1024);
        props.put(ConsumerConfig.MAX_PARTITION_FETCH_BYTES_CONFIG,  1024 * 1024);
        props.put(ConsumerConfig.REQUEST_TIMEOUT_MS_CONFIG,         CONNECT_TIMEOUT_MS);

        List<MessageDto> messages = new ArrayList<>();

        try (var admin = buildAdminClient(cluster);
             var consumer = new KafkaConsumer<String, String>(props)) {

            // Récupère toutes les partitions du topic
            var descriptions = admin.describeTopics(List.of(topic)).allTopicNames().get();
            var topicDesc    = descriptions.get(topic);
            if (topicDesc == null) throw new RuntimeException("Topic introuvable : " + topic);

            // Assigne manuellement toutes les partitions — pas de subscribe()
            var partitions = topicDesc.partitions().stream()
                .map(p -> new TopicPartition(topic, p.partition()))
                .collect(Collectors.toList());

            consumer.assign(partitions);

            // Récupère les offsets earliest et latest pour chaque partition
            var beginOffsets = consumer.beginningOffsets(partitions);
            var endOffsets   = consumer.endOffsets(partitions);

            // Calcule le nombre total de messages disponibles
            long totalMessages = endOffsets.entrySet().stream()
                .mapToLong(e -> e.getValue() - beginOffsets.getOrDefault(e.getKey(), 0L))
                .sum();

            if (totalMessages == 0) return List.of(); // topic vide → retour immédiat

            // Positionne sur earliest de chaque partition
            partitions.forEach(tp -> consumer.seek(tp, beginOffsets.getOrDefault(tp, 0L)));

            // Poll jusqu'à avoir le nombre de messages voulus ou épuiser le topic
            long deadline = System.currentTimeMillis() + 8000;
            while (messages.size() < limit && System.currentTimeMillis() < deadline) {
                var records = consumer.poll(Duration.ofMillis(500));
                if (records.isEmpty()) break;
                for (var r : records) {
                    messages.add(MessageDto.builder()
                        .partition(r.partition())
                        .offset(r.offset())
                        .key(r.key())
                        .value(r.value())
                        .timestamp(r.timestamp())
                        .build());
                    if (messages.size() >= limit) break;
                }
            }

        } catch (Exception e) {
            throw new RuntimeException("Erreur lecture messages : " + e.getMessage(), e);
        }

        return messages;
    }

    // ─── Helper erreurs ───────────────────────────────────────────────────────

    private String buildErrorMessage(KafkaCluster cluster, Exception e) {
        String cause = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
        if (cause != null && (cause.contains("Connection refused") || cause.contains("ECONNREFUSED"))) {
            return String.format("Impossible de joindre '%s' sur %s — vérifiez que Kafka est démarré.",
                cluster.getName(), cluster.getBootstrapServers());
        }
        if (cause != null && cause.contains("TimeoutException")) {
            return String.format("Timeout sur '%s' (%s) — réseau ou broker injoignable.",
                cluster.getName(), cluster.getBootstrapServers());
        }
        return "Erreur Kafka : " + (cause != null ? cause : e.getMessage());
    }

    public Object listBrokers(KafkaCluster cluster) throws Exception {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, cluster.getBootstrapServers());

        applySecurityProps(props, cluster); // si tu as déjà cette méthode

        try (AdminClient admin = AdminClient.create(props)) {
            var nodes = admin.describeCluster().nodes().get();

            return nodes.stream().map(node -> Map.of(
                "id", node.id(),
                "host", node.host(),
                "port", node.port(),
                "rack", node.rack()
            )).toList();
        }
    }

    private void applySecurityProps(Properties props, KafkaCluster cluster) {

        // AWS MSK IAM
        if (cluster.isAwsIam()) {
            props.put("security.protocol", "SASL_SSL");
            props.put("sasl.mechanism", "AWS_MSK_IAM");
            props.put("sasl.jaas.config", "software.amazon.msk.auth.iam.IAMLoginModule required;");
            props.put("sasl.client.callback.handler.class",
                    "software.amazon.msk.auth.iam.IAMClientCallbackHandler");
            props.put("ssl.truststore.type", "JKS");
            return;
        }

        // SASL (SCRAM / PLAIN)
        if (cluster.getSaslMechanism() != null && !cluster.getSaslMechanism().isBlank()) {

            props.put("security.protocol",
                    cluster.isTlsEnabled() ? "SASL_SSL" : "SASL_PLAINTEXT");

            props.put("sasl.mechanism", cluster.getSaslMechanism());

            String loginModule =
                    cluster.getSaslMechanism().startsWith("SCRAM")
                            ? "org.apache.kafka.common.security.scram.ScramLoginModule"
                            : "org.apache.kafka.common.security.plain.PlainLoginModule";

            props.put("sasl.jaas.config",
                    loginModule + " required " +
                            "username=\"" + cluster.getSaslUsername() + "\" " +
                            "password=\"" + cluster.getSaslPassword() + "\";");
            return;
        }

        // TLS simple
        if (cluster.isTlsEnabled()) {
            props.put("security.protocol", "SSL");
        }
    }
}