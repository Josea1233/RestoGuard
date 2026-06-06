import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiActivity,
  FiClock,
  FiCpu,
  FiDollarSign,
  FiGrid,
  FiLogOut,
  FiMonitor,
  FiPackage,
  FiSettings,
  FiShoppingCart,
  FiTrendingDown,
  FiUserCheck,
} from "react-icons/fi";

import { useTenant } from "../context/TenantContext";
import { authEnabled, hasSupabaseConfig, supabase } from "../services/supabase";
import { daysLeft } from "../utils/format";

const navItems = [
  { to: "/", label: "Dashboard", icon: FiActivity },
  { to: "/operacion", label: "Operacion", icon: FiShoppingCart },
  { to: "/cocina", label: "Cocina/Barra", icon: FiMonitor },
  { to: "/inventario", label: "Inventario", icon: FiPackage },
  { to: "/finanzas", label: "Finanzas", icon: FiDollarSign },
  { to: "/rrhh", label: "RRHH", icon: FiUserCheck },
  { to: "/merma", label: "Merma", icon: FiTrendingDown },
  { to: "/analisis", label: "Analisis", icon: FiCpu },
  { to: "/admin", label: "Admin", icon: FiSettings },
];

export default function AppShell({ children }) {
  const { isSuperAdmin, negocio, user } = useTenant();
  const [clock, setClock] = useState("");
  const betaLeft = daysLeft(negocio?.trial_ends_at);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Intl.DateTimeFormat("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const visibleItems =
    !negocio && isSuperAdmin
      ? navItems.filter((item) => item.to === "/admin")
      : navItems;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <FiGrid />
          </div>
          <div>
            <h1>
              Resto<span>Guard</span>
            </h1>
            <p>{negocio?.nombre || (isSuperAdmin ? "Super Admin" : "SaaS")}</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacion principal">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="status-pill">
            <span className="dot" />
            {hasSupabaseConfig ? "Supabase listo" : "Modo demo"}
          </div>
          {negocio?.estado === "BETA" && betaLeft !== null && (
            <div className="beta-box">
              <strong>Beta</strong>
              <span>{betaLeft < 0 ? "Vencida" : `${betaLeft} dias`}</span>
            </div>
          )}
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">{negocio?.rubro || "Sistema gastronomico"}</p>
            <h2>{negocio?.ciudad || "Control privado por negocio"}</h2>
          </div>
          <div className="topbar-actions">
            <span className="clock">
              <FiClock />
              {clock}
            </span>
            <span className="user-chip">{user?.email || "demo"}</span>
            {authEnabled && supabase && (
              <button
                className="icon-btn"
                type="button"
                onClick={() => supabase.auth.signOut()}
                title="Salir"
              >
                <FiLogOut />
              </button>
            )}
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
