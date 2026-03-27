from confluent_kafka.admin import AdminClient
from confluent_kafka import Consumer
from app.config import KAFKA_BOOTSTRAP_SERVERS


class KafkaService:
    def __init__(self):
        self.admin = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS})

    def list_topics(self):
        md = self.admin.list_topics(timeout=5)
        return list(md.topics.keys())

    def get_brokers_count(self):
        md = self.admin.list_topics(timeout=5)
        return len(md.brokers)

    def get_consumer_groups(self):
        groups = self.admin.list_groups(timeout=5)
        return [g.id for g in groups]

    def get_topics_details(self):
        md = self.admin.list_topics(timeout=5)
        topics = {}

        for name, topic in md.topics.items():
            partitions = []
            for pid, p in topic.partitions.items():
                partitions.append({
                    "partition": pid,
                    "leader": p.leader,
                    "replicas": p.replicas,
                    "isr": p.isrs,
                })

            topics[name] = {
                "partitions": partitions,
                "error": str(topic.error) if topic.error else None
            }

        return topics

    def get_total_lag(self):
        total_lag = 0
        groups = self.admin.list_groups(timeout=5)
        group_ids = [g.id for g in groups]

        for group_id in group_ids:
            try:
                offsets = self.admin.list_consumer_group_offsets(group_id)
                for tp, offset in offsets.items():
                    consumer = Consumer({
                        "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
                        "group.id": "lag-checker",
                        "enable.auto.commit": False
                    })
                    consumer.assign([tp])
                    pos = consumer.position([tp])[0].offset
                    consumer.close()

                    if pos > offset.offset:
                        total_lag += pos - offset.offset

            except Exception:
                pass

        return total_lag

    def get_throughput(self):
        return 0

    def get_brokers(self):
        md = self.admin.list_topics(timeout=5)

        brokers = []
        for broker in md.brokers.values():
            brokers.append({
                "id": broker.id,
                "host": broker.host,
                "port": broker.port,
                "rack": broker.rack
            })

        return brokers

    def get_consumer_groups_details(self):
        groups = self.admin.list_groups(timeout=5)
        result = []

        for g in groups:
            result.append({
                "group_id": g.id,
                "state": g.state,
                "protocol": g.protocol_type,
                "members": len(g.members)
            })

        return result

    def get_group_lag(self, group_id):
        result = []
        offsets = self.admin.list_consumer_group_offsets(group_id)

        for tp, offset in offsets.items():
            consumer = Consumer({
                "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
                "group.id": "lag-checker",
                "enable.auto.commit": False
            })
            consumer.assign([tp])
            pos = consumer.position([tp])[0].offset
            consumer.close()

            lag = max(0, pos - offset.offset)

            result.append({
                "topic": tp.topic,
                "partition": tp.partition,
                "current_offset": offset.offset,
                "latest_offset": pos,
                "lag": lag
            })

        return result


kafka_service = KafkaService()