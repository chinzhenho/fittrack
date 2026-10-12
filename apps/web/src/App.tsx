import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { ToastProvider } from './components/Toast';
import { useAuth } from './data/auth';
import { useAppState } from './data/store';
import { useSync } from './data/sync';
import { AddFood } from './pages/AddFood';
import { Loading, Login, ResetPassword, Signup, UpdatePassword, Welcome } from './pages/Auth';
import { Diary } from './pages/Diary';
import { Disclaimer, HowWeCalculate, Privacy } from './pages/Info';
import { Me } from './pages/Me';
import { Onboarding } from './pages/Onboarding';
import { Progress } from './pages/Progress';
import { Today } from './pages/Today';
import { Workout } from './pages/Workout';
import { WorkoutSession } from './pages/WorkoutSession';

/** Where a visitor without a profile on this device should go. */
function useEntryRoute(): 'loading' | '/onboarding' | '/welcome' {
  const auth = useAuth();
  const sync = useSync();
  if (auth.status === 'loading') return 'loading';
  if (auth.status === 'signedIn') return sync.ready ? '/onboarding' : 'loading';
  return '/welcome';
}

function RequireProfile({ children }: { children: ReactNode }) {
  const { profile } = useAppState();
  const entry = useEntryRoute();
  if (profile) return children;
  return entry === 'loading' ? <Loading /> : <Navigate to={entry} replace />;
}

function OnboardingGate() {
  const { profile } = useAppState();
  const entry = useEntryRoute();
  if (profile) return <Navigate to="/today" replace />;
  return entry === 'loading' ? <Loading /> : <Onboarding />;
}

function WelcomeGate() {
  const { profile } = useAppState();
  const entry = useEntryRoute();
  if (profile) return <Navigate to="/today" replace />;
  if (entry === 'loading') return <Loading />;
  return entry === '/onboarding' ? <Navigate to="/onboarding" replace /> : <Welcome />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomeGate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/onboarding" element={<OnboardingGate />} />
      <Route path="/how-we-calculate" element={<HowWeCalculate />} />
      <Route path="/legal/disclaimer" element={<Disclaimer />} />
      <Route path="/legal/privacy" element={<Privacy />} />
      <Route
        element={
          <RequireProfile>
            <AppShell />
          </RequireProfile>
        }
      >
        <Route path="/today" element={<Today />} />
        <Route path="/diary" element={<Diary />} />
        <Route path="/diary/add" element={<AddFood />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/workout/start/:templateId" element={<WorkoutSession />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/me" element={<Me />} />
      </Route>
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}
