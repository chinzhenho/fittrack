import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { ToastProvider } from './components/Toast';
import { useAppState } from './data/store';
import { AddFood } from './pages/AddFood';
import { Diary } from './pages/Diary';
import { Disclaimer, HowWeCalculate, Privacy } from './pages/Info';
import { Me } from './pages/Me';
import { Onboarding } from './pages/Onboarding';
import { Progress } from './pages/Progress';
import { Today } from './pages/Today';
import { Workout } from './pages/Workout';
import { WorkoutSession } from './pages/WorkoutSession';

function RequireProfile({ children }: { children: ReactNode }) {
  const { profile } = useAppState();
  return profile ? children : <Navigate to="/onboarding" replace />;
}

function OnboardingGate() {
  const { profile } = useAppState();
  return profile ? <Navigate to="/today" replace /> : <Onboarding />;
}

export function AppRoutes() {
  return (
    <Routes>
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
