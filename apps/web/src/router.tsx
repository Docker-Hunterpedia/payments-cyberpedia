import { Role } from '@cyberpedia/shared';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { tokenStore } from '@/lib/auth';
import { useAuth } from '@/providers/auth-provider';
import { ComingSoon } from '@/routes/coming-soon';
import { CourseDetailPage } from '@/routes/course-detail';
import { CoursesPage } from '@/routes/courses';
import { DashboardPage } from '@/routes/dashboard';
import { FinancePage } from '@/routes/finance';
import { LoginPage } from '@/routes/login';
import { MorePage } from '@/routes/more';
import { RecordPaymentPage } from '@/routes/record';
import { SettingsPage } from '@/routes/settings';
import { StudentDetailPage } from '@/routes/student-detail';
import { StudentsPage } from '@/routes/students';
import { TeacherDetailPage } from '@/routes/teacher-detail';
import { TeachersPage } from '@/routes/teachers';
import { UnpaidPage } from '@/routes/unpaid';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!tokenStore.access || !user) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (tokenStore.access && user) return <Navigate to="/" replace />;
  return children;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== Role.ADMIN) return <Navigate to="/" replace />;
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="record" element={<RecordPaymentPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="unpaid" element={<UnpaidPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route
          path="teachers"
          element={
            <RequireAdmin>
              <TeachersPage />
            </RequireAdmin>
          }
        />
        <Route
          path="teachers/:id"
          element={
            <RequireAdmin>
              <TeacherDetailPage />
            </RequireAdmin>
          }
        />
        <Route
          path="finance"
          element={
            <RequireAdmin>
              <FinancePage />
            </RequireAdmin>
          }
        />
        <Route
          path="analytics"
          element={
            <RequireAdmin>
              <ComingSoon title="Analytics" />
            </RequireAdmin>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAdmin>
              <SettingsPage />
            </RequireAdmin>
          }
        />
        <Route path="more" element={<MorePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
