import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-screen p-4 flex flex-col">
      <h2 className="text-xl font-semibold mb-6 text-indigo-400">Kafka Control</h2>

      <nav className="flex-1 space-y-2">
        <Link className="block px-3 py-2 rounded hover:bg-slate-800" to="/">
          Dashboard
        </Link>
        <Link className="block px-3 py-2 rounded hover:bg-slate-800" to="/clusters">
          Clusters
        </Link>
        <Link className="block px-3 py-2 rounded hover:bg-slate-800" to="/topics">
          Topics
        </Link>
        <Link className="block px-3 py-2 rounded hover:bg-slate-800" to="/consumers">
          Consumer Groups
        </Link>
      </nav>

      <footer className="text-slate-500 text-sm">
        v0.1 — DevMind Kafka UI
      </footer>
    </aside>
  );
}