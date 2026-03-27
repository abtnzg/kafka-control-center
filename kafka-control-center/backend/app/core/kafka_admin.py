from confluent_kafka.admin import AdminClient
from confluent_kafka import KafkaException
from app.config import ClusterConfig


class KafkaAdminService:
    def __init__(self, cluster: ClusterConfig):
        self.cluster = cluster
        self.admin = AdminClient({"bootstrap.servers": cluster.bootstrap_servers})

    def list_brokers(self) -> list[dict]:
        md = self.admin.list_topics(timeout=5)
        brokers = []
        for b in md.brokers.values():
            brokers.append(
                {
                    "id": b.id,
                    "host": b.host,
                    "port": b.port,
                    "rack": b.rack,
                }
            )
        return brokers

    def list_topics(self) -> list[str]:
        md = self.admin.list_topics(timeout=5)
        return list(md.topics.keys())

    def get_topics_details(self) -> dict:
        md = self.admin.list_topics(timeout=5)
        topics: dict[str, dict] = {}

        for name, topic in md.topics.items():
            partitions = []
            for pid, p in topic.partitions.items():
                partitions.append(
                    {
                        "partition": pid,
                        "leader": p.leader,
                        "replicas": p.replicas,
                        "isr": p.isrs,
                    }
                )

            topics[name] = {
                "name": name,
                "partitions": partitions,
                "error": str(topic.error) if topic.error else None,
            }

        return topics

    def list_consumer_groups(self) -> list[dict]:
        groups = self.admin.list_groups(timeout=5)
        result = []
        for g in groups:
            result.append(
                {
                    "group_id": g.id,
                    "state": g.state,
                    "protocol": g.protocol_type,
                    "members": len(g.members),
                }
            )
        return result

    def get_group_lag(self, group_id: str) -> list[dict]:
        from confluent_kafka import Consumer

        result = []
        try:
            offsets = self.admin.list_consumer_group_offsets(group_id)
        except KafkaException:
            return result

        for tp, offset in offsets.items():
            consumer = Consumer(
                {
                    "bootstrap.servers": self.cluster.bootstrap_servers,
                    "group.id": "lag-checker",
                    "enable.auto.commit": False,
                }
            )
            consumer.assign([tp])
            pos = consumer.position([tp])[0].offset
            consumer.close()

            lag = max(0, pos - offset.offset)

            result.append(
                {
                    "topic": tp.topic,
                    "partition": tp.partition,
                    "current_offset": offset.offset,
                    "latest_offset": pos,
                    "lag": lag,
                }
            )

        return result

    def get_cluster_health(self) -> dict:
        try:
            brokers = self.list_brokers()
            topics = self.list_topics()
            return {
                "status": "UP",
                "brokers": len(brokers),
                "topics": len(topics),
            }
        except Exception as e:
            return {"status": "DOWN", "error": str(e)}