import { useEffect, useState } from "react";
import { clusterApi } from "../services/api";
import { RefreshCw, Server, ChevronDown, ChevronRight, Shield } from "lucide-react";

const CONFIG_LABELS = {
  "log.retention.hours":        "Rétention logs (h)",
  "log.retention.bytes":        "Rétention logs (bytes)",
  "num.partitions":             "Partitions par défaut",
  "default.replication.factor": "Réplication par défaut",
  "min.insync.replicas":        "Min in-sync replicas",
  "compression.type":           "Compression",
  "message.max.bytes":          "Taille max message",
  "num.network.threads":        "Network threads",
  "num.io.threads":             "I/O threads",
  "log.dirs":                   "Répertoire logs",
  "auto.create.topics.enable":  "Auto-create topics",
  "delete.topic.enable":        "Suppression topics",
};

export default function Brokers({ cluster }) {
  const [brokers,  setBrokers]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = () => {
    if (!cluster) return;
    setLoading(true);
    clusterApi.brokers(cluster.id)
      .then(r => setBrokers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [cluster]);

  if (!cluster) return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <p>Sélectionne un cluster d'abord</p>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Brokers</h1>
          <p className="text-slate-500 text-sm">{brokers.length} broker(s) sur {cluster.name}</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-kafka-border text-slate-400 hover:text-white hover:bg-kafka-surface transition">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        [...Array(2)].map((_, i) => (
          <div key={i} className="bg-kafka-surface border border-kafka-border rounded-xl p-5">
            <div className="h-4 bg-kafka-border rounded animate-pulse w-32 mb-3" />
            <div className="h-3 bg-kafka-border rounded animate-pulse w-48" />
          </div>
        ))
      ) : brokers.length === 0 ? (
        <div className="bg-kafka-surface border border-kafka-border rounded-xl p-10 text-center text-slate-600">
          Aucun broker trouvé
        </div>
      ) : brokers.map(broker => (
        <div key={broker.id} className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
          {/* Broker header */}
          <button
            onClick={() => setExpanded(expanded === broker.id ? null : broker.id)}
            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-kafka-bg/50 transition text-left"
          >
            {expanded === broker.id
              ? <ChevronDown size={16} className="text-slate-500 shrink-0" />
              : <ChevronRight size={16} className="text-slate-500 shrink-0" />
            }
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              broker.controller
                ? "bg-kafka-accent/20 border border-kafka-accent/30"
                : "bg-kafka-bg border border-kafka-border"
            }`}>
              <Server size={18} className={broker.controller ? "text-kafka-accent" : "text-slate-400"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Broker #{broker.id}</span>
                {broker.controller && (
                  <span className="text-xs px-2 py-0.5 bg-kafka-accent/20 text-kafka-accent border border-kafka-accent/30 rounded-full font-medium">
                    Controller
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm font-mono">{broker.host}:{broker.port}</p>
            </div>
            <div className="text-right">
              {broker.rack && (
                <span className="text-xs text-slate-500">Rack: {broker.rack}</span>
              )}
              <div className={`w-2 h-2 rounded-full ml-auto mt-1 ${broker.controller ? "bg-kafka-accent" : "bg-green-400"}`} />
            </div>
          </button>

          {/* Broker configs */}
          {expanded === broker.id && (
            <div className="border-t border-kafka-border px-5 py-4">
              <h3 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Configuration</h3>
              {!broker.configs || Object.keys(broker.configs).length === 0 ? (
                <p className="text-slate-600 text-sm">Aucune configuration disponible</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(broker.configs).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 bg-kafka-bg rounded-lg border border-kafka-border">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">{CONFIG_LABELS[key] || key}</p>
                        <p className="text-xs font-mono text-slate-600 truncate">{key}</p>
                      </div>
                      <span className="text-xs font-mono text-slate-300 ml-3 shrink-0 max-w-[120px] truncate text-right">
                        {val || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
