import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { clusterApi } from "./services/api";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AddClusterModal from "./components/AddClusterModal";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Topics from "./pages/Topics";
import ConsumerGroups from "./pages/ConsumerGroups";
import Messages from "./pages/Messages";
import Brokers from "./pages/Brokers";
import Acls from "./pages/Acls";
import "./index.css";

function Layout() {
  const { user } = useAuth();
  const [clusters,       setClusters]       = useState([]);
  const [activeCluster,  setActiveCluster]  = useState(null);
  const [showAddCluster, setShowAddCluster] = useState(false);

  useEffect(() => {
    if (!user) return;
    clusterApi.list().then(res => {
      setClusters(res.data);
      if (res.data.length > 0) setActiveCluster(res.data[0]);
    }).catch(console.error);
  }, [user]);

  const handleClusterAdded = (cluster) => {
    setClusters(prev => [...prev, cluster]);
    setActiveCluster(cluster);
  };

  const ComingSoon = ({ title }) => (
    <div className="flex items-center justify-center h-full text-slate-500">
      <div className="text-center"><p className="text-4xl mb-4">🚧</p><p className="text-lg text-slate-400">{title}</p><p className="text-sm mt-2">En développement</p></div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-kafka-bg overflow-hidden">
      <Navbar activeCluster={activeCluster} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar clusters={clusters} activeCluster={activeCluster}
          onSelectCluster={setActiveCluster} onAddCluster={() => setShowAddCluster(true)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/"         element={<Dashboard      cluster={activeCluster} />} />
            <Route path="/brokers"  element={<Brokers        cluster={activeCluster} />} />
            <Route path="/topics"   element={<Topics         cluster={activeCluster} />} />
            <Route path="/groups"   element={<ConsumerGroups cluster={activeCluster} />} />
            <Route path="/messages" element={<Messages       cluster={activeCluster} />} />
            <Route path="/acls"     element={<Acls           cluster={activeCluster} />} />
            <Route path="/health"   element={<ComingSoon title="Health Report" />} />
            <Route path="/ai"       element={<ComingSoon title="IA Assistant" />} />
          </Routes>
        </main>
      </div>
      {showAddCluster && (
        <AddClusterModal onClose={() => setShowAddCluster(false)} onAdded={handleClusterAdded} />
      )}
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="h-screen bg-kafka-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-kafka-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<PrivateRoute><Layout /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
