import { useState } from "react";
import { X } from "lucide-react";
import { clusterApi } from "../services/api";

export default function AddClusterModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    name: "", bootstrapServers: "",
    saslMechanism: "", saslUsername: "", saslPassword: "",
    schemaRegistryUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.bootstrapServers) {
      setError("Nom et Bootstrap Servers obligatoires");
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await clusterApi.add(form);
      onAdded(res.data);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || "Erreur lors de l'ajout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-kafka-surface border border-kafka-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-kafka-border">
          <h2 className="font-semibold text-white">Ajouter un cluster Kafka</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-kafka-bg rounded-lg text-slate-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {[
            { key: "name",              label: "Nom du cluster",      placeholder: "Production EU",          required: true },
            { key: "bootstrapServers",  label: "Bootstrap Servers",   placeholder: "broker1:9092,broker2:9092", required: true },
            { key: "schemaRegistryUrl", label: "Schema Registry URL", placeholder: "http://schema-registry:8081" },
            { key: "saslMechanism",     label: "SASL Mechanism",      placeholder: "PLAIN (optionnel)" },
            { key: "saslUsername",      label: "SASL Username",       placeholder: "optionnel" },
            { key: "saslPassword",      label: "SASL Password",       placeholder: "optionnel", type: "password" },
          ].map(({ key, label, placeholder, required, type }) => (
            <div key={key}>
              <label className="text-xs text-slate-400 mb-1 block">
                {label} {required && <span className="text-red-400">*</span>}
              </label>
              <input
                type={type || "text"}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-kafka-accent transition"
              />
            </div>
          ))}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-kafka-border rounded-lg text-slate-400 hover:text-white text-sm transition">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition">
            {loading ? "Connexion..." : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}
