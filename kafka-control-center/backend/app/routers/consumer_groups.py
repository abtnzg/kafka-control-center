from fastapi import APIRouter
from app.kafka_service import kafka_service

router = APIRouter(prefix="/consumer-groups", tags=["consumer-groups"])

@router.get("")
def list_groups():
    return kafka_service.get_consumer_groups_details()

@router.get("/{group_id}/lag")
def group_lag(group_id: str):
    return kafka_service.get_group_lag(group_id)