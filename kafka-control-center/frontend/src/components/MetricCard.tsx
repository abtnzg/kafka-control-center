export default function MetricCard({ title, value, color }) {
  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-md">
      <p className="text-slate-400 text-sm">{title}</p>
      <p className={`text-2xl font-semibold mt-1 ${color}`}>{value}</p>
    </div>
  );
}