import asyncio
from confluent_kafka import Consumer
from app.config import ClusterConfig


class RealtimeConsumer:
    def __init__(self, cluster: ClusterConfig, topic: str, group_id: str):
        self.cluster = cluster
        self.topic = topic
        self.group_id = group_id
        self._consumer = Consumer(
            {
                "bootstrap.servers": cluster.bootstrap_servers,
                "group.id": group_id,
                "auto.offset.reset": "latest",
            }
        )
        self._consumer.subscribe([topic])
        self._running = True

    async def stream(self):
        try:
            while self._running:
                msg = self._consumer.poll(0.5)
                if msg is None:
                    await asyncio.sleep(0.1)
                    continue
                if msg.error():
                    continue
                yield {
                    "topic": self.topic,
                    "partition": msg.partition(),
                    "offset": msg.offset(),
                    "value": msg.value().decode("utf-8"),
                }
        finally:
            self._consumer.close()

    def stop(self):
        self._running = False