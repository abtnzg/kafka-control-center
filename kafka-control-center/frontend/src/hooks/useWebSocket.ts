import { useEffect, useRef, useState } from "react";

export function useWebSocket<T = unknown>(url: string | null) {
  const [messages, setMessages] = useState<T[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        setMessages((prev) => [data, ...prev].slice(0, 200));
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
  }, [url]);

  return { messages, connected };
}