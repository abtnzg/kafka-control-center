package com.kafkamind.service;

import com.kafkamind.dto.kafka.MessageDto;
import com.kafkamind.model.KafkaCluster;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.TopicPartition;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MessageActionService {

    private static final int MAX_MESSAGES = 1000;
    private static final int TIMEOUT_MS   = 8000;

    // ─── Replay ──────────────────────────────────────────────────────────────

    public List<MessageDto> replay(KafkaCluster cluster, String topic,
                                    String startFrom, int limit) throws Exception {
        limit = Math.min(limit, MAX_MESSAGES);
        Properties props = buildConsumerProps(cluster);
        try (var consumer = new KafkaConsumer<String, String>(props)) {
            var partitions = getPartitions(consumer, topic);
            consumer.assign(partitions);
            if (startFrom.startsWith("ts:")) {
                long ts = Long.parseLong(startFrom.substring(3));
                Map<TopicPartition, Long> tsMap = new HashMap<>();
                partitions.forEach(tp -> tsMap.put(tp, ts));
                var offsetsForTs = consumer.offsetsForTimes(tsMap);
                offsetsForTs.forEach((tp, om) -> {
                    if (om != null) consumer.seek(tp, om.offset());
                    else consumer.seekToEnd(List.of(tp));
                });
            } else if (startFrom.equals("earliest")) {
                consumer.seekToBeginning(partitions);
            } else if (startFrom.equals("latest")) {
                consumer.seekToEnd(partitions);
            } else {
                long offset = Long.parseLong(startFrom);
                partitions.forEach(tp -> consumer.seek(tp, offset));
            }
            return pollMessages(consumer, limit);
        }
    }

    // ─── Produire ─────────────────────────────────────────────────────────────

    public void produce(KafkaCluster cluster, String topic,
                         String key, String value, Map<String, String> headers) throws Exception {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,      cluster.getBootstrapServers());
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,   "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.ACKS_CONFIG,                   "all");
        addSasl(props, cluster);
        try (var producer = new KafkaProducer<String, String>(props)) {
            var record = new ProducerRecord<>(topic, key, value);
            if (headers != null) {
                headers.forEach((k, v) -> record.headers().add(k, v.getBytes()));
            }
            var meta = producer.send(record).get();
            log.info("Message produit → {}:{} offset={}", topic, meta.partition(), meta.offset());
        }
    }

    // ─── DLQ ─────────────────────────────────────────────────────────────────

    public List<MessageDto> getDlqMessages(KafkaCluster cluster, String topic, int limit) throws Exception {
        String dlqTopic = resolveDlqTopic(cluster, topic);
        return peekFromTopic(cluster, dlqTopic, limit);
    }

    public List<String> listDlqTopics(KafkaCluster cluster) throws Exception {
        Properties props = buildConsumerProps(cluster);
        try (var consumer = new KafkaConsumer<String, String>(props)) {
            return consumer.listTopics().keySet().stream()
                .filter(t -> t.contains(".dlq") || t.contains("-dlq") ||
                             t.contains(".DLQ") || t.contains("-DLQ") ||
                             t.contains("dead-letter") || t.contains("deadletter"))
                .sorted().collect(Collectors.toList());
        }
    }

    // ─── Recherche avec Regex ─────────────────────────────────────────────────

    public SearchResult search(KafkaCluster cluster, String topic,
                                String query, boolean useRegex,
                                int page, int pageSize) throws Exception {
        List<MessageDto> all = peekFromTopic(cluster, topic, MAX_MESSAGES);
        List<MessageDto> filtered;

        if (useRegex) {
            try {
                Pattern pattern = Pattern.compile(query, Pattern.CASE_INSENSITIVE);
                filtered = all.stream().filter(m -> {
                    String val = m.getValue() != null ? m.getValue() : "";
                    String key = m.getKey()   != null ? m.getKey()   : "";
                    return pattern.matcher(val).find() || pattern.matcher(key).find();
                }).collect(Collectors.toList());
            } catch (PatternSyntaxException e) {
                throw new IllegalArgumentException("Expression régulière invalide : " + e.getMessage());
            }
        } else {
            String q = query.toLowerCase();
            filtered = all.stream().filter(m -> {
                String val = m.getValue() != null ? m.getValue().toLowerCase() : "";
                String key = m.getKey()   != null ? m.getKey().toLowerCase()   : "";
                return val.contains(q) || key.contains(q);
            }).collect(Collectors.toList());
        }

        int total      = filtered.size();
        int totalPages = pageSize > 0 ? (int) Math.ceil((double) total / pageSize) : 1;
        int from       = Math.min(page * pageSize, total);
        int to         = Math.min(from + pageSize, total);
        List<MessageDto> pageData = filtered.subList(from, to);

        return new SearchResult(pageData, total, page, totalPages, pageSize, query, useRegex);
    }

    public record SearchResult(
        List<MessageDto> messages,
        int total, int page, int totalPages,
        int pageSize, String query, boolean regex
    ) {}

    // ─── Export ───────────────────────────────────────────────────────────────

    public String exportCsv(KafkaCluster cluster, String topic, int limit) throws Exception {
        List<MessageDto> messages = peekFromTopic(cluster, topic, limit);
        StringBuilder sb = new StringBuilder();
        sb.append("partition,offset,timestamp,key,value\n");
        for (var m : messages) {
            sb.append(m.getPartition()).append(",")
              .append(m.getOffset()).append(",")
              .append(m.getTimestamp()).append(",")
              .append(escapeCsv(m.getKey())).append(",")
              .append(escapeCsv(m.getValue())).append("\n");
        }
        return sb.toString();
    }

    public List<MessageDto> exportJson(KafkaCluster cluster, String topic, int limit) throws Exception {
        return peekFromTopic(cluster, topic, limit);
    }

    // ─── Validation schéma ────────────────────────────────────────────────────

    public List<ValidationResult> validateSchema(KafkaCluster cluster, String topic,
                                                   String schema, int limit) throws Exception {
        List<MessageDto> messages = peekFromTopic(cluster, topic, limit);
        return messages.stream().map(m -> validateJsonMessage(m, schema)).collect(Collectors.toList());
    }

    public record ValidationResult(long offset, int partition, boolean valid, String error, String value) {}

    private ValidationResult validateJsonMessage(MessageDto m, String schema) {
        String value = m.getValue();
        if (value == null || value.isBlank())
            return new ValidationResult(m.getOffset(), m.getPartition(), false, "Message vide", value);
        value = value.trim();
        if (!value.startsWith("{") && !value.startsWith("["))
            return new ValidationResult(m.getOffset(), m.getPartition(), false, "Pas un JSON valide", value);
        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.readTree(value);
            if (schema != null && !schema.isBlank()) {
                var schemaNode = mapper.readTree(schema);
                var msgNode    = mapper.readTree(value);
                if (schemaNode.has("required")) {
                    for (var req : schemaNode.get("required")) {
                        String field = req.asText();
                        if (!msgNode.has(field))
                            return new ValidationResult(m.getOffset(), m.getPartition(),
                                false, "Champ manquant : " + field, value);
                    }
                }
            }
            return new ValidationResult(m.getOffset(), m.getPartition(), true, null, value);
        } catch (Exception e) {
            return new ValidationResult(m.getOffset(), m.getPartition(),
                false, "JSON invalide : " + e.getMessage(), value);
        }
    }

    // ─── Lecture paginée ──────────────────────────────────────────────────────

    public PagedMessages getPagedMessages(KafkaCluster cluster, String topic,
                                           int page, int pageSize) throws Exception {
        pageSize = Math.min(pageSize, 100);
        int offset = page * pageSize;
        int needed = offset + pageSize;

        Properties props = buildConsumerProps(cluster);
        try (var adminConsumer = new KafkaConsumer<String, String>(props)) {
            var partitions  = getPartitions(adminConsumer, topic);
            var endOffsets  = adminConsumer.endOffsets(partitions);
            long totalMsgs  = endOffsets.values().stream().mapToLong(Long::longValue).sum();

            int totalPages  = pageSize > 0 ? (int) Math.ceil((double) totalMsgs / pageSize) : 1;

            List<MessageDto> all = peekFromTopic(cluster, topic, needed);
            int from = Math.min(offset, all.size());
            int to   = Math.min(offset + pageSize, all.size());
            List<MessageDto> pageData = all.subList(from, to);

            return new PagedMessages(pageData, totalMsgs, page, totalPages, pageSize);
        }
    }

    public record PagedMessages(
        List<MessageDto> messages,
        long total, int page, int totalPages, int pageSize
    ) {}

    // ─── Helpers ─────────────────────────────────────────────────────────────

    public List<MessageDto> peekFromTopic(KafkaCluster cluster, String topic, int limit) throws Exception {
        Properties props = buildConsumerProps(cluster);
        try (var consumer = new KafkaConsumer<String, String>(props)) {
            var partitions   = getPartitions(consumer, topic);
            consumer.assign(partitions);
            var beginOffsets = consumer.beginningOffsets(partitions);
            var endOffsets   = consumer.endOffsets(partitions);
            long total = endOffsets.entrySet().stream()
                .mapToLong(e -> e.getValue() - beginOffsets.getOrDefault(e.getKey(), 0L)).sum();
            if (total == 0) return List.of();
            partitions.forEach(tp -> consumer.seek(tp, beginOffsets.getOrDefault(tp, 0L)));
            return pollMessages(consumer, limit);
        }
    }

    private List<MessageDto> pollMessages(KafkaConsumer<String, String> consumer, int limit) {
        List<MessageDto> messages = new ArrayList<>();
        long deadline = System.currentTimeMillis() + TIMEOUT_MS;
        while (messages.size() < limit && System.currentTimeMillis() < deadline) {
            var records = consumer.poll(Duration.ofMillis(500));
            if (records.isEmpty()) break;
            for (var r : records) {
                messages.add(MessageDto.builder()
                    .partition(r.partition()).offset(r.offset())
                    .key(r.key()).value(r.value()).timestamp(r.timestamp())
                    .build());
                if (messages.size() >= limit) break;
            }
        }
        return messages;
    }

    private List<TopicPartition> getPartitions(KafkaConsumer<String, String> consumer, String topic) {
        return consumer.partitionsFor(topic).stream()
            .map(pi -> new TopicPartition(topic, pi.partition()))
            .collect(Collectors.toList());
    }

    private String resolveDlqTopic(KafkaCluster cluster, String topic) throws Exception {
        Properties props = buildConsumerProps(cluster);
        try (var consumer = new KafkaConsumer<String, String>(props)) {
            var allTopics = consumer.listTopics().keySet();
            for (String suffix : List.of(".dlq", "-dlq", ".DLQ", "-DLQ", "-dead-letter"))
                if (allTopics.contains(topic + suffix)) return topic + suffix;
        }
        return topic + ".dlq";
    }

    private Properties buildConsumerProps(KafkaCluster cluster) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,         cluster.getBootstrapServers());
        props.put(ConsumerConfig.GROUP_ID_CONFIG,                  "kafkamind-action-" + UUID.randomUUID());
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,    "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,  "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,        false);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG,          MAX_MESSAGES);
        props.put(ConsumerConfig.REQUEST_TIMEOUT_MS_CONFIG,        3000);
        addSasl(props, cluster);
        return props;
    }

    private void addSasl(Properties props, KafkaCluster cluster) {
        if (cluster.getSaslMechanism() != null) {
            props.put("security.protocol", "SASL_SSL");
            props.put("sasl.mechanism", cluster.getSaslMechanism());
            props.put("sasl.jaas.config",
                "org.apache.kafka.common.security.plain.PlainLoginModule required " +
                "username=\"" + cluster.getSaslUsername() + "\" " +
                "password=\"" + cluster.getSaslPassword() + "\";");
        }
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n"))
            return "\"" + val.replace("\"", "\"\"") + "\"";
        return val;
    }
}
