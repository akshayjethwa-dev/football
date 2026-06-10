/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';
import ClientsPage from './pages/ClientsPage';
import ClientFormPage from './pages/ClientFormPage';
import ClientCampaignsPage from './pages/ClientCampaignsPage';
import CampaignFormPage from './pages/CampaignFormPage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import PublicCampaignLanding from './pages/PublicCampaignLanding';
import { Shield } from 'lucide-react';

function ProtectedRoute({ children, requireSuperAdmin = false }: { children: React.ReactNode; requireSuperAdmin?: boolean }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <svg className="animate-spin h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">Establishing secure connection...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireSuperAdmin && profile && profile.role !== 'superadmin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20 text-rose-400">
          <Shield className="h-10 w-10" />
        </div>
        <h1 className="text-xl font-bold text-white font-sans">Access Denied</h1>
        <p className="text-slate-400 text-sm max-w-md leading-relaxed">
          Your profile account is marked as a **ClientAdmin**, which behaves as an observer in the v1 SuperAdmin directory scope. Clients directory access is restricted strictly to Ashrey Systems SuperAdmins.
        </p>
        <div className="pt-2">
          <button
            onClick={() => window.location.href = '/admin/login'} // logout fallback
            className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Refit Credentials
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RedirectRoot() {
  const { user } = useAuth();
  return user ? <Navigate to="/admin/clients" replace /> : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public / Auth Gateway */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/c/:campaignId" element={<PublicCampaignLanding />} />

          {/* Secure Admin Workspace Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireSuperAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/clients" replace />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/new" element={<ClientFormPage />} />
            <Route path="clients/edit/:id" element={<ClientFormPage />} />
            <Route path="clients/:clientId/campaigns" element={<ClientCampaignsPage />} />
            <Route path="clients/:clientId/campaigns/new" element={<CampaignFormPage />} />
            <Route path="clients/:clientId/campaigns/edit/:campaignId" element={<CampaignFormPage />} />
            <Route path="clients/:clientId/campaigns/:campaignId" element={<CampaignDetailPage />} />
          </Route>

          {/* Root dynamic redirects */}
          <Route path="/" element={<RedirectRoot />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
