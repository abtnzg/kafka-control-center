import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("km_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("km_token");
    if (token) {
      authApi.me()
        .then(res => { setUser(res.data); localStorage.setItem("km_user", JSON.stringify(res.data)); })
        .catch(() => { localStorage.removeItem("km_token"); localStorage.removeItem("km_user"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    localStorage.setItem("km_token", res.data.token);
    localStorage.setItem("km_user", JSON.stringify(res.data));
    setUser(res.data);
    return res.data;
  };

  const register = async (email, password) => {
    await authApi.register(email, password);
    return login(email, password);
  };

  const logout = () => {
    localStorage.removeItem("km_token");
    localStorage.removeItem("km_user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
