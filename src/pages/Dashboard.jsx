import {
  FiActivity,
  FiDollarSign,
  FiPackage,
  FiShoppingBag,
  FiUsers,
} from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import {
  demoInventory,
  demoMetrics,
  demoOrders,
  demoSalesByHour,
  demoChannelMix,
  demoKitchenStations,
  demoSmartActions,
  demoTables,
} from "../data/demo";
import { money } from "../utils/format";

export default function Dashboard() {
  const occupied = demoTables.filter((table) => table.estado === "OCUPADA");
  const criticalStock = demoInventory.filter((item) => item.estado !== "OK");
  const maxSales = Math.max(...demoSalesByHour.map((slot) => slot.ventas));
  const channelTotal = demoChannelMix.reduce((sum, item) => sum + item.ventas, 0);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Control diario"
        title="Dashboard general"
        subtitle="Ventas, mesas, cocina, inventario y alertas del negocio."
        action={<button className="btn primary">Reporte del dia</button>}
      />

      <div className="stats-grid">
        <Stat
          icon={FiDollarSign}
          label="Ventas hoy"
          value={money(demoMetrics.ventasHoy)}
          hint="+18% vs ayer"
          tone="teal"
        />
        <Stat
          icon={FiShoppingBag}
          label="Pedidos"
          value={demoMetrics.pedidosHoy}
          hint={`Ticket ${money(demoMetrics.ticketPromedio)}`}
          tone="blue"
        />
        <Stat
          icon={FiUsers}
          label="Ocupacion"
          value={`${demoMetrics.ocupacion}%`}
          hint={`${occupied.length} mesas activas`}
          tone="amber"
        />
        <Stat
          icon={FiPackage}
          label="Alertas stock"
          value={criticalStock.length}
          hint="Requieren accion"
          tone="red"
        />
      </div>

      <div className="dashboard-grid">
        <Card title="Pulso de ventas por hora">
          <div className="bar-list">
            {demoSalesByHour.map((slot) => (
              <div className="bar-row" key={slot.hora}>
                <span>{slot.hora}:00</span>
                <div className="bar-track">
                  <i style={{ "--bar": `${(slot.ventas / maxSales) * 100}%` }} />
                </div>
                <strong>{money(slot.ventas)}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Canales del dia">
          <div className="channel-stack">
            {demoChannelMix.map((item) => (
              <div className="channel-line" key={item.canal}>
                <div>
                  <strong>{item.canal}</strong>
                  <span>{item.pedidos} pedidos</span>
                </div>
                <div className="row-right">
                  <Badge tone={item.color}>
                    {Math.round((item.ventas / channelTotal) * 100)}%
                  </Badge>
                  <strong>{money(item.ventas)}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Carga de produccion">
          <div className="station-load">
            {demoKitchenStations.map((station) => (
              <div className="station-row" key={station.estacion}>
                <div>
                  <strong>{station.estacion}</strong>
                  <span>
                    {station.pendientes} pendientes / SLA {station.sla} min
                  </span>
                </div>
                <div className="load-meter">
                  <i style={{ "--bar": `${station.carga}%` }} />
                </div>
                <Badge tone={station.carga > 70 ? "red" : station.carga > 50 ? "amber" : "green"}>
                  {station.carga}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="two-col wide-left">
        <Card title="Mapa operativo de mesas">
          <div className="heat-grid">
            {demoTables.map((table) => (
              <div className={`heat-tile ${table.estado.toLowerCase()}`} key={table.id}>
                <strong>{table.nombre.replace("Mesa ", "M")}</strong>
                <span>{table.zona}</span>
                <small>
                  {table.pax}/{table.capacidad}
                  {table.total ? ` / ${money(table.total)}` : ""}
                </small>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pedidos en vivo">
          <div className="stack">
            {demoOrders.slice(0, 4).map((order) => (
              <div className="row-item" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>
                    {order.mesa} / {order.responsable}
                  </span>
                </div>
                <div className="row-right">
                  <Badge
                    tone={
                      order.estado === "LISTO"
                        ? "green"
                        : order.estado === "EN_COCINA"
                          ? "blue"
                          : "amber"
                    }
                  >
                    {order.estado}
                  </Badge>
                  <strong>{money(order.total)}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Acciones del gerente"
        action={
          <button className="btn ghost" type="button">
            <FiActivity /> Ver bitacora
          </button>
        }
      >
        <div className="insight-grid">
          {demoSmartActions.slice(0, 4).map((action) => (
            <div key={action.titulo}>
              <Badge tone={action.prioridad === "Alta" ? "red" : "amber"}>
                {action.modulo}
              </Badge>
              <strong>{action.titulo}</strong>
              <p>{action.impacto}</p>
            </div>
          ))}
        </div>
        <div className="alert-board">
          {criticalStock.map((item) => (
            <div className="alert-line" key={item.id}>
              <Badge tone={item.estado === "CRITICO" ? "red" : "amber"}>
                {item.estado}
              </Badge>
              <div>
                <strong>{item.nombre}</strong>
                <span>
                  Stock {item.stock} {item.unidad}, minimo {item.minimo}. Vence:{" "}
                  {item.vencimiento}.
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
