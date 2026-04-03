import { useEffect, useState, useRef } from "react";
import { streamApi, clusterApi } from "../services/api";
import { Plus, Play, Square, Pause, Trash2, RefreshCw, X, Activity, ArrowRight, Zap, Filter, Copy, ChevronDown, ChevronUp } from "lucide-react";

const MODE_META = {
  REPLICATE: { label: "Réplication",  color: "bg-blue-500/10 text-blue-400 border border-blue-500/20",   desc: "Copie continue temps réel" },
  MIGRATE:   { label: "Migration",    color: "bg-purple-500/10 text-purple-400 border border-purple-500/20", desc: "Migration sans interruption" },
  FAN_OUT:   { label: "Fan-out",      color: "bg-green-500/10 text-green-400 border border-green-500/20",   desc: "1 source → N destinations" },
  FILTER:    { label: "Filtrage",     color: "bg-amber-500/10 text-amber-400 border border-amber-500/20",   desc: "Filtre et copie" },
  REPLAY:    { label: "Replay",       color: "bg-red-500/10 text-red-400 border border-red-500/20",         desc: "Rejoue depuis offset" },
};

const STATUS_STYLE = {
  RUNNING: "bg-green-500/10 text-green-400 border border-green-500/20",
  STOPPED: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  PAUSED:  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  ERROR:   "bg-red-500/10 text-red-400 border border-red-500/20",
};

const DEFAULT_FORM = {
  name: "", description: "",
  sourceClusterId: "", sourceTopic: "",
  destClusterId: "", destTopic: "",
  mode: "REPLICATE", guarantee: "AT_LEAST_ONCE",
  filterExpression: "", transformScript: "", startOffset: "latest"
};

export default function Streaming() {
  const [pipelines,    setPipelines]    = useState([]);
  const [clusters,     setClusters]     = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [form,         setForm]         = useState(DEFAULT_FORM);
  const [formError,    setFormError]    = useState("");
  const [deleting,     setDeleting]     = useState(null);
  const [expanded,     setExpanded]     = useState(null);

  // Topics dynamiques par cluster
  const [sourceTopics, setSourceTopics] = useState([]);
  const [destTopics,   setDestTopics]   = useState([]);
  const [loadingST,    setLoadingST]    = useState(false);
  const [loadingDT,    setLoadingDT]    = useState(false);

  const intervalRef = useRef(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [pRes, cRes] = await Promise.all([streamApi.list(), clusterApi.list()]);
      setPipelines(Array.isArray(pRes.data) ? pRes.data : []);
      setClusters(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (e) { setError(e.response?.data?.error || e.message || "Erreur"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Chargement topics source quand on change de cluster source
  const onSourceClusterChange = async (clusterId) => {
    setForm(f => ({ ...f, sourceClusterId: clusterId, sourceTopic: "" }));
    if (!clusterId) { setSourceTopics([]); return; }
    setLoadingST(true);
    try {
      const r = await streamApi.topicsForCluster(clusterId);
      setSourceTopics(r.data);
    } catch { setSourceTopics([]); }
    finally { setLoadingST(false); }
  };

  // Chargement topics dest quand on change de cluster dest
  const onDestClusterChange = async (clusterId) => {
    setForm(f => ({ ...f, destClusterId: clusterId, destTopic: "" }));
    if (!clusterId) { setDestTopics([]); return; }
    setLoadingDT(true);
    try {
      const r = await streamApi.topicsForCluster(clusterId);
      setDestTopics(r.data);
    } catch { setDestTopics([]); }
    finally { setLoadingDT(false); }
  };

  const handleCreate = async () => {
    if (!form.name.trim())        { setFormError("Nom obligatoire"); return; }
    if (!form.sourceClusterId)    { setFormError("Cluster source obligatoire"); return; }
    if (!form.sourceTopic.trim()) { setFormError("Topic source obligatoire"); return; }
    if (!form.destClusterId)      { setFormError("Cluster destination obligatoire"); return; }
    if (!form.destTopic.trim())   { setFormError("Topic destination obligatoire"); return; }
    try {
      await streamApi.create({ ...form, sourceClusterId: parseInt(form.sourceClusterId), destClusterId: parseInt(form.destClusterId) });
      setShowCreate(false); setForm(DEFAULT_FORM); setFormError("");
      setSourceTopics([]); setDestTopics([]);
      load();
    } catch (e) { setFormError(e.response?.data?.error || "Erreur création"); }
  };

  const handleDuplicate = async (id) => {
    try { await streamApi.duplicate(id); load(); } catch (e) { alert(e.response?.data?.error || "Erreur"); }
  };
  const handleStart  = async (id) => { try { await streamApi.start(id);  load(); } catch (e) { alert(e.response?.data?.error || "Erreur"); } };
  const handleStop   = async (id) => { try { await streamApi.stop(id);   load(); } catch (e) { alert(e.response?.data?.error || "Erreur"); } };
  const handlePause  = async (id) => { try { await streamApi.pause(id);  load(); } catch (e) { alert(e.response?.data?.error || "Erreur"); } };
  const handleDelete = async (id) => { try { await streamApi.delete(id); setDeleting(null); load(); } catch (e) { alert(e.response?.data?.error || "Erreur"); } };

  const clusterName = (id) => clusters.find(c => c.id === id || c.id === parseInt(id))?.name || `#${id}`;
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2"><Activity size={20} className="text-kafka-accent" /> Streaming</h1>
          <p className="text-slate-500 text-sm">Réplication et migration Kafka en temps réel</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-kafka-border text-slate-400 hover:text-white transition">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
            <Plus size={16} /> Nouveau pipeline
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

      {/* Liste vide */}
      {!loading && !error && pipelines.length === 0 && (
        <div className="bg-kafka-surface border border-kafka-border rounded-xl p-12 text-center">
          <Zap size={40} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 text-lg font-medium">Aucun pipeline configuré</p>
          <p className="text-slate-600 text-sm mt-2 mb-6">Crée un pipeline pour répliquer des messages entre topics Kafka</p>
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
            Créer mon premier pipeline
          </button>
        </div>
      )}

      {/* Pipelines */}
      {pipelines.map(p => {
        const mode = MODE_META[p.mode] || MODE_META.REPLICATE;
        return (
          <div key={p.id} className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-4">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.status==="RUNNING"?"bg-green-400 animate-pulse":p.status==="ERROR"?"bg-red-400":p.status==="PAUSED"?"bg-yellow-400":"bg-slate-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${mode.color}`}>{mode.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[p.status]||STATUS_STYLE.STOPPED}`}>{p.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="font-mono">{clusterName(p.sourceClusterId)}/{p.sourceTopic}</span>
                  <ArrowRight size={12} className="text-kafka-accent shrink-0" />
                  <span className="font-mono">{clusterName(p.destClusterId)}/{p.destTopic}</span>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-4 text-xs shrink-0">
                <div className="text-center">
                  <p className="text-white font-mono">{(p.transferred??0).toLocaleString()}</p>
                  <p className="text-slate-600">transférés</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-mono">{p.throughput??0}/s</p>
                  <p className="text-slate-600">débit</p>
                </div>
                <div className="text-center">
                  <p className={`font-mono ${(p.errors??0)>0?"text-red-400":"text-white"}`}>{p.errors??0}</p>
                  <p className="text-slate-600">erreurs</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {p.status !== "RUNNING" && (
                  <button onClick={() => handleStart(p.id)} title="Démarrer"
                    className="p-2 rounded-lg hover:bg-green-500/10 text-slate-400 hover:text-green-400 transition"><Play size={15} /></button>
                )}
                {p.status === "RUNNING" && (
                  <button onClick={() => handlePause(p.id)} title="Pause"
                    className="p-2 rounded-lg hover:bg-yellow-500/10 text-slate-400 hover:text-yellow-400 transition"><Pause size={15} /></button>
                )}
                {p.status !== "STOPPED" && (
                  <button onClick={() => handleStop(p.id)} title="Arrêter"
                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"><Square size={15} /></button>
                )}
                <button onClick={() => handleDuplicate(p.id)} title="Dupliquer"
                  className="p-2 rounded-lg hover:bg-blue-500/10 text-slate-400 hover:text-blue-400 transition"><Copy size={14} /></button>
                <button onClick={() => setExpanded(expanded===p.id?null:p.id)} title="Détails"
                  className="p-2 rounded-lg hover:bg-kafka-bg text-slate-400 hover:text-white transition">
                  {expanded===p.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
                <button onClick={() => setDeleting(p.id)} title="Supprimer"
                  className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"><Trash2 size={14} /></button>
              </div>
            </div>
            {expanded === p.id && (
              <div className="border-t border-kafka-border px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-kafka-bg rounded-lg p-3"><p className="text-slate-500 mb-1">Garantie</p><p className="text-slate-300 font-medium">{p.guarantee}</p></div>
                <div className="bg-kafka-bg rounded-lg p-3"><p className="text-slate-500 mb-1">Offset départ</p><p className="text-slate-300 font-mono">{p.startOffset}</p></div>
                {p.filterExpression && <div className="col-span-2 bg-kafka-bg rounded-lg p-3"><p className="text-slate-500 mb-1">Filtre</p><p className="text-slate-300 font-mono">{p.filterExpression}</p></div>}
                {p.transformScript && <div className="col-span-2 bg-kafka-bg rounded-lg p-3"><p className="text-slate-500 mb-1">Transformation</p><p className="text-slate-300 font-mono">{p.transformScript}</p></div>}
              </div>
            )}
          </div>
        );
      })}

      {/* Modal création */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-kafka-border shrink-0">
              <h2 className="font-semibold text-white flex items-center gap-2"><Zap size={16} className="text-kafka-accent" /> Créer un pipeline</h2>
              <button onClick={() => { setShowCreate(false); setFormError(""); setForm(DEFAULT_FORM); setSourceTopics([]); setDestTopics([]); }}
                className="p-1.5 hover:bg-kafka-bg rounded-lg text-slate-400 hover:text-white transition"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nom <span className="text-red-400">*</span></label>
                  <input value={form.name} onChange={e => f("name", e.target.value)} placeholder="Migration prod → DR"
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Description</label>
                  <input value={form.description} onChange={e => f("description", e.target.value)} placeholder="Optionnel"
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                </div>
              </div>

              {/* Source */}
              <div className="bg-kafka-bg border border-kafka-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Source</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Cluster <span className="text-red-400">*</span></label>
                    <select value={form.sourceClusterId} onChange={e => onSourceClusterChange(e.target.value)}
                      className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                      <option value="">Sélectionner...</option>
                      {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Topic <span className="text-red-400">*</span>
                      {loadingST && <span className="text-slate-600 ml-1">chargement...</span>}
                    </label>
                    {sourceTopics.length > 0 ? (
                      <select value={form.sourceTopic} onChange={e => f("sourceTopic", e.target.value)}
                        className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                        <option value="">Sélectionner un topic</option>
                        {sourceTopics.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input value={form.sourceTopic} onChange={e => f("sourceTopic", e.target.value)}
                        placeholder={form.sourceClusterId ? "Saisir le topic" : "Sélectionne d'abord un cluster"}
                        className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                    )}
                  </div>
                </div>
              </div>

              {/* Destination */}
              <div className="bg-kafka-bg border border-kafka-border rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Destination</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Cluster <span className="text-red-400">*</span></label>
                    <select value={form.destClusterId} onChange={e => onDestClusterChange(e.target.value)}
                      className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                      <option value="">Sélectionner...</option>
                      {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Topic <span className="text-red-400">*</span>
                      {loadingDT && <span className="text-slate-600 ml-1">chargement...</span>}
                    </label>
                    {destTopics.length > 0 ? (
                      <select value={form.destTopic} onChange={e => f("destTopic", e.target.value)}
                        className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                        <option value="">Sélectionner un topic</option>
                        {destTopics.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input value={form.destTopic} onChange={e => f("destTopic", e.target.value)}
                        placeholder={form.destClusterId ? "Saisir le topic" : "Sélectionne d'abord un cluster"}
                        className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                    )}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Mode</label>
                  <select value={form.mode} onChange={e => f("mode", e.target.value)}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                    {Object.entries(MODE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <p className="text-slate-600 text-xs mt-1">{MODE_META[form.mode]?.desc}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Garantie</label>
                  <select value={form.guarantee} onChange={e => f("guarantee", e.target.value)}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                    <option value="AT_LEAST_ONCE">At-least-once</option>
                    <option value="EXACTLY_ONCE">Exactly-once</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Offset départ</label>
                  <select value={form.startOffset} onChange={e => f("startOffset", e.target.value)}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                    <option value="latest">latest</option>
                    <option value="earliest">earliest</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block flex items-center gap-1"><Filter size={12}/> Filtre (optionnel)</label>
                <input value={form.filterExpression} onChange={e => f("filterExpression", e.target.value)}
                  placeholder="contains:order  |  key:user-123  |  not:error"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Transformation (optionnel)</label>
                <input value={form.transformScript} onChange={e => f("transformScript", e.target.value)}
                  placeholder='addField:{"source":"kafkamind"}  |  prefix:v2-'
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition" />
              </div>

              {formError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><p className="text-red-400 text-sm">{formError}</p></div>}
            </div>

            <div className="px-6 py-4 flex gap-3 shrink-0 border-t border-kafka-border">
              <button onClick={() => { setShowCreate(false); setFormError(""); setForm(DEFAULT_FORM); setSourceTopics([]); setDestTopics([]); }}
                className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">Annuler</button>
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">Créer le pipeline</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h2 className="font-semibold text-white mb-2">Supprimer le pipeline ?</h2>
            <p className="text-slate-400 text-sm mb-5">Action irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 text-sm">Annuler</button>
              <button onClick={() => handleDelete(deleting)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
