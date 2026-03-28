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

    // ─── Topics ──────────────────────────────────────────────────────────────

    public List<TopicDto> listTopics(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var names = admin.listTopics(new ListTopicsOptions().listInternal(false)).names().get();
            var descriptions = admin.describeTopics(names).allTopicNames().get();
            return descriptions.values().stream().map(td -> {
                int partitions = td.partitions().size();
                int replication = td.partitions().isEmpty() ? 0 : td.partitions().get(0).replicas().size();
                return TopicDto.builder().name(td.name()).partitions(partitions).replicationFactor(replication).build();
            }).sorted(Comparator.comparing(TopicDto::getName)).collect(Collectors.toList());
        }
    }

    public void createTopic(KafkaCluster cluster, String name, int partitions, short replication) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            admin.createTopics(List.of(new NewTopic(name, partitions, replication))).all().get();
        }
    }

    public void deleteTopic(KafkaCluster cluster, String name) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            admin.deleteTopics(List.of(name)).all().get();
        }
    }

    // ─── Topic Configurations ─────────────────────────────────────────────────

    public Map<String, String> getTopicConfig(KafkaCluster cluster, String topicName) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
            var configs = admin.describeConfigs(List.of(resource)).all().get();
            return configs.get(resource).entries().stream()
                .filter(e -> !e.isDefault())
                .collect(Collectors.toMap(
                    ConfigEntry::name,
                    ConfigEntry::value,
                    (a, b) -> a,
                    TreeMap::new
                ));
        }
    }

    public Map<String, String> getAllTopicConfig(KafkaCluster cluster, String topicName) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
            var configs = admin.describeConfigs(List.of(resource)).all().get();
            return configs.get(resource).entries().stream()
                .collect(Collectors.toMap(
                    ConfigEntry::name,
                    ConfigEntry::value,
                    (a, b) -> a,
                    TreeMap::new
                ));
        }
    }

    public void updateTopicConfig(KafkaCluster cluster, String topicName, Map<String, String> configs) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var resource = new ConfigResource(ConfigResource.Type.TOPIC, topicName);
            var entries = configs.entrySet().stream()
                .map(e -> new ConfigEntry(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
            admin.alterConfigs(Map.of(resource, new Config(entries))).all().get();
        }
    }

    // ─── Consumer Groups ─────────────────────────────────────────────────────

    public List<ConsumerGroupDto> listConsumerGroups(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var groups = admin.listConsumerGroups().all().get();
            var groupIds = groups.stream().map(ConsumerGroupListing::groupId).collect(Collectors.toList());
            var descriptions = admin.describeConsumerGroups(groupIds).all().get();
            return descriptions.values().stream().map(desc -> ConsumerGroupDto.builder()
                .groupId(desc.groupId()).state(desc.state().toString()).members(desc.members().size()).build()
            ).sorted(Comparator.comparing(ConsumerGroupDto::getGroupId)).collect(Collectors.toList());
        }
    }

    public Map<String, Long> getConsumerGroupLag(KafkaCluster cluster, String groupId) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var offsets = admin.listConsumerGroupOffsets(groupId).partitionsToOffsetAndMetadata().get();
            Map<TopicPartition, OffsetSpec> latestRequest = new HashMap<>();
            offsets.keySet().forEach(tp -> latestRequest.put(tp, OffsetSpec.latest()));
            var latestOffsets = admin.listOffsets(latestRequest).all().get();
            Map<String, Long> lag = new HashMap<>();
            offsets.forEach((tp, om) -> {
                long latest = latestOffsets.get(tp).offset();
                lag.put(tp.topic() + "-" + tp.partition(), latest - om.offset());
            });
            return lag;
        }
    }

    // ─── Cluster Health ───────────────────────────────────────────────────────

    public ClusterHealthDto getClusterHealth(KafkaCluster cluster) throws Exception {
        try (var admin = buildAdminClient(cluster)) {
            var description = admin.describeCluster();
            var nodes = description.nodes().get();
            var controller = description.controller().get();
            var topics = admin.listTopics().names().get();
            return ClusterHealthDto.builder()
                .brokersCount(nodes.size()).controllerId(controller.id())
                .topicsCount(topics.size()).bootstrapServers(cluster.getBootstrapServers()).build();
        }
    }

    // ─── Messages ─────────────────────────────────────────────────────────────

    public List<MessageDto> peekMessages(KafkaCluster cluster, String topic, int maxMessages) throws Exception {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, cluster.getBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "kafkamind-peek-" + UUID.randomUUID());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxMessages);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        List<MessageDto> messages = new ArrayList<>();
        try (var consumer = new KafkaConsumer<String, String>(props)) {
            consumer.subscribe(List.of(topic));
            var records = consumer.poll(Duration.ofSeconds(5));
            for (var r : records) {
                messages.add(MessageDto.builder()
                    .partition(r.partition()).offset(r.offset())
                    .key(r.key()).value(r.value()).timestamp(r.timestamp()).build());
                if (messages.size() >= maxMessages) break;
            }
        }
        return messages;
    }
}
