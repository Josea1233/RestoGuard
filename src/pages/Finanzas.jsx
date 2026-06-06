import {
  FiArrowDown,
  FiArrowUp,
  FiCheckSquare,
  FiDollarSign,
  FiExternalLink,
  FiTrendingUp,
} from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import {
  demoCashClosures,
  demoCashMovements,
  demoCostCenters,
  demoMetrics,
  demoPaymentMix,
} from "../data/demo";
import { money } from "../utils/format";

export default function Finanzas() {
  const paymentTotal = demoPaymentMix.reduce((sum, item) => sum + item.monto, 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Caja y rentabilidad"
        title="Finanzas"
        subtitle="Caja, pagos, compras, gastos, cierres y margen estimado."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              Exportar
            </button>
            <button className="btn primary" type="button">
              Cerrar caja
            </button>
          </div>
        }
      />

      <div className="stats-grid">
        <Stat
          icon={FiDollarSign}
          label="Caja disponible"
          value={money(demoMetrics.caja)}
        />
        <Stat
          icon={FiArrowUp}
          label="Ingresos mes"
          value={money(89420)}
          tone="green"
        />
        <Stat
          icon={FiArrowDown}
          label="Gastos mes"
          value={money(demoMetrics.gastosMes)}
          tone="red"
        />
        <Stat
          icon={FiTrendingUp}
          label="Ganancia neta"
          value={money(demoMetrics.gananciaMes)}
          tone="blue"
        />
      </div>

      <div className="two-col">
        <Card title="Flujo de caja hoy">
          <div className="stack">
            {demoCashMovements.map((movement) => (
              <div className={`finance-row ${movement.tipo}`} key={movement.concepto}>
                <span>{movement.concepto}</span>
                <strong>
                  {movement.tipo === "income" ? "+ " : movement.tipo === "expense" ? "- " : ""}
                  {money(movement.monto)}
                </strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Metodos de pago">
          <div className="payment-grid">
            {demoPaymentMix.map((payment) => (
              <div className="payment-card" key={payment.metodo}>
                <div>
                  <strong>{payment.metodo}</strong>
                  <span>{payment.transacciones} transacciones</span>
                </div>
                <div className="load-meter">
                  <i style={{ "--bar": `${(payment.monto / paymentTotal) * 100}%` }} />
                </div>
                <strong>{money(payment.monto)}</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="two-col">
        <Card title="Centros de costo">
          <div className="stack">
            {demoCostCenters.map((center) => (
              <div className="cost-row" key={center.centro}>
                <div>
                  <strong>{center.centro}</strong>
                  <span>
                    Meta {center.meta}% / acumulado {money(center.monto)}
                  </span>
                </div>
                <div className="load-meter">
                  <i style={{ "--bar": `${center.valor}%` }} />
                </div>
                <Badge tone={center.valor > center.meta ? "red" : "green"}>
                  {center.valor}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Checklist de cierre">
          <div className="stack">
            {demoCashClosures.map((item) => (
              <div className="check-row" key={item.tarea}>
                <FiCheckSquare />
                <div>
                  <strong>{item.tarea}</strong>
                  <span>{item.responsable}</span>
                </div>
                <Badge tone={item.estado === "Listo" ? "green" : "amber"}>
                  {item.estado}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Modulos relacionados">
        <div className="module-link-grid">
          <div className="module-link-card">
            <Badge tone="blue">RRHH</Badge>
            <strong>Planilla, comisiones y asistencia</strong>
            <span>El detalle laboral vive separado para que finanzas no se sature.</span>
            <FiExternalLink />
          </div>
          <div className="module-link-card">
            <Badge tone="red">Merma</Badge>
            <strong>Perdidas y desperdicio</strong>
            <span>La perdida operativa se revisa en su propio modulo con causas.</span>
            <FiExternalLink />
          </div>
          <div className="module-link-card">
            <Badge tone="amber">Inventario</Badge>
            <strong>Compras y proveedores</strong>
            <span>Costos de insumos y compras recientes quedan en stock.</span>
            <FiExternalLink />
          </div>
        </div>
      </Card>
    </div>
  );
}
