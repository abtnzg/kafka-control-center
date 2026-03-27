from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import clusters, topics, ai, ws  # <--- IMPORTANT

app = FastAPI(title="Kafka Control Center API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clusters.router)
app.include_router(topics.router)
app.include_router(ai.router)
app.include_router(ws.router)  # <--- IMPORTANT

from app.routers import brokers, consumer_groups, topics, ws

app.include_router(brokers.router)
app.include_router(consumer_groups.router)
app.include_router(topics.router)
app.include_router(ws.router)