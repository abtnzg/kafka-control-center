import { useEffect, useState } from "react";
import { topicApi } from "../services/api";
import { Plus, Trash2, Search, RefreshCw } from "lucide-react";

export default function Topics({ cluster }) {
  const [topics,  setTopics]  = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState({ name: "", partitions: 3, replication: 1 });
  const [error,   setError]   = useState("");

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
    if (!form.name.trim()) return;
    try {
      await topicApi.create(cluster.id, {
        name: form.name,
        partitions: parseInt(form.partitions),
        replication: parseInt(form.replication)
      });
      setShowAdd(false);
      setForm({ name: "", partitions: 3, replication: 1 });
      load();
    } catch (e) {
      setError(e.response?.data?.error || "Erreur création topic");
    }
  };

  const handleDelete = async (name) => {
    if (!confirm(`Supprimer le topic "${name}" ?`)) return;
    try {
      await topicApi.remove(cluster.id, name);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "Erreur suppression");
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Topics</h1>
          <p className="text-slate-500 text-sm">{topics.length} topics sur {cluster.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load}
            className="p-2 rounded-lg border border-kafka-border text-slate-400 hover:text-white hover:bg-kafka-surface transition">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
            <Plus size={16} /> Nouveau topic
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un topic..."
          className="w-full bg-kafka-surface border border-kafka-border rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-kafka-accent transition"
        />
      </div>

      {/* Table */}
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
              [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-kafka-border/50">
                  <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-56" /></td>
                  <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-8 mx-auto" /></td>
                  <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-8 mx-auto" /></td>
                  <td className="px-5 py-3"></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-600">
                  {search ? "Aucun topic trouvé" : "Aucun topic — crée le premier !"}
                </td>
              </tr>
            ) : filtered.map(t => (
              <tr key={t.name} className="border-b border-kafka-border/50 hover:bg-kafka-bg/50 transition group">
                <td className="px-5 py-3 text-slate-300 font-mono text-xs">{t.name}</td>
                <td className="px-5 py-3 text-center">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs">
                    {t.partitions}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    t.replicationFactor >= 3
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                  }`}>
                    {t.replicationFactor}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(t.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="font-semibold text-white mb-5">Créer un topic</h2>
            <div className="space-y-4">
              {[
                { key: "name",        label: "Nom du topic",       placeholder: "mon-topic",  type: "text"   },
                { key: "partitions",  label: "Partitions",         placeholder: "3",          type: "number" },
                { key: "replication", label: "Facteur réplication",placeholder: "1",          type: "number" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition"
                  />
                </div>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAdd(false); setError(""); }}
                className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">
                Annuler
              </button>
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
