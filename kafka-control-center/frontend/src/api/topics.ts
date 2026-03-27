import { apiClient } from "./client";

export interface TopicPartition {
  partition: number;
  leader: number;
  replicas: number[];
  isr: number[];
}

export interface TopicDetails {
  name: string;
  partitions: TopicPartition[];
  error: string | null;
}

export const topicsApi = {
  list: (clusterId: string) =>
    apiClient.get<{ topics: string[] }>(`/clusters/${clusterId}/topics`),
  details: (clusterId: string) =>
    apiClient.get<Record<string, TopicDetails>>(
      `/clusters/${clusterId}/topics/details`
    ),
};