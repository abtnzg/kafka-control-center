import { Link } from "react-router-dom";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Kafka Control Center</div>
      <nav className="sidebar-nav">
        <Link to="/">Cluster overview</Link>
        <Link to="/topics">Topics</Link>
        <Link to="/consumer-groups">Consumer groups</Link>
      </nav>
    </aside>
  );
}