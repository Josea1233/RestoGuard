import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiClock,
  FiDollarSign,
  FiDownload,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import { demoLaborSummary, demoSchedule, demoStaff } from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { money, supabaseMessage } from "../utils/format";

function normalizeEmployee(employee) {
  return {
    ...employee,
    sueldo: Number(employee.sueldo) || 0,
    ventas: Number(employee.ventas) || 0,
    propinas: Number(employee.propinas) || 0,
    horas: Number(employee.horas) || 0,
    tardanzas: Number(employee.tardanzas) || 0,
    asistencia: employee.asistencia || "0/0",
    estado: employee.estado || "ACTIVO",
  };
}

export default function RRHH() {
  const { negocioId } = useTenant();
  const realMode = authEnabled && Boolean(supabase);
  const [employees, setEmployees] = useState(() =>
    realMode ? [] : demoStaff.map(normalizeEmployee)
  );
  const [loading, setLoading] = useState(realMode);
  const [message, setMessage] = useState("");

  const loadEmployees = useCallback(async () => {
    if (!realMode) {
      setEmployees(demoStaff.map(normalizeEmployee));
      setLoading(false);
      return;
    }

    if (!negocioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("empleados")
      .select("id,nombre,rol,email,telefono,sueldo,estado,created_at")
      .eq("negocio_id", negocioId)
      .order("id", { ascending: true });

    if (error) {
      setMessage(
        `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`
      );
      setLoading(false);
      return;
    }

    setEmployees((data || []).map(normalizeEmployee));
    setLoading(false);
  }, [negocioId, realMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadEmployees();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadEmployees]);

  const payrollTotal = employees.reduce(
    (sum, staff) => sum + staff.sueldo + staff.ventas * 0.03 + staff.propinas,
    0
  );
  const topSeller = employees.reduce(
    (best, staff) => (staff.ventas > best.ventas ? staff : best),
    employees[0] || null
  );
  const activeEmployees = employees.filter((staff) =>
    ["ACTIVO", "Activo"].includes(staff.estado)
  );
  const summary = useMemo(() => {
    if (!realMode) return demoLaborSummary;

    return {
      empleados: activeEmployees.length,
      costoLaboral: 0,
      costoMes: payrollTotal,
      horasMes: employees.reduce((sum, staff) => sum + staff.horas, 0),
      tardanzas: employees.reduce((sum, staff) => sum + staff.tardanzas, 0),
      propinas: employees.reduce((sum, staff) => sum + staff.propinas, 0),
    };
  }, [activeEmployees.length, employees, payrollTotal, realMode]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Labor y equipo"
        title="RRHH"
        subtitle="Turnos, asistencia, planilla, propinas, comisiones y permisos del personal."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiDownload /> Exportar planilla
            </button>
            <Link className="btn primary" to="/configuracion">
              <FiUserPlus /> Agregar empleado
            </Link>
          </div>
        }
      />

      {message && <div className="notice warning">{message}</div>}
      {loading && <div className="notice">Cargando RRHH...</div>}

      <div className="stats-grid">
        <Stat
          icon={FiUsers}
          label="Empleados"
          value={summary.empleados}
          hint="Equipo activo"
          tone="blue"
        />
        <Stat
          icon={FiDollarSign}
          label="Costo laboral"
          value={realMode ? money(summary.costoMes) : `${summary.costoLaboral}%`}
          hint={realMode ? "Sueldo mensual" : money(summary.costoMes)}
          tone="amber"
        />
        <Stat
          icon={FiClock}
          label="Horas mes"
          value={summary.horasMes}
          hint={`${summary.tardanzas} tardanzas`}
          tone="red"
        />
        <Stat
          label="Propinas"
          value={money(summary.propinas)}
          hint="Por repartir"
          tone="green"
        />
      </div>

      <div className="two-col">
        <Card title="Cobertura de turnos">
          {!realMode ? (
            <div className="stack">
              {demoSchedule.map((shift) => (
                <div className="labor-row" key={shift.turno}>
                  <div>
                    <strong>{shift.turno}</strong>
                    <span>
                      {shift.hora} / {shift.equipo}
                    </span>
                  </div>
                  <div className="load-meter">
                    <i style={{ "--bar": `${shift.cobertura}%` }} />
                  </div>
                  <Badge tone={shift.cobertura >= 85 ? "green" : "amber"}>
                    {shift.cobertura}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Turnos en cero"
              text="La planilla ya es real; los turnos se pueden agregar como siguiente modulo."
            />
          )}
        </Card>

        <Card title="Lectura del supervisor">
          {employees.length ? (
            <div className="insight-grid single">
              <div>
                <Badge tone="green">Equipo</Badge>
                <strong>{topSeller?.nombre || "Sin ventas"}</strong>
                <p>
                  {realMode
                    ? "Empleado registrado en el negocio. Las ventas y asistencia se conectaran al cerrar pedidos por responsable."
                    : `${topSeller.rol} con ${money(topSeller.ventas)} vendidos en el mes.`}
                </p>
              </div>
              <div>
                <Badge tone="amber">Operacion</Badge>
                <strong>Control separado</strong>
                <p>
                  RRHH queda fuera de finanzas para que el cliente no mezcle
                  planilla, caja e inventario en una sola pantalla.
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Sin empleados"
              text="Agrega empleados para armar planilla y roles."
            />
          )}
        </Card>
      </div>

      <Card title="Planilla y rendimiento">
        {employees.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Rol</th>
                  <th>Sueldo</th>
                  <th>Ventas</th>
                  <th>Comision</th>
                  <th>Propinas</th>
                  <th>Total</th>
                  <th>Asistencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((staff) => {
                  const commission = staff.ventas * 0.03;
                  const total = staff.sueldo + commission + staff.propinas;

                  return (
                    <tr key={staff.id || staff.nombre}>
                      <td>{staff.nombre}</td>
                      <td>{staff.rol}</td>
                      <td>{money(staff.sueldo)}</td>
                      <td>{money(staff.ventas)}</td>
                      <td>{money(commission)}</td>
                      <td>{money(staff.propinas)}</td>
                      <td>{money(total)}</td>
                      <td>
                        {staff.asistencia}
                        <span className="table-sub">
                          {staff.horas} h / {staff.tardanzas} tardanzas
                        </span>
                      </td>
                      <td>
                        <Badge
                          tone={
                            ["ACTIVO", "Activo"].includes(staff.estado)
                              ? "green"
                              : "amber"
                          }
                        >
                          {staff.estado}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Planilla en cero"
            text="Los empleados que crees en Configuracion apareceran aqui."
          />
        )}
      </Card>

      <Card title="Resumen de pago">
        <div className="ticket-total">
          <span>Total estimado de planilla, comisiones y propinas</span>
          <strong>{money(payrollTotal)}</strong>
        </div>
      </Card>
    </div>
  );
}
