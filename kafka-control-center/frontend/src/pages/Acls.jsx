import { useEffect, useState } from "react";
import { clusterApi } from "../services/api";
import { Plus, Trash2, RefreshCw, Shield, X, AlertTriangle } from "lucide-react";

const RESOURCE_TYPES  = ["TOPIC", "GROUP", "CLUSTER", "TRANSACTIONAL_ID", "DELEGATION_TOKEN"];
const OPERATIONS      = ["ALL", "READ", "WRITE", "CREATE", "DELETE", "ALTER", "DESCRIBE", "CLUSTER_ACTION", "DESCRIBE_CONFIGS", "ALTER_CONFIGS", "IDEMPOTENT_WRITE"];
const PERMISSION_TYPES = ["ALLOW", "DENY"];
const PATTERN_TYPES   = ["LITERAL", "PREFIXED"];

const PERM_STYLE = {
  ALLOW: "bg-green-500/10 text-green-400 border border-green-500/20",
  DENY:  "bg-red-500/10 text-red-400 border border-red-500/20",
};

const OP_STYLE = {
  READ:   "bg-blue-500/10 text-blue-400",
  WRITE:  "bg-purple-500/10 text-purple-400",
  ALL:    "bg-orange-500/10 text-orange-400",
  DELETE: "bg-red-500/10 text-red-400",
  CREATE: "bg-green-500/10 text-green-400",
};

const DEFAULT_FORM = {
  resourceType: "TOPIC", resourceName: "", patternType: "LITERAL",
  principal: "User:", host: "*", operation: "READ", permissionType: "ALLOW"
};

export default function Acls({ cluster }) {
  const [acls,      setAcls]      = useState([]);
  const [warning,   setWarning]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [showCreate,setShowCreate]= useState(false);
  const [form,      setForm]      = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState("");
  const [deleting,  setDeleting]  = useState(null);
  const [search,    setSearch]    = useState("");

  const load = () => {
    if (!cluster) return;
    setLoading(true);
    clusterApi.listAcls(cluster.id)
      .then(r => {
        if (r.data.warning) { setWarning(r.data.warning); setAcls([]); }
        else { setWarning(""); setAcls(Array.isArray(r.data) ? r.data : []); }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [cluster]);

  const handleCreate = async () => {
    if (!form.resourceName.trim()) { setFormError("Le nom de la ressource est obligatoire"); return; }
    if (!form.principal.trim())    { setFormError("Le principal est obligatoire"); return; }
    try {
      await clusterApi.createAcl(cluster.id, form);
      setShowCreate(false);
      setForm(DEFAULT_FORM);
      setFormError("");
      load();
    } catch (e) {
      setFormError(e.response?.data?.error || "Erreur création ACL");
    }
  };

  const handleDelete = async (acl) => {
    try {
      await clusterApi.deleteAcl(cluster.id, acl);
      setDeleting(null);
      load();
    } catch (e) {
      alert(e.response?.data?.error || "Erreur suppression ACL");
    }
  };

  const filtered = acls.filter(a =>
    a.resourceName.toLowerCase().includes(search.toLowerCase()) ||
    a.principal.toLowerCase().includes(search.toLowerCase()) ||
    a.operation.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield size={20} className="text-kafka-accent" /> ACLs
          </h1>
          <p className="text-slate-500 text-sm">{acls.length} règle(s) sur {cluster.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-kafka-border text-slate-400 hover:text-white hover:bg-kafka-surface transition">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">
            <Plus size={16} /> Nouvelle ACL
          </button>
        </div>
      </div>

      {/* Warning si ACLs non disponibles */}
      {warning && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 text-sm font-medium">ACLs non disponibles</p>
            <p className="text-yellow-400/70 text-xs mt-1">{warning}</p>
            <p className="text-slate-500 text-xs mt-2">
              Pour activer les ACLs, ajoutez dans server.properties :<br/>
              <code className="font-mono bg-kafka-bg px-1 rounded">authorizer.class.name=kafka.security.authorizer.AclAuthorizer</code>
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      {acls.length > 0 && (
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par ressource, principal, opération..."
          className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-kafka-accent transition" />
      )}

      {/* ACL Table */}
      <div className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-kafka-border/50 flex gap-4">
              <div className="h-3 bg-kafka-border rounded animate-pulse w-20" />
              <div className="h-3 bg-kafka-border rounded animate-pulse w-32" />
              <div className="h-3 bg-kafka-border rounded animate-pulse w-24" />
              <div className="h-3 bg-kafka-border rounded animate-pulse w-16 ml-auto" />
            </div>
          ))
        ) : filtered.length === 0 && !warning ? (
          <div className="px-5 py-12 text-center text-slate-600">
            {search ? "Aucune ACL trouvée" : "Aucune ACL configurée — crée la première !"}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 px-5 py-3 border-b border-kafka-border text-xs text-slate-500 font-medium">
              <span>Type</span>
              <span className="col-span-2">Ressource</span>
              <span className="col-span-2">Principal</span>
              <span>Opération</span>
              <span className="text-right">Permission</span>
            </div>
            {filtered.map((acl, i) => (
              <div key={i} className="grid grid-cols-7 items-center px-5 py-3 border-b border-kafka-border/50 hover:bg-kafka-bg/50 transition group">
                <span className="text-xs px-2 py-0.5 bg-kafka-bg border border-kafka-border rounded text-slate-400 w-fit">
                  {acl.resourceType}
                </span>
                <div className="col-span-2">
                  <p className="text-slate-300 text-xs font-mono">{acl.resourceName}</p>
                  <p className="text-slate-600 text-xs">{acl.patternType}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-300 text-xs font-mono truncate">{acl.principal}</p>
                  <p className="text-slate-600 text-xs">host: {acl.host}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded w-fit ${OP_STYLE[acl.operation] || "bg-kafka-bg text-slate-400"}`}>
                  {acl.operation}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${PERM_STYLE[acl.permissionType] || ""}`}>
                    {acl.permissionType}
                  </span>
                  <button onClick={() => setDeleting(acl)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-kafka-border">
              <h2 className="font-semibold text-white flex items-center gap-2"><Shield size={16} className="text-kafka-accent" /> Créer une ACL</h2>
              <button onClick={() => { setShowCreate(false); setFormError(""); setForm(DEFAULT_FORM); }}
                className="p-1.5 hover:bg-kafka-bg rounded-lg text-slate-400 hover:text-white transition"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Type de ressource</label>
                  <select value={form.resourceType} onChange={e => setForm(f => ({ ...f, resourceType: e.target.value }))}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                    {RESOURCE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Pattern type</label>
                  <select value={form.patternType} onChange={e => setForm(f => ({ ...f, patternType: e.target.value }))}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                    {PATTERN_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Nom de la ressource <span className="text-red-400">*</span></label>
                <input value={form.resourceName} onChange={e => setForm(f => ({ ...f, resourceName: e.target.value }))}
                  placeholder="mon-topic ou * pour tous"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Principal <span className="text-red-400">*</span></label>
                <input value={form.principal} onChange={e => setForm(f => ({ ...f, principal: e.target.value }))}
                  placeholder="User:alice ou Group:mon-groupe"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Host</label>
                <input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                  placeholder="* pour tous les hôtes"
                  className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Opération</label>
                  <select value={form.operation} onChange={e => setForm(f => ({ ...f, operation: e.target.value }))}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                    {OPERATIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Permission</label>
                  <select value={form.permissionType} onChange={e => setForm(f => ({ ...f, permissionType: e.target.value }))}
                    className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                    {PERMISSION_TYPES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              {formError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><p className="text-red-400 text-sm">{formError}</p></div>}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => { setShowCreate(false); setFormError(""); setForm(DEFAULT_FORM); }}
                className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">Annuler</button>
              <button onClick={handleCreate}
                className="flex-1 py-2.5 bg-kafka-accent hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition">Créer</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h2 className="font-semibold text-white">Supprimer l'ACL</h2>
              <div className="mt-3 p-3 bg-kafka-bg rounded-lg text-left space-y-1">
                <p className="text-xs text-slate-400">Ressource : <span className="text-white font-mono">{deleting.resourceName}</span></p>
                <p className="text-xs text-slate-400">Principal : <span className="text-white font-mono">{deleting.principal}</span></p>
                <p className="text-xs text-slate-400">Opération : <span className="text-white font-mono">{deleting.operation}</span></p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">Annuler</button>
              <button onClick={() => handleDelete(deleting)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
