import { FiAlertTriangle, FiClipboard, FiPlus, FiTruck } from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import {
  demoInventory,
  demoPurchases,
  demoRecipeCosts,
  demoSuppliers,
} from "../data/demo";
import { money } from "../utils/format";

export default function Inventario() {
  const stockValue = demoInventory.reduce(
    (sum, item) => sum + Number(item.stock) * Number(item.costo),
    0
  );
  const criticalItems = demoInventory.filter((item) => item.estado !== "OK");
  const suggestedPurchase = demoInventory.reduce(
    (sum, item) => sum + Number(item.compraSugerida || 0) * Number(item.costo),
    0
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Stock y compras"
        title="Inventario"
        subtitle="Insumos, bebidas, vencimientos, compras, proveedores y costo de recetas."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiTruck /> Registrar compra
            </button>
            <button className="btn primary" type="button">
              <FiPlus /> Nuevo insumo
            </button>
          </div>
        }
      />

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
          label="Recetas costeadas"
          value={demoRecipeCosts.length}
          hint="Margen visible"
          tone="green"
        />
      </div>

      <div className="two-col wide-left">
        <Card title="Stock critico y operativo">
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
                {demoInventory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nombre}</td>
                    <td>{item.categoria}</td>
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
                    <td>{item.vencimiento}</td>
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
        </Card>

        <div className="stack">
          <Card title="Reposicion sugerida">
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
          </Card>

          <Card title="Compras recientes">
            <div className="stack">
              {demoPurchases.map((purchase) => (
                <div className="row-item" key={purchase.proveedor}>
                  <div>
                    <strong>{purchase.proveedor}</strong>
                    <span>{purchase.item}</span>
                  </div>
                  <div className="row-right">
                    <Badge tone="blue">{purchase.tipo}</Badge>
                    <strong>{money(purchase.total)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="two-col">
        <Card title="Costo de recetas">
          <div className="recipe-grid">
            {demoRecipeCosts.map((recipe) => (
              <div className="recipe-card" key={recipe.plato}>
                <div>
                  <strong>{recipe.plato}</strong>
                  <span>{recipe.riesgo}</span>
                </div>
                <div className="recipe-numbers">
                  <span>Precio {money(recipe.precio)}</span>
                  <span>Costo {money(recipe.costo)}</span>
                  <Badge
                    tone={
                      recipe.foodCost > 45
                        ? "red"
                        : recipe.foodCost > 35
                          ? "amber"
                          : "green"
                    }
                  >
                    Food cost {recipe.foodCost}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Proveedores">
          <div className="supplier-grid">
            {demoSuppliers.map((supplier) => (
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
        </Card>
      </div>
    </div>
  );
}
