import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AppShell from "./components/AppShell";
import AuthGate from "./components/AuthGate";
import { TenantProvider, useTenant } from "./context/TenantContext";
import Admin from "./pages/Admin";
import Analisis from "./pages/Analisis";
import Cocina from "./pages/Cocina";
import Configuracion from "./pages/Configuracion";
import Dashboard from "./pages/Dashboard";
import Finanzas from "./pages/Finanzas";
import Inventario from "./pages/Inventario";
import Merma from "./pages/Merma";
import Operacion from "./pages/Operacion";
import RRHH from "./pages/RRHH";
import { supabase } from "./services/supabase";
import { supabaseMessage } from "./utils/format";

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
  const [form, setForm] = useState({
    nombre: "",
    rubro: "Restaurante",
    ciudad: "Pucallpa",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function createBusiness() {
    if (!supabase) return;

    if (!form.nombre.trim()) {
      setMessage("Escribe el nombre del negocio para empezar.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: createError } = await supabase.rpc("crear_mi_negocio", {
      p_nombre: form.nombre.trim(),
      p_rubro: form.rubro.trim(),
      p_ciudad: form.ciudad.trim(),
    });

    setSaving(false);

    if (createError) {
      setMessage(supabaseMessage(createError));
      return;
    }

    await reloadTenant();
  }

  return (
    <div className="screen-center">
      <div className="panel narrow">
        <p className="eyebrow">Acceso privado</p>
        <h1>Crea tu negocio</h1>
        <p className="muted">
          Tu usuario existe, pero todavia no tiene restaurante, bar o cafeteria
          asignado. Crea tu negocio y empieza con la configuracion inicial.
        </p>
        {error && <div className="notice danger">{error}</div>}
        {message && <div className="notice warning">{message}</div>}
        <div className="form-grid">
          <input
            placeholder="Nombre del negocio"
            value={form.nombre}
            onChange={(event) =>
              setForm((current) => ({ ...current, nombre: event.target.value }))
            }
          />
          <input
            placeholder="Rubro"
            value={form.rubro}
            onChange={(event) =>
              setForm((current) => ({ ...current, rubro: event.target.value }))
            }
          />
          <input
            placeholder="Ciudad"
            value={form.ciudad}
            onChange={(event) =>
              setForm((current) => ({ ...current, ciudad: event.target.value }))
            }
          />
        </div>
        <div className="actions">
          <button
            className="btn primary"
            type="button"
            onClick={createBusiness}
            disabled={saving}
          >
            Crear negocio
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={reloadTenant}
            disabled={saving}
          >
            Actualizar
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
      <Route path="/configuracion" element={<Configuracion />} />
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
