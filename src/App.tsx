import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { ResourceDetailPage } from '@/pages/ResourceDetailPage';
import { BookingsPage } from '@/pages/BookingsPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { TrainingPage } from '@/pages/TrainingPage';
import { AuditPage } from '@/pages/AuditPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/resources/:id" element={<ResourceDetailPage />} />
        <Route path="/bookings" element={<BookingsPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/training" element={<TrainingPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
