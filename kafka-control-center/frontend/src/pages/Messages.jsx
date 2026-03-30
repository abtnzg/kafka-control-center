import { useState, useEffect } from "react";
import { topicApi, messageApi } from "../services/api";
import { Search, Play, ChevronDown, RotateCcw, Send, AlertTriangle, Download, CheckCircle, XCircle, Filter } from "lucide-react";

const TABS = [
  { id: "browse",   label: "Parcourir",   icon: Play },
  { id: "replay",   label: "Replay",      icon: RotateCcw },
  { id: "produce",  label: "Produire",    icon: Send },
  { id: "dlq",      label: "DLQ",         icon: AlertTriangle },
  { id: "search",   label: "Recherche",   icon: Search },
  { id: "export",   label: "Export",      icon: Download },
  { id: "validate", label: "Validation",  icon: CheckCircle },
];

export default function Messages({ cluster }) {
  const [tab,      setTab]      = useState("browse");
  const [topics,   setTopics]   = useState([]);
  const [topic,    setTopic]    = useState("");
  const [messages, setMessages] = useState([]);
  const [limit,    setLimit]    = useState(20);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  // Replay
  const [replayFrom,  setReplayFrom]  = useState("earliest");
  const [replayLimit, setReplayLimit] = useState(100);

  // Produce
  const [prodKey,     setProdKey]     = useState("");
  const [prodValue,   setProdValue]   = useState('{"event":"test","data":{}}');
  const [prodHeaders, setProdHeaders] = useState("");

  // Search
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchLimit,  setSearchLimit]  = useState(100);

  // Validate
  const [schema,          setSchema]          = useState('{"required":["id","event"]}');
  const [validateLimit,   setValidateLimit]   = useState(50);
  const [validationResult,setValidationResult]= useState(null);

  // DLQ
  const [dlqTopics, setDlqTopics] = useState([]);

  useEffect(() => {
    if (!cluster) return;
    topicApi.list(cluster.id).then(r => setTopics(r.data)).catch(console.error);
  }, [cluster]);

  const run = async (action) => {
    if (!cluster) { setError("Sélectionne un cluster"); return; }
    setError(""); setSuccess(""); setLoading(true); setMessages([]); setValidationResult(null);
    try {
      switch (action) {
        case "browse": {
          if (!topic) { setError("Sélectionne un topic"); break; }
          const r = await topicApi.messages(cluster.id, topic, limit);
          setMessages(r.data);
          break;
        }
        case "replay": {
          if (!topic) { setError("Sélectionne un topic"); break; }
          const r = await messageApi.replay(cluster.id, topic, replayFrom, replayLimit);
          setMessages(r.data.messages);
          setSuccess(`${r.data.count} messages rejoués depuis ${replayFrom}`);
          break;
        }
        case "produce": {
          if (!topic)      { setError("Sélectionne un topic"); break; }
          if (!prodValue)  { setError("La valeur est obligatoire"); break; }
          const headers = {};
          if (prodHeaders.trim()) {
            prodHeaders.split("\n").forEach(line => {
              const [k, v] = line.split(":");
              if (k && v) headers[k.trim()] = v.trim();
            });
          }
          await messageApi.produce(cluster.id, topic, prodKey || null, prodValue, headers);
          setSuccess("Message produit avec succès !");
          break;
        }
        case "dlq": {
          const r = await messageApi.listDlq(cluster.id);
          setDlqTopics(r.data.dlqTopics);
          if (topic) {
            const msgs = await messageApi.getDlqMessages(cluster.id, topic, 50);
            setMessages(msgs.data.messages);
          }
          break;
        }
        case "search": {
          if (!topic)       { setError("Sélectionne un topic"); break; }
          if (!searchQuery) { setError("Saisis une requête de recherche"); break; }
          const r = await messageApi.search(cluster.id, topic, searchQuery, searchLimit);
          setMessages(r.data.results);
          setSuccess(`${r.data.count} résultat(s) pour "${searchQuery}"`);
          break;
        }
        case "export-csv": {
          if (!topic) { setError("Sélectionne un topic"); break; }
          const r = await messageApi.exportCsv(cluster.id, topic, limit);
          const blob = new Blob([r.data], { type: "text/csv" });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement("a");
          a.href = url; a.download = `${topic}.csv`; a.click();
          URL.revokeObjectURL(url);
          setSuccess("Export CSV téléchargé !");
          break;
        }
        case "export-json": {
          if (!topic) { setError("Sélectionne un topic"); break; }
          const r = await messageApi.exportJson(cluster.id, topic, limit);
          const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement("a");
          a.href = url; a.download = `${topic}.json`; a.click();
          URL.revokeObjectURL(url);
          setSuccess("Export JSON téléchargé !");
          break;
        }
        case "validate": {
          if (!topic) { setError("Sélectionne un topic"); break; }
          const r = await messageApi.validate(cluster.id, topic, schema, validateLimit);
          setValidationResult(r.data);
          break;
        }
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const tryJson = (val) => {
    try { return JSON.stringify(JSON.parse(val), null, 2); }
    catch { return val; }
  };

  if (!cluster) return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <p>Sélectionne un cluster d'abord</p>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Messages</h1>
        <p className="text-slate-500 text-sm">Parcourir, rejouer, produire et analyser les messages Kafka</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setMessages([]); setError(""); setSuccess(""); setValidationResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
              tab === id
                ? "bg-kafka-accent text-white"
                : "bg-kafka-surface border border-kafka-border text-slate-400 hover:text-white"
            }`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Topic selector commun */}
      <div className="bg-kafka-surface border border-kafka-border rounded-xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <select value={topic} onChange={e => setTopic(e.target.value)}
              className="w-full bg-kafka-bg border border-kafka-border rounded-lg pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition appearance-none">
              <option value="">Sélectionner un topic</option>
              {topics.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          {/* Contrôles selon le tab */}
          {(tab === "browse" || tab === "export") && (
            <select value={limit} onChange={e => setLimit(Number(e.target.value))}
              className="bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
              {[20, 50, 100, 200, 500].map(n => <option key={n} value={n}>{n} msgs</option>)}
            </select>
          )}
        </div>

        {/* ── BROWSE ── */}
        {tab === "browse" && (
          <button onClick={() => run("browse")} disabled={!topic || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
            <Play size={14} />{loading ? "Chargement..." : "Lire les messages"}
          </button>
        )}

        {/* ── REPLAY ── */}
        {tab === "replay" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Depuis</label>
                <select value={replayFrom} onChange={e => setReplayFrom(e.target.value)}
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                  <option value="earliest">Début (earliest)</option>
                  <option value="latest">Fin (latest)</option>
                  <option value="custom-offset">Offset précis</option>
                  <option value="custom-ts">Timestamp</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nombre de messages</label>
                <input type="number" value={replayLimit} onChange={e => setReplayLimit(Number(e.target.value))}
                  min="1" max="500"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
            </div>
            {replayFrom === "custom-offset" && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Offset (ex: 1000)</label>
                <input type="number" placeholder="1000"
                  onChange={e => setReplayFrom(e.target.value)}
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
            )}
            {replayFrom === "custom-ts" && (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Timestamp (Unix ms)</label>
                <input type="number" placeholder="1711706400000"
                  onChange={e => setReplayFrom("ts:" + e.target.value)}
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
            )}
            <button onClick={() => run("replay")} disabled={!topic || loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              <RotateCcw size={14} />{loading ? "Chargement..." : "Rejouer"}
            </button>
          </div>
        )}

        {/* ── PRODUIRE ── */}
        {tab === "produce" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Clé (optionnel)</label>
              <input value={prodKey} onChange={e => setProdKey(e.target.value)}
                placeholder="user-123"
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Valeur <span className="text-red-400">*</span></label>
              <textarea value={prodValue} onChange={e => setProdValue(e.target.value)}
                rows={5} placeholder='{"event":"order.placed","userId":"alice"}'
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition resize-none" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Headers (un par ligne, format key:value)</label>
              <textarea value={prodHeaders} onChange={e => setProdHeaders(e.target.value)}
                rows={2} placeholder={"correlation-id:abc123\ncontent-type:application/json"}
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition resize-none" />
            </div>
            <button onClick={() => run("produce")} disabled={!topic || loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              <Send size={14} />{loading ? "Envoi..." : "Envoyer le message"}
            </button>
          </div>
        )}

        {/* ── DLQ ── */}
        {tab === "dlq" && (
          <div className="space-y-3">
            <button onClick={() => run("dlq")} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              <AlertTriangle size={14} />{loading ? "Chargement..." : "Scanner les DLQ"}
            </button>
            {dlqTopics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dlqTopics.map(t => (
                  <button key={t} onClick={() => setTopic(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
                      topic === t
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-kafka-bg border border-kafka-border text-slate-400 hover:text-red-400"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECHERCHE ── */}
        {tab === "search" && (
          <div className="space-y-3">
            <div className="flex gap-3">
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder='Rechercher dans les messages... ex: "alice" ou "error"'
                onKeyDown={e => e.key === "Enter" && run("search")}
                className="flex-1 bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              <select value={searchLimit} onChange={e => setSearchLimit(Number(e.target.value))}
                className="bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                {[50, 100, 200].map(n => <option key={n} value={n}>max {n}</option>)}
              </select>
            </div>
            <button onClick={() => run("search")} disabled={!topic || !searchQuery || loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              <Search size={14} />{loading ? "Recherche..." : "Rechercher"}
            </button>
          </div>
        )}

        {/* ── EXPORT ── */}
        {tab === "export" && (
          <div className="flex gap-3">
            <button onClick={() => run("export-json")} disabled={!topic || loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/80 hover:bg-blue-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              <Download size={14} /> Export JSON
            </button>
            <button onClick={() => run("export-csv")} disabled={!topic || loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600/80 hover:bg-green-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              <Download size={14} /> Export CSV
            </button>
          </div>
        )}

        {/* ── VALIDATION ── */}
        {tab === "validate" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Schéma JSON (champs requis)</label>
              <textarea value={schema} onChange={e => setSchema(e.target.value)}
                rows={4}
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition resize-none" />
            </div>
            <div className="flex gap-3 items-center">
              <span className="text-xs text-slate-400">Valider</span>
              <input type="number" value={validateLimit} onChange={e => setValidateLimit(Number(e.target.value))}
                min="1" max="200"
                className="w-24 bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              <span className="text-xs text-slate-400">messages</span>
            </div>
            <button onClick={() => run("validate")} disabled={!topic || loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
              <CheckCircle size={14} />{loading ? "Validation..." : "Valider les messages"}
            </button>
          </div>
        )}

        {/* Messages de retour */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}
      </div>

      {/* ── Résultat validation ── */}
      {validationResult && (
        <div className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-kafka-border flex items-center gap-4">
            <div className="flex-1">
              <h3 className="text-white font-medium text-sm">Résultat de validation</h3>
              <p className="text-slate-500 text-xs">{validationResult.total} messages analysés</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-400 font-mono">{validationResult.valid} valides</span>
              <span className="text-red-400 font-mono">{validationResult.invalid} invalides</span>
              <span className={`text-lg font-bold ${
                validationResult.score >= 90 ? "text-green-400" :
                validationResult.score >= 70 ? "text-yellow-400" : "text-red-400"
              }`}>{validationResult.score}%</span>
            </div>
          </div>
          {/* Barre de score */}
          <div className="px-5 py-3 border-b border-kafka-border">
            <div className="w-full bg-kafka-bg rounded-full h-2">
              <div className={`h-2 rounded-full transition-all ${
                validationResult.score >= 90 ? "bg-green-500" :
                validationResult.score >= 70 ? "bg-yellow-500" : "bg-red-500"
              }`} style={{ width: `${validationResult.score}%` }} />
            </div>
          </div>
          {/* Messages invalides */}
          {validationResult.results.filter(r => !r.valid).length > 0 && (
            <div className="divide-y divide-kafka-border max-h-64 overflow-y-auto">
              {validationResult.results.filter(r => !r.valid).map((r, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-400">
                      Partition {r.partition} · Offset {r.offset}
                    </p>
                    <p className="text-red-400 text-xs mt-0.5">{r.error}</p>
                    <p className="text-slate-600 text-xs font-mono mt-1 truncate">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Liste de messages ── */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-slate-500 text-xs">{messages.length} message(s)</p>
          </div>
          {messages.map((msg, i) => (
            <div key={i} className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
              <button onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-kafka-bg/50 transition text-left">
                <span className="text-xs px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded font-mono shrink-0">
                  P{msg.partition}
                </span>
                <span className="text-xs text-slate-500 font-mono shrink-0">+{msg.offset}</span>
                {msg.key && (
                  <span className="text-xs text-slate-400 font-mono shrink-0">
                    <span className="text-slate-600">key:</span> {msg.key}
                  </span>
                )}
                <span className="text-xs text-slate-600 font-mono truncate flex-1">
                  {msg.value?.substring(0, 80)}{msg.value?.length > 80 ? "…" : ""}
                </span>
                <span className="text-xs text-slate-700 shrink-0">
                  {new Date(msg.timestamp).toLocaleTimeString("fr-FR")}
                </span>
                <ChevronDown size={13} className={`text-slate-500 shrink-0 transition-transform ${expanded === i ? "rotate-180" : ""}`} />
              </button>
              {expanded === i && (
                <div className="px-5 pb-4 border-t border-kafka-border">
                  <pre className="mt-3 text-xs text-green-400 bg-kafka-bg rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
                    {tryJson(msg.value) || "(vide)"}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && !loading && !validationResult && tab !== "produce" && (
        <div className="bg-kafka-surface border border-kafka-border rounded-xl px-5 py-10 text-center text-slate-600 text-sm">
          {topic ? "Lance une action pour voir les messages" : "Sélectionne un topic"}
        </div>
      )}
    </div>
  );
}
