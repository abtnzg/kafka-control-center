from fastapi import APIRouter
from app.kafka_service import kafka_service

router = APIRouter(prefix="/topics", tags=["topics"])

@router.get("/details")
def topic_details():
    return kafka_service.get_topics_details()