import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiClock, FiMonitor, FiPrinter } from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import { demoKitchenStations, demoKitchenTickets } from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { supabaseMessage } from "../utils/format";

const lanes = [
  { id: "NUEVA", title: "Nueva", tone: "amber" },
  { id: "EN_PREPARACION", title: "En preparacion", tone: "blue" },
  { id: "LISTO", title: "Listo para servir", tone: "green" },
];

const stationFilters = ["TODAS", "COCINA", "BARRA", "EMPAQUE"];
const stationNames = {
  COCINA: "Cocina caliente",
  BARRA: "Barra",
  EMPAQUE: "Empaque",
};

function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function minutesSince(dateValue) {
  if (!dateValue) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(dateValue).getTime()) / 60000));
}

function laneFromItems(items) {
  if (items.every((item) => item.estado === "LISTO")) return "LISTO";
  if (items.some((item) => item.estado === "PREPARANDO")) return "EN_PREPARACION";
  return "NUEVA";
}

function itemStateFromLane(lane) {
  if (lane === "LISTO") return "LISTO";
  if (lane === "EN_PREPARACION") return "PREPARANDO";
  return "PENDIENTE";
}

function nextLane(currentLane) {
  if (currentLane === "NUEVA") return "EN_PREPARACION";
  if (currentLane === "EN_PREPARACION") return "LISTO";
  return "LISTO";
}

export default function Cocina() {
  const { negocioId } = useTenant();
  const realMode = authEnabled && Boolean(supabase);
  const [stationFilter, setStationFilter] = useState("TODAS");
  const [tickets, setTickets] = useState(() => (realMode ? [] : demoKitchenTickets));
  const [loading, setLoading] = useState(realMode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadKitchen = useCallback(async () => {
    if (!realMode) {
      setTickets(demoKitchenTickets);
      setLoading(false);
      return;
    }

    if (!negocioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const since = todayStartIso();
    const [ordersResult, itemsResult] = await Promise.all([
      supabase
        .from("pedidos")
        .select("id,codigo,canal,estado,responsable,mesa_id,created_at")
        .eq("negocio_id", negocioId)
        .gte("created_at", since)
        .order("created_at", { ascending: false }),
      supabase
        .from("pedido_items")
        .select("id,pedido_id,nombre,area,cantidad,precio,estado,created_at")
        .eq("negocio_id", negocioId)
        .gte("created_at", since),
    ]);

    const error = ordersResult.error || itemsResult.error;

    if (error) {
      setMessage(
        `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`
      );
      setLoading(false);
      return;
    }

    const openOrders = (ordersResult.data || []).filter(
      (order) => !["COBRADO", "ANULADO"].includes(order.estado)
    );
    const orderMap = new Map(openOrders.map((order) => [order.id, order]));
    const grouped = new Map();

    (itemsResult.data || []).forEach((item) => {
      const order = orderMap.get(item.pedido_id);
      if (!order || item.estado === "ANULADO") return;

      const area = item.area || "COCINA";
      const key = `${item.pedido_id}-${area}`;
      const current = grouped.get(key) || {
        id: key,
        pedidoId: item.pedido_id,
        codigo: order.codigo || `P-${order.id}`,
        mesa: order.canal || "Operacion",
        canal: order.canal,
        estacion: area,
        prioridad: "NORMAL",
        createdAt: order.created_at,
        items: [],
      };

      current.items.push({
        id: item.id,
        nombre: item.nombre,
        cantidad: Number(item.cantidad) || 1,
        nota: "",
        estado: item.estado,
      });
      grouped.set(key, current);
    });

    const nextTickets = Array.from(grouped.values()).map((ticket) => ({
      ...ticket,
      id: `${ticket.codigo}-${ticket.estacion}`,
      estado: laneFromItems(ticket.items),
      tiempo: minutesSince(ticket.createdAt),
    }));

    setTickets(nextTickets);
    setLoading(false);
  }, [negocioId, realMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadKitchen();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadKitchen]);

  const visibleTickets = useMemo(
    () =>
      stationFilter === "TODAS"
        ? tickets
        : tickets.filter((ticket) => ticket.estacion === stationFilter),
    [stationFilter, tickets]
  );
  const stationSummary = useMemo(() => {
    if (!realMode) return demoKitchenStations;

    return stationFilters
      .filter((station) => station !== "TODAS")
      .map((station) => {
        const stationTickets = tickets.filter((ticket) => ticket.estacion === station);
        const pending = stationTickets.filter((ticket) => ticket.estado !== "LISTO");
        const avg = stationTickets.length
          ? Math.round(
              stationTickets.reduce((sum, ticket) => sum + ticket.tiempo, 0) /
                stationTickets.length
            )
          : 0;

        return {
          estacion: stationNames[station],
          area: station,
          pendientes: pending.length,
          promedio: avg,
          sla: station === "BARRA" ? 12 : 18,
          carga: Math.min(100, pending.length * 20),
        };
      });
  }, [realMode, tickets]);
  const lateTickets = visibleTickets.filter(
    (ticket) => ticket.tiempo >= stationSla(ticket)
  );
  const readyTickets = visibleTickets.filter((ticket) => ticket.estado === "LISTO");
  const averageTime = Math.round(
    visibleTickets.reduce((sum, ticket) => sum + ticket.tiempo, 0) /
      Math.max(visibleTickets.length, 1)
  );

  function stationSla(ticket) {
    return (
      stationSummary.find((station) => station.area === ticket.estacion)?.sla || 15
    );
  }

  async function advanceTicket(ticket) {
    const next = nextLane(ticket.estado);
    if (ticket.estado === "LISTO") return;

    if (!realMode) {
      setTickets((current) =>
        current.map((item) =>
          item.id === ticket.id ? { ...item, estado: next } : item
        )
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: itemError } = await supabase
      .from("pedido_items")
      .update({ estado: itemStateFromLane(next) })
      .eq("pedido_id", ticket.pedidoId)
      .eq("area", ticket.estacion)
      .eq("negocio_id", negocioId);

    if (itemError) {
      setSaving(false);
      setMessage(supabaseMessage(itemError));
      return;
    }

    const { error: orderError } = await supabase
      .from("pedidos")
      .update({ estado: next === "LISTO" ? "LISTO" : "EN_COCINA" })
      .eq("id", ticket.pedidoId)
      .eq("negocio_id", negocioId);

    if (orderError) setMessage(supabaseMessage(orderError));

    setSaving(false);
    await loadKitchen();
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

      {message && <div className="notice warning">{message}</div>}
      {loading && <div className="notice">Cargando comandas...</div>}

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
          {stationSummary.map((station) => (
            <div className="station-card" key={station.area || station.estacion}>
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
                        <strong>{ticket.codigo || ticket.id}</strong>
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
                          <li key={`${ticket.id}-${item.id || item.nombre}`}>
                            <strong>
                              {item.cantidad}x {item.nombre}
                            </strong>
                            <span>{item.nota}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="ticket-actions">
                        <Badge tone={ticket.prioridad === "ALTA" ? "red" : "blue"}>
                          {ticket.estacion}
                        </Badge>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => advanceTicket(ticket)}
                          disabled={saving || ticket.estado === "LISTO"}
                        >
                          <FiCheck /> Avanzar
                        </button>
                      </div>
                    </article>
                  );
                })}
              {!visibleTickets.some((ticket) => ticket.estado === lane.id) && (
                <EmptyState
                  title="Sin comandas"
                  text="No hay tickets en este estado."
                />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
