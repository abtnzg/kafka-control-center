import { useWebSocket } from "../../hooks/useWebSocket";

interface Props {
  clusterId: string;
  topic: string;
  wsBaseUrl: string;
}

export function RealtimeMessages({ clusterId, topic, wsBaseUrl }: Props) {
  const url = `${wsBaseUrl}/ws/${clusterId}/topics/${topic}`;
  const { messages, connected } = useWebSocket(url);

  return (
    <div>
      <h3>Messages en temps réel — {topic}</h3>
      <div>Status : {connected ? "🟢 connecté" : "🔴 déconnecté"}</div>

      <div className="messages">
        {messages.map((m, i) => (
          <div key={i}>
            <strong>[{m.partition}@{m.offset}]</strong> {m.value}
          </div>
        ))}
      </div>
    </div>
  );
}