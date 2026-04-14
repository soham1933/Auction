import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './layout/AppShell';
import AdminDashboard from './pages/AdminDashboard';
import AuctionRoom from './pages/AuctionRoom';

const App = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<AuctionRoom />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
