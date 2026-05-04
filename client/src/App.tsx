import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { ExceptionsPage } from './pages/ExceptionsPage';
import { IntakeQueuePage } from './pages/IntakeQueuePage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { ShipmentDetailPage } from './pages/ShipmentDetailPage';
import { ShipmentsPage } from './pages/ShipmentsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/intake" replace />} />
          <Route path="/intake" element={<IntakeQueuePage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/shipments" element={<ShipmentsPage />} />
          <Route path="/shipments/:id" element={<ShipmentDetailPage />} />
          <Route path="/exceptions" element={<ExceptionsPage />} />
          <Route path="/dashboard" element={<ManagerDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
