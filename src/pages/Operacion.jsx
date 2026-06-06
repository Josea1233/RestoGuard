import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiCheck,
  FiCreditCard,
  FiDollarSign,
  FiEdit3,
  FiLock,
  FiMinus,
  FiPlus,
  FiPrinter,
  FiSave,
  FiSend,
  FiTrash2,
  FiUnlock,
  FiX,
} from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import { demoMenu, demoOrders, demoTables } from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { money, supabaseMessage } from "../utils/format";

const serviceModes = ["SALON", "BARRA", "PARA LLEVAR", "DELIVERY"];
const paymentMethods = ["EFECTIVO", "YAPE", "PLIN", "POS", "TRANSFERENCIA"];
const orderStates = ["PENDIENTE", "EN_COCINA", "LISTO", "SERVIDO", "COBRADO"];
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

const initialOrders = demoOrders.map((order, index) => ({
  ...order,
  mesaId: [1, 26, 7, null][index],
  idLabel: order.id,
  pago: order.estado === "COBRADO" ? "YAPE" : "PENDIENTE",
  items: order.items.map((label, itemIndex) => ({
    id: `${order.id}-${itemIndex}`,
    nombre: label.replace(/^\d+\s/, "").replace(/^x\s/i, ""),
    cantidad: Number(label.match(/^\d+/)?.[0] || 1),
    precio: Math.round(
      order.total /
        Math.max(order.items.length, 1) /
        Number(label.match(/^\d+/)?.[0] || 1)
    ),
    area: itemIndex === 0 ? "COCINA" : "BARRA",
    notas: "",
  })),
}));

function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function nextOrderCode(count) {
  const stamp = new Date();
  const timeCode = `${stamp.getHours()}${stamp.getMinutes()}${stamp.getSeconds()}`
    .padStart(6, "0")
    .slice(-6);
  return `P-${timeCode}-${String(count).padStart(2, "0")}`;
}

function getOrderTotal(order) {
  if (!order.items?.length) return Number(order.total) || 0;

  return order.items.reduce(
    (sum, item) => sum + Number(item.cantidad) * Number(item.precio),
    0
  );
}

function blankTicket(tableId = "") {
  return {
    mesaId: tableId,
    servicio: "SALON",
    responsable: "Caja",
    cliente: "",
    notas: "",
    pago: "EFECTIVO",
    dividirEntre: 1,
    items: [],
  };
}

function draftFromTable(table) {
  return {
    nombre: table?.nombre || "",
    zona: table?.zona || "Salon",
    estado: table?.estado || "LIBRE",
    pax: table?.pax || 0,
    capacidad: table?.capacidad || 4,
  };
}

function normalizeProduct(item) {
  return {
    ...item,
    categoria: item.categoria || "General",
    area: item.area || "COCINA",
    precio: Number(item.precio) || 0,
    modificadores: item.modificadores || [],
  };
}

function attachTableTotals(tables, orders) {
  const totals = new Map();

  orders
    .filter((order) => !["COBRADO", "ANULADO"].includes(order.estado))
    .forEach((order) => {
      if (!order.mesaId) return;
      totals.set(order.mesaId, (totals.get(order.mesaId) || 0) + getOrderTotal(order));
    });

  return tables.map((table) => ({
    ...table,
    pax: Number(table.pax) || 0,
    capacidad: Number(table.capacidad) || 4,
    total: totals.get(table.id) || 0,
  }));
}

function itemStateForOrder(nextState) {
  if (nextState === "ANULADO") return "ANULADO";
  if (["LISTO", "SERVIDO", "COBRADO"].includes(nextState)) return "LISTO";
  if (nextState === "EN_COCINA") return "PREPARANDO";
  return "PENDIENTE";
}

export default function Operacion() {
  const { negocioId } = useTenant();
  const realMode = authEnabled && Boolean(supabase);
  const [tables, setTables] = useState(() => (realMode ? [] : demoTables));
  const [menu, setMenu] = useState(() =>
    realMode ? [] : demoMenu.map(normalizeProduct)
  );
  const [orders, setOrders] = useState(() => (realMode ? [] : initialOrders));
  const [selectedTableId, setSelectedTableId] = useState(() =>
    realMode ? "" : demoTables[0]?.id
  );
  const [tableFilter, setTableFilter] = useState("TODAS");
  const [menuFilter, setMenuFilter] = useState("TODOS");
  const [loading, setLoading] = useState(realMode);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [cash, setCash] = useState({
    open: false,
    openingAmount: 0,
    openedBy: "Caja principal",
  });
  const [tableDraft, setTableDraft] = useState(() =>
    draftFromTable(realMode ? null : demoTables[0])
  );
  const [ticket, setTicket] = useState(() =>
    blankTicket(realMode ? "" : demoTables[0]?.id || "")
  );

  const loadOperation = useCallback(async () => {
    if (!realMode) {
      setTables(demoTables);
      setMenu(demoMenu.map(normalizeProduct));
      setOrders(initialOrders);
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
    const [tablesResult, productsResult, ordersResult, itemsResult] =
      await Promise.all([
        supabase
          .from("mesas")
          .select("id,nombre,zona,estado,pax,capacidad,created_at")
          .eq("negocio_id", negocioId)
          .order("id", { ascending: true }),
        supabase
          .from("productos")
          .select("id,nombre,categoria,area,precio,costo,activo,created_at")
          .eq("negocio_id", negocioId)
          .eq("activo", true)
          .order("id", { ascending: true }),
        supabase
          .from("pedidos")
          .select("id,codigo,mesa_id,canal,estado,responsable,total,created_at")
          .eq("negocio_id", negocioId)
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase
          .from("pedido_items")
          .select("id,pedido_id,nombre,area,cantidad,precio,estado")
          .eq("negocio_id", negocioId)
          .gte("created_at", since),
      ]);

    const error =
      tablesResult.error ||
      productsResult.error ||
      ordersResult.error ||
      itemsResult.error;

    if (error) {
      setMessage(
        `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`
      );
      setLoading(false);
      return;
    }

    const tableMap = new Map((tablesResult.data || []).map((table) => [table.id, table]));
    const itemsByOrder = new Map();

    (itemsResult.data || []).forEach((item) => {
      const current = itemsByOrder.get(item.pedido_id) || [];
      current.push({
        id: item.id,
        nombre: item.nombre,
        cantidad: Number(item.cantidad) || 1,
        precio: Number(item.precio) || 0,
        area: item.area || "COCINA",
        estado: item.estado,
        notas: "",
      });
      itemsByOrder.set(item.pedido_id, current);
    });

    const normalizedOrders = (ordersResult.data || []).map((order) => {
      const table = tableMap.get(order.mesa_id);

      return {
        ...order,
        idLabel: order.codigo || `P-${order.id}`,
        mesaId: order.mesa_id,
        mesa: table?.nombre || order.canal || "Operacion",
        pago: order.estado === "COBRADO" ? "REGISTRADO" : "PENDIENTE",
        items: itemsByOrder.get(order.id) || [],
      };
    });
    const normalizedTables = attachTableTotals(
      tablesResult.data || [],
      normalizedOrders
    );
    const nextSelected =
      normalizedTables.find((table) => table.id === selectedTableId) ||
      normalizedTables[0] ||
      null;

    setTables(normalizedTables);
    setMenu((productsResult.data || []).map(normalizeProduct));
    setOrders(normalizedOrders);
    setSelectedTableId(nextSelected?.id || "");
    setTableDraft(draftFromTable(nextSelected));
    setTicket((current) => ({
      ...current,
      mesaId: nextSelected?.id || "",
      servicio: nextSelected?.zona === "Barra" ? "BARRA" : current.servicio,
    }));
    setLoading(false);
  }, [negocioId, realMode, selectedTableId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOperation();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadOperation]);

  const zones = useMemo(
    () => ["TODAS", ...Array.from(new Set(tables.map((table) => table.zona || "Salon")))],
    [tables]
  );
  const categories = useMemo(
    () => [
      "TODOS",
      ...Array.from(new Set(menu.map((item) => item.categoria || "General"))),
    ],
    [menu]
  );
  const selectedTable = tables.find((table) => table.id === selectedTableId);
  const visibleTables =
    tableFilter === "TODAS"
      ? tables
      : tables.filter((table) => (table.zona || "Salon") === tableFilter);
  const visibleMenu =
    menuFilter === "TODOS"
      ? menu
      : menu.filter((item) => (item.categoria || "General") === menuFilter);
  const openOrders = orders.filter((order) => order.estado !== "ANULADO");
  const paidOrders = orders.filter((order) => order.estado === "COBRADO");
  const paidSales = paidOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const openSales = openOrders
    .filter((order) => order.estado !== "COBRADO")
    .reduce((sum, order) => sum + getOrderTotal(order), 0);
  const occupiedTables = tables.filter((table) => table.estado === "OCUPADA");
  const currentCash = Number(cash.openingAmount) + paidSales;
  const ticketTotal = getOrderTotal(ticket);
  const splitAmount = ticketTotal / Math.max(Number(ticket.dividirEntre), 1);
  const needsSetup = realMode && !loading && !tables.length && !menu.length;

  function selectTable(table) {
    setSelectedTableId(table.id);
    setTableDraft(draftFromTable(table));
    setTicket((current) => ({
      ...current,
      mesaId: table.id,
      servicio: table.zona === "Barra" ? "BARRA" : "SALON",
    }));
  }

  async function saveTable() {
    if (!selectedTableId) return;

    if (!realMode) {
      setTables((current) =>
        current.map((table) =>
          table.id === selectedTableId
            ? {
                ...table,
                ...tableDraft,
                pax: Number(tableDraft.pax),
                capacidad: Number(tableDraft.capacidad),
                total: tableDraft.estado === "LIBRE" ? 0 : table.total,
              }
            : table
        )
      );
      setMessage("Mesa guardada en modo demo.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("mesas")
      .update({
        nombre: tableDraft.nombre.trim(),
        zona: tableDraft.zona.trim(),
        estado: tableDraft.estado,
        pax: Number(tableDraft.pax) || 0,
        capacidad: Number(tableDraft.capacidad) || 4,
      })
      .eq("id", selectedTableId)
      .eq("negocio_id", negocioId);

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setMessage("Mesa guardada.");
    await loadOperation();
  }

  async function addTable() {
    if (!realMode) {
      const maxId = tables.length ? Math.max(...tables.map((table) => table.id)) : 0;
      const nextId = maxId + 1;
      const nextTable = {
        id: nextId,
        nombre: `Mesa ${String(nextId).padStart(2, "0")}`,
        zona: "Salon",
        estado: "LIBRE",
        pax: 0,
        capacidad: 4,
        total: 0,
      };

      setTables((current) => [...current, nextTable]);
      selectTable(nextTable);
      return;
    }

    if (!negocioId) return;

    setSaving(true);
    setMessage("");

    const { data, error } = await supabase
      .from("mesas")
      .insert({
        negocio_id: negocioId,
        nombre: `Mesa ${String(tables.length + 1).padStart(2, "0")}`,
        zona: "Salon",
        estado: "LIBRE",
        pax: 0,
        capacidad: 4,
      })
      .select("id,nombre,zona,estado,pax,capacidad,created_at")
      .single();

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setMessage("Mesa creada.");
    await loadOperation();
    if (data) selectTable({ ...data, total: 0 });
  }

  async function updateMenuPrice(menuId, price) {
    const nextPrice = Number(price) || 0;
    setMenu((current) =>
      current.map((item) =>
        item.id === menuId ? { ...item, precio: nextPrice } : item
      )
    );

    if (!realMode) return;

    const { error } = await supabase
      .from("productos")
      .update({ precio: nextPrice })
      .eq("id", menuId)
      .eq("negocio_id", negocioId);

    if (error) setMessage(supabaseMessage(error));
  }

  function addItemToTicket(menuItem, modifier = "") {
    const existingKey = `${menuItem.id}-${modifier}`;

    setTicket((current) => {
      const existingItem = current.items.find((item) => item.key === existingKey);

      if (existingItem) {
        return {
          ...current,
          items: current.items.map((item) =>
            item.key === existingKey
              ? { ...item, cantidad: Number(item.cantidad) + 1 }
              : item
          ),
        };
      }

      return {
        ...current,
        items: [
          ...current.items,
          {
            key: existingKey,
            id: `${Date.now()}-${menuItem.id}`,
            menuId: menuItem.id,
            nombre: menuItem.nombre,
            cantidad: 1,
            precio: Number(menuItem.precio),
            area: menuItem.area,
            notas: modifier,
          },
        ],
      };
    });
  }

  function updateTicketItem(itemId, patch) {
    setTicket((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      ),
    }));
  }

  function removeTicketItem(itemId) {
    setTicket((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  async function createOrder(nextState = "PENDIENTE") {
    const table = tables.find((tableItem) => tableItem.id === Number(ticket.mesaId));
    const isTableService = ticket.servicio === "SALON" || ticket.servicio === "BARRA";

    if (!ticket.items.length) return;
    if (isTableService && !table) {
      setMessage("Primero crea o selecciona una mesa.");
      return;
    }

    if (!realMode) {
      const nextOrder = {
        id: nextOrderCode(orders.length + 1),
        idLabel: nextOrderCode(orders.length + 1),
        mesaId: table?.id || null,
        mesa: table?.nombre || ticket.servicio,
        canal: ticket.servicio,
        responsable: ticket.responsable,
        estado: nextState,
        tiempo: 0,
        pago: nextState === "COBRADO" ? ticket.pago : "PENDIENTE",
        total: ticketTotal,
        items: ticket.items,
      };

      setOrders((current) => [nextOrder, ...current]);

      if (table && nextState !== "COBRADO") {
        setTables((current) =>
          current.map((tableItem) =>
            tableItem.id === table.id
              ? {
                  ...tableItem,
                  estado: "OCUPADA",
                  pax: tableItem.pax || 1,
                  total: tableItem.total + getOrderTotal(nextOrder),
                }
              : tableItem
          )
        );
      }

      setTicket((current) => ({
        ...blankTicket(current.mesaId),
        servicio: current.servicio,
        responsable: current.responsable,
        pago: current.pago,
      }));
      return;
    }

    setSaving(true);
    setMessage("");

    const code = nextOrderCode(orders.length + 1);
    const { data: order, error: orderError } = await supabase
      .from("pedidos")
      .insert({
        negocio_id: negocioId,
        mesa_id: table?.id || null,
        codigo: code,
        canal: ticket.servicio,
        estado: nextState,
        responsable: ticket.responsable.trim() || "Caja",
        total: ticketTotal,
      })
      .select("id")
      .single();

    if (orderError) {
      setSaving(false);
      setMessage(supabaseMessage(orderError));
      return;
    }

    const itemState = itemStateForOrder(nextState);
    const { error: itemsError } = await supabase.from("pedido_items").insert(
      ticket.items.map((item) => ({
        pedido_id: order.id,
        negocio_id: negocioId,
        nombre: item.notas ? `${item.nombre} - ${item.notas}` : item.nombre,
        area: item.area || "COCINA",
        cantidad: Number(item.cantidad) || 1,
        precio: Number(item.precio) || 0,
        estado: itemState,
      }))
    );

    if (itemsError) {
      setSaving(false);
      setMessage(supabaseMessage(itemsError));
      return;
    }

    if (table) {
      const { error: tableError } = await supabase
        .from("mesas")
        .update({
          estado: nextState === "COBRADO" ? "LIBRE" : "OCUPADA",
          pax: nextState === "COBRADO" ? 0 : table.pax || 1,
        })
        .eq("id", table.id)
        .eq("negocio_id", negocioId);

      if (tableError) setMessage(supabaseMessage(tableError));
    }

    setSaving(false);
    setTicket((current) => ({
      ...blankTicket(current.mesaId),
      servicio: current.servicio,
      responsable: current.responsable,
      pago: current.pago,
    }));
    await loadOperation();
  }

  async function setOrderState(orderId, nextState) {
    if (!realMode) {
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                estado: nextState,
                pago: nextState === "COBRADO" ? "EFECTIVO" : order.pago,
              }
            : order
        )
      );

      if (nextState === "COBRADO" || nextState === "ANULADO") {
        const order = orders.find((item) => item.id === orderId);
        if (!order?.mesaId) return;

        const remainingOpenOrders = orders.filter(
          (item) =>
            item.id !== orderId &&
            item.mesaId === order.mesaId &&
            !["COBRADO", "ANULADO"].includes(item.estado)
        );

        if (remainingOpenOrders.length === 0) {
          setTables((current) =>
            current.map((table) =>
              table.id === order.mesaId
                ? { ...table, estado: "LIBRE", pax: 0, total: 0 }
                : table
            )
          );
        }
      }
      return;
    }

    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    setSaving(true);
    setMessage("");

    const { error: orderError } = await supabase
      .from("pedidos")
      .update({ estado: nextState })
      .eq("id", orderId)
      .eq("negocio_id", negocioId);

    if (orderError) {
      setSaving(false);
      setMessage(supabaseMessage(orderError));
      return;
    }

    const { error: itemError } = await supabase
      .from("pedido_items")
      .update({ estado: itemStateForOrder(nextState) })
      .eq("pedido_id", orderId)
      .eq("negocio_id", negocioId);

    if (itemError) {
      setMessage(supabaseMessage(itemError));
    }

    if ((nextState === "COBRADO" || nextState === "ANULADO") && order.mesaId) {
      const remainingOpenOrders = orders.filter(
        (item) =>
          item.id !== orderId &&
          item.mesaId === order.mesaId &&
          !["COBRADO", "ANULADO"].includes(item.estado)
      );

      if (remainingOpenOrders.length === 0) {
        const { error: tableError } = await supabase
          .from("mesas")
          .update({ estado: "LIBRE", pax: 0 })
          .eq("id", order.mesaId)
          .eq("negocio_id", negocioId);

        if (tableError) setMessage(supabaseMessage(tableError));
      }
    }

    setSaving(false);
    await loadOperation();
  }

  function nextStateFor(order) {
    const currentIndex = orderStates.indexOf(order.estado);
    return orderStates[Math.min(currentIndex + 1, orderStates.length - 1)];
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={realMode ? "Operacion real" : "Benchmark POS profesional"}
        title="Operacion"
        subtitle="Mesas, caja, menu rapido, comanda activa, pagos y control de pedidos."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiPrinter /> Comanda
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={addTable}
              disabled={saving}
            >
              <FiPlus /> Agregar mesa
            </button>
          </div>
        }
      />

      {message && <div className="notice">{message}</div>}
      {loading && <div className="notice">Cargando operacion del negocio...</div>}
      {needsSetup && (
        <div className="notice warning">
          Este negocio esta en cero. Crea mesas y productos desde Configuracion
          para empezar a vender.
        </div>
      )}

      <div className="stats-grid">
        <Stat label="Mesas totales" value={tables.length} />
        <Stat label="Ocupadas" value={occupiedTables.length} tone="amber" />
        <Stat
          label="Pedidos abiertos"
          value={openOrders.filter((order) => order.estado !== "COBRADO").length}
          tone="blue"
        />
        <Stat label="Venta abierta" value={money(openSales)} tone="green" />
      </div>

      <Card title="Caja del turno">
        <div className="cash-control">
          <div className="cash-state">
            <Badge tone={cash.open ? "green" : "red"}>
              {cash.open ? "CAJA ABIERTA" : "CAJA CERRADA"}
            </Badge>
            <strong>{money(currentCash)}</strong>
            <span>
              Apertura {money(cash.openingAmount)} / Cobrado {money(paidSales)}
            </span>
          </div>
          <div className="cash-actions">
            <label>
              Monto inicial
              <input
                type="number"
                value={cash.openingAmount}
                disabled={cash.open}
                onChange={(event) =>
                  setCash((current) => ({
                    ...current,
                    openingAmount: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label>
              Cajero / turno
              <input
                value={cash.openedBy}
                onChange={(event) =>
                  setCash((current) => ({
                    ...current,
                    openedBy: event.target.value,
                  }))
                }
              />
            </label>
            <button
              className={`btn ${cash.open ? "ghost" : "primary"}`}
              type="button"
              onClick={() =>
                setCash((current) => ({ ...current, open: !current.open }))
              }
            >
              {cash.open ? <FiLock /> : <FiUnlock />}
              {cash.open ? "Cerrar caja" : "Abrir caja"}
            </button>
          </div>
        </div>
      </Card>

      <div className="pos-layout">
        <Card
          title="Mapa de mesas"
          action={
            <select
              className="compact-select"
              value={tableFilter}
              onChange={(event) => setTableFilter(event.target.value)}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          }
        >
          {visibleTables.length ? (
            <div className="large-table-grid">
              {visibleTables.map((table) => (
                <button
                  className={`table-tile ${(table.estado || "LIBRE").toLowerCase()} ${
                    table.id === selectedTableId ? "selected" : ""
                  }`}
                  key={table.id}
                  type="button"
                  onClick={() => selectTable(table)}
                >
                  <strong>{table.nombre}</strong>
                  <span>{table.zona || "Salon"}</span>
                  <Badge tone={statusTone[table.estado] || "green"}>
                    {table.estado || "LIBRE"}
                  </Badge>
                  <small>
                    {table.pax || 0}/{table.capacidad || 4} pax
                    {table.total > 0 ? ` / ${money(table.total)}` : ""}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin mesas"
              text="Agrega mesas aqui o desde Configuracion."
            />
          )}
        </Card>

        <Card title="Menu rapido">
          <div className="segment-row">
            {categories.map((category) => (
              <button
                className={`segmented ${menuFilter === category ? "active" : ""}`}
                key={category}
                type="button"
                onClick={() => setMenuFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
          {visibleMenu.length ? (
            <div className="quick-menu-grid">
              {visibleMenu.map((item) => (
                <div className="menu-product" key={item.id}>
                  <button type="button" onClick={() => addItemToTicket(item)}>
                    <strong>{item.nombre}</strong>
                    <span>
                      {item.categoria} / {item.area}
                    </span>
                    <em>{money(item.precio)}</em>
                  </button>
                  {!!item.modificadores?.length && (
                    <div className="modifier-row">
                      {item.modificadores.map((modifier) => (
                        <button
                          key={modifier}
                          type="button"
                          onClick={() => addItemToTicket(item, modifier)}
                        >
                          {modifier}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin productos"
              text="Carga tu carta en Configuracion para poder vender."
            />
          )}
        </Card>

        <div className="stack">
          <Card title="Comanda activa">
            <div className="form-grid">
              <div className="segment-row">
                {serviceModes.map((mode) => (
                  <button
                    className={`segmented ${ticket.servicio === mode ? "active" : ""}`}
                    key={mode}
                    type="button"
                    onClick={() =>
                      setTicket((current) => ({ ...current, servicio: mode }))
                    }
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="form-grid split">
                <label>
                  Mesa / origen
                  <select
                    value={ticket.mesaId}
                    disabled={!tables.length}
                    onChange={(event) =>
                      setTicket((current) => ({
                        ...current,
                        mesaId: Number(event.target.value),
                      }))
                    }
                  >
                    {!tables.length && <option value="">Sin mesas</option>}
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.nombre} - {table.zona || "Salon"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Responsable
                  <input
                    value={ticket.responsable}
                    onChange={(event) =>
                      setTicket((current) => ({
                        ...current,
                        responsable: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label>
                Cliente / nota rapida
                <input
                  placeholder="Ej: sin picante, cumpleanos, delivery..."
                  value={ticket.notas}
                  onChange={(event) =>
                    setTicket((current) => ({
                      ...current,
                      notas: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="ticket-items">
                {ticket.items.map((item) => (
                  <div className="ticket-line" key={item.id}>
                    <div>
                      <strong>{item.nombre}</strong>
                      <span>
                        {item.area}
                        {item.notas ? ` / ${item.notas}` : ""}
                      </span>
                    </div>
                    <div className="qty-control">
                      <button
                        type="button"
                        onClick={() =>
                          updateTicketItem(item.id, {
                            cantidad: Math.max(1, Number(item.cantidad) - 1),
                          })
                        }
                      >
                        <FiMinus />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(event) =>
                          updateTicketItem(item.id, {
                            cantidad: Number(event.target.value),
                          })
                        }
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateTicketItem(item.id, {
                            cantidad: Number(item.cantidad) + 1,
                          })
                        }
                      >
                        <FiPlus />
                      </button>
                    </div>
                    <input
                      className="price-input"
                      type="number"
                      min="0"
                      value={item.precio}
                      onChange={(event) =>
                        updateTicketItem(item.id, {
                          precio: Number(event.target.value),
                        })
                      }
                    />
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => removeTicketItem(item.id)}
                      title="Quitar item"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}

                {!ticket.items.length && (
                  <div className="empty-ticket">
                    Toca un producto del menu para armar la comanda.
                  </div>
                )}
              </div>

              <div className="ticket-total">
                <span>Total</span>
                <strong>{money(ticketTotal)}</strong>
              </div>

              <div className="form-grid split">
                <label>
                  Dividir cuenta
                  <input
                    type="number"
                    min="1"
                    value={ticket.dividirEntre}
                    onChange={(event) =>
                      setTicket((current) => ({
                        ...current,
                        dividirEntre: Number(event.target.value),
                      }))
                    }
                  />
                  <small>{money(splitAmount)} por persona/cuenta</small>
                </label>
                <label>
                  Metodo de pago
                  <select
                    value={ticket.pago}
                    onChange={(event) =>
                      setTicket((current) => ({
                        ...current,
                        pago: event.target.value,
                      }))
                    }
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="actions">
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => createOrder("PENDIENTE")}
                  disabled={!ticket.items.length || saving}
                >
                  <FiSend /> Enviar
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => createOrder("COBRADO")}
                  disabled={!ticket.items.length || !cash.open || saving}
                >
                  <FiCreditCard /> Cobrar directo
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() =>
                    setTicket((current) => ({
                      ...blankTicket(current.mesaId),
                      servicio: current.servicio,
                      responsable: current.responsable,
                      pago: current.pago,
                    }))
                  }
                >
                  Limpiar
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="two-col">
        <Card title="Editar mesa seleccionada">
          {selectedTable ? (
            <div className="form-grid split">
              <label>
                Numero / nombre
                <input
                  value={tableDraft.nombre}
                  onChange={(event) =>
                    setTableDraft((current) => ({
                      ...current,
                      nombre: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Zona
                <input
                  value={tableDraft.zona}
                  onChange={(event) =>
                    setTableDraft((current) => ({
                      ...current,
                      zona: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Estado
                <select
                  value={tableDraft.estado}
                  onChange={(event) =>
                    setTableDraft((current) => ({
                      ...current,
                      estado: event.target.value,
                    }))
                  }
                >
                  <option value="LIBRE">LIBRE</option>
                  <option value="OCUPADA">OCUPADA</option>
                  <option value="RESERVADA">RESERVADA</option>
                </select>
              </label>
              <label>
                Personas
                <input
                  type="number"
                  min="0"
                  value={tableDraft.pax}
                  onChange={(event) =>
                    setTableDraft((current) => ({
                      ...current,
                      pax: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Capacidad
                <input
                  type="number"
                  min="1"
                  value={tableDraft.capacidad}
                  onChange={(event) =>
                    setTableDraft((current) => ({
                      ...current,
                      capacidad: event.target.value,
                    }))
                  }
                />
              </label>
              <button
                className="btn primary full"
                type="button"
                onClick={saveTable}
                disabled={saving}
              >
                <FiSave /> Guardar mesa
              </button>
            </div>
          ) : (
            <EmptyState
              title="Seleccion sin mesa"
              text="Crea una mesa para editar numero, zona, estado y capacidad."
            />
          )}
        </Card>

        <Card title="Editar precios de carta">
          {menu.length ? (
            <div className="price-grid">
              {menu.map((item) => (
                <label className="price-row" key={item.id}>
                  <span>
                    <strong>{item.nombre}</strong>
                    <small>
                      {item.categoria} / {item.area}
                    </small>
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={item.precio}
                    onChange={(event) =>
                      updateMenuPrice(item.id, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin carta"
              text="Agrega productos desde Configuracion para editar precios."
            />
          )}
        </Card>
      </div>

      <Card title={`Control de pedidos (${orders.length})`}>
        {orders.length ? (
          <div className="stack">
            {orders.map((order) => {
              const total = getOrderTotal(order);
              const nextState = nextStateFor(order);

              return (
                <div className="order-control" key={order.id}>
                  <div className="order-main">
                    <strong>{order.idLabel || order.id}</strong>
                    <span>
                      {order.mesa} / {order.responsable || "Caja"} / {order.canal}
                    </span>
                    <small>
                      {order.items
                        .map(
                          (item) =>
                            `${item.cantidad}x ${item.nombre} (${money(item.precio)})${
                              item.notas ? ` - ${item.notas}` : ""
                            }`
                        )
                        .join(", ") || "Sin items registrados"}
                    </small>
                  </div>
                  <div className="order-side">
                    <Badge tone={statusTone[order.estado] || "blue"}>
                      {order.estado}
                    </Badge>
                    <strong>{money(total)}</strong>
                    <div className="mini-actions">
                      {order.estado !== "COBRADO" && order.estado !== "ANULADO" && (
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => setOrderState(order.id, nextState)}
                          disabled={saving}
                        >
                          <FiCheck /> {nextState}
                        </button>
                      )}
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setOrderState(order.id, "COBRADO")}
                        disabled={!cash.open || order.estado === "COBRADO" || saving}
                      >
                        <FiDollarSign /> Cobrar
                      </button>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setOrderState(order.id, "ANULADO")}
                        disabled={order.estado === "COBRADO" || saving}
                      >
                        <FiX /> Anular
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Sin pedidos"
            text="Los pedidos del dia apareceran cuando envies una comanda."
          />
        )}
      </Card>

      {selectedTable && (
        <Card
          title="Detalle seleccionado"
          action={
            <Link className="btn ghost" to="/configuracion">
              Configurar
            </Link>
          }
        >
          <div className="selected-summary">
            <FiEdit3 />
            <div>
              <strong>{selectedTable.nombre}</strong>
              <span>
                {selectedTable.zona || "Salon"} / {selectedTable.estado} /{" "}
                {selectedTable.pax} personas / total {money(selectedTable.total)}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
