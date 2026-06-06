import {
  FiClock,
  FiDollarSign,
  FiDownload,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import { demoLaborSummary, demoSchedule, demoStaff } from "../data/demo";
import { money } from "../utils/format";

export default function RRHH() {
  const payrollTotal = demoStaff.reduce(
    (sum, staff) => sum + staff.sueldo + staff.ventas * 0.03 + staff.propinas,
    0
  );
  const topSeller = demoStaff.reduce((best, staff) =>
    staff.ventas > best.ventas ? staff : best
  );

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
            <button className="btn primary" type="button">
              <FiUserPlus /> Agregar empleado
            </button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat
          icon={FiUsers}
          label="Empleados"
          value={demoLaborSummary.empleados}
          hint="Equipo activo"
          tone="blue"
        />
        <Stat
          icon={FiDollarSign}
          label="Costo laboral"
          value={`${demoLaborSummary.costoLaboral}%`}
          hint={money(demoLaborSummary.costoMes)}
          tone="amber"
        />
        <Stat
          icon={FiClock}
          label="Horas mes"
          value={demoLaborSummary.horasMes}
          hint={`${demoLaborSummary.tardanzas} tardanzas`}
          tone="red"
        />
        <Stat
          label="Propinas"
          value={money(demoLaborSummary.propinas)}
          hint="Por repartir"
          tone="green"
        />
      </div>

      <div className="two-col">
        <Card title="Cobertura de turnos">
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
        </Card>

        <Card title="Lectura del supervisor">
          <div className="insight-grid single">
            <div>
              <Badge tone="green">Mejor venta</Badge>
              <strong>{topSeller.nombre}</strong>
              <p>
                {topSeller.rol} con {money(topSeller.ventas)} vendidos en el
                mes. Puede liderar entrenamiento de servicio.
              </p>
            </div>
            <div>
              <Badge tone="amber">Riesgo</Badge>
              <strong>Cierre con baja cobertura</strong>
              <p>
                Turno de cierre al 74%. Conviene reforzar caja/supervision en
                viernes y sabado.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Planilla y rendimiento">
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
              {demoStaff.map((staff) => {
                const commission = staff.ventas * 0.03;
                const total = staff.sueldo + commission + staff.propinas;

                return (
                  <tr key={staff.nombre}>
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
                      <Badge tone={staff.estado === "Activo" ? "green" : "amber"}>
                        {staff.estado}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
