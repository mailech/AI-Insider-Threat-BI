import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { AlertsPage, RiskScoresPage } from '@/pages/AlertsPage';
import { PagePlaceholder } from '@/pages/PagePlaceholder';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="employees" element={<PagePlaceholder title="Employees" />} />
          <Route
            path="behavior"
            element={<PagePlaceholder title="Behavior Analytics" />}
          />
          <Route path="risk-scores" element={<RiskScoresPage />} />
          <Route
            path="investigations"
            element={<PagePlaceholder title="Investigations" />}
          />
          <Route path="reports" element={<PagePlaceholder title="Reports" />} />
          <Route path="settings" element={<PagePlaceholder title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
