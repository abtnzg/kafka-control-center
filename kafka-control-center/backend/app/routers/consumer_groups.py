from fastapi import APIRouter, HTTPException
from app.config import get_cluster
from app.core.kafka_admin import KafkaAdminService

router = APIRouter(
    prefix="/clusters/{cluster_id}/consumer-groups", tags=["consumer-groups"]
)


@router.get("")
def list_consumer_groups(cluster_id: str):
    try:
        cluster = get_cluster(cluster_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Cluster not found")

    admin = KafkaAdminService(cluster)
    return admin.list_consumer_groups()


@router.get("/{group_id}/lag")
def group_lag(cluster_id: str, group_id: str):
    try:
        cluster = get_cluster(cluster_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Cluster not found")

    admin = KafkaAdminService(cluster)
    return admin.get_group_lag(group_id)