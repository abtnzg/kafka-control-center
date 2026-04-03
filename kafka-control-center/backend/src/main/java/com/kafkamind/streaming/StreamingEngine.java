// package com.kafkamind.streaming;

// import com.kafkamind.model.KafkaCluster;
// import com.kafkamind.model.StreamPipeline;
// import com.kafkamind.repository.KafkaClusterRepository;
// import com.kafkamind.repository.StreamPipelineRepository;
// import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
// import org.apache.kafka.clients.consumer.*;
// import org.apache.kafka.clients.producer.*;
// import org.apache.kafka.common.TopicPartition;
// import org.springframework.stereotype.Service;

// import jakarta.annotation.PreDestroy;
// import java.time.Duration;
// import java.time.LocalDateTime;
// import java.util.*;
// import java.util.concurrent.*;

// @Service
// @RequiredArgsConstructor
// @Slf4j
// public class StreamingEngine {

//     private final StreamPipelineRepository pipelineRepo;
//     private final KafkaClusterRepository   clusterRepo;

//     // Map pipelineId → thread en cours
//     private final Map<Long, Future<?>>       runningTasks = new ConcurrentHashMap<>();
//     private final Map<Long, PipelineMetrics> metrics      = new ConcurrentHashMap<>();
//     private final ExecutorService            executor     = Executors.newCachedThreadPool();

//     // ─── Démarrer un pipeline ─────────────────────────────────────────────────

//     public void start(StreamPipeline pipeline) {
//         if (runningTasks.containsKey(pipeline.getId())) {
//             throw new IllegalStateException("Pipeline déjà en cours d'exécution");
//         }

//         var sourceCluster = clusterRepo.findById(pipeline.getSourceClusterId())
//             .orElseThrow(() -> new RuntimeException("Cluster source introuvable"));
//         var destCluster = clusterRepo.findById(pipeline.getDestClusterId())
//             .orElseThrow(() -> new RuntimeException("Cluster destination introuvable"));

//         var pipelineMetrics = new PipelineMetrics();
//         metrics.put(pipeline.getId(), pipelineMetrics);

//         pipeline.setStatus(StreamPipeline.PipelineStatus.RUNNING);
//         pipelineRepo.save(pipeline);

//         Future<?> task = executor.submit(() ->
//             runPipeline(pipeline, sourceCluster, destCluster, pipelineMetrics)
//         );
//         runningTasks.put(pipeline.getId(), task);
//         log.info("Pipeline {} démarré : {}:{} → {}:{}",
//             pipeline.getId(), sourceCluster.getName(), pipeline.getSourceTopic(),
//             destCluster.getName(), pipeline.getDestTopic());
//     }

//     // ─── Arrêter un pipeline ──────────────────────────────────────────────────

//     public void stop(Long pipelineId) {
//         Future<?> task = runningTasks.remove(pipelineId);
//         if (task != null) {
//             task.cancel(true);
//         }
//         metrics.remove(pipelineId);
//         pipelineRepo.findById(pipelineId).ifPresent(p -> {
//             p.setStatus(StreamPipeline.PipelineStatus.STOPPED);
//             pipelineRepo.save(p);
//         });
//         log.info("Pipeline {} arrêté", pipelineId);
//     }

//     public void pause(Long pipelineId) {
//         pipelineRepo.findById(pipelineId).ifPresent(p -> {
//             p.setStatus(StreamPipeline.PipelineStatus.PAUSED);
//             pipelineRepo.save(p);
//         });
//     }

//     // ─── Boucle principale du pipeline ───────────────────────────────────────

//     private void runPipeline(StreamPipeline pipeline, KafkaCluster source,
//                               KafkaCluster dest, PipelineMetrics m) {
//         String consumerGroupId = "kafkamind-stream-" + pipeline.getId();

//         try (
//             KafkaConsumer<String, String> consumer = buildConsumer(source, consumerGroupId);
//             KafkaProducer<String, String> producer = buildProducer(dest, pipeline.getGuarantee())
//         ) {
//             consumer.subscribe(List.of(pipeline.getSourceTopic()));

//             // Positionnement offset initial
//             configureStartOffset(consumer, pipeline);

//             long lastMetricUpdate = System.currentTimeMillis();

//             while (!Thread.currentThread().isInterrupted()) {
//                 // Si pipeline en pause → attente
//                 var current = pipelineRepo.findById(pipeline.getId()).orElse(null);
//                 if (current == null || current.getStatus() == StreamPipeline.PipelineStatus.STOPPED) break;
//                 if (current.getStatus() == StreamPipeline.PipelineStatus.PAUSED) {
//                     Thread.sleep(1000);
//                     continue;
//                 }

//                 var records = consumer.poll(Duration.ofMillis(500));

//                 for (ConsumerRecord<String, String> record : records) {
//                     try {
//                         // Filtrage optionnel
//                         if (!shouldTransfer(record, pipeline)) {
//                             m.getFiltered().incrementAndGet();
//                             continue;
//                         }

//                         // Transformation optionnelle
//                         String value = transform(record.value(), pipeline);

//                         // Envoi vers destination
//                         var outRecord = new ProducerRecord<>(
//                             pipeline.getDestTopic(),
//                             record.partition() % getDestPartitions(producer, pipeline.getDestTopic()),
//                             record.key(),
//                             value
//                         );

//                         if (pipeline.getGuarantee() == StreamPipeline.DeliveryGuarantee.EXACTLY_ONCE) {
//                             try {
//                                 producer.initTransactions();
//                                 producer.beginTransaction();

//                                 producer.send(outRecord);

//                                 producer.commitTransaction();
//                             } catch (Exception e) {
//                                 producer.abortTransaction();
//                                 m.getErrors().incrementAndGet();
//                                 m.setLastError(e.getMessage());
//                                 log.error("Transaction Kafka échouée pipeline {}: {}", pipeline.getId(), e.getMessage());
//                             }
//                         } else {
//                             producer.send(outRecord, (meta, ex) -> {
//                                 if (ex != null) {
//                                     m.getErrors().incrementAndGet();
//                                     m.setLastError(ex.getMessage());
//                                     log.error("Erreur envoi message pipeline {}: {}", pipeline.getId(), ex.getMessage());
//                                 }
//                             });
//                         }

//                         m.getTransferred().incrementAndGet();
//                         m.setLastMessageTs(record.timestamp());

//                     } catch (Exception e) {
//                         m.getErrors().incrementAndGet();
//                         m.setLastError(e.getMessage());
//                         log.error("Erreur traitement message pipeline {}: {}", pipeline.getId(), e.getMessage());
//                     }
//                 }

//                 // Commit offset (at-least-once)
//                 if (pipeline.getGuarantee() == StreamPipeline.DeliveryGuarantee.AT_LEAST_ONCE) {
//                     consumer.commitSync();
//                 }

//                 // Mise à jour métriques toutes les 5s
//                 if (System.currentTimeMillis() - lastMetricUpdate > 5000) {
//                     m.updateThroughput();
//                     updatePipelineStats(pipeline.getId(), m);
//                     lastMetricUpdate = System.currentTimeMillis();
//                 }
//             }

//         } catch (InterruptedException e) {
//             Thread.currentThread().interrupt();
//             log.info("Pipeline {} interrompu", pipeline.getId());
//         } catch (Exception e) {
//             log.error("Erreur pipeline {}: {}", pipeline.getId(), e.getMessage());
//             pipelineRepo.findById(pipeline.getId()).ifPresent(p -> {
//                 p.setStatus(StreamPipeline.PipelineStatus.ERROR);
//                 pipelineRepo.save(p);
//             });
//         } finally {
//             runningTasks.remove(pipeline.getId());
//         }
//     }

//     // ─── Configuration offset de départ ──────────────────────────────────────

//     private void configureStartOffset(KafkaConsumer<String, String> consumer, StreamPipeline pipeline) {
//         if (pipeline.getStartOffset() == null || pipeline.getStartOffset().equals("latest")) {
//             consumer.poll(Duration.ofMillis(100));
//             consumer.seekToEnd(consumer.assignment());
//         } else if (pipeline.getStartOffset().equals("earliest")) {
//             consumer.poll(Duration.ofMillis(100));
//             consumer.seekToBeginning(consumer.assignment());
//         } else {
//             // Offset numérique par partition
//             try {
//                 long offset = Long.parseLong(pipeline.getStartOffset());
//                 consumer.poll(Duration.ofMillis(100));
//                 for (TopicPartition tp : consumer.assignment()) {
//                     consumer.seek(tp, offset);
//                 }
//             } catch (NumberFormatException e) {
//                 log.warn("Offset invalide '{}', utilisation de latest", pipeline.getStartOffset());
//             }
//         }
//     }

//     // ─── Filtrage ─────────────────────────────────────────────────────────────

//     private boolean shouldTransfer(ConsumerRecord<String, String> record, StreamPipeline pipeline) {
//         if (pipeline.getFilterExpression() == null || pipeline.getFilterExpression().isBlank()) return true;
//         String expr = pipeline.getFilterExpression().trim();
//         String value = record.value() != null ? record.value() : "";
//         // Filtres simples : contains, key match, JSON field
//         if (expr.startsWith("contains:"))  return value.contains(expr.substring(9).trim());
//         if (expr.startsWith("key:"))       return expr.substring(4).trim().equals(record.key());
//         if (expr.startsWith("not:"))       return !value.contains(expr.substring(4).trim());
//         return true;
//     }

//     // ─── Transformation ───────────────────────────────────────────────────────

//     private String transform(String value, StreamPipeline pipeline) {
//         if (pipeline.getTransformScript() == null || pipeline.getTransformScript().isBlank()) return value;
//         // Transformations simples configurables
//         String script = pipeline.getTransformScript().trim();
//         if (script.startsWith("addField:")) {
//             // ex: addField:{"source":"kafkamind"}
//             String field = script.substring(9).trim();
//             if (value != null && value.trim().endsWith("}")) {
//                 return value.trim().substring(0, value.trim().length() - 1) + "," + field + "}";
//             }
//         }
//         if (script.startsWith("prefix:")) {
//             return script.substring(7).trim() + value;
//         }
//         return value;
//     }

//     // ─── Helper : nb partitions destination ──────────────────────────────────

//     private int getDestPartitions(KafkaProducer<String, String> producer, String topic) {
//         try {
//             return producer.partitionsFor(topic).size();
//         } catch (Exception e) {
//             return 1;
//         }
//     }

//     // ─── Mise à jour stats en base ────────────────────────────────────────────

//     private void updatePipelineStats(Long pipelineId, PipelineMetrics m) {
//         pipelineRepo.findById(pipelineId).ifPresent(p -> {
//             p.setMessagesTransferred(m.getTransferred().get());
//             p.setMessagesFiltered(m.getFiltered().get());
//             p.setErrors(m.getErrors().get());
//             if (m.getLastMessageTs() > 0)
//                 p.setLastMessageAt(LocalDateTime.now());
//             pipelineRepo.save(p);
//         });
//     }

//     // ─── Builders Consumer/Producer ──────────────────────────────────────────

//     private KafkaConsumer<String, String> buildConsumer(KafkaCluster cluster, String groupId) {
//         Properties props = new Properties();
//         props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,       cluster.getBootstrapServers());
//         props.put(ConsumerConfig.GROUP_ID_CONFIG,                groupId);
//         props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,  "org.apache.kafka.common.serialization.StringDeserializer");
//         props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringDeserializer");
//         props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG,       "latest");
//         props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,      false);
//         props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG,        500);
//         props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG,      30000);
//         addSasl(props, cluster);
//         return new KafkaConsumer<>(props);
//     }

//     private KafkaProducer<String, String> buildProducer(KafkaCluster cluster,
//                                                          StreamPipeline.DeliveryGuarantee guarantee) {
//         Properties props = new Properties();
//         props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,       cluster.getBootstrapServers());
//         props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,    "org.apache.kafka.common.serialization.StringSerializer");
//         props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,  "org.apache.kafka.common.serialization.StringSerializer");
//         props.put(ProducerConfig.ACKS_CONFIG,                    "all");
//         props.put(ProducerConfig.RETRIES_CONFIG,                 3);
//         props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG,        "lz4");
//         props.put(ProducerConfig.LINGER_MS_CONFIG,               5);
//         props.put(ProducerConfig.BATCH_SIZE_CONFIG,              65536);
//         if (guarantee == StreamPipeline.DeliveryGuarantee.EXACTLY_ONCE) {
//             props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG,  true);
//             props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG,    "kafkamind-tx-" + UUID.randomUUID());
//         }
//         addSasl(props, cluster);
//         return new KafkaProducer<>(props);
//     }

//     private void addSasl(Properties props, KafkaCluster cluster) {
//         if (cluster.getSaslMechanism() != null) {
//             props.put("security.protocol", "SASL_SSL");
//             props.put("sasl.mechanism", cluster.getSaslMechanism());
//             props.put("sasl.jaas.config",
//                 "org.apache.kafka.common.security.plain.PlainLoginModule required " +
//                 "username=\"" + cluster.getSaslUsername() + "\" " +
//                 "password=\"" + cluster.getSaslPassword() + "\";");
//         }
//     }

//     // ─── Métriques publiques ──────────────────────────────────────────────────

//     public PipelineMetrics getMetrics(Long pipelineId) {
//         return metrics.get(pipelineId);
//     }

//     public boolean isRunning(Long pipelineId) {
//         return runningTasks.containsKey(pipelineId);
//     }

//     @PreDestroy
//     public void shutdown() {
//         runningTasks.keySet().forEach(this::stop);
//         executor.shutdown();
//     }
// }


package com.kafkamind.streaming;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kafkamind.model.KafkaCluster;
import com.kafkamind.model.StreamPipeline;
import com.kafkamind.repository.KafkaClusterRepository;
import com.kafkamind.repository.StreamPipelineRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.consumer.*;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.TopicPartition;
import org.springframework.stereotype.Service;

import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StreamingEngine {

    private final StreamPipelineRepository pipelineRepo;
    private final KafkaClusterRepository   clusterRepo;
    private final ObjectMapper             mapper = new ObjectMapper();

    private final Map<Long, Future<?>>       runningTasks = new ConcurrentHashMap<>();
    private final Map<Long, PipelineMetrics> metrics      = new ConcurrentHashMap<>();
    private final ExecutorService            executor     = Executors.newCachedThreadPool();

    public void start(StreamPipeline pipeline) {
        if (runningTasks.containsKey(pipeline.getId()))
            throw new IllegalStateException("Pipeline déjà en cours d'exécution");
        var source = clusterRepo.findById(pipeline.getSourceClusterId())
            .orElseThrow(() -> new RuntimeException("Cluster source introuvable"));
        var dest = clusterRepo.findById(pipeline.getDestClusterId())
            .orElseThrow(() -> new RuntimeException("Cluster destination introuvable"));
        var m = new PipelineMetrics();
        metrics.put(pipeline.getId(), m);
        pipeline.setStatus(StreamPipeline.PipelineStatus.RUNNING);
        pipelineRepo.save(pipeline);
        Future<?> task = executor.submit(() -> runPipeline(pipeline, source, dest, m));
        runningTasks.put(pipeline.getId(), task);
        log.info("Pipeline {} démarré : {}:{} -> {}:{}",
            pipeline.getId(), source.getName(), pipeline.getSourceTopic(),
            dest.getName(), pipeline.getDestTopic());
    }

    public void stop(Long id) {
        Future<?> task = runningTasks.remove(id);
        if (task != null) task.cancel(true);
        metrics.remove(id);
        pipelineRepo.findById(id).ifPresent(p -> {
            p.setStatus(StreamPipeline.PipelineStatus.STOPPED);
            pipelineRepo.save(p);
        });
    }

    public void pause(Long id) {
        pipelineRepo.findById(id).ifPresent(p -> {
            p.setStatus(StreamPipeline.PipelineStatus.PAUSED);
            pipelineRepo.save(p);
        });
    }

    private void runPipeline(StreamPipeline pipeline, KafkaCluster source,
                              KafkaCluster dest, PipelineMetrics m) {
        String groupId = "kafkamind-stream-" + pipeline.getId();
        try (var consumer = buildConsumer(source, groupId);
             var producer = buildProducer(dest, pipeline.getGuarantee())) {

            // FIX 1 — assign() via AdminClient = synchrone, seek() immédiat garanti
            List<TopicPartition> partitions = getPartitionsViaAdmin(source, pipeline.getSourceTopic());
            if (partitions.isEmpty()) {
                // fallback subscribe + attente
                consumer.subscribe(List.of(pipeline.getSourceTopic()));
                long deadline = System.currentTimeMillis() + 10_000;
                while (consumer.assignment().isEmpty() && System.currentTimeMillis() < deadline) {
                    consumer.poll(Duration.ofMillis(200));
                }
            } else {
                consumer.assign(partitions);
            }

            // FIX 2 — positionnement correct (reprise ou départ)
            positionConsumer(consumer, pipeline);

            long lastMetricUpdate = System.currentTimeMillis();
            long lastOffsetSave   = System.currentTimeMillis();
            Map<Integer, Long> currentOffsets = new HashMap<>();

            while (!Thread.currentThread().isInterrupted()) {
                var current = pipelineRepo.findById(pipeline.getId()).orElse(null);
                if (current == null || current.getStatus() == StreamPipeline.PipelineStatus.STOPPED) break;
                if (current.getStatus() == StreamPipeline.PipelineStatus.PAUSED) {
                    Thread.sleep(1000);
                    continue;
                }

                var records = consumer.poll(Duration.ofMillis(500));

                for (var record : records) {
                    try {
                        if (!shouldTransfer(record, pipeline)) {
                            m.getFiltered().incrementAndGet();
                            continue;
                        }
                        String value = transform(record.value(), pipeline);
                        int destParts = getDestPartitions(producer, pipeline.getDestTopic());
                        var out = new ProducerRecord<>(
                            pipeline.getDestTopic(),
                            record.partition() % destParts,
                            record.key(), value);
                        if (pipeline.getGuarantee() == StreamPipeline.DeliveryGuarantee.EXACTLY_ONCE) {
                            producer.send(out).get();
                        } else {
                            producer.send(out, (meta, ex) -> {
                                if (ex != null) { m.getErrors().incrementAndGet(); m.setLastError(ex.getMessage()); }
                            });
                        }
                        m.getTransferred().incrementAndGet();
                        m.setLastMessageTs(record.timestamp());
                        currentOffsets.put(record.partition(), record.offset());
                    } catch (Exception e) {
                        m.getErrors().incrementAndGet();
                        m.setLastError(e.getMessage());
                    }
                }

                if (!records.isEmpty() && pipeline.getGuarantee() == StreamPipeline.DeliveryGuarantee.AT_LEAST_ONCE)
                    consumer.commitSync();

                long now = System.currentTimeMillis();
                // FIX 3 — sauvegarde offset toutes les 5s
                if (now - lastOffsetSave > 5000 && !currentOffsets.isEmpty()) {
                    persistOffsets(pipeline.getId(), currentOffsets, m);
                    lastOffsetSave = now;
                }
                if (now - lastMetricUpdate > 5000) {
                    m.updateThroughput();
                    lastMetricUpdate = now;
                }
            }

            if (!currentOffsets.isEmpty()) persistOffsets(pipeline.getId(), currentOffsets, m);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.error("Erreur pipeline {}: {}", pipeline.getId(), e.getMessage(), e);
            pipelineRepo.findById(pipeline.getId()).ifPresent(p -> {
                p.setStatus(StreamPipeline.PipelineStatus.ERROR);
                pipelineRepo.save(p);
            });
        } finally {
            runningTasks.remove(pipeline.getId());
        }
    }

    // FIX 1 — partitions via AdminClient (synchrone)
    private List<TopicPartition> getPartitionsViaAdmin(KafkaCluster cluster, String topic) {
        try {
            Properties props = new Properties();
            props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG,      cluster.getBootstrapServers());
            props.put(AdminClientConfig.REQUEST_TIMEOUT_MS_CONFIG,     5000);
            props.put(AdminClientConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, 8000);
            applySecurityProps(props, cluster);
            try (var admin = AdminClient.create(props)) {
                var desc = admin.describeTopics(List.of(topic)).allTopicNames().get();
                var td = desc.get(topic);
                if (td == null) return List.of();
                return td.partitions().stream()
                    .map(p -> new TopicPartition(topic, p.partition()))
                    .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("AdminClient partitions ko pour {} : {}", topic, e.getMessage());
            return List.of();
        }
    }

    // FIX 2 — positionnement avec reprise lastOffsets
    private void positionConsumer(KafkaConsumer<String, String> consumer, StreamPipeline pipeline) {
        if (pipeline.getLastOffsets() != null && !pipeline.getLastOffsets().isBlank()) {
            try {
                Map<String, Long> saved = mapper.readValue(pipeline.getLastOffsets(), new TypeReference<>() {});
                boolean ok = true;
                for (var tp : consumer.assignment()) {
                    String key = String.valueOf(tp.partition());
                    if (saved.containsKey(key)) {
                        consumer.seek(tp, saved.get(key) + 1);
                        log.info("Pipeline {} reprise P{} @ offset {}", pipeline.getId(), tp.partition(), saved.get(key)+1);
                    } else { ok = false; }
                }
                if (ok) return;
            } catch (Exception e) {
                log.warn("Restauration offsets impossible : {}", e.getMessage());
            }
        }
        // Premier démarrage
        String start = pipeline.getStartOffset();
        if ("earliest".equals(start)) {
            consumer.seekToBeginning(consumer.assignment());
            log.info("Pipeline {} -> earliest (historique inclus)", pipeline.getId());
        } else if (start == null || "latest".equals(start)) {
            consumer.seekToEnd(consumer.assignment());
            log.info("Pipeline {} -> latest (nouveaux msgs seulement)", pipeline.getId());
        } else {
            try {
                long off = Long.parseLong(start);
                consumer.assignment().forEach(tp -> consumer.seek(tp, off));
            } catch (NumberFormatException e) {
                consumer.seekToEnd(consumer.assignment());
            }
        }
    }

    // FIX 3 — persistance offsets
    private void persistOffsets(Long id, Map<Integer, Long> offsets, PipelineMetrics m) {
        pipelineRepo.findById(id).ifPresent(p -> {
            try {
                final Map<String, Long> saved =
                    (p.getLastOffsets() != null && !p.getLastOffsets().isBlank())
                        ? new HashMap<>(mapper.readValue(p.getLastOffsets(), new TypeReference<>() {}))
                        : new HashMap<>();

                offsets.forEach((part, off) -> saved.put(String.valueOf(part), off));

                p.setLastOffsets(mapper.writeValueAsString(saved));
                p.setMessagesTransferred(m.getTransferred().get());
                p.setMessagesFiltered(m.getFiltered().get());
                p.setErrors(m.getErrors().get());

                if (m.getLastMessageTs() > 0) {
                    p.setLastMessageAt(LocalDateTime.now());
                }

                pipelineRepo.save(p);

            } catch (Exception e) {
                log.warn("Persistance offsets ko pipeline {} : {}", id, e.getMessage());
            }
        });
    }

    private boolean shouldTransfer(ConsumerRecord<String, String> record, StreamPipeline pipeline) {
        if (pipeline.getFilterExpression() == null || pipeline.getFilterExpression().isBlank()) return true;
        String expr = pipeline.getFilterExpression().trim();
        String val  = record.value() != null ? record.value() : "";
        if (expr.startsWith("contains:")) return val.contains(expr.substring(9).trim());
        if (expr.startsWith("key:"))      return expr.substring(4).trim().equals(record.key());
        if (expr.startsWith("not:"))      return !val.contains(expr.substring(4).trim());
        return true;
    }

    private String transform(String value, StreamPipeline pipeline) {
        if (pipeline.getTransformScript() == null || pipeline.getTransformScript().isBlank()) return value;
        String s = pipeline.getTransformScript().trim();
        if (s.startsWith("addField:") && value != null && value.trim().endsWith("}"))
            return value.trim().substring(0, value.trim().length()-1) + "," + s.substring(9).trim() + "}";
        if (s.startsWith("prefix:")) return s.substring(7).trim() + value;
        return value;
    }

    private int getDestPartitions(KafkaProducer<String, String> p, String topic) {
        try { return p.partitionsFor(topic).size(); } catch (Exception e) { return 1; }
    }

    private KafkaConsumer<String, String> buildConsumer(KafkaCluster cluster, String groupId) {
        Properties p = new Properties();
        p.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,        cluster.getBootstrapServers());
        p.put(ConsumerConfig.GROUP_ID_CONFIG,                 groupId);
        p.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,   "org.apache.kafka.common.serialization.StringDeserializer");
        p.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringDeserializer");
        p.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG,        "latest");
        p.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,       false);
        p.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG,         500);
        p.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG,       30000);
        p.put(ConsumerConfig.REQUEST_TIMEOUT_MS_CONFIG,       10000);
        applySecurityProps(p, cluster);
        return new KafkaConsumer<>(p);
    }

    private KafkaProducer<String, String> buildProducer(KafkaCluster cluster,
                                                          StreamPipeline.DeliveryGuarantee guarantee) {
        Properties p = new Properties();
        p.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,      cluster.getBootstrapServers());
        p.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,   "org.apache.kafka.common.serialization.StringSerializer");
        p.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");
        p.put(ProducerConfig.ACKS_CONFIG,                   "all");
        p.put(ProducerConfig.RETRIES_CONFIG,                3);
        p.put(ProducerConfig.COMPRESSION_TYPE_CONFIG,       "lz4");
        p.put(ProducerConfig.LINGER_MS_CONFIG,              5);
        p.put(ProducerConfig.BATCH_SIZE_CONFIG,             65536);
        p.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG,     10000);
        if (guarantee == StreamPipeline.DeliveryGuarantee.EXACTLY_ONCE) {
            p.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
            p.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG,   "kafkamind-tx-" + UUID.randomUUID());
        }
        applySecurityProps(p, cluster);
        return new KafkaProducer<>(p);
    }

    // FIX 4 — sécurité unifiée : local / SASL / TLS / AWS IAM MSK
    private void applySecurityProps(Properties props, KafkaCluster cluster) {
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
            String module = cluster.getSaslMechanism().startsWith("SCRAM")
                ? "org.apache.kafka.common.security.scram.ScramLoginModule"
                : "org.apache.kafka.common.security.plain.PlainLoginModule";
            props.put("sasl.jaas.config", module + " required " +
                "username=\"" + cluster.getSaslUsername() + "\" " +
                "password=\"" + cluster.getSaslPassword() + "\";");
        } else if (cluster.isTlsEnabled()) {
            props.put("security.protocol", "SSL");
        }
    }

    public PipelineMetrics getMetrics(Long id) { return metrics.get(id); }
    public boolean isRunning(Long id)           { return runningTasks.containsKey(id); }

    @PreDestroy
    public void shutdown() { runningTasks.keySet().forEach(this::stop); executor.shutdown(); }
}
