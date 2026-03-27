import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ClusterOverviewPage } from "../pages/ClusterOverviewPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<ClusterOverviewPage />} />
          {/* plus tard: /topics, /consumer-groups, etc. */}
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}