import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiRefreshCw, FiSave, FiTrash2 } from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import { demoInventory, demoMenu, demoStaff, demoTables } from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { money, supabaseMessage } from "../utils/format";

const emptyMesa = {
  id: null,
  nombre: "",
  zona: "Salon",
  estado: "LIBRE",
  pax: 0,
  capacidad: 4,
};

const emptyProducto = {
  id: null,
  nombre: "",
  categoria: "Platos",
  area: "COCINA",
  precio: 0,
  costo: 0,
  activo: true,
};

const emptyInsumo = {
  id: null,
  nombre: "",
  categoria: "Cocina",
  unidad: "und",
  stock: 0,
  stock_minimo: 0,
  costo_unitario: 0,
};

const emptyEmpleado = {
  id: null,
  nombre: "",
  rol: "MOZO",
  email: "",
  telefono: "",
  sueldo: 0,
  estado: "ACTIVO",
};

const productAreas = ["COCINA", "BARRA"];
const employeeRoles = ["ADMIN", "SUPERVISOR", "CAJA", "MOZO", "COCINA", "BARRA", "RRHH"];
const employeeStates = ["ACTIVO", "OBSERVACION", "INACTIVO"];

export default function Configuracion() {
  const { isSuperAdmin, membership, negocioId } = useTenant();
  const [mesas, setMesas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [mesaForm, setMesaForm] = useState(emptyMesa);
  const [productoForm, setProductoForm] = useState(emptyProducto);
  const [insumoForm, setInsumoForm] = useState(emptyInsumo);
  const [empleadoForm, setEmpleadoForm] = useState(emptyEmpleado);
  const [loading, setLoading] = useState(authEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canConfigure = useMemo(
    () =>
      !authEnabled ||
      isSuperAdmin ||
      ["ADMIN", "SUPERVISOR"].includes(membership?.rol),
    [isSuperAdmin, membership?.rol]
  );

  const loadConfig = useCallback(async () => {
    if (!authEnabled || !supabase) {
      setMesas(demoTables);
      setProductos(demoMenu);
      setInsumos(
        demoInventory.map((item) => ({
          ...item,
          stock_minimo: item.minimo,
          costo_unitario: item.costo,
        }))
      );
      setEmpleados(
        demoStaff.map((staff) => ({
          ...staff,
          rol:
            {
              Mozo: "MOZO",
              Barra: "BARRA",
              Caja: "CAJA",
              Chef: "COCINA",
              Delivery: "MOZO",
            }[staff.rol] || "MOZO",
          estado: staff.estado === "Observacion" ? "OBSERVACION" : "ACTIVO",
        }))
      );
      setLoading(false);
      return;
    }

    if (!negocioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const [mesasResult, productosResult, insumosResult, empleadosResult] =
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
          .order("id", { ascending: true }),
        supabase
          .from("insumos")
          .select("id,nombre,categoria,unidad,stock,stock_minimo,costo_unitario,created_at")
          .eq("negocio_id", negocioId)
          .order("id", { ascending: true }),
        supabase
          .from("empleados")
          .select("id,nombre,rol,email,telefono,sueldo,estado,created_at")
          .eq("negocio_id", negocioId)
          .order("id", { ascending: true }),
      ]);

    const error =
      mesasResult.error ||
      productosResult.error ||
      insumosResult.error ||
      empleadosResult.error;

    if (error) {
      setMessage(`${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`);
      setLoading(false);
      return;
    }

    setMesas(mesasResult.data || []);
    setProductos(productosResult.data || []);
    setInsumos(insumosResult.data || []);
    setEmpleados(empleadosResult.data || []);
    setLoading(false);
  }, [negocioId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadConfig();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadConfig]);

  async function upsertRow(table, form, resetForm, setRows, mapPayload) {
    if (!canConfigure) return;

    if (!authEnabled || !supabase) {
      setRows((current) => {
        const nextRow = {
          ...form,
          id: form.id || Date.now(),
        };

        if (form.id) {
          return current.map((item) => (item.id === form.id ? nextRow : item));
        }

        return [nextRow, ...current];
      });
      resetForm();
      setMessage("Cambio guardado en modo demo.");
      return;
    }

    if (!negocioId) return;

    setSaving(true);
    setMessage("");

    const payload = mapPayload(form);
    const request = form.id
      ? supabase.from(table).update(payload).eq("id", form.id).eq("negocio_id", negocioId)
      : supabase.from(table).insert({ ...payload, negocio_id: negocioId });

    const { error } = await request;

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    resetForm();
    setMessage("Configuracion guardada.");
    await loadConfig();
  }

  async function deleteRow(table, rowId, setRows) {
    if (!canConfigure || !rowId) return;

    if (!authEnabled || !supabase) {
      setRows((current) => current.filter((item) => item.id !== rowId));
      setMessage("Registro eliminado en modo demo.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from(table)
      .delete()
      .eq("id", rowId)
      .eq("negocio_id", negocioId);

    setSaving(false);

    if (error) {
      setMessage(supabaseMessage(error));
      return;
    }

    setMessage("Registro eliminado.");
    await loadConfig();
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Puesta en marcha"
        title="Configuracion"
        subtitle="Carga y edita lo basico para que un negocio nuevo pueda operar sin tocar codigo."
        action={
          <button className="btn ghost" type="button" onClick={loadConfig}>
            <FiRefreshCw /> Actualizar
          </button>
        }
      />

      {!canConfigure && (
        <div className="notice warning">
          Tu rol puede ver la configuracion, pero no modificarla. Pide acceso
          ADMIN o SUPERVISOR.
        </div>
      )}
      {message && <div className="notice">{message}</div>}

      <div className="stats-grid">
        <Stat label="Mesas" value={mesas.length} tone="blue" />
        <Stat label="Productos" value={productos.length} tone="green" />
        <Stat label="Insumos" value={insumos.length} tone="amber" />
        <Stat label="Empleados" value={empleados.length} tone="teal" />
      </div>

      <div className="config-grid">
        <Card title={mesaForm.id ? "Editar mesa" : "Nueva mesa"}>
          <div className="form-grid">
            <input
              placeholder="Mesa 01"
              value={mesaForm.nombre}
              onChange={(event) =>
                setMesaForm((current) => ({ ...current, nombre: event.target.value }))
              }
            />
            <div className="form-grid split">
              <input
                placeholder="Zona"
                value={mesaForm.zona}
                onChange={(event) =>
                  setMesaForm((current) => ({ ...current, zona: event.target.value }))
                }
              />
              <input
                type="number"
                min="1"
                value={mesaForm.capacidad}
                onChange={(event) =>
                  setMesaForm((current) => ({
                    ...current,
                    capacidad: Number(event.target.value),
                  }))
                }
              />
            </div>
            <button
              className="btn primary full"
              type="button"
              disabled={!canConfigure || saving || !mesaForm.nombre}
              onClick={() =>
                upsertRow(
                  "mesas",
                  mesaForm,
                  () => setMesaForm(emptyMesa),
                  setMesas,
                  (form) => ({
                    nombre: form.nombre.trim(),
                    zona: form.zona.trim(),
                    estado: form.estado,
                    pax: Number(form.pax) || 0,
                    capacidad: Number(form.capacidad) || 4,
                  })
                )
              }
            >
              <FiSave /> Guardar mesa
            </button>
          </div>
        </Card>

        <Card title={productoForm.id ? "Editar producto" : "Nuevo producto"}>
          <div className="form-grid">
            <input
              placeholder="Nombre del producto"
              value={productoForm.nombre}
              onChange={(event) =>
                setProductoForm((current) => ({ ...current, nombre: event.target.value }))
              }
            />
            <div className="form-grid split">
              <input
                placeholder="Categoria"
                value={productoForm.categoria}
                onChange={(event) =>
                  setProductoForm((current) => ({
                    ...current,
                    categoria: event.target.value,
                  }))
                }
              />
              <select
                value={productoForm.area}
                onChange={(event) =>
                  setProductoForm((current) => ({ ...current, area: event.target.value }))
                }
              >
                {productAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-grid split">
              <input
                type="number"
                min="0"
                placeholder="Precio"
                value={productoForm.precio}
                onChange={(event) =>
                  setProductoForm((current) => ({
                    ...current,
                    precio: Number(event.target.value),
                  }))
                }
              />
              <input
                type="number"
                min="0"
                placeholder="Costo"
                value={productoForm.costo}
                onChange={(event) =>
                  setProductoForm((current) => ({
                    ...current,
                    costo: Number(event.target.value),
                  }))
                }
              />
            </div>
            <button
              className="btn primary full"
              type="button"
              disabled={!canConfigure || saving || !productoForm.nombre}
              onClick={() =>
                upsertRow(
                  "productos",
                  productoForm,
                  () => setProductoForm(emptyProducto),
                  setProductos,
                  (form) => ({
                    nombre: form.nombre.trim(),
                    categoria: form.categoria.trim(),
                    area: form.area,
                    precio: Number(form.precio) || 0,
                    costo: Number(form.costo) || 0,
                    activo: Boolean(form.activo),
                  })
                )
              }
            >
              <FiSave /> Guardar producto
            </button>
          </div>
        </Card>

        <Card title={insumoForm.id ? "Editar insumo" : "Nuevo insumo"}>
          <div className="form-grid">
            <input
              placeholder="Nombre del insumo"
              value={insumoForm.nombre}
              onChange={(event) =>
                setInsumoForm((current) => ({ ...current, nombre: event.target.value }))
              }
            />
            <div className="form-grid split">
              <input
                placeholder="Categoria"
                value={insumoForm.categoria}
                onChange={(event) =>
                  setInsumoForm((current) => ({
                    ...current,
                    categoria: event.target.value,
                  }))
                }
              />
              <input
                placeholder="Unidad"
                value={insumoForm.unidad}
                onChange={(event) =>
                  setInsumoForm((current) => ({ ...current, unidad: event.target.value }))
                }
              />
            </div>
            <div className="form-grid three">
              <input
                type="number"
                min="0"
                placeholder="Stock"
                value={insumoForm.stock}
                onChange={(event) =>
                  setInsumoForm((current) => ({
                    ...current,
                    stock: Number(event.target.value),
                  }))
                }
              />
              <input
                type="number"
                min="0"
                placeholder="Minimo"
                value={insumoForm.stock_minimo}
                onChange={(event) =>
                  setInsumoForm((current) => ({
                    ...current,
                    stock_minimo: Number(event.target.value),
                  }))
                }
              />
              <input
                type="number"
                min="0"
                placeholder="Costo"
                value={insumoForm.costo_unitario}
                onChange={(event) =>
                  setInsumoForm((current) => ({
                    ...current,
                    costo_unitario: Number(event.target.value),
                  }))
                }
              />
            </div>
            <button
              className="btn primary full"
              type="button"
              disabled={!canConfigure || saving || !insumoForm.nombre}
              onClick={() =>
                upsertRow(
                  "insumos",
                  insumoForm,
                  () => setInsumoForm(emptyInsumo),
                  setInsumos,
                  (form) => ({
                    nombre: form.nombre.trim(),
                    categoria: form.categoria.trim(),
                    unidad: form.unidad.trim(),
                    stock: Number(form.stock) || 0,
                    stock_minimo: Number(form.stock_minimo) || 0,
                    costo_unitario: Number(form.costo_unitario) || 0,
                  })
                )
              }
            >
              <FiSave /> Guardar insumo
            </button>
          </div>
        </Card>

        <Card title={empleadoForm.id ? "Editar empleado" : "Nuevo empleado"}>
          <div className="form-grid">
            <input
              placeholder="Nombre del empleado"
              value={empleadoForm.nombre}
              onChange={(event) =>
                setEmpleadoForm((current) => ({ ...current, nombre: event.target.value }))
              }
            />
            <div className="form-grid split">
              <select
                value={empleadoForm.rol}
                onChange={(event) =>
                  setEmpleadoForm((current) => ({ ...current, rol: event.target.value }))
                }
              >
                {employeeRoles.map((rol) => (
                  <option key={rol} value={rol}>
                    {rol}
                  </option>
                ))}
              </select>
              <select
                value={empleadoForm.estado}
                onChange={(event) =>
                  setEmpleadoForm((current) => ({
                    ...current,
                    estado: event.target.value,
                  }))
                }
              >
                {employeeStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-grid split">
              <input
                type="email"
                placeholder="correo@negocio.com"
                value={empleadoForm.email}
                onChange={(event) =>
                  setEmpleadoForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <input
                type="number"
                min="0"
                placeholder="Sueldo"
                value={empleadoForm.sueldo}
                onChange={(event) =>
                  setEmpleadoForm((current) => ({
                    ...current,
                    sueldo: Number(event.target.value),
                  }))
                }
              />
            </div>
            <input
              placeholder="Telefono"
              value={empleadoForm.telefono}
              onChange={(event) =>
                setEmpleadoForm((current) => ({ ...current, telefono: event.target.value }))
              }
            />
            <button
              className="btn primary full"
              type="button"
              disabled={!canConfigure || saving || !empleadoForm.nombre}
              onClick={() =>
                upsertRow(
                  "empleados",
                  empleadoForm,
                  () => setEmpleadoForm(emptyEmpleado),
                  setEmpleados,
                  (form) => ({
                    nombre: form.nombre.trim(),
                    rol: form.rol,
                    email: form.email.trim() || null,
                    telefono: form.telefono.trim() || null,
                    sueldo: Number(form.sueldo) || 0,
                    estado: form.estado,
                  })
                )
              }
            >
              <FiSave /> Guardar empleado
            </button>
          </div>
        </Card>
      </div>

      <Card title="Datos cargados">
        {loading ? (
          <p className="muted">Cargando configuracion...</p>
        ) : (
          <div className="config-tables">
            <MiniTable
              title="Mesas"
              rows={mesas}
              columns={["nombre", "zona", "capacidad"]}
              onEdit={setMesaForm}
              onDelete={(id) => deleteRow("mesas", id, setMesas)}
              canConfigure={canConfigure}
            />
            <MiniTable
              title="Carta"
              rows={productos}
              columns={["nombre", "categoria", "area", "precio"]}
              formatValue={(key, value) => (key === "precio" ? money(value) : value)}
              onEdit={setProductoForm}
              onDelete={(id) => deleteRow("productos", id, setProductos)}
              canConfigure={canConfigure}
            />
            <MiniTable
              title="Insumos"
              rows={insumos}
              columns={["nombre", "stock", "unidad", "stock_minimo"]}
              onEdit={setInsumoForm}
              onDelete={(id) => deleteRow("insumos", id, setInsumos)}
              canConfigure={canConfigure}
            />
            <MiniTable
              title="Empleados"
              rows={empleados}
              columns={["nombre", "rol", "estado", "sueldo"]}
              formatValue={(key, value) => (key === "sueldo" ? money(value) : value)}
              onEdit={setEmpleadoForm}
              onDelete={(id) => deleteRow("empleados", id, setEmpleados)}
              canConfigure={canConfigure}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function MiniTable({
  title,
  rows,
  columns,
  formatValue = (_key, value) => value,
  onEdit,
  onDelete,
  canConfigure,
}) {
  return (
    <div className="config-table">
      <div className="config-table-head">
        <strong>{title}</strong>
        <Badge tone={rows.length ? "green" : "amber"}>{rows.length}</Badge>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th>Accion</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column}>{formatValue(column, row[column]) || "-"}</td>
                ))}
                <td>
                  <div className="mini-actions">
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={!canConfigure}
                      onClick={() => onEdit(row)}
                    >
                      <FiPlus /> Editar
                    </button>
                    <button
                      className="btn ghost"
                      type="button"
                      disabled={!canConfigure}
                      onClick={() => onDelete(row.id)}
                    >
                      <FiTrash2 /> Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={columns.length + 1}>Aun no hay registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
