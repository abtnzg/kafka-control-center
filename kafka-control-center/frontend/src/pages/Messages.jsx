import { useState, useEffect } from "react";
import { topicApi } from "../services/api";
import { Search, Play, ChevronDown } from "lucide-react";

export default function Messages({ cluster }) {
  const [topics,   setTopics]   = useState([]);
  const [topic,    setTopic]    = useState("");
  const [messages, setMessages] = useState([]);
  const [limit,    setLimit]    = useState(20);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!cluster) return;
    topicApi.list(cluster.id).then(r => setTopics(r.data));
  }, [cluster]);

  const fetchMessages = async () => {
    if (!topic) return;
    setLoading(true); setMessages([]);
    try {
      const res = await topicApi.messages(cluster.id, topic, limit);
      setMessages(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const tryJson = (val) => {
    try { return JSON.stringify(JSON.parse(val), null, 2); }
    catch { return val; }
  };

  if (!cluster) return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <p>Sélectionne un cluster</p>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Messages</h1>
        <p className="text-slate-500 text-sm">Visualise les messages de tes topics</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select value={topic} onChange={e => setTopic(e.target.value)}
            className="w-full bg-kafka-surface border border-kafka-border rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition appearance-none">
            <option value="">Sélectionner un topic</option>
            {topics.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <select value={limit} onChange={e => setLimit(Number(e.target.value))}
          className="bg-kafka-surface border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
          {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} messages</option>)}
        </select>
        <button onClick={fetchMessages} disabled={!topic || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
          <Play size={14} />
          {loading ? "Chargement..." : "Lire"}
        </button>
      </div>

      {messages.length === 0 && !loading ? (
        <div className="bg-kafka-surface border border-kafka-border rounded-xl px-5 py-12 text-center text-slate-600">
          {topic ? "Aucun message — clique sur Lire" : "Sélectionne un topic"}
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full px-5 py-3 flex items-center gap-4 hover:bg-kafka-bg/50 transition text-left">
                <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono">
                  P{msg.partition}
                </span>
                <span className="text-xs text-slate-500 font-mono">offset: {msg.offset}</span>
                {msg.key && (
                  <span className="text-xs text-slate-400 font-mono">
                    key: <span className="text-slate-300">{msg.key}</span>
                  </span>
                )}
                <span className="text-xs text-slate-600 ml-auto">
                  {new Date(msg.timestamp).toLocaleString("fr-FR")}
                </span>
                <ChevronDown size={14}
                  className={`text-slate-500 transition-transform ${expanded === i ? "rotate-180" : ""}`} />
              </button>
              {expanded === i && (
                <div className="px-5 pb-4 border-t border-kafka-border">
                  <pre className="mt-3 text-xs text-green-400 bg-kafka-bg rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
                    {tryJson(msg.value) || "(valeur vide)"}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}