import React from "react";
import MetricCard from "../components/MetricCard";
import LiveChart from "../components/LiveChart";
import { useWebSocket } from "../hooks/useWebSocket";


export default function Dashboard() {
  const metrics = useWebSocket("ws://localhost:8000/ws/metrics");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Cluster Overview</h1>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Lag total" value={metrics?.lag || 0} color="text-amber-400" />
        <MetricCard title="Throughput" value={metrics?.throughput || 0} color="text-indigo-400" />
        <MetricCard title="Topics" value={metrics?.topics || 0} color="text-green-400" />
        <MetricCard title="Brokers UP" value={metrics?.brokers || 0} color="text-blue-400" />
      </div>

      <div className="bg-slate-800 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Lag par Consumer Group</h2>
        <LiveChart data={metrics?.lagSeries || []} />
      </div>
    </div>
  );
}