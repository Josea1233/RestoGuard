import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiClipboard, FiPlus, FiTruck } from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import {
  demoInventory,
  demoPurchases,
  demoRecipeCosts,
  demoSuppliers,
} from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { money, supabaseMessage } from "../utils/format";

function inventoryState(item) {
  const stock = Number(item.stock) || 0;
  const min = Number(item.stock_minimo ?? item.minimo) || 0;

  if (min > 0 && stock <= min) return "CRITICO";
  if (min > 0 && stock <= min * 1.5) return "RIESGO";
  return "OK";
}

function normalizeInventory(item) {
  const costo = Number(item.costo_unitario ?? item.costo) || 0;
  const minimo = Number(item.stock_minimo ?? item.minimo) || 0;
  const stock = Number(item.stock) || 0;
  const estado = item.estado || inventoryState(item);
  const compraSugerida =
    estado === "OK" ? 0 : Math.max(Math.ceil(minimo * 2 - stock), 1);

  return {
    ...item,
    stock,
    minimo,
    costo,
    estado,
    unidad: item.unidad || "und",
    proveedor: item.proveedor || "Por definir",
    ubicacion: item.ubicacion || "Almacen",
    compraSugerida,
  };
}

export default function Inventario() {
  const { negocioId } = useTenant();
  const realMode = authEnabled && Boolean(supabase);
  const [items, setItems] = useState(() =>
    realMode ? [] : demoInventory.map(normalizeInventory)
  );
  const [purchases, setPurchases] = useState(() => (realMode ? [] : demoPurchases));
  const [products, setProducts] = useState(() =>
    realMode ? [] : demoRecipeCosts.map((recipe) => ({ ...recipe, id: recipe.plato }))
  );
  const [loading, setLoading] = useState(realMode);
  const [message, setMessage] = useState("");

  const loadInventory = useCallback(async () => {
    if (!realMode) {
      setItems(demoInventory.map(normalizeInventory));
      setPurchases(demoPurchases);
      setProducts(demoRecipeCosts.map((recipe) => ({ ...recipe, id: recipe.plato })));
      setLoading(false);
      return;
    }

    if (!negocioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const [inventoryResult, purchasesResult, productsResult] = await Promise.all([
      supabase
        .from("insumos")
        .select("id,nombre,categoria,unidad,stock,stock_minimo,costo_unitario,vencimiento,created_at")
        .eq("negocio_id", negocioId)
        .order("id", { ascending: true }),
      supabase
        .from("compras")
        .select("id,proveedor,descripcion,total,comprobante,created_at")
        .eq("negocio_id", negocioId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("productos")
        .select("id,nombre,categoria,precio,costo,activo")
        .eq("negocio_id", negocioId)
        .order("id", { ascending: true }),
    ]);

    const error =
      inventoryResult.error || purchasesResult.error || productsResult.error;

    if (error) {
      setMessage(
        `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`
      );
      setLoading(false);
      return;
    }

    setItems((inventoryResult.data || []).map(normalizeInventory));
    setPurchases(purchasesResult.data || []);
    setProducts(productsResult.data || []);
    setLoading(false);
  }, [negocioId, realMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadInventory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadInventory]);

  const criticalItems = useMemo(
    () => items.filter((item) => item.estado !== "OK"),
    [items]
  );
  const stockValue = items.reduce(
    (sum, item) => sum + Number(item.stock) * Number(item.costo),
    0
  );
  const suggestedPurchase = criticalItems.reduce(
    (sum, item) => sum + Number(item.compraSugerida || 0) * Number(item.costo),
    0
  );
  const supplierRows = realMode
    ? Array.from(
        new Map(
          purchases.map((purchase) => [
            purchase.proveedor || "Proveedor sin nombre",
            {
              nombre: purchase.proveedor || "Proveedor sin nombre",
              categoria: purchase.descripcion,
              deuda: 0,
              ultimaCompra: purchase.created_at?.slice(0, 10) || "-",
              puntualidad: 100,
            },
          ])
        ).values()
      )
    : demoSuppliers;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Stock y compras"
        title="Inventario"
        subtitle="Insumos, bebidas, vencimientos, compras, proveedores y costo de carta."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiTruck /> Registrar compra
            </button>
            <Link className="btn primary" to="/configuracion">
              <FiPlus /> Nuevo insumo
            </Link>
          </div>
        }
      />

      {message && <div className="notice warning">{message}</div>}
      {loading && <div className="notice">Cargando inventario...</div>}

      <div className="stats-grid">
        <Stat
          icon={FiClipboard}
          label="Stock valorizado"
          value={money(stockValue)}
          tone="blue"
        />
        <Stat
          icon={FiAlertTriangle}
          label="Items en riesgo"
          value={criticalItems.length}
          tone="red"
        />
        <Stat
          icon={FiTruck}
          label="Compra sugerida"
          value={money(suggestedPurchase)}
          tone="amber"
        />
        <Stat
          label="Carta costeada"
          value={products.length}
          hint="Productos configurados"
          tone="green"
        />
      </div>

      <div className="two-col wide-left">
        <Card title="Stock critico y operativo">
          {items.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Categoria</th>
                    <th>Stock</th>
                    <th>Minimo</th>
                    <th>Proveedor</th>
                    <th>Ubicacion</th>
                    <th>Compra</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nombre}</td>
                      <td>{item.categoria || "-"}</td>
                      <td>
                        {item.stock} {item.unidad}
                      </td>
                      <td>
                        {item.minimo} {item.unidad}
                      </td>
                      <td>{item.proveedor}</td>
                      <td>{item.ubicacion}</td>
                      <td>
                        {item.compraSugerida
                          ? `${item.compraSugerida} ${item.unidad}`
                          : "No aplica"}
                      </td>
                      <td>{item.vencimiento || "-"}</td>
                      <td>
                        <Badge
                          tone={
                            item.estado === "OK"
                              ? "green"
                              : item.estado === "CRITICO"
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
          ) : (
            <EmptyState
              title="Inventario en cero"
              text="Carga insumos desde Configuracion para empezar a controlar stock."
            />
          )}
        </Card>

        <div className="stack">
          <Card title="Reposicion sugerida">
            {criticalItems.length ? (
              <div className="stack">
                {criticalItems.map((item) => (
                  <div className="row-item" key={item.id}>
                    <div>
                      <strong>{item.nombre}</strong>
                      <span>
                        Comprar {item.compraSugerida} {item.unidad} a{" "}
                        {item.proveedor}
                      </span>
                    </div>
                    <strong>{money(item.compraSugerida * item.costo)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Sin reposicion"
                text="Los insumos bajo minimo apareceran aqui."
              />
            )}
          </Card>

          <Card title="Compras recientes">
            {purchases.length ? (
              <div className="stack">
                {purchases.map((purchase) => (
                  <div className="row-item" key={purchase.id || purchase.proveedor}>
                    <div>
                      <strong>{purchase.proveedor || "Proveedor"}</strong>
                      <span>{purchase.descripcion || purchase.item}</span>
                    </div>
                    <div className="row-right">
                      <Badge tone="blue">
                        {purchase.comprobante || purchase.tipo || "Compra"}
                      </Badge>
                      <strong>{money(purchase.total)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Sin compras"
                text="Cuando registres compras, se listaran aqui."
              />
            )}
          </Card>
        </div>
      </div>

      <div className="two-col">
        <Card title="Costo de carta">
          {products.length ? (
            <div className="recipe-grid">
              {products.map((product) => {
                const precio = Number(product.precio) || 0;
                const costo = Number(product.costo) || 0;
                const foodCost = precio ? Math.round((costo / precio) * 100) : 0;

                return (
                  <div className="recipe-card" key={product.id}>
                    <div>
                      <strong>{product.nombre || product.plato}</strong>
                      <span>{product.categoria || product.riesgo || "Carta"}</span>
                    </div>
                    <div className="recipe-numbers">
                      <span>Precio {money(product.precio ?? product.precio)}</span>
                      <span>Costo {money(product.costo ?? product.costo)}</span>
                      <Badge
                        tone={
                          foodCost > 45 ? "red" : foodCost > 35 ? "amber" : "green"
                        }
                      >
                        Food cost {foodCost || product.foodCost || 0}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Sin productos costeados"
              text="Carga la carta y costos para ver margen por producto."
            />
          )}
        </Card>

        <Card title="Proveedores">
          {supplierRows.length ? (
            <div className="supplier-grid">
              {supplierRows.map((supplier) => (
                <div className="supplier-card" key={supplier.nombre}>
                  <div>
                    <strong>{supplier.nombre}</strong>
                    <span>{supplier.categoria}</span>
                  </div>
                  <Badge tone={supplier.puntualidad >= 90 ? "green" : "amber"}>
                    {supplier.puntualidad}% puntual
                  </Badge>
                  <small>
                    Deuda {money(supplier.deuda)} / ultima compra{" "}
                    {supplier.ultimaCompra}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin proveedores"
              text="Los proveedores se forman con las compras registradas."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
