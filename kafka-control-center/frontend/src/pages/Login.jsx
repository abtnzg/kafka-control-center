import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const { login, register }         = useAuth();
  const navigate                    = useNavigate();

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      isRegister ? await register(email, password) : await login(email, password);
      navigate("/");
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-kafka-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-kafka-accent flex items-center justify-center text-xl">⚡</div>
            <span className="text-2xl font-bold text-white">KafkaMind</span>
          </div>
          <p className="text-slate-400 text-sm">Kafka intelligent, propulsé par l'IA</p>
        </div>

        {/* Card */}
        <div className="bg-kafka-surface border border-kafka-border rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">
            {isRegister ? "Créer un compte" : "Se connecter"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-kafka-accent transition"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full bg-kafka-bg border border-kafka-border rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-kafka-accent transition"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="mt-6 w-full bg-kafka-accent hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition text-sm"
          >
            {loading ? "Chargement..." : isRegister ? "Créer mon compte" : "Se connecter"}
          </button>

          <p className="text-center text-slate-500 text-sm mt-6">
            {isRegister ? "Déjà un compte ?" : "Pas encore de compte ?"}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-kafka-accent hover:underline ml-1"
            >
              {isRegister ? "Se connecter" : "S'inscrire gratuitement"}
            </button>
          </p>
        </div>

        {/* Plans info */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            { plan: "Free",       price: "0€",   limit: "50 req/mois" },
            { plan: "Pro",        price: "49€",  limit: "500 req/mois" },
            { plan: "Enterprise", price: "199€", limit: "Illimité" },
          ].map(p => (
            <div key={p.plan} className="bg-kafka-surface border border-kafka-border rounded-xl p-3">
              <p className="text-white text-sm font-medium">{p.plan}</p>
              <p className="text-kafka-accent font-bold">{p.price}</p>
              <p className="text-slate-500 text-xs">{p.limit}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
