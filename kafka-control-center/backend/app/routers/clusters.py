from fastapi import APIRouter

router = APIRouter(prefix="/clusters", tags=["clusters"])

@router.get("/")
def list_clusters():
    return [{"id": "default", "name": "Local Kafka", "status": "UP"}]
