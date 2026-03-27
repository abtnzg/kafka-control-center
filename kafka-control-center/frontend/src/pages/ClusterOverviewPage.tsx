import { useEffect, useState } from "react";
import { clustersApi } from "../api/clusters";
import { TopicsTable } from "../components/topics/TopicsTable";
import { RealtimeMessages } from "../components/messages/RealtimeMessages";

export function ClusterOverviewPage() {
  const [clusterId, setClusterId] = useState<string | null>(null);

  useEffect(() => {
    clustersApi.list().then((clusters) => {
      if (clusters.length > 0) {
        setClusterId(clusters[0].id); // pour l’instant on prend le premier cluster
      }
    });
  }, []);

  if (!clusterId) {
    return <div>Chargement du cluster…</div>;
  }

  return (
    <div className="cluster-overview">
      <h2>Cluster : {clusterId}</h2>

      <section>
        <h3>Topics</h3>
        <TopicsTable clusterId={clusterId} />
      </section>

      <section>
        <RealtimeMessages
          clusterId={clusterId}
          topic="test"
          wsBaseUrl="ws://localhost:8000"
        />
      </section>
    </div>
  );
}