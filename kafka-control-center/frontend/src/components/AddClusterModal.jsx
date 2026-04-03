import { useState } from "react";
import { clusterApi } from "../services/api";
import { X, Server, Shield, Cloud } from "lucide-react";

const AUTH_MODES = [
  { id: "none",  label: "Aucune (local)",  icon: Server },
  { id: "sasl",  label: "SASL (Confluent / MSK SCRAM)", icon: Shield },
  { id: "iam",   label: "AWS IAM (MSK recommandé)",      icon: Cloud },
];

export default function AddClusterModal({ onClose, onAdded }) {
  const [name,       setName]       = useState("");
  const [bootstrap,  setBootstrap]  = useState("");
  const [authMode,   setAuthMode]   = useState("none");
  const [mechanism,  setMechanism]  = useState("PLAIN");
  const [username,   setUsername]   = useState("");
  const [password,   setPassword]   = useState("");
  const [awsRegion,  setAwsRegion]  = useState("eu-west-1");
  const [tls,        setTls]        = useState(false);
  const [error,      setError]      = useState("");
  const [loading,    setLoading]    = useState(false);

  const handleSubmit = async () => {
    if (!name.trim())      { setError("Nom obligatoire"); return; }
    if (!bootstrap.trim()) { setError("Bootstrap servers obligatoire"); return; }

    const payload = {
      name, bootstrapServers: bootstrap,
      awsIam:      authMode === "iam",
      awsRegion:   authMode === "iam" ? awsRegion : null,
      tlsEnabled:  tls || authMode === "iam" || authMode === "sasl",
      saslMechanism: authMode === "sasl" ? mechanism : null,
      saslUsername:  authMode === "sasl" ? username  : null,
      saslPassword:  authMode === "sasl" ? password  : null,
    };

    setLoading(true);
    try {
      const r = await clusterApi.add(payload);
      onAdded(r.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || "Erreur création cluster");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-kafka-border">
          <h2 className="font-semibold text-white">Ajouter un cluster</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-kafka-bg rounded-lg text-slate-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nom */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Nom <span className="text-red-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Production EU"
              className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
          </div>

          {/* Bootstrap */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Bootstrap servers <span className="text-red-400">*</span></label>
            <input value={bootstrap} onChange={e => setBootstrap(e.target.value)}
              placeholder="localhost:9092  ou  boot-xxx.kafka.eu-west-1.amazonaws.com:9098"
              className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-kafka-accent transition" />
          </div>

          {/* Auth mode */}
          <div>
            <label className="text-xs text-slate-400 mb-2 block">Mode d'authentification</label>
            <div className="grid grid-cols-3 gap-2">
              {AUTH_MODES.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setAuthMode(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs transition ${
                    authMode === id
                      ? "bg-kafka-accent/10 border-kafka-accent text-kafka-accent"
                      : "bg-kafka-bg border-kafka-border text-slate-400 hover:text-white"
                  }`}>
                  <Icon size={18} />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SASL */}
          {authMode === "sasl" && (
            <div className="bg-kafka-bg border border-kafka-border rounded-xl p-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Mécanisme</label>
                <select value={mechanism} onChange={e => setMechanism(e.target.value)}
                  className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                  <option value="PLAIN">PLAIN</option>
                  <option value="SCRAM-SHA-256">SCRAM-SHA-256</option>
                  <option value="SCRAM-SHA-512">SCRAM-SHA-512</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition" />
                </div>
              </div>
            </div>
          )}

          {/* AWS IAM */}
          {authMode === "iam" && (
            <div className="bg-kafka-bg border border-kafka-border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <Cloud size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-400 space-y-1">
                  <p className="font-medium">Prérequis AWS IAM</p>
                  <p className="text-amber-400/70">Le serveur doit avoir un rôle IAM avec les permissions <code>kafka-cluster:*</code> sur le MSK cluster.</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Région AWS</label>
                <select value={awsRegion} onChange={e => setAwsRegion(e.target.value)}
                  className="w-full bg-kafka-surface border border-kafka-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-kafka-accent transition">
                  {["eu-west-1","eu-west-3","eu-central-1","us-east-1","us-east-2","us-west-2","ap-southeast-1","ap-northeast-1"].map(r =>
                    <option key={r} value={r}>{r}</option>
                  )}
                </select>
              </div>
              <div className="text-xs text-slate-500">
                <p className="font-medium text-slate-400 mb-1">Bootstrap server MSK IAM :</p>
                <p className="font-mono">boot-xxxx.c1.kafka.eu-west-1.amazonaws.com:<span className="text-amber-400">9098</span></p>
                <p className="text-slate-600 mt-1">Port 9098 = IAM · 9092 = PLAINTEXT · 9094 = TLS · 9096 = SCRAM</p>
              </div>
            </div>
          )}

          {/* TLS toggle (pour none et sasl) */}
          {authMode !== "iam" && (
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-9 h-5 rounded-full transition-colors ${tls ? "bg-kafka-accent" : "bg-slate-600"}`}
                onClick={() => setTls(!tls)}>
                <div className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${tls ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-slate-400">Activer TLS/SSL</span>
            </label>
          )}

          {error && <p className="text-red-400 text-sm p-3 bg-red-500/10 rounded-lg">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 text-sm">Annuler</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
            {loading ? "Connexion..." : "Ajouter le cluster"}
          </button>
        </div>
      </div>
    </div>
  );
}
