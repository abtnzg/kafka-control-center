import { useState } from "react";
import { aiApi } from "../services/api";
import { Brain, Zap, Code, Activity, AlertTriangle } from "lucide-react";

const TABS = [
  { id: "health",   label: "Health Report",  icon: Activity },
  { id: "analyze",  label: "Analyse messages", icon: Brain },
  { id: "generate", label: "Génération code", icon: Code },
  { id: "anomalies",label: "Anomalies",       icon: AlertTriangle },
];

export default function AiAssistant({ cluster }) {
  const [tab,      setTab]      = useState("health");
  const [result,   setResult]   = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // Analyze form
  const [topic,    setTopic]    = useState("");
  const [limit,    setLimit]    = useState(20);

  // Generate form
  const [genTopic,    setGenTopic]    = useState("");
  const [genGroupId,  setGenGroupId]  = useState("my-group");
  const [genLang,     setGenLang]     = useState("Java");
  const [genType,     setGenType]     = useState("producer");
  const [genSchema,   setGenSchema]   = useState('{"id": "string", "value": "number"}');

  const run = async () => {
    if (!cluster) { setError("Sélectionne un cluster d'abord"); return; }
    setError(""); setResult(""); setLoading(true);
    try {
      let res;
      if (tab === "health") {
        res = await aiApi.health(cluster.id);
        setResult(res.data.report);
      } else if (tab === "analyze") {
        res = await aiApi.analyze({ clusterId: cluster.id, topic, limit });
        setResult(res.data.analysis);
      } else if (tab === "generate") {
        if (genType === "producer") {
          res = await aiApi.generate({ type: "producer", topic: genTopic, language: genLang, schema: genSchema });
        } else {
          res = await aiApi.generate({ type: "consumer", topic: genTopic, groupId: genGroupId, language: genLang });
        }
        setResult(res.data.code);
      } else if (tab === "anomalies") {
        res = await aiApi.analyze({ type: "anomalies", clusterId: cluster.id });
        setResult(res.data.anomalies);
      }
    } catch (e) {
      setError(e.response?.data?.error || "Erreur IA");
    } finally {
      setLoading(false);
    }
  };

  if (!cluster) return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <p>Sélectionne un cluster d'abord</p>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-kafka-accent/20 border border-kafka-accent/30 flex items-center justify-center">
          <Brain size={18} className="text-kafka-accent" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">IA Assistant</h1>
          <p className="text-slate-500 text-sm">Propulsé par Claude — {cluster.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setResult(""); setError(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === id
                ? "bg-kafka-accent text-white"
                : "bg-kafka-surface border border-kafka-border text-slate-400 hover:text-white hover:bg-kafka-bg"
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="bg-kafka-surface border border-kafka-border rounded-xl p-5 space-y-4">

        {tab === "health" && (
          <p className="text-slate-400 text-sm">
            Analyse complète de ton cluster — topics, consumer groups, santé, recommandations et plan d'action.
          </p>
        )}

        {tab === "analyze" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nom du topic</label>
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="mon-topic"
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nombre de messages</label>
              <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        )}

        {tab === "generate" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {["producer", "consumer"].map(t => (
                <button key={t} onClick={() => setGenType(t)}
                  className={`px-4 py-2 rounded-lg text-sm transition ${
                    genType === t ? "bg-kafka-accent text-white" : "bg-kafka-bg border border-kafka-border text-slate-400 hover:text-white"
                  }`}>
                  {t === "producer" ? "🚀 Producer" : "📥 Consumer"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Topic</label>
                <input value={genTopic} onChange={e => setGenTopic(e.target.value)}
                  placeholder="mon-topic"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Langage</label>
                <select value={genLang} onChange={e => setGenLang(e.target.value)}
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                  {["Java", "Python", "Go", "Node.js"].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            {genType === "producer" ? (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Schéma du message (JSON)</label>
                <textarea value={genSchema} onChange={e => setGenSchema(e.target.value)}
                  rows={3}
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition resize-none" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Group ID</label>
                <input value={genGroupId} onChange={e => setGenGroupId(e.target.value)}
                  placeholder="my-consumer-group"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
            )}
          </div>
        )}

        {tab === "anomalies" && (
          <p className="text-slate-400 text-sm">
            Analyse tous les consumer groups, détecte les lags critiques et propose des actions correctives.
          </p>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button onClick={run} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg font-medium transition">
          <Zap size={16} />
          {loading ? "KafkaMind réfléchit..." : "Analyser avec l'IA"}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-kafka-border flex items-center justify-between">
            <span className="text-sm font-medium text-white">Résultat</span>
            <button onClick={() => navigator.clipboard.writeText(result)}
              className="text-xs text-slate-500 hover:text-slate-300 transition">
              📋 Copier
            </button>
          </div>
          <pre className="p-5 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[600px]">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
