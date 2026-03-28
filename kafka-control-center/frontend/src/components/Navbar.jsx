import { useAuth } from "../context/AuthContext";
import { Bell, Settings, LogOut, Zap } from "lucide-react";

const PLAN_COLORS = {
  FREE:       "bg-slate-700 text-slate-300",
  PRO:        "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
  ENTERPRISE: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

export default function Navbar({ activeCluster }) {
  const { user, logout } = useAuth();

  return (
    <nav className="h-14 bg-kafka-surface border-b border-kafka-border flex items-center px-6 gap-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-kafka-accent flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-bold text-white text-sm">KafkaMind</span>
      </div>

      {/* Active cluster */}
      {activeCluster && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-kafka-bg border border-kafka-border rounded-lg">
          <div className="w-2 h-2 rounded-full bg-kafka-success animate-pulse" />
          <span className="text-slate-300 text-xs">{activeCluster.name}</span>
          <span className="text-slate-600 text-xs">{activeCluster.bootstrapServers}</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {/* Plan badge */}
        {user?.plan && (
          <span className={`text-xs px-2 py-1 rounded-md font-medium ${PLAN_COLORS[user.plan] || PLAN_COLORS.FREE}`}>
            {user.plan}
          </span>
        )}

        <span className="text-slate-500 text-xs">{user?.email}</span>

        <button className="p-1.5 rounded-lg hover:bg-kafka-bg text-slate-400 hover:text-white transition">
          <Bell size={16} />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-kafka-bg text-slate-400 hover:text-white transition">
          <Settings size={16} />
        </button>
        <button
          onClick={logout}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition"
        >
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
