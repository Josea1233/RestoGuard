import {
  FiAlertTriangle,
  FiClipboard,
  FiPlus,
  FiTarget,
  FiTrendingDown,
} from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import { demoMetrics, demoWaste, demoWasteActions, demoWasteCauses } from "../data/demo";
import { money } from "../utils/format";

export default function Merma() {
  const wasteValue = demoWaste.reduce((sum, item) => sum + item.perdida, 0);
  const recoverable = demoWaste.reduce((sum, item) => sum + item.recuperable, 0);
  const maxCause = Math.max(...demoWasteCauses.map((cause) => cause.valor));
  const pending = demoWaste.filter((item) => item.estado !== "Registrada");

  return (
    <div className="page">
      <PageHeader
        eyebrow="Control de perdida"
        title="Merma"
        subtitle="Perdidas, desperdicios, roturas, vencimientos y acciones para recuperar margen."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiClipboard /> Auditoria
            </button>
            <button className="btn primary" type="button">
              <FiPlus /> Registrar merma
            </button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat
          icon={FiTrendingDown}
          label="Merma mes"
          value={money(demoMetrics.mermaMes)}
          hint="Acumulado"
          tone="red"
        />
        <Stat
          icon={FiAlertTriangle}
          label="Merma hoy"
          value={money(wasteValue)}
          hint={`${demoWaste.length} registros`}
          tone="amber"
        />
        <Stat
          icon={FiTarget}
          label="Recuperable"
          value={money(recoverable)}
          hint="Puede salvarse"
          tone="green"
        />
        <Stat
          label="Pendientes"
          value={pending.length}
          hint="Requieren revision"
          tone="blue"
        />
      </div>

      <div className="two-col">
        <Card title="Causas principales">
          <div className="bar-list">
            {demoWasteCauses.map((cause) => (
              <div className="bar-row waste" key={cause.causa}>
                <span>{cause.causa}</span>
                <div className="bar-track">
                  <i style={{ "--bar": `${(cause.valor / maxCause) * 100}%` }} />
                </div>
                <strong>{money(cause.monto)}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Acciones correctivas">
          <div className="stack">
            {demoWasteActions.map((item) => (
              <div className="action-row" key={item.accion}>
                <Badge tone="blue">{item.responsable}</Badge>
                <div>
                  <strong>{item.accion}</strong>
                  <span>{item.impacto}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Registro de merma por producto">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Causa</th>
                <th>Area</th>
                <th>Cantidad</th>
                <th>Perdida</th>
                <th>Recuperable</th>
                <th>Responsable</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {demoWaste.map((item) => (
                <tr key={`${item.item}-${item.causa}`}>
                  <td>{item.item}</td>
                  <td>{item.causa}</td>
                  <td>{item.area}</td>
                  <td>{item.cantidad}</td>
                  <td>{money(item.perdida)}</td>
                  <td>{money(item.recuperable)}</td>
                  <td>{item.responsable}</td>
                  <td>
                    <Badge
                      tone={
                        item.estado === "Registrada"
                          ? "green"
                          : item.estado === "Pendiente"
                            ? "red"
                            : "amber"
                      }
                    >
                      {item.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
