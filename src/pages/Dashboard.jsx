import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiActivity,
  FiDollarSign,
  FiPackage,
  FiSettings,
  FiShoppingBag,
  FiUsers,
} from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import {
  demoChannelMix,
  demoInventory,
  demoKitchenStations,
  demoMetrics,
  demoOrders,
  demoSalesByHour,
  demoSmartActions,
  demoTables,
} from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { money, supabaseMessage } from "../utils/format";

const statusTone = {
  LIBRE: "green",
  OCUPADA: "red",
  RESERVADA: "amber",
  PENDIENTE: "amber",
  EN_COCINA: "blue",
  LISTO: "green",
  SERVIDO: "blue",
  COBRADO: "green",
  ANULADO: "red",
};

function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function buildDemoState() {
  const occupied = demoTables.filter((table) => table.estado === "OCUPADA");
  const criticalStock = demoInventory.filter((item) => item.estado !== "OK");

  return {
    loading: false,
    error: "",
    isDemo: true,
    tables: demoTables,
    orders: demoOrders,
    inventory: demoInventory,
    salesByHour: demoSalesByHour,
    channelMix: demoChannelMix,
    kitchenStations: demoKitchenStations,
    actions: demoSmartActions.slice(0, 4),
    metrics: {
      ventasHoy: demoMetrics.ventasHoy,
      pedidosHoy: demoMetrics.pedidosHoy,
      ticketPromedio: demoMetrics.ticketPromedio,
      ocupacion: demoMetrics.ocupacion,
      mesasActivas: occupied.length,
      alertasStock: criticalStock.length,
    },
  };
}

function buildEmptyState() {
  return {
    loading: true,
    error: "",
    isDemo: false,
    tables: [],
    orders: [],
    inventory: [],
    salesByHour: [],
    channelMix: [],
    kitchenStations: [],
    actions: [],
    metrics: {
      ventasHoy: 0,
      pedidosHoy: 0,
      ticketPromedio: 0,
      ocupacion: 0,
      mesasActivas: 0,
      alertasStock: 0,
    },
  };
}

function groupSalesByHour(orders) {
  const grouped = new Map();

  orders
    .filter((order) => order.estado === "COBRADO")
    .forEach((order) => {
      const hour = new Date(order.created_at).getHours().toString().padStart(2, "0");
      const current = grouped.get(hour) || { hora: hour, ventas: 0, pedidos: 0 };
      current.ventas += Number(order.total) || 0;
      current.pedidos += 1;
      grouped.set(hour, current);
    });

  return Array.from(grouped.values()).sort((a, b) => a.hora.localeCompare(b.hora));
}

function groupChannels(orders) {
  const grouped = new Map();
  const tones = ["teal", "blue", "amber", "green"];

  orders
    .filter((order) => order.estado === "COBRADO")
    .forEach((order) => {
      const canal = order.canal || "Salon";
      const current = grouped.get(canal) || {
        canal,
        ventas: 0,
        pedidos: 0,
        color: tones[grouped.size % tones.length],
      };
      current.ventas += Number(order.total) || 0;
      current.pedidos += 1;
      grouped.set(canal, current);
    });

  return Array.from(grouped.values());
}

function groupStations(items) {
  const labels = {
    COCINA: "Cocina",
    BARRA: "Barra",
    EMPAQUE: "Empaque",
  };
  const grouped = new Map();

  items
    .filter((item) => !["LISTO", "ANULADO"].includes(item.estado))
    .forEach((item) => {
      const area = item.area || "COCINA";
      const current = grouped.get(area) || {
        estacion: labels[area] || area,
        area,
        pendientes: 0,
        promedio: 0,
        sla: area === "BARRA" ? 12 : 18,
        carga: 0,
      };
      current.pendientes += Number(item.cantidad) || 1;
      grouped.set(area, current);
    });

  return Array.from(grouped.values()).map((station) => ({
    ...station,
    carga: Math.min(100, Math.round(station.pendientes * 14)),
  }));
}

function buildActions({ tables, inventory, orders }) {
  const actions = [];
  const criticalStock = inventory.filter(
    (item) => Number(item.stock) <= Number(item.stock_minimo)
  );
  const openOrders = orders.filter(
    (order) => !["COBRADO", "ANULADO"].includes(order.estado)
  );

  if (!tables.length) {
    actions.push({
      modulo: "Config",
      prioridad: "Alta",
      titulo: "Crear mapa de mesas",
      impacto: "Carga mesas y zonas para empezar a tomar pedidos reales.",
    });
  }

  if (!inventory.length) {
    actions.push({
      modulo: "Inventario",
      prioridad: "Media",
      titulo: "Cargar insumos iniciales",
      impacto: "Define stock minimo para que las alertas sean reales.",
    });
  }

  if (criticalStock.length) {
    actions.push({
      modulo: "Inventario",
      prioridad: "Alta",
      titulo: "Reponer stock critico",
      impacto: `${criticalStock.length} insumos estan por debajo del minimo.`,
    });
  }

  if (openOrders.length) {
    actions.push({
      modulo: "Operacion",
      prioridad: "Media",
      titulo: "Revisar pedidos abiertos",
      impacto: `${openOrders.length} pedidos siguen sin cobrar o cerrar.`,
    });
  }

  if (!actions.length) {
    actions.push({
      modulo: "Operacion",
      prioridad: "Media",
      titulo: "Listo para operar",
      impacto: "Cuando registres ventas, aqui apareceran acciones automaticas.",
    });
  }

  return actions.slice(0, 4);
}

export default function Dashboard() {
  const { negocioId } = useTenant();
  const [state, setState] = useState(() =>
    authEnabled ? buildEmptyState() : buildDemoState()
  );

  const loadDashboard = useCallback(async () => {
    if (!authEnabled || !supabase) {
      setState(buildDemoState());
      return;
    }

    if (!negocioId) {
      setState((current) => ({ ...current, loading: false }));
      return;
    }

    setState((current) => ({ ...current, loading: true, error: "" }));

    const since = todayStartIso();
    const [tablesResult, ordersResult, inventoryResult, itemsResult] =
      await Promise.all([
        supabase
          .from("mesas")
          .select("id,nombre,zona,estado,pax,created_at")
          .eq("negocio_id", negocioId)
          .order("id", { ascending: true }),
        supabase
          .from("pedidos")
          .select("id,codigo,canal,estado,responsable,total,created_at")
          .eq("negocio_id", negocioId)
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase
          .from("insumos")
          .select("id,nombre,categoria,unidad,stock,stock_minimo,costo_unitario,vencimiento")
          .eq("negocio_id", negocioId)
          .order("id", { ascending: true }),
        supabase
          .from("pedido_items")
          .select("area,estado,cantidad,created_at")
          .eq("negocio_id", negocioId)
          .gte("created_at", since),
      ]);

    const error =
      tablesResult.error ||
      ordersResult.error ||
      inventoryResult.error ||
      itemsResult.error;

    if (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql si falta una tabla.`,
      }));
      return;
    }

    const tables = tablesResult.data || [];
    const orders = ordersResult.data || [];
    const inventory = inventoryResult.data || [];
    const paidOrders = orders.filter((order) => order.estado === "COBRADO");
    const ventasHoy = paidOrders.reduce(
      (sum, order) => sum + (Number(order.total) || 0),
      0
    );
    const occupied = tables.filter((table) => table.estado === "OCUPADA");
    const criticalStock = inventory.filter(
      (item) => Number(item.stock) <= Number(item.stock_minimo)
    );

    setState({
      loading: false,
      error: "",
      isDemo: false,
      tables,
      orders: orders.map((order) => ({
        ...order,
        mesa: order.canal || "Operacion",
        idLabel: order.codigo || `P-${order.id}`,
      })),
      inventory,
      salesByHour: groupSalesByHour(orders),
      channelMix: groupChannels(orders),
      kitchenStations: groupStations(itemsResult.data || []),
      actions: buildActions({ tables, inventory, orders }),
      metrics: {
        ventasHoy,
        pedidosHoy: orders.length,
        ticketPromedio: paidOrders.length ? ventasHoy / paidOrders.length : 0,
        ocupacion: tables.length ? Math.round((occupied.length / tables.length) * 100) : 0,
        mesasActivas: occupied.length,
        alertasStock: criticalStock.length,
      },
    });
  }, [negocioId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  const criticalStock = useMemo(
    () =>
      state.inventory.filter((item) =>
        state.isDemo
          ? item.estado !== "OK"
          : Number(item.stock) <= Number(item.stock_minimo)
      ),
    [state.inventory, state.isDemo]
  );
  const maxSales = Math.max(...state.salesByHour.map((slot) => slot.ventas), 1);
  const channelTotal = Math.max(
    state.channelMix.reduce((sum, item) => sum + item.ventas, 0),
    1
  );
  const needsSetup =
    !state.isDemo &&
    !state.loading &&
    !state.tables.length &&
    !state.orders.length &&
    !state.inventory.length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Control diario"
        title="Dashboard general"
        subtitle={
          state.isDemo
            ? "Vista demo local. Con Supabase activo se muestran datos reales del negocio."
            : "Datos reales del negocio conectado."
        }
        action={
          <Link className="btn primary" to="/configuracion">
            <FiSettings /> Configurar negocio
          </Link>
        }
      />

      {state.error && <div className="notice warning">{state.error}</div>}
      {state.loading && <div className="notice">Cargando datos del negocio...</div>}
      {needsSetup && (
        <div className="notice warning">
          Este negocio todavia no tiene datos cargados. Entra a Configuracion
          para crear mesas, carta, insumos y empleados.
        </div>
      )}

      <div className="stats-grid">
        <Stat
          icon={FiDollarSign}
          label="Ventas hoy"
          value={money(state.metrics.ventasHoy)}
          hint={state.isDemo ? "+18% vs ayer" : "Cobrado hoy"}
          tone="teal"
        />
        <Stat
          icon={FiShoppingBag}
          label="Pedidos"
          value={state.metrics.pedidosHoy}
          hint={`Ticket ${money(state.metrics.ticketPromedio)}`}
          tone="blue"
        />
        <Stat
          icon={FiUsers}
          label="Ocupacion"
          value={`${state.metrics.ocupacion}%`}
          hint={`${state.metrics.mesasActivas} mesas activas`}
          tone="amber"
        />
        <Stat
          icon={FiPackage}
          label="Alertas stock"
          value={state.metrics.alertasStock}
          hint="Bajo minimo"
          tone="red"
        />
      </div>

      <div className="dashboard-grid">
        <Card title="Pulso de ventas por hora">
          {state.salesByHour.length ? (
            <div className="bar-list">
              {state.salesByHour.map((slot) => (
                <div className="bar-row" key={slot.hora}>
                  <span>{slot.hora}:00</span>
                  <div className="bar-track">
                    <i style={{ "--bar": `${(slot.ventas / maxSales) * 100}%` }} />
                  </div>
                  <strong>{money(slot.ventas)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin ventas cobradas"
              text="Cuando cierres pedidos, el pulso por hora aparecera aqui."
            />
          )}
        </Card>

        <Card title="Canales del dia">
          {state.channelMix.length ? (
            <div className="channel-stack">
              {state.channelMix.map((item) => (
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
          ) : (
            <EmptyState
              title="Sin canales aun"
              text="Salon, barra y delivery apareceran cuando registres ventas."
            />
          )}
        </Card>

        <Card title="Carga de produccion">
          {state.kitchenStations.length ? (
            <div className="station-load">
              {state.kitchenStations.map((station) => (
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
                  <Badge
                    tone={station.carga > 70 ? "red" : station.carga > 50 ? "amber" : "green"}
                  >
                    {station.carga}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin comandas"
              text="Cocina y barra se cargan cuando hay items pendientes."
            />
          )}
        </Card>
      </div>

      <div className="two-col wide-left">
        <Card title="Mapa operativo de mesas">
          {state.tables.length ? (
            <div className="heat-grid">
              {state.tables.map((table) => (
                <div
                  className={`heat-tile ${(table.estado || "LIBRE").toLowerCase()}`}
                  key={table.id}
                >
                  <strong>{table.nombre?.replace("Mesa ", "M") || "Mesa"}</strong>
                  <span>{table.zona || "Salon"}</span>
                  <small>
                    {table.pax || 0}/{table.capacidad || 4} pax
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin mesas"
              text="Crea el mapa de salon en Configuracion."
            />
          )}
        </Card>

        <Card title="Pedidos en vivo">
          {state.orders.length ? (
            <div className="stack">
              {state.orders.slice(0, 4).map((order) => (
                <div className="row-item" key={order.id}>
                  <div>
                    <strong>{order.idLabel || order.id}</strong>
                    <span>
                      {order.mesa} / {order.responsable || "Sin responsable"}
                    </span>
                  </div>
                  <div className="row-right">
                    <Badge tone={statusTone[order.estado] || "blue"}>
                      {order.estado}
                    </Badge>
                    <strong>{money(order.total)}</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin pedidos hoy"
              text="Cuando Operacion guarde pedidos, apareceran aqui."
            />
          )}
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
          {state.actions.map((action) => (
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
              <Badge tone="red">STOCK</Badge>
              <div>
                <strong>{item.nombre}</strong>
                <span>
                  Stock {item.stock} {item.unidad}, minimo{" "}
                  {item.stock_minimo ?? item.minimo}.{" "}
                  {item.vencimiento ? `Vence: ${item.vencimiento}.` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
