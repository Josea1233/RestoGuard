import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiCheckSquare,
  FiCreditCard,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiUserPlus,
} from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import { demoOnboarding, demoPlans, demoRoleMatrix } from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { date, daysLeft, money, supabaseMessage } from "../utils/format";

const roles = ["ADMIN", "SUPERVISOR", "CAJA", "MOZO", "COCINA", "BARRA"];
const estados = ["BETA", "ACTIVO", "SUSPENDIDO"];

export default function Admin() {
  const { isSuperAdmin, membership, negocio, negocioId, reloadTenant } =
    useTenant();
  const [members, setMembers] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(authEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [businessForm, setBusinessForm] = useState({
    nombre: negocio?.nombre || "",
    rubro: negocio?.rubro || "",
    ciudad: negocio?.ciudad || "",
  });
  const [newBusinessForm, setNewBusinessForm] = useState({
    nombre: "",
    rubro: "Restaurante",
    ciudad: "",
    ownerEmail: "",
  });
  const [memberForm, setMemberForm] = useState({
    email: "",
    rol: "MOZO",
  });

  const canManageCurrentBusiness =
    Boolean(negocioId) && (isSuperAdmin || membership?.rol === "ADMIN");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusinessForm({
        nombre: negocio?.nombre || "",
        rubro: negocio?.rubro || "",
        ciudad: negocio?.ciudad || "",
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [negocio]);

  const loadAdmin = useCallback(async () => {
    if (!authEnabled || !supabase) {
      setLoading(false);
      setMembers([
        { id: 1, email: "dueno@demo.com", rol: "ADMIN", created_at: new Date().toISOString() },
        { id: 2, email: "caja@demo.com", rol: "CAJA", created_at: new Date().toISOString() },
      ]);
      setBusinesses([
        {
          id: 1,
          nombre: "Demo Restaurante Bar",
          rubro: "Restaurante / Bar",
          ciudad: "Pucallpa",
          estado: "BETA",
          owner_email: "dueno@demo.com",
          trial_ends_at: negocio?.trial_ends_at,
          usuarios: 2,
        },
      ]);
      return;
    }

    setLoading(true);
    setMessage("");

    const membersPromise = negocioId
      ? supabase
          .from("negocio_usuarios")
          .select("id,user_id,email,rol,created_at")
          .eq("negocio_id", negocioId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null });

    const businessesPromise = isSuperAdmin
      ? supabase.rpc("listar_negocios_admin")
      : Promise.resolve({ data: [], error: null });

    const [membersResult, businessesResult] = await Promise.all([
      membersPromise,
      businessesPromise,
    ]);

    if (membersResult.error || businessesResult.error) {
      setMessage(
        supabaseMessage(membersResult.error || businessesResult.error)
      );
      setLoading(false);
      return;
    }

    setMembers(membersResult.data || []);
    setBusinesses(businessesResult.data || []);
    setLoading(false);
  }, [isSuperAdmin, negocio?.trial_ends_at, negocioId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAdmin();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAdmin]);

  async function saveBusiness() {
    if (!authEnabled || !supabase || !canManageCurrentBusiness) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("negocios")
      .update({
        nombre: businessForm.nombre.trim(),
        rubro: businessForm.rubro.trim(),
        ciudad: businessForm.ciudad.trim(),
      })
      .eq("id", negocioId);

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setMessage("Datos del negocio actualizados.");
    await reloadTenant();
    await loadAdmin();
  }

  async function createBusiness() {
    if (!authEnabled || !supabase || !isSuperAdmin) {
      setMessage("En modo demo no se crean negocios reales. Conecta Supabase.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("crear_negocio_admin", {
      p_nombre: newBusinessForm.nombre.trim(),
      p_rubro: newBusinessForm.rubro.trim(),
      p_ciudad: newBusinessForm.ciudad.trim(),
      p_owner_email: newBusinessForm.ownerEmail.trim().toLowerCase(),
    });

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setNewBusinessForm({
      nombre: "",
      rubro: "Restaurante",
      ciudad: "",
      ownerEmail: "",
    });
    setMessage("Negocio creado con beta de 30 dias.");
    await loadAdmin();
  }

  async function addMember() {
    if (!authEnabled || !supabase || !canManageCurrentBusiness) {
      setMessage("En modo demo no se agregan usuarios reales. Conecta Supabase.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("agregar_usuario_negocio", {
      p_negocio_id: negocioId,
      p_email: memberForm.email.trim().toLowerCase(),
      p_rol: memberForm.rol,
    });

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setMemberForm({ email: "", rol: "MOZO" });
    setMessage("Usuario agregado.");
    await loadAdmin();
  }

  async function changeBusinessState(businessId, estado) {
    if (!authEnabled || !supabase || !isSuperAdmin) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc("actualizar_estado_negocio", {
      p_negocio_id: businessId,
      p_estado: estado,
    });

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setMessage("Estado actualizado.");
    await loadAdmin();
    await reloadTenant();
  }

  const summary = useMemo(
    () => ({
      total: businesses.length,
      beta: businesses.filter((business) => business.estado === "BETA").length,
      suspended: businesses.filter((business) => business.estado === "SUSPENDIDO").length,
    }),
    [businesses]
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Accesos y clientes"
        title="Admin"
        subtitle="Crea negocios, asigna usuarios, controla beta y suspensiones."
        action={
          <button className="btn ghost" type="button" onClick={loadAdmin}>
            <FiRefreshCw /> Actualizar
          </button>
        }
      />

      {!authEnabled && (
        <div className="notice warning">
          Modo demo activo. Para usar clientes reales, configura Supabase y
          ejecuta supabase/restoguard.sql.
        </div>
      )}

      {message && <div className="notice">{message}</div>}

      <div className="admin-overview">
        <Card
          title="Planes comerciales"
          action={
            <button className="btn ghost" type="button">
              <FiCreditCard /> Cobros
            </button>
          }
        >
          <div className="plan-grid">
            {demoPlans.map((plan) => (
              <div className="plan-card" key={plan.nombre}>
                <div>
                  <Badge tone={plan.nombre === "Beta" ? "blue" : "green"}>
                    {plan.clientes} clientes
                  </Badge>
                  <strong>{plan.nombre}</strong>
                  <span>{plan.foco}</span>
                </div>
                <p>{plan.incluye}</p>
                <b>{plan.precio ? `${money(plan.precio)} / mes` : "Gratis"}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Onboarding del cliente"
          action={
            <button className="btn ghost" type="button">
              <FiCheckSquare /> Plantilla
            </button>
          }
        >
          <div className="onboarding-list">
            {demoOnboarding.map((step) => (
              <div className="check-row" key={step.paso}>
                <FiCheckSquare />
                <div>
                  <strong>{step.paso}</strong>
                  <span>{step.dueno}</span>
                </div>
                <Badge
                  tone={
                    step.estado === "Listo"
                      ? "green"
                      : step.estado === "En curso"
                        ? "blue"
                        : "amber"
                  }
                >
                  {step.estado}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Matriz de roles"
        action={
          <button className="btn ghost" type="button">
            <FiShield /> Seguridad
          </button>
        }
      >
        <div className="role-grid">
          {demoRoleMatrix.map((role) => (
            <div className="role-card" key={role.rol}>
              <Badge tone={role.rol === "ADMIN" ? "green" : "blue"}>
                {role.rol}
              </Badge>
              <span>{role.permisos}</span>
            </div>
          ))}
        </div>
      </Card>

      {isSuperAdmin && (
        <>
          <div className="stats-grid compact">
            <Stat label="Negocios" value={summary.total} />
            <Stat label="En beta" value={summary.beta} tone="blue" />
            <Stat label="Suspendidos" value={summary.suspended} tone="red" />
          </div>

          <div className="two-col">
            <Card title="Crear negocio">
              <div className="form-grid">
                <input
                  placeholder="Nombre del negocio"
                  value={newBusinessForm.nombre}
                  onChange={(event) =>
                    setNewBusinessForm((current) => ({
                      ...current,
                      nombre: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Rubro: restaurante, bar, cafeteria..."
                  value={newBusinessForm.rubro}
                  onChange={(event) =>
                    setNewBusinessForm((current) => ({
                      ...current,
                      rubro: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Ciudad"
                  value={newBusinessForm.ciudad}
                  onChange={(event) =>
                    setNewBusinessForm((current) => ({
                      ...current,
                      ciudad: event.target.value,
                    }))
                  }
                />
                <input
                  placeholder="Correo del dueno"
                  type="email"
                  value={newBusinessForm.ownerEmail}
                  onChange={(event) =>
                    setNewBusinessForm((current) => ({
                      ...current,
                      ownerEmail: event.target.value,
                    }))
                  }
                />
                <button
                  className="btn primary full"
                  type="button"
                  onClick={createBusiness}
                  disabled={saving || !newBusinessForm.nombre}
                >
                  <FiBriefcase /> Crear beta 30 dias
                </button>
              </div>
            </Card>

            <Card title="Negocios registrados">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Negocio</th>
                      <th>Dueno</th>
                      <th>Estado</th>
                      <th>Beta</th>
                      <th>Cambiar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {businesses.map((business) => (
                      <tr key={business.id}>
                        <td>
                          <strong>{business.nombre}</strong>
                          <span className="table-sub">
                            {business.rubro} / {business.ciudad}
                          </span>
                        </td>
                        <td>{business.owner_email || "-"}</td>
                        <td>
                          <Badge
                            tone={
                              business.estado === "ACTIVO"
                                ? "green"
                                : business.estado === "SUSPENDIDO"
                                  ? "red"
                                  : "blue"
                            }
                          >
                            {business.estado}
                          </Badge>
                        </td>
                        <td>
                          {date(business.trial_ends_at)}
                          {business.estado === "BETA" && (
                            <span className="table-sub">
                              {daysLeft(business.trial_ends_at)} dias
                            </span>
                          )}
                        </td>
                        <td>
                          <select
                            value={business.estado || "BETA"}
                            disabled={saving || !authEnabled}
                            onChange={(event) =>
                              changeBusinessState(business.id, event.target.value)
                            }
                          >
                            {estados.map((estado) => (
                              <option key={estado} value={estado}>
                                {estado}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                    {!loading && businesses.length === 0 && (
                      <tr>
                        <td colSpan="5">Aun no hay negocios registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {negocio && (
        <div className="two-col">
          <Card title="Datos del negocio">
            <div className="form-grid">
              <input
                placeholder="Nombre"
                value={businessForm.nombre}
                disabled={!canManageCurrentBusiness}
                onChange={(event) =>
                  setBusinessForm((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }))
                }
              />
              <input
                placeholder="Rubro"
                value={businessForm.rubro}
                disabled={!canManageCurrentBusiness}
                onChange={(event) =>
                  setBusinessForm((current) => ({
                    ...current,
                    rubro: event.target.value,
                  }))
                }
              />
              <input
                placeholder="Ciudad"
                value={businessForm.ciudad}
                disabled={!canManageCurrentBusiness}
                onChange={(event) =>
                  setBusinessForm((current) => ({
                    ...current,
                    ciudad: event.target.value,
                  }))
                }
              />
              <button
                className="btn primary full"
                type="button"
                onClick={saveBusiness}
                disabled={!canManageCurrentBusiness || saving || !authEnabled}
              >
                <FiSave /> Guardar
              </button>
            </div>
          </Card>

          <Card title="Usuarios del negocio">
            <div className="form-grid split">
              <input
                placeholder="correo@negocio.com"
                type="email"
                value={memberForm.email}
                disabled={!canManageCurrentBusiness}
                onChange={(event) =>
                  setMemberForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
              <select
                value={memberForm.rol}
                disabled={!canManageCurrentBusiness}
                onChange={(event) =>
                  setMemberForm((current) => ({
                    ...current,
                    rol: event.target.value,
                  }))
                }
              >
                {roles.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </select>
              <button
                className="btn primary full"
                type="button"
                onClick={addMember}
                disabled={!canManageCurrentBusiness || saving || !memberForm.email}
              >
                <FiUserPlus /> Agregar usuario
              </button>
            </div>

            <div className="stack mt">
              {members.map((member) => (
                <div className="row-item" key={member.id}>
                  <div>
                    <strong>{member.email}</strong>
                    <span>{date(member.created_at)}</span>
                  </div>
                  <Badge tone={member.rol === "ADMIN" ? "green" : "blue"}>
                    {member.rol}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
