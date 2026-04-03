// package com.kafkamind.controller;

// import com.kafkamind.model.KafkaCluster;
// import com.kafkamind.repository.KafkaClusterRepository;
// import com.kafkamind.service.*;
// import lombok.*;
// import org.springframework.http.ResponseEntity;
// import org.springframework.security.core.annotation.AuthenticationPrincipal;
// import org.springframework.security.core.userdetails.UserDetails;
// import org.springframework.web.bind.annotation.*;

// import java.util.Map;

// @RestController
// @RequestMapping("/clusters")
// @RequiredArgsConstructor
// public class KafkaController {

//     private final KafkaService kafkaService;
//     private final KafkaClusterRepository clusterRepo;
//     private final AuthService authService;

//     // ─── Clusters CRUD ────────────────────────────────────────────────────────

//     @GetMapping
//     public ResponseEntity<?> listClusters(@AuthenticationPrincipal UserDetails ud) {
//         var user = authService.getByEmail(ud.getUsername());
//         return ResponseEntity.ok(clusterRepo.findByOwnerIdAndActiveTrue(user.getId()));
//     }

//     @PostMapping
//     public ResponseEntity<?> addCluster(@AuthenticationPrincipal UserDetails ud, @RequestBody ClusterRequest req) {
//         var user = authService.getByEmail(ud.getUsername());
//         var cluster = KafkaCluster.builder()
//             .name(req.name()).bootstrapServers(req.bootstrapServers())
//             .saslMechanism(req.saslMechanism()).saslUsername(req.saslUsername())
//             .saslPassword(req.saslPassword()).schemaRegistryUrl(req.schemaRegistryUrl())
//             .owner(user).build();
//         return ResponseEntity.status(201).body(clusterRepo.save(cluster));
//     }

//     @PutMapping("/{id}")
//     public ResponseEntity<?> updateCluster(@AuthenticationPrincipal UserDetails ud,
//                                             @PathVariable Long id, @RequestBody ClusterRequest req) {
//         var user = authService.getByEmail(ud.getUsername());
//         var cluster = clusterRepo.findByIdAndOwnerId(id, user.getId())
//             .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
//         cluster.setName(req.name());
//         cluster.setBootstrapServers(req.bootstrapServers());
//         cluster.setSaslMechanism(req.saslMechanism());
//         cluster.setSaslUsername(req.saslUsername());
//         if (req.saslPassword() != null) cluster.setSaslPassword(req.saslPassword());
//         cluster.setSchemaRegistryUrl(req.schemaRegistryUrl());
//         return ResponseEntity.ok(clusterRepo.save(cluster));
//     }

//     @DeleteMapping("/{id}")
//     public ResponseEntity<?> deleteCluster(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) {
//         var user = authService.getByEmail(ud.getUsername());
//         var cluster = clusterRepo.findByIdAndOwnerId(id, user.getId())
//             .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
//         cluster.setActive(false);
//         clusterRepo.save(cluster);
//         return ResponseEntity.ok().build();
//     }

//     // ─── Topics ──────────────────────────────────────────────────────────────

//     @GetMapping("/{id}/topics")
//     public ResponseEntity<?> topics(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) throws Exception {
//         return ResponseEntity.ok(kafkaService.listTopics(getCluster(ud, id)));
//     }

//     @PostMapping("/{id}/topics")
//     public ResponseEntity<?> createTopic(@AuthenticationPrincipal UserDetails ud,
//                                           @PathVariable Long id, @RequestBody TopicRequest req) throws Exception {
//         kafkaService.createTopic(getCluster(ud, id), req.name(), req.partitions(), req.replication());
//         return ResponseEntity.status(201).body(Map.of("message", "Topic créé : " + req.name()));
//     }

//     @DeleteMapping("/{id}/topics/{topic}")
//     public ResponseEntity<?> deleteTopic(@AuthenticationPrincipal UserDetails ud,
//                                           @PathVariable Long id, @PathVariable String topic) throws Exception {
//         kafkaService.deleteTopic(getCluster(ud, id), topic);
//         return ResponseEntity.ok(Map.of("message", "Topic supprimé : " + topic));
//     }

//     // ─── Topic Config ─────────────────────────────────────────────────────────

//     @GetMapping("/{id}/topics/{topic}/config")
//     public ResponseEntity<?> getTopicConfig(@AuthenticationPrincipal UserDetails ud,
//                                              @PathVariable Long id, @PathVariable String topic,
//                                              @RequestParam(defaultValue = "false") boolean all) throws Exception {
//         var cluster = getCluster(ud, id);
//         var config = all
//             ? kafkaService.getAllTopicConfig(cluster, topic)
//             : kafkaService.getTopicConfig(cluster, topic);
//         return ResponseEntity.ok(config);
//     }

//     @PutMapping("/{id}/topics/{topic}/config")
//     public ResponseEntity<?> updateTopicConfig(@AuthenticationPrincipal UserDetails ud,
//                                                 @PathVariable Long id, @PathVariable String topic,
//                                                 @RequestBody Map<String, String> configs) throws Exception {
//         kafkaService.updateTopicConfig(getCluster(ud, id), topic, configs);
//         return ResponseEntity.ok(Map.of("message", "Configuration mise à jour"));
//     }

//     // ─── Consumer Groups ─────────────────────────────────────────────────────

//     @GetMapping("/{id}/consumer-groups")
//     public ResponseEntity<?> consumerGroups(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) throws Exception {
//         return ResponseEntity.ok(kafkaService.listConsumerGroups(getCluster(ud, id)));
//     }

//     @GetMapping("/{id}/consumer-groups/{groupId}/lag")
//     public ResponseEntity<?> consumerGroupLag(@AuthenticationPrincipal UserDetails ud,
//                                                @PathVariable Long id, @PathVariable String groupId) throws Exception {
//         return ResponseEntity.ok(kafkaService.getConsumerGroupLag(getCluster(ud, id), groupId));
//     }

//     // ─── Health ──────────────────────────────────────────────────────────────

//     @GetMapping("/{id}/health")
//     public ResponseEntity<?> health(@AuthenticationPrincipal UserDetails ud, @PathVariable Long id) throws Exception {
//         return ResponseEntity.ok(kafkaService.getClusterHealth(getCluster(ud, id)));
//     }

//     // ─── Messages ─────────────────────────────────────────────────────────────

//     @GetMapping("/{id}/topics/{topic}/messages")
//     public ResponseEntity<?> messages(@AuthenticationPrincipal UserDetails ud,
//                                        @PathVariable Long id, @PathVariable String topic,
//                                        @RequestParam(defaultValue = "20") int limit) throws Exception {
//         return ResponseEntity.ok(kafkaService.peekMessages(getCluster(ud, id), topic, limit));
//     }

//     // ─── Helper ──────────────────────────────────────────────────────────────

//     private KafkaCluster getCluster(UserDetails ud, Long clusterId) {
//         var user = authService.getByEmail(ud.getUsername());
//         return clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
//             .orElseThrow(() -> new RuntimeException("Cluster introuvable ou accès refusé"));
//     }

//     record ClusterRequest(String name, String bootstrapServers, String saslMechanism,
//                            String saslUsername, String saslPassword, String schemaRegistryUrl) {}
//     record TopicRequest(String name, int partitions, short replication) {}
// }
package com.kafkamind.controller;

import com.kafkamind.model.KafkaCluster;
import com.kafkamind.repository.KafkaClusterRepository;
import com.kafkamind.service.*;
import lombok.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/clusters")
@RequiredArgsConstructor
public class KafkaController {

    private final KafkaService kafkaService;
    private final KafkaClusterRepository clusterRepo;
    private final AuthService authService;

    @GetMapping
    public ResponseEntity<?> listClusters(@AuthenticationPrincipal UserDetails ud) {
        var user = authService.getByEmail(ud.getUsername());
        return ResponseEntity.ok(clusterRepo.findByOwnerIdAndActiveTrue(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> addCluster(@AuthenticationPrincipal UserDetails ud,
                                         @RequestBody ClusterRequest req) {
        var user = authService.getByEmail(ud.getUsername());
        var cluster = KafkaCluster.builder()
            .name(req.name())
            .bootstrapServers(req.bootstrapServers())
            .saslMechanism(req.saslMechanism())
            .saslUsername(req.saslUsername())
            .saslPassword(req.saslPassword())
            .schemaRegistryUrl(req.schemaRegistryUrl())
            .awsIam(req.awsIam() != null && req.awsIam())
            .awsRegion(req.awsRegion())
            .tlsEnabled(req.tlsEnabled() != null && req.tlsEnabled())
            .owner(user).build();
        return ResponseEntity.status(201).body(clusterRepo.save(cluster));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCluster(@AuthenticationPrincipal UserDetails ud,
                                            @PathVariable Long id, @RequestBody ClusterRequest req) {
        var user = authService.getByEmail(ud.getUsername());
        var cluster = clusterRepo.findByIdAndOwnerId(id, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
        cluster.setName(req.name());
        cluster.setBootstrapServers(req.bootstrapServers());
        cluster.setSaslMechanism(req.saslMechanism());
        cluster.setSaslUsername(req.saslUsername());
        if (req.saslPassword() != null) cluster.setSaslPassword(req.saslPassword());
        cluster.setSchemaRegistryUrl(req.schemaRegistryUrl());
        cluster.setAwsIam(req.awsIam() != null && req.awsIam());
        cluster.setAwsRegion(req.awsRegion());
        cluster.setTlsEnabled(req.tlsEnabled() != null && req.tlsEnabled());
        return ResponseEntity.ok(clusterRepo.save(cluster));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCluster(@AuthenticationPrincipal UserDetails ud,
                                            @PathVariable Long id) {
        var user = authService.getByEmail(ud.getUsername());
        var cluster = clusterRepo.findByIdAndOwnerId(id, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable"));
        cluster.setActive(false);
        clusterRepo.save(cluster);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/topics")
    public ResponseEntity<?> topics(@AuthenticationPrincipal UserDetails ud,
                                     @PathVariable Long id) throws Exception {
        return ResponseEntity.ok(kafkaService.listTopics(getCluster(ud, id)));
    }

    @PostMapping("/{id}/topics")
    public ResponseEntity<?> createTopic(@AuthenticationPrincipal UserDetails ud,
                                          @PathVariable Long id, @RequestBody TopicRequest req) throws Exception {
        kafkaService.createTopic(getCluster(ud, id), req.name(), req.partitions(), req.replication());
        return ResponseEntity.status(201).body(Map.of("message", "Topic créé : " + req.name()));
    }

    @DeleteMapping("/{id}/topics/{topic}")
    public ResponseEntity<?> deleteTopic(@AuthenticationPrincipal UserDetails ud,
                                          @PathVariable Long id, @PathVariable String topic) throws Exception {
        kafkaService.deleteTopic(getCluster(ud, id), topic);
        return ResponseEntity.ok(Map.of("message", "Topic supprimé : " + topic));
    }

    @GetMapping("/{id}/topics/{topic}/config")
    public ResponseEntity<?> getTopicConfig(@AuthenticationPrincipal UserDetails ud,
                                             @PathVariable Long id, @PathVariable String topic,
                                             @RequestParam(defaultValue = "false") boolean all) throws Exception {
        var cluster = getCluster(ud, id);
        return ResponseEntity.ok(all ? kafkaService.getAllTopicConfig(cluster, topic)
                                     : kafkaService.getTopicConfig(cluster, topic));
    }

    @PutMapping("/{id}/topics/{topic}/config")
    public ResponseEntity<?> updateTopicConfig(@AuthenticationPrincipal UserDetails ud,
                                                @PathVariable Long id, @PathVariable String topic,
                                                @RequestBody Map<String, String> configs) throws Exception {
        kafkaService.updateTopicConfig(getCluster(ud, id), topic, configs);
        return ResponseEntity.ok(Map.of("message", "Configuration mise à jour"));
    }

    @GetMapping("/{id}/consumer-groups")
    public ResponseEntity<?> consumerGroups(@AuthenticationPrincipal UserDetails ud,
                                             @PathVariable Long id) throws Exception {
        return ResponseEntity.ok(kafkaService.listConsumerGroups(getCluster(ud, id)));
    }

    @GetMapping("/{id}/consumer-groups/{groupId}/lag")
    public ResponseEntity<?> consumerGroupLag(@AuthenticationPrincipal UserDetails ud,
                                               @PathVariable Long id,
                                               @PathVariable String groupId) throws Exception {
        return ResponseEntity.ok(kafkaService.getConsumerGroupLag(getCluster(ud, id), groupId));
    }

    @GetMapping("/{id}/health")
    public ResponseEntity<?> health(@AuthenticationPrincipal UserDetails ud,
                                     @PathVariable Long id) throws Exception {
        return ResponseEntity.ok(kafkaService.getClusterHealth(getCluster(ud, id)));
    }

    // @GetMapping("/{id}/brokers")
    // public ResponseEntity<?> brokers(@AuthenticationPrincipal UserDetails ud,
    //                                   @PathVariable Long id) throws Exception {
    //     return ResponseEntity.ok(kafkaService.listBrokers(getCluster(ud, id)));
    // }

    @GetMapping("/{id}/topics/{topic}/messages")
    public ResponseEntity<?> messages(@AuthenticationPrincipal UserDetails ud,
                                       @PathVariable Long id, @PathVariable String topic,
                                       @RequestParam(defaultValue = "20") int limit) throws Exception {
        return ResponseEntity.ok(kafkaService.peekMessages(getCluster(ud, id), topic, limit));
    }

    private KafkaCluster getCluster(UserDetails ud, Long clusterId) {
        var user = authService.getByEmail(ud.getUsername());
        return clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable ou accès refusé"));
    }

    record ClusterRequest(
        String name, String bootstrapServers,
        String saslMechanism, String saslUsername, String saslPassword,
        String schemaRegistryUrl,
        Boolean awsIam, String awsRegion, Boolean tlsEnabled
    ) {}
    record TopicRequest(String name, int partitions, short replication) {}
}
