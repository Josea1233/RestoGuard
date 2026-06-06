import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCpu, FiTarget, FiTrendingDown, FiTrendingUp } from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import {
  demoChannelMix,
  demoBenchmarkIdeas,
  demoForecast,
  demoInventory,
  demoMenuEngineering,
  demoMetrics,
  demoSmartActions,
} from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { money, supabaseMessage } from "../utils/format";

function monthStartIso() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function groupChannels(orders) {
  const grouped = new Map();

  orders
    .filter((order) => order.estado === "COBRADO")
    .forEach((order) => {
      const key = order.canal || "SALON";
      const current = grouped.get(key) || { canal: key, ventas: 0, pedidos: 0 };
      current.ventas += Number(order.total) || 0;
      current.pedidos += 1;
      grouped.set(key, current);
    });

  return Array.from(grouped.values()).sort((a, b) => b.ventas - a.ventas);
}

function inventoryState(item) {
  const stock = Number(item.stock) || 0;
  const min = Number(item.stock_minimo) || 0;

  if (min > 0 && stock <= min) return "CRITICO";
  if (min > 0 && stock <= min * 1.5) return "RIESGO";
  return "OK";
}

function buildActions({ riskyItems, orders, products, wasteTotal }) {
  const actions = [];
  const openOrders = orders.filter(
    (order) => !["COBRADO", "ANULADO"].includes(order.estado)
  );

  if (!products.length) {
    actions.push({
      modulo: "Config",
      prioridad: "Alta",
      titulo: "Cargar carta",
      impacto: "Sin productos no se puede tomar pedidos ni calcular margen.",
    });
  }

  if (riskyItems.length) {
    actions.push({
      modulo: "Inventario",
      prioridad: "Alta",
      titulo: "Reponer insumos criticos",
      impacto: `${riskyItems.length} insumos estan bajo minimo o cerca del minimo.`,
    });
  }

  if (openOrders.length) {
    actions.push({
      modulo: "Operacion",
      prioridad: "Media",
      titulo: "Cerrar pedidos abiertos",
      impacto: `${openOrders.length} pedidos siguen pendientes de cobro o cierre.`,
    });
  }

  if (wasteTotal > 0) {
    actions.push({
      modulo: "Merma",
      prioridad: "Media",
      titulo: "Revisar perdida del mes",
      impacto: `${money(wasteTotal)} registrados como merma.`,
    });
  }

  if (!actions.length) {
    actions.push({
      modulo: "Operacion",
      prioridad: "Media",
      titulo: "Listo para operar",
      impacto: "Cuando haya ventas y stock, el sistema generara prioridades reales.",
    });
  }

  return actions;
}

export default function Analisis() {
  const { negocioId } = useTenant();
  const realMode = authEnabled && Boolean(supabase);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState(() => (realMode ? [] : demoInventory));
  const [products, setProducts] = useState(() => (realMode ? [] : demoMenuEngineering));
  const [waste, setWaste] = useState([]);
  const [loading, setLoading] = useState(realMode);
  const [message, setMessage] = useState("");

  const loadAnalysis = useCallback(async () => {
    if (!realMode) {
      setInventory(demoInventory);
      setProducts(demoMenuEngineering);
      setLoading(false);
      return;
    }

    if (!negocioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const [ordersResult, inventoryResult, productsResult, wasteResult] =
      await Promise.all([
        supabase
          .from("pedidos")
          .select("id,canal,estado,total,created_at")
          .eq("negocio_id", negocioId)
          .gte("created_at", monthStartIso()),
        supabase
          .from("insumos")
          .select("id,nombre,unidad,stock,stock_minimo,costo_unitario,vencimiento")
          .eq("negocio_id", negocioId),
        supabase
          .from("productos")
          .select("id,nombre,categoria,precio,costo,activo")
          .eq("negocio_id", negocioId),
        supabase
          .from("mermas")
          .select("id,descripcion,causa,costo,created_at")
          .eq("negocio_id", negocioId)
          .gte("created_at", monthStartIso()),
      ]);

    const error =
      ordersResult.error ||
      inventoryResult.error ||
      productsResult.error ||
      wasteResult.error;

    if (error) {
      setMessage(
        `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`
      );
      setLoading(false);
      return;
    }

    setOrders(ordersResult.data || []);
    setInventory(inventoryResult.data || []);
    setProducts(productsResult.data || []);
    setWaste(wasteResult.data || []);
    setLoading(false);
  }, [negocioId, realMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnalysis();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadAnalysis]);

  const channelMix = realMode ? groupChannels(orders) : demoChannelMix;
  const riskyItems = inventory.filter((item) =>
    realMode ? inventoryState(item) !== "OK" : item.estado !== "OK"
  );
  const wasteTotal = realMode
    ? waste.reduce((sum, item) => sum + Number(item.costo || 0), 0)
    : demoMetrics.mermaMes;
  const actions = realMode
    ? buildActions({ riskyItems, orders, products, wasteTotal })
    : demoSmartActions;
  const bestChannel = channelMix[0] || null;
  const forecastRows = realMode
    ? channelMix.map((channel) => ({
        dia: channel.canal,
        salon: channel.canal === "SALON" ? channel.pedidos : 0,
        barra: channel.canal === "BARRA" ? channel.pedidos : 0,
        delivery: !["SALON", "BARRA"].includes(channel.canal) ? channel.pedidos : 0,
      }))
    : demoForecast;
  const maxForecast = Math.max(
    ...forecastRows.map((day) => day.salon + day.barra + day.delivery),
    1
  );
  const menuEngineering = useMemo(() => {
    if (!realMode) return demoMenuEngineering;

    return products.map((product) => {
      const precio = Number(product.precio) || 0;
      const costo = Number(product.costo) || 0;
      const margen = precio ? Math.round(((precio - costo) / precio) * 100) : 0;
      const foodCost = precio ? Math.round((costo / precio) * 100) : 0;

      return {
        plato: product.nombre,
        cuadrante: margen >= 60 ? "Estrella" : margen >= 35 ? "Rentable" : "Revisar",
        margen,
        popularidad: 0,
        accion:
          foodCost > 45
            ? "Revisar costo o precio."
            : "Listo para medir popularidad con ventas.",
      };
    });
  }, [products, realMode]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Decision inteligente"
        title="Analisis"
        subtitle="Recomendaciones para comprar mejor, vender mas, perder menos y ajustar la carta."
        action={<button className="btn primary">Generar analisis</button>}
      />

      {message && <div className="notice warning">{message}</div>}
      {loading && <div className="notice">Cargando analisis...</div>}

      <div className="stats-grid">
        <Stat
          icon={FiCpu}
          label={realMode ? "Base de datos" : "Confianza demo"}
          value={realMode ? `${orders.length} pedidos` : "91%"}
          tone="blue"
        />
        <Stat
          icon={FiTrendingDown}
          label="Merma mes"
          value={money(wasteTotal)}
          tone="red"
        />
        <Stat
          icon={FiTarget}
          label="Acciones sugeridas"
          value={actions.length}
          tone="amber"
        />
        <Stat
          icon={FiTrendingUp}
          label="Canal lider"
          value={bestChannel?.canal || "Sin ventas"}
          hint={bestChannel ? money(bestChannel.ventas) : money(0)}
          tone="green"
        />
      </div>

      <div className="two-col wide-left">
        <Card title="Prioridades automaticas">
          <div className="priority-list">
            {actions.map((action, index) => (
              <div className="priority-item" key={action.titulo}>
                <span className="rank">{index + 1}</span>
                <div>
                  <Badge tone={action.prioridad === "Alta" ? "red" : "amber"}>
                    {action.prioridad}
                  </Badge>
                  <strong>{action.titulo}</strong>
                  <p>{action.impacto}</p>
                </div>
                <small>{action.modulo}</small>
              </div>
            ))}
          </div>
        </Card>

        <Card title={realMode ? "Ventas por canal" : "Forecast por canal"}>
          {forecastRows.length ? (
            <>
              <div className="forecast-list">
                {forecastRows.map((day) => {
                  const total = day.salon + day.barra + day.delivery;

                  return (
                    <div className="forecast-row" key={day.dia}>
                      <strong>{day.dia}</strong>
                      <div className="stacked-bar" style={{ "--bar": `${(total / maxForecast) * 100}%` }}>
                        <i style={{ "--bar": `${total ? (day.salon / total) * 100 : 0}%` }} />
                        <b style={{ "--bar": `${total ? (day.barra / total) * 100 : 0}%` }} />
                        <em style={{ "--bar": `${total ? (day.delivery / total) * 100 : 0}%` }} />
                      </div>
                      <span>{total} pedidos</span>
                    </div>
                  );
                })}
              </div>
              <div className="legend-row">
                <span><i className="dot teal" /> Salon</span>
                <span><i className="dot blue" /> Barra</span>
                <span><i className="dot amber" /> Delivery</span>
              </div>
            </>
          ) : (
            <EmptyState
              title="Sin ventas"
              text="Cuando cobres pedidos, se mostrara el canal lider."
            />
          )}
        </Card>
      </div>

      <Card title="Ingenieria de menu">
        {menuEngineering.length ? (
          <div className="menu-matrix">
            {menuEngineering.map((item) => (
              <div className="menu-card" key={item.plato}>
                <Badge
                  tone={
                    item.cuadrante === "Estrella"
                      ? "green"
                      : item.cuadrante === "Revisar"
                        ? "amber"
                        : "blue"
                  }
                >
                  {item.cuadrante}
                </Badge>
                <strong>{item.plato}</strong>
                <div className="mini-metrics">
                  <span>Margen {item.margen}%</span>
                  <span>Popularidad {item.popularidad}%</span>
                </div>
                <p>{item.accion}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin carta"
            text="Carga productos para ver margen y popularidad."
          />
        )}
      </Card>

      <Card title="Benchmark internacional aplicado">
        <div className="benchmark-grid">
          {demoBenchmarkIdeas.map((item) => (
            <div className="benchmark-card" key={item.sistema}>
              <Badge tone="blue">{item.sistema}</Badge>
              <strong>{item.idea}</strong>
              <span>{item.aplicado}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="two-col">
        <Card title="Promociones inteligentes">
          {realMode ? (
            <EmptyState
              title="Sin promociones automaticas"
              text="Necesitamos ventas reales por producto para recomendar combos."
            />
          ) : (
            <div className="promo-grid">
              <div className="recommendation">
                <Badge tone="green">Hoy</Badge>
                <strong>Combo barra rapida</strong>
                <p>2 cocteles + piqueo con margen alto.</p>
              </div>
              <div className="recommendation">
                <Badge tone="amber">Stock</Badge>
                <strong>Menu del dia con pollo</strong>
                <p>Usar pollo fresco antes de vencimiento.</p>
              </div>
              <div className="recommendation">
                <Badge tone="blue">Fin de semana</Badge>
                <strong>Paquete familiar</strong>
                <p>Subir ticket promedio con bebida incluida.</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="Riesgos detectados">
          {riskyItems.length ? (
            <div className="stack">
              {riskyItems.map((item) => (
                <div className="row-item" key={item.id}>
                  <div>
                    <strong>{item.nombre}</strong>
                    <span>
                      Stock {item.stock} {item.unidad} / minimo{" "}
                      {item.stock_minimo ?? item.minimo}
                    </span>
                  </div>
                  <Badge
                    tone={
                      (realMode ? inventoryState(item) : item.estado) === "CRITICO"
                        ? "red"
                        : "amber"
                    }
                  >
                    {realMode ? inventoryState(item) : item.estado}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin riesgos"
              text="El stock bajo minimo aparecera aqui."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
