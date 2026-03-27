import { useEffect, useState } from "react";

export function useWebSocket(url: string) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        setData(JSON.parse(event.data));
      } catch {
        setData(event.data);
      }
    };

    return () => ws.close();
  }, [url]);

  return data;
}