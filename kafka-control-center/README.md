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