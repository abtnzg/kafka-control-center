from functools import lru_cache
from pathlib import Path
import yaml

from pydantic_settings import BaseSettings
from pydantic import BaseModel


class Settings(BaseSettings):
    app_name: str = "Kafka Control Center API"
    clusters_config_path: str = str(Path(__file__).parent / "clusters.yaml")

    class Config:
        env_file = ".env"


class ClusterConfig(BaseModel):
    id: str
    name: str
    bootstrap_servers: str


@lru_cache
def get_settings() -> Settings:
    return Settings()


@lru_cache
def get_clusters() -> dict[str, ClusterConfig]:
    settings = get_settings()
    with open(settings.clusters_config_path, "r") as f:
        raw = yaml.safe_load(f)

    clusters = {}
    for c in raw.get("clusters", []):
        cfg = ClusterConfig(**c)
        clusters[cfg.id] = cfg
    return clusters


def get_cluster(cluster_id: str) -> ClusterConfig:
    clusters = get_clusters()
    if cluster_id not in clusters:
        raise ValueError(f"Unknown cluster_id: {cluster_id}")
    return clusters[cluster_id]