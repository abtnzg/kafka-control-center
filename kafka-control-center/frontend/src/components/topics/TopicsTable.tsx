import { useEffect, useState } from "react";
import { topicsApi, TopicDetails } from "../../api/topics";

interface Props {
  clusterId: string;
}

export function TopicsTable({ clusterId }: Props) {
  const [topics, setTopics] = useState<TopicDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    topicsApi.details(clusterId).then((data) => {
      const list = Object.values(data).filter(
        (t) => !t.name.startsWith("__") // on cache __consumer_offsets
      );
      setTopics(list);
      setLoading(false);
    });
  }, [clusterId]);

  if (loading) return <div>Chargement des topics…</div>;

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Topic</th>
          <th>Partitions</th>
          <th>Leaders</th>
          <th>Replicas</th>
          <th>ISR</th>
        </tr>
      </thead>
      <tbody>
        {topics.map((t) => {
          const leaders = [...new Set(t.partitions.map((p) => p.leader))];
          const replicas = [...new Set(t.partitions.flatMap((p) => p.replicas))];
          const isr = [...new Set(t.partitions.flatMap((p) => p.isr))];

          return (
            <tr key={t.name}>
              <td>{t.name}</td>
              <td>{t.partitions.length}</td>
              <td>{leaders.join(", ")}</td>
              <td>{replicas.join(", ")}</td>
              <td>{isr.join(", ")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}