import { useMemo, useState } from "react";
import { FiCheck, FiClock, FiMonitor, FiPrinter } from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import { demoKitchenStations, demoKitchenTickets } from "../data/demo";

const lanes = [
  { id: "NUEVA", title: "Nueva", tone: "amber" },
  { id: "EN_PREPARACION", title: "En preparacion", tone: "blue" },
  { id: "LISTO", title: "Listo para servir", tone: "green" },
];

const stationFilters = ["TODAS", "COCINA", "BARRA", "EMPAQUE"];

export default function Cocina() {
  const [stationFilter, setStationFilter] = useState("TODAS");
  const visibleTickets = useMemo(
    () =>
      stationFilter === "TODAS"
        ? demoKitchenTickets
        : demoKitchenTickets.filter((ticket) => ticket.estacion === stationFilter),
    [stationFilter]
  );
  const lateTickets = visibleTickets.filter((ticket) => ticket.tiempo >= 15);
  const readyTickets = visibleTickets.filter((ticket) => ticket.estado === "LISTO");
  const averageTime = Math.round(
    visibleTickets.reduce((sum, ticket) => sum + ticket.tiempo, 0) /
      Math.max(visibleTickets.length, 1)
  );

  function stationSla(ticket) {
    return demoKitchenStations.find((station) => station.area === ticket.estacion)?.sla || 15;
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Produccion"
        title="Cocina y barra"
        subtitle="Comandas visibles por estado, tiempo y area de preparacion."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiPrinter /> Imprimir cola
            </button>
            <button className="btn primary" type="button">
              <FiMonitor /> Pantalla grande
            </button>
          </div>
        }
      />

      <div className="stats-grid compact">
        <Stat icon={FiClock} label="Tiempo promedio" value={`${averageTime} min`} tone="blue" />
        <Stat icon={FiCheck} label="Listas" value={readyTickets.length} tone="green" />
        <Stat icon={FiMonitor} label="Fuera de SLA" value={lateTickets.length} tone="red" />
      </div>

      <Card title="Estaciones activas">
        <div className="segment-row">
          {stationFilters.map((station) => (
            <button
              className={`segmented ${stationFilter === station ? "active" : ""}`}
              key={station}
              type="button"
              onClick={() => setStationFilter(station)}
            >
              {station}
            </button>
          ))}
        </div>
        <div className="station-cards">
          {demoKitchenStations.map((station) => (
            <div className="station-card" key={station.estacion}>
              <div>
                <strong>{station.estacion}</strong>
                <span>
                  {station.pendientes} comandas / promedio {station.promedio} min
                </span>
              </div>
              <div className="load-meter">
                <i style={{ "--bar": `${station.carga}%` }} />
              </div>
              <Badge tone={station.carga > 70 ? "red" : station.carga > 50 ? "amber" : "green"}>
                SLA {station.sla} min
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <div className="kanban">
        {lanes.map((lane) => (
          <Card key={lane.id} title={lane.title} className="lane">
            <div className="stack">
              {visibleTickets
                .filter((ticket) => ticket.estado === lane.id)
                .map((ticket) => {
                  const isLate = ticket.tiempo >= stationSla(ticket);

                  return (
                    <article
                      className={`kitchen-ticket ${isLate ? "late" : ""}`}
                      key={ticket.id}
                    >
                    <div className="ticket-head">
                      <strong>{ticket.id}</strong>
                      <Badge tone={lane.tone}>{ticket.mesa}</Badge>
                    </div>
                    <div className="ticket-meta">
                      <span>
                        <FiClock /> {ticket.tiempo} min / SLA {stationSla(ticket)}
                      </span>
                      <span>{ticket.canal}</span>
                    </div>
                    <ul className="prep-list">
                      {ticket.items.map((item) => (
                        <li key={`${ticket.id}-${item.nombre}`}>
                          <strong>{item.cantidad}x {item.nombre}</strong>
                          <span>{item.nota}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="ticket-actions">
                      <Badge tone={ticket.prioridad === "ALTA" ? "red" : "blue"}>
                        {ticket.estacion}
                      </Badge>
                      <button className="btn ghost" type="button">
                        <FiCheck /> Avanzar
                      </button>
                    </div>
                  </article>
                  );
                })}
              {!visibleTickets.some((ticket) => ticket.estado === lane.id) && (
                <p className="muted small">Sin comandas en este estado.</p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
