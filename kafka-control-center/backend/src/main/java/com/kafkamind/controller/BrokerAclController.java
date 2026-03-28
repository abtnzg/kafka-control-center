package com.kafkamind.controller;

import com.kafkamind.dto.kafka.AclDto;
import com.kafkamind.model.KafkaCluster;
import com.kafkamind.repository.KafkaClusterRepository;
import com.kafkamind.service.AuthService;
import com.kafkamind.service.BrokerAclService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/clusters")
@RequiredArgsConstructor
public class BrokerAclController {

    private final BrokerAclService brokerAclService;
    private final KafkaClusterRepository clusterRepo;
    private final AuthService authService;

    // ─── Brokers ──────────────────────────────────────────────────────────────

    @GetMapping("/{id}/brokers")
    public ResponseEntity<?> listBrokers(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) throws Exception {
        return ResponseEntity.ok(brokerAclService.listBrokers(getCluster(ud, id)));
    }

    // ─── ACLs ─────────────────────────────────────────────────────────────────

    @GetMapping("/{id}/acls")
    public ResponseEntity<?> listAcls(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id
    ) throws Exception {
        try {
            return ResponseEntity.ok(brokerAclService.listAcls(getCluster(ud, id)));
        } catch (Exception e) {
            // ACLs non supportées sur certains clusters (ex: sans SASL)
            return ResponseEntity.ok(Map.of(
                "warning", "ACLs non disponibles sur ce cluster — vérifiez la configuration authorizer.class.name",
                "acls", java.util.List.of()
            ));
        }
    }

    @PostMapping("/{id}/acls")
    public ResponseEntity<?> createAcl(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @RequestBody AclDto dto
    ) throws Exception {
        brokerAclService.createAcl(getCluster(ud, id), dto);
        return ResponseEntity.status(201).body(Map.of("message", "ACL créée avec succès"));
    }

    @DeleteMapping("/{id}/acls")
    public ResponseEntity<?> deleteAcl(
        @AuthenticationPrincipal UserDetails ud,
        @PathVariable Long id,
        @RequestBody AclDto dto
    ) throws Exception {
        brokerAclService.deleteAcl(getCluster(ud, id), dto);
        return ResponseEntity.ok(Map.of("message", "ACL supprimée avec succès"));
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private KafkaCluster getCluster(UserDetails ud, Long clusterId) {
        var user = authService.getByEmail(ud.getUsername());
        return clusterRepo.findByIdAndOwnerId(clusterId, user.getId())
            .orElseThrow(() -> new RuntimeException("Cluster introuvable ou accès refusé"));
    }
}
