from fastapi import APIRouter, HTTPException
from app.config import get_clusters, get_cluster
from app.core.kafka_admin import KafkaAdminService

router = APIRouter(prefix="/clusters", tags=["clusters"])


@router.get("")
def list_clusters():
    clusters = get_clusters()
    return [
        {"id": c.id, "name": c.name, "bootstrap_servers": c.bootstrap_servers}
        for c in clusters.values()
    ]


@router.get("/{cluster_id}/health")
def cluster_health(cluster_id: str):
    try:
        cluster = get_cluster(cluster_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Cluster not found")

    admin = KafkaAdminService(cluster)
    return admin.get_cluster_health()