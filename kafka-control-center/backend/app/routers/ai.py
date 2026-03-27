from fastapi import APIRouter
from app.ai_service import summarize_topic_sample

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/summarize-topic")
def summarize_topic(messages: list[str]):
    summary = summarize_topic_sample(messages)
    return {"summary": summary}
