import { NavLink } from "react-router-dom";
import { LayoutDashboard, List, Users, Activity, MessageSquare, Brain, Plus, ChevronDown, Server, Shield } from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/",        icon: LayoutDashboard, label: "Dashboard"        },
  { to: "/brokers", icon: Server,          label: "Brokers"          },
  { to: "/topics",  icon: List,            label: "Topics"           },
  { to: "/groups",  icon: Users,           label: "Consumer Groups"  },
  { to: "/messages",icon: MessageSquare,   label: "Messages"         },
  { to: "/acls",    icon: Shield,          label: "ACLs"             },
  { to: "/health",  icon: Activity,        label: "Health"           },
  { to: "/ai",      icon: Brain,           label: "IA Assistant", badge: "AI" },
];

export default function Sidebar({ clusters, activeCluster, onSelectCluster, onAddCluster }) {
  const [clusterOpen, setClusterOpen] = useState(true);

  return (
    <aside className="w-56 bg-kafka-surface border-r border-kafka-border flex flex-col shrink-0">
      <div className="p-3 border-b border-kafka-border">
        <button onClick={() => setClusterOpen(!clusterOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-kafka-bg text-sm text-slate-300 transition">
          <span className="font-medium truncate">{activeCluster?.name || "Sélectionner un cluster"}</span>
          <ChevronDown size={14} className={`transition-transform ${clusterOpen ? "rotate-180" : ""}`} />
        </button>
        {clusterOpen && (
          <div className="mt-1 space-y-1">
            {clusters.map(c => (
              <button key={c.id} onClick={() => onSelectCluster(c)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center gap-2 ${
                  activeCluster?.id === c.id
                    ? "bg-kafka-accent/10 text-kafka-accent border border-kafka-accent/30"
                    : "text-slate-400 hover:bg-kafka-bg hover:text-white"
                }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${activeCluster?.id === c.id ? "bg-kafka-success" : "bg-slate-600"}`} />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            <button onClick={onAddCluster}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-kafka-accent hover:bg-kafka-bg transition">
              <Plus size={12} /> Ajouter un cluster
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                isActive
                  ? "bg-kafka-accent/10 text-kafka-accent border border-kafka-accent/20"
                  : "text-slate-400 hover:bg-kafka-bg hover:text-white"
              }`
            }>
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {badge && <span className="text-xs px-1.5 py-0.5 bg-kafka-accent rounded text-white font-medium">{badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-kafka-border">
        <p className="text-xs text-slate-600 text-center">KafkaMind v1.0.0</p>
      </div>
    </aside>
  );
}
