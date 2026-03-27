import { useEffect, useState } from "react";
import { Cluster, clustersApi } from "../api/clusters";

export function useClusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clustersApi
      .list()
      .then(setClusters)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { clusters, loading, error };
}