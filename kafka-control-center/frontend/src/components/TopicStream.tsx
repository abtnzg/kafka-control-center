// src/components/TopicStream.jsx
import React, { useEffect, useState } from "react";

export default function TopicStream({ topic }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!topic) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/topic/${topic}`);

    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      setMessages(prev => [msg, ...prev].slice(0, 100)); // garder les 100 derniers
    };

    ws.onclose = () => {
      console.log("WebSocket fermé");
    };

    return () => ws.close();
  }, [topic]);

  if (!topic) return <div>Sélectionne un topic pour voir les messages.</div>;

  return (
    <div>
      <h2>Messages en temps réel — {topic}</h2>
      <ul>
        {messages.map((m, idx) => (
          <li key={idx}>
            [{m.partition}@{m.offset}] {m.value}
          </li>
        ))}
      </ul>
    </div>
  );
}