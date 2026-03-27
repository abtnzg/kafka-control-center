from fastapi import APIRouter
from app.kafka_service import kafka_service

router = APIRouter(prefix="/brokers", tags=["brokers"])

@router.get("")
def list_brokers():
    return kafka_service.get_brokers()