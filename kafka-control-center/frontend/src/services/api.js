import axios from "axios";

const api = axios.create({ baseURL: "" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("km_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("km_token");
      localStorage.removeItem("km_user");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  register: (email, password) => api.post("/auth/register", { email, password }),
  login:    (email, password) => api.post("/auth/login",    { email, password }),
  me:       ()                => api.get("/auth/me"),
};

export const clusterApi = {
  list:      ()         => api.get("/clusters"),
  add:       (data)     => api.post("/clusters", data),
  update:    (id, data) => api.put(`/clusters/${id}`, data),
  remove:    (id)       => api.delete(`/clusters/${id}`),
  health:    (id)       => api.get(`/clusters/${id}/health`),
  brokers:   (id)       => api.get(`/clusters/${id}/brokers`),
  listAcls:  (id)       => api.get(`/clusters/${id}/acls`),
  createAcl: (id, data) => api.post(`/clusters/${id}/acls`, data),
  deleteAcl: (id, data) => api.delete(`/clusters/${id}/acls`, { data }),
};

export const topicApi = {
  list:         (cid)               => api.get(`/clusters/${cid}/topics`),
  create:       (cid, data)         => api.post(`/clusters/${cid}/topics`, data),
  remove:       (cid, topic)        => api.delete(`/clusters/${cid}/topics/${topic}`),
  messages:     (cid, topic, limit) => api.get(`/clusters/${cid}/topics/${topic}/messages?limit=${limit}`),
  getConfig:    (cid, topic, all)   => api.get(`/clusters/${cid}/topics/${topic}/config?all=${all}`),
  updateConfig: (cid, topic, data)  => api.put(`/clusters/${cid}/topics/${topic}/config`, data),
};

export const messageApi = {
  pagedMessages:  (cid, topic, page, pageSize) =>
    api.get(`/clusters/${cid}/topics/${topic}/messages/paged?page=${page}&pageSize=${pageSize}`),
  replay:         (cid, topic, startFrom, limit) =>
    api.post(`/clusters/${cid}/topics/${topic}/replay`, { startFrom, limit }),
  produce:        (cid, topic, key, value, headers) =>
    api.post(`/clusters/${cid}/topics/${topic}/produce`, { key, value, headers }),
  listDlq:        (cid)                    => api.get(`/clusters/${cid}/dlq`),
  getDlqMessages: (cid, topic, limit)      => api.get(`/clusters/${cid}/topics/${topic}/dlq?limit=${limit}`),
  search:         (cid, topic, q, regex, page, pageSize) =>
    api.get(`/clusters/${cid}/topics/${topic}/search?q=${encodeURIComponent(q)}&regex=${regex}&page=${page}&pageSize=${pageSize}`),
  exportCsv:      (cid, topic, limit)      =>
    api.get(`/clusters/${cid}/topics/${topic}/export?format=csv&limit=${limit}`, { responseType: "text" }),
  exportJson:     (cid, topic, limit)      =>
    api.get(`/clusters/${cid}/topics/${topic}/export?format=json&limit=${limit}`),
  validate:       (cid, topic, schema, limit) =>
    api.post(`/clusters/${cid}/topics/${topic}/validate`, { schema, limit }),
};

export const groupApi = {
  list: (cid)          => api.get(`/clusters/${cid}/consumer-groups`),
  lag:  (cid, groupId) => api.get(`/clusters/${cid}/consumer-groups/${groupId}/lag`),
};

export const streamApi = {
  list:              ()         => api.get("/streaming"),
  create:            (data)     => api.post("/streaming", data),
  update:            (id, data) => api.put(`/streaming/${id}`, data),
  delete:            (id)       => api.delete(`/streaming/${id}`),
  duplicate:         (id)       => api.post(`/streaming/${id}/duplicate`),
  start:             (id)       => api.post(`/streaming/${id}/start`),
  stop:              (id)       => api.post(`/streaming/${id}/stop`),
  pause:             (id)       => api.post(`/streaming/${id}/pause`),
  metrics:           (id)       => api.get(`/streaming/${id}/metrics`),
  topicsForCluster:  (clusterId)=> api.get(`/streaming/cluster-topics/${clusterId}`),
};

export const aiApi = {
  health:    (clusterId) => api.post("/ai/health-report",     { clusterId }),
  analyze:   (data)      => api.post("/ai/analyze-messages",  data),
  generate:  (data)      => api.post(data.type === "producer" ? "/ai/generate-producer" : "/ai/generate-consumer", data),
  anomalies: (clusterId) => api.post("/ai/detect-anomalies",  { clusterId }),
};

export default api;
