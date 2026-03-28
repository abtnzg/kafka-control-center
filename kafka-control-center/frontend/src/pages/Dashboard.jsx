import { useEffect, useState } from "react";
import { clusterApi, topicApi, groupApi } from "../services/api";
import { Activity, List, Users, Server } from "lucide-react";

export default function Dashboard({ cluster }) {
  const [health,  setHealth]  = useState(null);
  const [topics,  setTopics]  = useState([]);
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cluster) return;
    setLoading(true);
    Promise.all([
      clusterApi.health(cluster.id),
      topicApi.list(cluster.id),
      groupApi.list(cluster.id),
    ]).then(([h, t, g]) => {
      setHealth(h.data);
      setTopics(t.data);
      setGroups(g.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [cluster]);

  if (!cluster) return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <div className="text-center">
        <Server size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">Sélectionne un cluster dans la sidebar</p>
        <p className="text-sm mt-2">ou ajoute ton premier cluster Kafka</p>
      </div>
    </div>
  );

  const stats = [
    { label: "Brokers",         value: health?.brokersCount ?? "—", icon: Server,   color: "text-indigo-400" },
    { label: "Topics",          value: topics.length,               icon: List,    color: "text-blue-400"   },
    { label: "Consumer Groups", value: groups.length,               icon: Users,   color: "text-purple-400" },
    { label: "Controller",      value: health ? `#${health.controllerId}` : "—", icon: Activity, color: "text-green-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">{cluster.name}</h1>
        <p className="text-slate-500 text-sm mt-1">{cluster.bootstrapServers}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-kafka-surface border border-kafka-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-500 text-sm">{label}</span>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">
              {loading ? <span className="animate-pulse text-slate-600">—</span> : value}
            </p>
          </div>
        ))}
      </div>

      {/* Topics table */}
      <div className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-kafka-border flex items-center justify-between">
          <h2 className="font-medium text-white text-sm">Topics récents</h2>
          <span className="text-slate-500 text-xs">{topics.length} topics</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kafka-border">
                <th className="text-left px-5 py-3 text-slate-500 font-medium text-xs">Nom</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium text-xs">Partitions</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium text-xs">Réplication</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-kafka-border/50">
                    <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-48" /></td>
                    <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-8 ml-auto" /></td>
                    <td className="px-5 py-3"><div className="h-3 bg-kafka-border rounded animate-pulse w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : topics.slice(0, 10).map(t => (
                <tr key={t.name} className="border-b border-kafka-border/50 hover:bg-kafka-bg/50 transition">
                  <td className="px-5 py-3 text-slate-300 font-mono text-xs">{t.name}</td>
                  <td className="px-5 py-3 text-right text-slate-400">{t.partitions}</td>
                  <td className="px-5 py-3 text-right text-slate-400">{t.replicationFactor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consumer groups */}
      <div className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-kafka-border">
          <h2 className="font-medium text-white text-sm">Consumer Groups</h2>
        </div>
        <div className="divide-y divide-kafka-border">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="h-3 bg-kafka-border rounded animate-pulse w-40" />
                <div className="h-3 bg-kafka-border rounded animate-pulse w-16 ml-auto" />
              </div>
            ))
          ) : groups.slice(0, 8).map(g => (
            <div key={g.groupId} className="px-5 py-3 flex items-center justify-between hover:bg-kafka-bg/50 transition">
              <span className="text-slate-300 font-mono text-xs">{g.groupId}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-xs">{g.members} membres</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  g.state === "Stable"   ? "bg-green-500/20 text-green-400" :
                  g.state === "Empty"    ? "bg-slate-500/20 text-slate-400" :
                                           "bg-yellow-500/20 text-yellow-400"
                }`}>{g.state}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
