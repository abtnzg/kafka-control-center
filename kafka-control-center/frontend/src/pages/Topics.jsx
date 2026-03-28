import { useEffect, useState } from "react";
import { topicApi } from "../services/api";
import { Plus, Trash2, Search, RefreshCw, Settings, X, Save, ChevronDown, ChevronUp } from "lucide-react";

const CONFIG_LABELS = {
  "retention.ms":           { label: "Rétention (ms)",        hint: "ex: 604800000 = 7 jours" },
  "retention.bytes":        { label: "Rétention (bytes)",      hint: "-1 = illimité" },
  "cleanup.policy":         { label: "Politique nettoyage",    hint: "delete | compact" },
  "compression.type":       { label: "Compression",            hint: "none | gzip | snappy | lz4 | zstd" },
  "max.message.bytes":      { label: "Taille max message",     hint: "ex: 1048576 = 1 Mo" },
  "min.insync.replicas":    { label: "Min in-sync replicas",   hint: "ex: 1 ou 2" },
  "segment.ms":             { label: "Segment durée (ms)",     hint: "ex: 604800000 = 7 jours" },
  "segment.bytes":          { label: "Segment taille (bytes)", hint: "ex: 1073741824 = 1 Go" },
  "unclean.leader.election.enable": { label: "Unclean leader", hint: "true | false" },
  "message.timestamp.type": { label: "Type timestamp",         hint: "CreateTime | LogAppendTime" },
};

export default function Topics({ cluster }) {
  const [topics,        setTopics]        = useState([]);
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(false);
  const [showCreate,    setShowCreate]    = useState(false);
  const [showConfig,    setShowConfig]    = useState(null);
  const [showAll,       setShowAll]       = useState(false);
  const [config,        setConfig]        = useState({});
  const [configEdit,    setConfigEdit]    = useState({});
  const [configLoad,    setConfigLoad]    = useState(false);
  const [configSave,    setConfigSave]    = useState(false);
  const [configMsg,     setConfigMsg]     = useState("");
  const [form,          setForm]          = useState({ name: "", partitions: 3, replication: 1 });
  const [formError,     setFormError]     = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = () => {
    if (!cluster) return;
    setLoading(true);
    topicApi.list(cluster.id)
      .then(r => setTopics(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [cluster]);

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError("Le nom est obligatoire"); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(form.name)) {
      setFormError("Nom invalide — utilise uniquement lettres, chiffres, . _ -");
      return;
    }
    try {
      await topicApi.create(cluster.id, {
        name: form.name,
        partitions: parseInt(form.partitions),
        replication: parseInt(form.replication)
      });
      setShowCreate(false);
      setForm({ name: "", partitions: 3, replication: 1 });
      setFormError("");
      load();
    } catch (e) {
      setFormError(e.response?.data?.error || "Erreur lors de la création");
    }
  };

  const handleDelete = async (name) => {
    try {
      await topicApi.remove(cluster.id, name);
      setDeleteConfirm(null);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "Erreur suppression");
    }
  };

  const openConfig = async (topicName) => {
    setShowConfig(topicName);
    setConfigLoad(true);
    setConfig({});
    setConfigEdit({});
    setConfigMsg("");
    try {
      const res = await topicApi.getConfig(cluster.id, topicName, false);
      setConfig(res.data);
      setConfigEdit({ ...res.data });
    } catch (e) {
      console.error(e);
    } finally {
      setConfigLoad(false);
    }
  };

  const reloadConfig = async (all) => {
    if (!showConfig) return;
    setConfigLoad(true);
    try {
      const res = await topicApi.getConfig(cluster.id, showConfig, all);
      setConfig(res.data);
      setConfigEdit({ ...res.data });
    } finally {
      setConfigLoad(false);
    }
  };

  const toggleShowAll = () => {
    const next = !showAll;
    setShowAll(next);
    reloadConfig(next);
  };

  const handleSaveConfig = async () => {
    setConfigSave(true);
    setConfigMsg("");
    try {
      const changed = {};
      Object.keys(configEdit).forEach(k => {
        if (configEdit[k] !== config[k]) changed[k] = configEdit[k];
      });
      if (Object.keys(changed).length === 0) {
        setConfigMsg("Aucune modification détectée");
        return;
      }
      await topicApi.updateConfig(cluster.id, showConfig, changed);
      setConfigMsg("✅ Configuration mise à jour !");
      const res = await topicApi.getConfig(cluster.id, showConfig, showAll);
      setConfig(res.data);
      setConfigEdit({ ...res.data });
    } catch (e) {
      setConfigMsg("❌ " + (e.response?.data?.error || "Erreur mise à jour"));
    } finally {
      setConfigSave(false);
    }
  };

  const filtered = topics.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!cluster) return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <p>Sélectionne un cluster d'abord</p>
    </div>
  );

  return (
    <div className="p-6 space-y-4">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Topics</h1>
          <p className="text-slate-500 text-sm">{topics.length} topics sur {cluster.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-kafka-border text-slate-400 hover:text-white hover:bg-kafka-surface transition">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
            <Plus size={16} /> Nouveau topic
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un topic..."
          className="w-full bg-kafka-surface border border-kafka-border rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-kafka-accent transition" />
      </div>

      <div className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-kafka-border">
              <th className="text-left px-5 py-3 text-slate-500 font-medium text-xs">Nom</th>
              <th className="text-center px-5 py-3 text-slate-500 font-medium text-xs">Partitions</th>
              <th className="text-center px-5 py-3 text-slate-500 font-medium text-xs">Réplication</th>
              <th className="text-right px-5 py-3 text-slate-500 font-medium text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-kafka-border/50">
                  <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-48" /></td>
                  <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-8 mx-auto" /></td>
                  <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-8 mx-auto" /></td>
                  <td></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-600">
                {search ? "Aucun topic trouvé" : "Aucun topic — crée le premier !"}
              </td></tr>
            ) : filtered.map(t => (
              <tr key={t.name} className="border-b border-kafka-border/50 hover:bg-kafka-bg/40 transition group">
                <td className="px-5 py-3 text-slate-300 font-mono text-xs">{t.name}</td>
                <td className="px-5 py-3 text-center">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs">{t.partitions}</span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${t.replicationFactor >= 3 ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}>
                    {t.replicationFactor}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openConfig(t.name)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 transition text-xs">
                      <Settings size={13} /> Config
                    </button>
                    <button onClick={() => setDeleteConfirm(t.name)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition text-xs">
                      <Trash2 size={13} /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-kafka-border">
              <h2 className="font-semibold text-white">Créer un topic</h2>
              <button onClick={() => { setShowCreate(false); setFormError(""); }} className="p-1.5 hover:bg-kafka-bg rounded-lg text-slate-400 hover:text-white transition"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nom du topic <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="mon-topic"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                <p className="text-slate-600 text-xs mt-1">Lettres, chiffres, . _ - autorisés</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Partitions</label>
                  <input type="number" min="1" max="100" value={form.partitions}
                    onChange={e => setForm(f => ({ ...f, partitions: e.target.value }))}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Réplication</label>
                  <input type="number" min="1" max="10" value={form.replication}
                    onChange={e => setForm(f => ({ ...f, replication: e.target.value }))}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                </div>
              </div>
              {formError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><p className="text-red-400 text-sm">{formError}</p></div>}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setShowCreate(false); setFormError(""); }} className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">Annuler</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">Créer</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h2 className="font-semibold text-white">Supprimer le topic</h2>
              <p className="text-slate-400 text-sm mt-2">Es-tu sûr de vouloir supprimer <span className="text-white font-mono">{deleteConfirm}</span> ?</p>
              <p className="text-red-400 text-xs mt-1">⚠️ Action irréversible — tous les messages seront perdus.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-kafka-border shrink-0">
              <div>
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Settings size={16} className="text-kafka-accent" />
                  Config — <span className="font-mono text-kafka-accent">{showConfig}</span>
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Modifie les valeurs puis clique sur Sauvegarder</p>
              </div>
              <button onClick={() => { setShowConfig(null); setConfigMsg(""); setShowAll(false); }} className="p-1.5 hover:bg-kafka-bg rounded-lg text-slate-400 hover:text-white transition"><X size={16} /></button>
            </div>

            <div className="px-6 py-3 border-b border-kafka-border flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">{Object.keys(config).length} propriété(s) {showAll ? "au total" : "non-défaut"}</span>
              <button onClick={toggleShowAll} className="flex items-center gap-1 text-xs text-slate-400 hover:text-kafka-accent transition">
                {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAll ? "Masquer les valeurs par défaut" : "Afficher toutes les configs"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {configLoad ? (
                [...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-kafka-bg rounded-lg">
                    <div className="h-3 bg-kafka-border rounded animate-pulse w-40" />
                    <div className="h-3 bg-kafka-border rounded animate-pulse flex-1" />
                  </div>
                ))
              ) : Object.keys(configEdit).length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">Aucune configuration trouvée</p>
              ) : Object.entries(configEdit).map(([key, val]) => {
                const meta = CONFIG_LABELS[key];
                const changed = val !== config[key];
                return (
                  <div key={key} className={`rounded-lg border transition ${changed ? "border-kafka-accent/50 bg-kafka-accent/5" : "border-kafka-border bg-kafka-bg"}`}>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-slate-300">{key}</span>
                          {meta && <span className="text-xs text-slate-600">— {meta.label}</span>}
                          {changed && <span className="text-xs px-1.5 py-0.5 bg-kafka-accent/20 text-kafka-accent rounded">modifié</span>}
                        </div>
                        {meta?.hint && <p className="text-xs text-slate-600 mt-0.5">{meta.hint}</p>}
                      </div>
                      <input type="text" value={val}
                        onChange={e => setConfigEdit(c => ({ ...c, [key]: e.target.value }))}
                        className={`w-48 bg-kafka-surface border rounded px-3 py-1.5 text-white text-xs font-mono focus:outline-none transition ${changed ? "border-kafka-accent" : "border-kafka-border focus:border-kafka-accent"}`} />
                      {changed && (
                        <button onClick={() => setConfigEdit(c => ({ ...c, [key]: config[key] }))} className="p-1 rounded text-slate-500 hover:text-slate-300 transition" title="Annuler">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-kafka-border shrink-0 space-y-3">
              {configMsg && (
                <div className={`p-3 rounded-lg text-sm ${configMsg.startsWith("✅") ? "bg-green-500/10 border border-green-500/20 text-green-400" : configMsg.startsWith("❌") ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-kafka-bg border border-kafka-border text-slate-400"}`}>
                  {configMsg}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setConfigEdit({ ...config })} className="px-4 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">Réinitialiser</button>
                <button onClick={() => { setShowConfig(null); setConfigMsg(""); setShowAll(false); }} className="px-4 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">Fermer</button>
                <button onClick={handleSaveConfig} disabled={configSave}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
                  <Save size={14} />
                  {configSave ? "Sauvegarde..." : "Sauvegarder"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}