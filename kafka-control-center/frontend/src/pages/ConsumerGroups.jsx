import { useEffect, useState } from "react";
import { groupApi } from "../services/api";
import { RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

export default function ConsumerGroups({ cluster }) {
  const [groups,   setGroups]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [lagData,  setLagData]  = useState({});

  const load = () => {
    if (!cluster) return;
    setLoading(true);
    groupApi.list(cluster.id).then(r => setGroups(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [cluster]);

  const toggleLag = async (groupId) => {
    if (expanded === groupId) { setExpanded(null); return; }
    setExpanded(groupId);
    if (lagData[groupId]) return;
    try { const res = await groupApi.lag(cluster.id, groupId); setLagData(d => ({...d, [groupId]: res.data})); }
    catch { setLagData(d => ({...d, [groupId]: {}})); }
  };

  if (!cluster) return <div className="flex items-center justify-center h-full text-slate-500"><p>Sélectionne un cluster</p></div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-white">Consumer Groups</h1><p className="text-slate-500 text-sm">{groups.length} groupes</p></div>
        <button onClick={load} className="p-2 rounded-lg border border-kafka-border text-slate-400 hover:text-white transition"><RefreshCw size={16} className={loading?"animate-spin":""} /></button>
      </div>
      <div className="bg-kafka-surface border border-kafka-border rounded-xl overflow-hidden">
        {groups.length === 0
          ? <div className="px-5 py-10 text-center text-slate-600">Aucun consumer group</div>
          : groups.map(g => (
            <div key={g.groupId} className="border-b border-kafka-border/50 last:border-0">
              <button onClick={() => toggleLag(g.groupId)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-kafka-bg/50 transition text-left">
                {expanded===g.groupId ? <ChevronDown size={14} className="text-slate-500"/> : <ChevronRight size={14} className="text-slate-500"/>}
                <span className="text-slate-300 font-mono text-xs flex-1">{g.groupId}</span>
                <span className="text-slate-500 text-xs">{g.members} membres</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${g.state==="Stable"?"bg-green-500/10 text-green-400":"bg-slate-500/10 text-slate-400"}`}>{g.state}</span>
              </button>
              {expanded===g.groupId && (
                <div className="px-5 pb-4">
                  {Object.keys(lagData[g.groupId]||{}).length===0
                    ? <div className="text-slate-600 text-xs">Aucun lag disponible</div>
                    : <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(lagData[g.groupId]).map(([tp,lag]) => (
                          <div key={tp} className="flex items-center justify-between px-3 py-2 bg-kafka-bg rounded-lg">
                            <span className="text-slate-500 font-mono text-xs truncate">{tp}</span>
                            <span className={`text-xs font-semibold ml-2 ${lag>1000?"text-red-400":lag>100?"text-yellow-400":"text-green-400"}`}>{lag.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}