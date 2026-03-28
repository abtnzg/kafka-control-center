package com.kafkamind.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class AnthropicService {

    private final WebClient webClient;
    private final String model;
    private final int maxTokens;
    private final boolean enabled;

    private static final String SYSTEM = """
        Tu es KafkaMind, un expert en Apache Kafka et architecture event-driven.
        Tu analyses des clusters Kafka, détectes des anomalies, proposes des optimisations
        et génères du code producer/consumer de qualité production.
        """;

    public AnthropicService(
    @Value("${app.anthropic.api-key:}") String apiKey,
    @Value("${app.anthropic.model}") String model,
    @Value("${app.anthropic.max-tokens}") int maxTokens
    ) {
        // Sécurise la valeur (évite null)
        apiKey = apiKey == null ? "" : apiKey.trim();

        this.model     = model;
        this.maxTokens = maxTokens;

        // IA activée seulement si une clé valide est fournie
        this.enabled = !apiKey.isBlank();

        this.webClient = WebClient.builder()
            .baseUrl("https://api.anthropic.com")
            .defaultHeader("x-api-key", this.enabled ? apiKey : "disabled")
            .defaultHeader("anthropic-version", "2023-06-01")
            .defaultHeader("Content-Type", "application/json")
            .build();
    }

    public String ask(String prompt) {
        if (!enabled) {
            return "⚠️ Fonctionnalité IA désactivée — configure ANTHROPIC_API_KEY pour l'activer.";
        }
        var body = Map.of(
            "model", model,
            "max_tokens", maxTokens,
            "system", SYSTEM,
            "messages", List.of(Map.of("role", "user", "content", prompt))
        );
        var response = webClient.post()
            .uri("/v1/messages")
            .bodyValue(body)
            .retrieve()
            .bodyToMono(Map.class)
            .block();

        if (response == null) throw new RuntimeException("Pas de réponse Anthropic");

        @SuppressWarnings("unchecked")
        var content = (List<Map<String, Object>>) response.get("content");
        return (String) content.get(0).get("text");
    }

    public String analyzeMessages(String topic, String messagesJson) {
        return ask("""
            Analyse ces messages Kafka du topic "%s" :
            %s
            Fournis : structure, anomalies détectées, recommandations.
            """.formatted(topic, messagesJson));
    }

    public String generateHealthReport(String clusterJson, String topicsJson, String groupsJson) {
        return ask("""
            Génère un rapport de santé pour ce cluster Kafka.
            Cluster : %s
            Topics : %s
            Consumer Groups : %s
            Fournis : score santé (0-100), points critiques, optimisations, plan d'action.
            """.formatted(clusterJson, topicsJson, groupsJson));
    }

    public String generateProducer(String topic, String language, String messageSchema) {
        return ask("""
            Génère un Producer Kafka production-ready pour :
            - Topic : %s — Langage : %s — Schéma : %s
            Inclure : gestion erreurs, retry, compression, sérialisation, graceful shutdown.
            """.formatted(topic, language, messageSchema));
    }

    public String generateConsumer(String topic, String groupId, String language) {
        return ask("""
            Génère un Consumer Kafka production-ready pour :
            - Topic : %s — Group : %s — Langage : %s
            Inclure : DLQ, commit manuel, idempotence, monitoring lag, graceful shutdown.
            """.formatted(topic, groupId, language));
    }

    public String detectAnomalies(String lagJson) {
        return ask("""
            Analyse ces données de lag Kafka :
            %s
            Détecte : groupes critiques (lag > 10000), retards croissants, actions correctives.
            """.formatted(lagJson));
    }
}