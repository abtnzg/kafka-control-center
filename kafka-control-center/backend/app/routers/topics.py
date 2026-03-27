from fastapi import APIRouter, HTTPException
from app.config import get_cluster
from app.core.kafka_admin import KafkaAdminService

router = APIRouter(prefix="/clusters/{cluster_id}/topics", tags=["topics"])


@router.get("")
def list_topics(cluster_id: str):
    try:
        cluster = get_cluster(cluster_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Cluster not found")

    admin = KafkaAdminService(cluster)
    return {"topics": admin.list_topics()}


@router.get("/details")
def topics_details(cluster_id: str):
    try:
        cluster = get_cluster(cluster_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Cluster not found")

    admin = KafkaAdminService(cluster)
    return admin.get_topics_details()