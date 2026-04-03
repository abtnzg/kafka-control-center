 TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@kafkamind.com","password":"kafkamind123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:8080/api/clusters   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "Local Dev",
    "bootstrapServers": "localhost:9092",
    "schemaRegistryUrl": "http://localhost:8081"
  }'



  ____________________________________________________________________________________
  docker exec -it kafka bash -c '

echo "🚀 === SETUP KAFKA CLUSTER TEST ==="

echo "📦 Création des topics..."
kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists \
  --topic test-topic --partitions 3 --replication-factor 1

kafka-topics --bootstrap-server localhost:9092 --create --if-not-exists \
  --topic user-events --partitions 2 --replication-factor 1

echo ""
echo "📋 Liste des topics :"
kafka-topics --bootstrap-server localhost:9092 --list

echo ""
echo "📄 Description du topic test-topic :"
kafka-topics --bootstrap-server localhost:9092 --describe --topic test-topic

echo ""
echo "📤 Production de messages dans test-topic..."
echo -e "hello\nkafka\nfrom\ndocker" | \
kafka-console-producer --bootstrap-server localhost:9092 --topic test-topic

echo ""
echo "📥 Consommation (depuis le début)..."
timeout 5 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --from-beginning

echo ""
echo "👥 Consommation avec consumer group (my-group)..."
timeout 5 kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --group my-group \
  --from-beginning

echo ""
echo "📊 Description du consumer group :"
kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --describe \
  --group my-group

echo ""
echo "🏁 === FIN ==="
'
______________TEST STREAMING________________
###############
# Entre dans le conteneur Kafka
docker exec -it kafka-control-center-kafka-1 bash

# Crée le topic source
kafka-topics --bootstrap-server localhost:9092 \
  --create --topic stream-source \
  --partitions 3 --replication-factor 1

# Crée le topic destination
kafka-topics --bootstrap-server localhost:9092 \
  --create --topic stream-destination \
  --partitions 3 --replication-factor 1

# Vérifie que les 2 topics existent
kafka-topics --bootstrap-server localhost:9092 --list | grep stream

exit
```

---

### Étape 2 — Créer le pipeline dans l'IHM

Ouvre **http://localhost:5173/streaming** → clique **"Nouveau pipeline"** et remplis :
```
Nom             : Test sync même cluster
Description     : Sync stream-source → stream-destination
Cluster source  : Local Dev
Topic source    : stream-source
Cluster dest    : Local Dev       ← même cluster !
Topic dest      : stream-destination
Mode            : Réplication
Garantie        : At-least-once
Offset départ   : earliest
Filtre          : (vide)
Transform       : (vide)

# Terminal 1 — Producteur dans stream-source
docker exec -it kafka-control-center-kafka-1 \
  kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic stream-source

# Tape ces messages un par un (Entrée après chaque) :
{"id":"1","event":"order.placed","amount":99.99,"userId":"alice"}
{"id":"2","event":"user.created","email":"bob@test.com"}
{"id":"3","event":"payment.success","orderId":"ORD-001","amount":149.0}
{"id":"4","event":"order.shipped","trackingId":"TR-XYZ","userId":"alice"}
{"id":"5","event":"user.login","userId":"charlie","ip":"192.168.1.1"}

# Ctrl+C pour quitter

# Terminal 2 — Consommateur sur stream-destination
docker exec -it kafka-control-center-kafka-1 \
  kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic stream-destination \
  --from-beginning \
  --max-messages 5
```

Tu dois voir les **5 mêmes messages** apparaître.

---

### Étape 6 — Vérifier dans l'IHM KafkaMind

Va sur **Messages** → sélectionne `stream-destination` → clique **Lire**

Tu dois voir les 5 messages répliqués.

---

### Étape 7 — Test avec filtre

Modifie ou crée un 2ème pipeline avec un filtre :
```
Topic source  : stream-source
Topic dest    : stream-orders-only
Filtre        : contains:order


cat > ~/messages-test.json << 'EOF'
{"id":"1","event":"order.placed","amount":99.99,"userId":"alice","timestamp":"2026-03-29T10:00:00Z"}
{"id":"2","event":"user.created","email":"bob@test.com","timestamp":"2026-03-29T10:01:00Z"}
{"id":"3","event":"payment.success","orderId":"ORD-001","amount":149.0,"timestamp":"2026-03-29T10:02:00Z"}
{"id":"4","event":"order.shipped","trackingId":"TR-XYZ","userId":"alice","timestamp":"2026-03-29T10:03:00Z"}
{"id":"5","event":"user.login","userId":"charlie","ip":"192.168.1.1","timestamp":"2026-03-29T10:04:00Z"}
{"id":"6","event":"order.placed","amount":299.0,"userId":"bob","timestamp":"2026-03-29T10:05:00Z"}
{"id":"7","event":"payment.failed","reason":"insufficient_funds","userId":"charlie","timestamp":"2026-03-29T10:06:00Z"}
{"id":"8","event":"order.cancelled","orderId":"ORD-002","userId":"alice","timestamp":"2026-03-29T10:07:00Z"}
{"id":"9","event":"user.logout","userId":"bob","timestamp":"2026-03-29T10:08:00Z"}
{"id":"10","event":"order.placed","amount":49.99,"userId":"alice","timestamp":"2026-03-29T10:09:00Z"}
EOF
echo "Fichier créé : $(wc -l < ~/messages-test.json) messages"

# Copie le fichier dans le conteneur
docker cp ~/messages-test.json kafka-control-center-kafka-1:/tmp/messages-test.json


# Méthode correcte — exécute la redirection DANS le conteneur
docker exec kafka-control-center-kafka-1 \
  bash -c "kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic stream-source < /tmp/messages-test.json"

echo "Messages envoyés !"
_________________________________________________________________________________________
ubuntu@ali:~/kafka-control-center/kafka-control-center$ python3 -c "
import json, random
events = ['order.placed','user.created','payment.success','order.shipped','user.login','payment.failed']
users  = ['alice','bob','charlie','diana','eve']
for i in range(1, 100001):
    print(json.dumps({'id':str(i),'event':random.choice(events),'userId':random.choice(users),'amount':round(random.uniform(10,500),2)}))
" > ~/messages-100000.json
ubuntu@ali:~/kafka-control-center/kafka-control-center$ docker cp ~/messages-1000.json kafka-control-center-kafka-1:/tmp/messages-1000.json
Successfully copied 7.79MB to kafka-control-center-kafka-1:/tmp/messages-1000.json
ubuntu@ali:~/kafka-control-center/kafka-control-center$ docker exec kafka-control-center-kafka-1 \
  bash -c "kafka-console-producer \
  --bootstrap-server localhost:9092 \
  --topic stream-source < /tmp/messages-1000.json"
ubuntu@ali:~/kafka-control-center/kafka-control-center$
_____________________________________________________________________________________________________
______________________________________________________________________________________________________
Voici le détail des actions les plus impactantes par profil :
## Profil Métier / Dev — à implémenter en priorité
# Replay 
— rejouer des messages depuis un offset précis ou une date. Cas réel : un bug en production a mal traité des commandes, on rejoue les 2 dernières heures pour recorriger sans reprise manuelle.
# Produire manuellement 
— injecter un message depuis l'IHM sans écrire de code. Cas réel : les équipes QA peuvent tester un consumer sans passer par un dev.
# DLQ Viewer 
— visualiser et rejouer les messages en dead letter queue. Cas réel : une banque doit traiter manuellement les virements rejetés.
# Export CSV/JSON 
— exporter un échantillon de messages. Cas réel : le métier veut analyser les commandes du jour dans Excel.
## Profil DSI / Ops
# Diff topics 
— comparer les messages entre source et destination après migration. Cas réel : valider qu'aucun message n'a été perdu lors d'une migration Blue/Green.
# Latence end-to-end 
— mesurer le délai entre production et consommation. Cas réel : SLA contractuel de traitement < 500ms à démontrer.
# Purge ciblée 
— supprimer des messages par clé ou plage de timestamps. Cas réel : un client demande la suppression de ses données RGPD dans les événements.
## Profil Conformité / RSSI
# Masquage RGPD 
— anonymiser les champs PII (email, téléphone, IBAN) à la volée avant affichage. Cas réel : obligation légale dans tous les secteurs.
# Audit log 
— tracer qui a lu quel message et quand. Cas réel : exigence PCI-DSS pour les données de paiement.
# Rétention légale 
— configurer automatiquement la rétention à 7 ans pour la comptabilité, 5 ans pour la banque.