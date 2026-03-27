from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.config import get_cluster
from app.core.kafka_consumer import RealtimeConsumer

router = APIRouter()


@router.websocket("/ws/{cluster_id}/topics/{topic}")
async def topic_stream(websocket: WebSocket, cluster_id: str, topic: str):
    await websocket.accept()

    try:
        cluster = get_cluster(cluster_id)
    except ValueError:
        await websocket.close(code=4000)
        return

    consumer = RealtimeConsumer(cluster, topic, group_id=f"viewer-{topic}")

    try:
        async for msg in consumer.stream():
            await websocket.send_json(msg)
    except WebSocketDisconnect:
        consumer.stop()
    finally:
        consumer.stop()