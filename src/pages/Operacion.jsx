import { useMemo, useState } from "react";
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

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import { demoMenu, demoOrders, demoTables } from "../data/demo";
import { money } from "../utils/format";

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

function nextOrderCode(count) {
  return `P-${String(140 + count).padStart(4, "0")}`;
}

function getOrderTotal(order) {
  return order.items.reduce(
    (sum, item) => sum + Number(item.cantidad) * Number(item.precio),
    0
  );
}

function blankTicket(tableId = "") {
  return {
    mesaId: tableId,
    servicio: "SALON",
    responsable: "Carlos",
    cliente: "",
    notas: "",
    pago: "EFECTIVO",
    dividirEntre: 1,
    items: [],
  };
}

export default function Operacion() {
  const [tables, setTables] = useState(demoTables);
  const [menu, setMenu] = useState(demoMenu);
  const [orders, setOrders] = useState(initialOrders);
  const [selectedTableId, setSelectedTableId] = useState(demoTables[0]?.id);
  const [tableFilter, setTableFilter] = useState("TODAS");
  const [menuFilter, setMenuFilter] = useState("TODOS");
  const [cash, setCash] = useState({
    open: false,
    openingAmount: 300,
    openedBy: "Caja principal",
  });
  const [tableDraft, setTableDraft] = useState({
    nombre: demoTables[0]?.nombre || "",
    zona: demoTables[0]?.zona || "Salon",
    estado: demoTables[0]?.estado || "LIBRE",
    pax: demoTables[0]?.pax || 0,
    capacidad: demoTables[0]?.capacidad || 4,
  });
  const [ticket, setTicket] = useState(blankTicket(demoTables[0]?.id || ""));

  const zones = useMemo(
    () => ["TODAS", ...Array.from(new Set(tables.map((table) => table.zona)))],
    [tables]
  );
  const categories = useMemo(
    () => ["TODOS", ...Array.from(new Set(menu.map((item) => item.categoria)))],
    [menu]
  );
  const selectedTable = tables.find((table) => table.id === selectedTableId);
  const visibleTables =
    tableFilter === "TODAS"
      ? tables
      : tables.filter((table) => table.zona === tableFilter);
  const visibleMenu =
    menuFilter === "TODOS"
      ? menu
      : menu.filter((item) => item.categoria === menuFilter);
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

  function selectTable(table) {
    setSelectedTableId(table.id);
    setTableDraft({
      nombre: table.nombre,
      zona: table.zona,
      estado: table.estado,
      pax: table.pax,
      capacidad: table.capacidad || 4,
    });
    setTicket((current) => ({
      ...current,
      mesaId: table.id,
      servicio: table.zona === "Barra" ? "BARRA" : "SALON",
    }));
  }

  function saveTable() {
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
  }

  function addTable() {
    const nextId = Math.max(...tables.map((table) => table.id)) + 1;
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
  }

  function updateMenuPrice(menuId, price) {
    setMenu((current) =>
      current.map((item) =>
        item.id === menuId ? { ...item, precio: Number(price) } : item
      )
    );
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

  function createOrder(nextState = "PENDIENTE") {
    const table = tables.find((tableItem) => tableItem.id === Number(ticket.mesaId));
    const isTableService = ticket.servicio === "SALON" || ticket.servicio === "BARRA";

    if (!ticket.items.length) return;
    if (isTableService && !table) return;

    const nextOrder = {
      id: nextOrderCode(orders.length + 1),
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

    if (table) {
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
  }

  function setOrderState(orderId, nextState) {
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
  }

  function nextStateFor(order) {
    const currentIndex = orderStates.indexOf(order.estado);
    return orderStates[Math.min(currentIndex + 1, orderStates.length - 1)];
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Benchmark POS profesional"
        title="Operacion"
        subtitle="Mesas, caja, menu rapido, comanda activa, pagos y control de pedidos."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiPrinter /> Comanda
            </button>
            <button className="btn primary" type="button" onClick={addTable}>
              <FiPlus /> Agregar mesa
            </button>
          </div>
        }
      />

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
          <div className="large-table-grid">
            {visibleTables.map((table) => (
              <button
                className={`table-tile ${table.estado.toLowerCase()} ${
                  table.id === selectedTableId ? "selected" : ""
                }`}
                key={table.id}
                type="button"
                onClick={() => selectTable(table)}
              >
                <strong>{table.nombre}</strong>
                <span>{table.zona}</span>
                <Badge tone={statusTone[table.estado]}>{table.estado}</Badge>
                <small>
                  {table.pax}/{table.capacidad} pax
                  {table.total > 0 ? ` / ${money(table.total)}` : ""}
                </small>
              </button>
            ))}
          </div>
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
              </div>
            ))}
          </div>
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
                    onChange={(event) =>
                      setTicket((current) => ({
                        ...current,
                        mesaId: Number(event.target.value),
                      }))
                    }
                  >
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        {table.nombre} - {table.zona}
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
                  disabled={!ticket.items.length}
                >
                  <FiSend /> Enviar
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() => createOrder("COBRADO")}
                  disabled={!ticket.items.length || !cash.open}
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
            <button className="btn primary full" type="button" onClick={saveTable}>
              <FiSave /> Guardar mesa
            </button>
          </div>
        </Card>

        <Card title="Editar precios de carta">
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
                  onChange={(event) => updateMenuPrice(item.id, event.target.value)}
                />
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card title={`Control de pedidos (${orders.length})`}>
        <div className="stack">
          {orders.map((order) => {
            const total = getOrderTotal(order);
            const nextState = nextStateFor(order);

            return (
              <div className="order-control" key={order.id}>
                <div className="order-main">
                  <strong>{order.id}</strong>
                  <span>
                    {order.mesa} / {order.responsable} / {order.canal}
                  </span>
                  <small>
                    {order.items
                      .map(
                        (item) =>
                          `${item.cantidad}x ${item.nombre} (${money(item.precio)})${
                            item.notas ? ` - ${item.notas}` : ""
                          }`
                      )
                      .join(", ")}
                  </small>
                </div>
                <div className="order-side">
                  <Badge tone={statusTone[order.estado]}>{order.estado}</Badge>
                  <strong>{money(total)}</strong>
                  <div className="mini-actions">
                    {order.estado !== "COBRADO" && order.estado !== "ANULADO" && (
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => setOrderState(order.id, nextState)}
                      >
                        <FiCheck /> {nextState}
                      </button>
                    )}
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => setOrderState(order.id, "COBRADO")}
                      disabled={!cash.open || order.estado === "COBRADO"}
                    >
                      <FiDollarSign /> Cobrar
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => setOrderState(order.id, "ANULADO")}
                      disabled={order.estado === "COBRADO"}
                    >
                      <FiX /> Anular
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedTable && (
        <Card title="Detalle seleccionado">
          <div className="selected-summary">
            <FiEdit3 />
            <div>
              <strong>{selectedTable.nombre}</strong>
              <span>
                {selectedTable.zona} / {selectedTable.estado} /{" "}
                {selectedTable.pax} personas / total {money(selectedTable.total)}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
