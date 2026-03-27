import { apiClient } from "./client";

export interface Cluster {
  id: string;
  name: string;
  bootstrap_servers: string;
}

export interface ClusterHealth {
  status: "UP" | "DOWN";
  brokers: number;
  topics: number;
  error?: string;
}

export const clustersApi = {
  list: () => apiClient.get<Cluster[]>("/clusters"),
  health: (clusterId: string) =>
    apiClient.get<ClusterHealth>(`/clusters/${clusterId}/health`),
};