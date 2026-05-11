import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import ExceptionsPage from './pages/ExceptionsPage';
import IntakePage from './pages/IntakePage';
import ShipmentDetailPage from './pages/ShipmentDetailPage';
import ShipmentsPage from './pages/ShipmentsPage';

export default function App() {
  return <Routes>
    <Route element={<Layout/>}>
      <Route path='/' element={<Navigate to='/intake'/>} />
      <Route path='/intake' element={<IntakePage/>} />
      <Route path='/documents/:id' element={<DocumentDetailPage/>} />
      <Route path='/shipments' element={<ShipmentsPage/>} />
      <Route path='/shipments/:id' element={<ShipmentDetailPage/>} />
      <Route path='/exceptions' element={<ExceptionsPage/>} />
      <Route path='/dashboard' element={<DashboardPage/>} />
    </Route>
  </Routes>;
}
