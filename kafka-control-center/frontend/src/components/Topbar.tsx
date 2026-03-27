import React from "react";

export default function Topbar() {
  return (
    <header className="w-full bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <input
        type="text"
        placeholder="Rechercher un topic..."
        className="bg-slate-800 px-3 py-2 rounded text-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="flex items-center gap-4">
        <button className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm">
          Ajouter un cluster
        </button>
        <div className="w-8 h-8 rounded-full bg-slate-700"></div>
      </div>
    </header>
  );
}