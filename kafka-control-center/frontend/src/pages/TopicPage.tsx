import React, { useEffect, useState } from "react";
import TopicTable from "../components/TopicTable";
import { useWebSocket } from "../hooks/useWebSocket";

export default function TopicPage() {
  const messages = useWebSocket("ws://localhost:8000/ws/topic-stream");
  const [summary, setSummary] = useState("");

  async function summarize() {
    const res = await fetch("http://localhost:8000/ai/summarize-topic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages?.slice(0, 20) || []),
    });
    const data = await res.json();
    setSummary(data.summary);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Topic Viewer</h1>

      <button
        onClick={summarize}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded"
      >
        Résumer avec IA
      </button>

      {summary && (
        <div className="bg-slate-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Résumé IA</h2>
          <p className="text-slate-300 whitespace-pre-line">{summary}</p>
        </div>
      )}

      <TopicTable messages={messages || []} />
    </div>
  );
}