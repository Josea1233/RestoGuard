import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import AuthGate from "./components/AuthGate";
import { TenantProvider, useTenant } from "./context/TenantContext";
import Admin from "./pages/Admin";
import Analisis from "./pages/Analisis";
import Cocina from "./pages/Cocina";
import Dashboard from "./pages/Dashboard";
import Finanzas from "./pages/Finanzas";
import Inventario from "./pages/Inventario";
import Merma from "./pages/Merma";
import Operacion from "./pages/Operacion";
import RRHH from "./pages/RRHH";
import { supabase } from "./services/supabase";

function LoadingScreen() {
  return (
    <div className="screen-center">
      <div className="panel narrow">
        <p className="muted">Cargando sistema...</p>
      </div>
    </div>
  );
}

function AccessBlocked() {
  const { error, reloadTenant } = useTenant();

  return (
    <div className="screen-center">
      <div className="panel narrow">
        <p className="eyebrow">Acceso privado</p>
        <h1>Cuenta sin negocio asignado</h1>
        <p className="muted">
          Tu usuario existe, pero todavia no fue conectado a un restaurante,
          bar o cafeteria. El administrador debe crear el negocio y asignarte.
        </p>
        {error && <div className="notice danger">{error}</div>}
        <div className="actions">
          <button className="btn primary" type="button" onClick={reloadTenant}>
            Reintentar
          </button>
          {supabase && (
            <button
              className="btn ghost"
              type="button"
              onClick={() => supabase.auth.signOut()}
            >
              Salir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SuspendedBusiness() {
  const { negocio, reloadTenant } = useTenant();

  return (
    <div className="screen-center">
      <div className="panel narrow">
        <p className="eyebrow danger-text">Negocio suspendido</p>
        <h1>{negocio?.nombre || "Acceso detenido"}</h1>
        <p className="muted">
          Este negocio esta suspendido temporalmente. Reactivalo desde el panel
          Super Admin cuando el cliente pague o continue la beta.
        </p>
        <div className="actions">
          <button className="btn primary" type="button" onClick={reloadTenant}>
            Reintentar
          </button>
          {supabase && (
            <button
              className="btn ghost"
              type="button"
              onClick={() => supabase.auth.signOut()}
            >
              Salir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TenantGate({ children }) {
  const { accessBlocked, loading, negocio, isSuperAdmin } = useTenant();

  if (loading) return <LoadingScreen />;
  if (accessBlocked) return <AccessBlocked />;
  if (negocio?.estado === "SUSPENDIDO" && !isSuperAdmin) {
    return <SuspendedBusiness />;
  }

  return children;
}

function AppRoutes() {
  const { negocio, isSuperAdmin } = useTenant();

  if (!negocio && isSuperAdmin) {
    return (
      <Routes>
        <Route path="*" element={<Admin />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/operacion" element={<Operacion />} />
      <Route path="/cocina" element={<Cocina />} />
      <Route path="/inventario" element={<Inventario />} />
      <Route path="/finanzas" element={<Finanzas />} />
      <Route path="/rrhh" element={<RRHH />} />
      <Route path="/merma" element={<Merma />} />
      <Route path="/analisis" element={<Analisis />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthGate>
      <TenantProvider>
        <BrowserRouter>
          <TenantGate>
            <AppShell>
              <AppRoutes />
            </AppShell>
          </TenantGate>
        </BrowserRouter>
      </TenantProvider>
    </AuthGate>
  );
}
