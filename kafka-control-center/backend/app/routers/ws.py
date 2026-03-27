from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from confluent_kafka import Consumer
from app.config import KAFKA_BOOTSTRAP_SERVERS

router = APIRouter()

@router.websocket("/ws/topic/{topic}")
async def topic_stream(websocket: WebSocket, topic: str):
    await websocket.accept()

    consumer = Consumer({
        "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
        "group.id": f"viewer-{topic}",
        "auto.offset.reset": "latest"
    })
    consumer.subscribe([topic])

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg and not msg.error():
                await websocket.send_json({
                    "topic": topic,
                    "partition": msg.partition(),
                    "offset": msg.offset(),
                    "value": msg.value().decode("utf-8")
                })
    except WebSocketDisconnect:
        consumer.close()