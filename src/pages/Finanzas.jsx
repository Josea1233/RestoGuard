import { useCallback, useEffect, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiCheckSquare,
  FiDollarSign,
  FiExternalLink,
  FiTrendingUp,
} from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import {
  demoCashClosures,
  demoCashMovements,
  demoCostCenters,
  demoMetrics,
  demoPaymentMix,
} from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { money, supabaseMessage } from "../utils/format";

function monthStartIso() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function todayStartIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function groupIncomeByChannel(orders) {
  const grouped = new Map();

  orders
    .filter((order) => order.estado === "COBRADO")
    .forEach((order) => {
      const key = order.canal || "SALON";
      const current = grouped.get(key) || {
        metodo: key,
        monto: 0,
        transacciones: 0,
      };
      current.monto += Number(order.total) || 0;
      current.transacciones += 1;
      grouped.set(key, current);
    });

  return Array.from(grouped.values());
}

export default function Finanzas() {
  const { negocioId } = useTenant();
  const realMode = authEnabled && Boolean(supabase);
  const [orders, setOrders] = useState(() => (realMode ? [] : []));
  const [purchases, setPurchases] = useState(() => (realMode ? [] : []));
  const [waste, setWaste] = useState(() => (realMode ? [] : []));
  const [loading, setLoading] = useState(realMode);
  const [message, setMessage] = useState("");

  const loadFinance = useCallback(async () => {
    if (!realMode) {
      setLoading(false);
      return;
    }

    if (!negocioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const [ordersResult, purchasesResult, wasteResult] = await Promise.all([
      supabase
        .from("pedidos")
        .select("id,codigo,canal,estado,total,created_at")
        .eq("negocio_id", negocioId)
        .gte("created_at", monthStartIso())
        .order("created_at", { ascending: false }),
      supabase
        .from("compras")
        .select("id,proveedor,descripcion,total,created_at")
        .eq("negocio_id", negocioId)
        .gte("created_at", monthStartIso())
        .order("created_at", { ascending: false }),
      supabase
        .from("mermas")
        .select("id,descripcion,costo,causa,created_at")
        .eq("negocio_id", negocioId)
        .gte("created_at", monthStartIso())
        .order("created_at", { ascending: false }),
    ]);

    const error = ordersResult.error || purchasesResult.error || wasteResult.error;

    if (error) {
      setMessage(
        `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`
      );
      setLoading(false);
      return;
    }

    setOrders(ordersResult.data || []);
    setPurchases(purchasesResult.data || []);
    setWaste(wasteResult.data || []);
    setLoading(false);
  }, [negocioId, realMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadFinance();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFinance]);

  const paidOrders = realMode
    ? orders.filter((order) => order.estado === "COBRADO")
    : [];
  const today = todayStartIso();
  const realIncomeMonth = paidOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );
  const realIncomeToday = paidOrders
    .filter((order) => order.created_at >= today)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const realPurchases = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.total || 0),
    0
  );
  const realWaste = waste.reduce((sum, item) => sum + Number(item.costo || 0), 0);
  const paymentMix = realMode ? groupIncomeByChannel(orders) : demoPaymentMix;
  const paymentTotal = Math.max(
    paymentMix.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    1
  );
  const cashMovements = realMode
    ? [
        { concepto: "Ventas cobradas hoy", tipo: "income", monto: realIncomeToday },
        { concepto: "Compras del mes", tipo: "expense", monto: realPurchases },
        { concepto: "Merma valorizada", tipo: "expense", monto: realWaste },
      ]
    : demoCashMovements;
  const costBase = Math.max(realIncomeMonth, 1);
  const costCenters = realMode
    ? [
        {
          centro: "Compras",
          meta: 35,
          monto: realPurchases,
          valor: Math.round((realPurchases / costBase) * 100),
        },
        {
          centro: "Merma",
          meta: 5,
          monto: realWaste,
          valor: Math.round((realWaste / costBase) * 100),
        },
      ]
    : demoCostCenters;
  const closures = realMode
    ? [
        { tarea: "Contar efectivo fisico", estado: "Pendiente", responsable: "Caja" },
        { tarea: "Conciliar Yape/Plin/POS", estado: "Pendiente", responsable: "Caja" },
        { tarea: "Registrar compras del turno", estado: purchases.length ? "Listo" : "Pendiente", responsable: "Supervisor" },
        { tarea: "Enviar reporte al dueno", estado: "Pendiente", responsable: "Admin" },
      ]
    : demoCashClosures;
  const incomeMonth = realMode ? realIncomeMonth : 89420;
  const expensesMonth = realMode ? realPurchases + realWaste : demoMetrics.gastosMes;
  const netProfit = incomeMonth - expensesMonth;
  const cashAvailable = realMode ? realIncomeToday : demoMetrics.caja;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Caja y rentabilidad"
        title="Finanzas"
        subtitle="Caja, ingresos, compras, gastos, cierres y margen estimado."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              Exportar
            </button>
            <button className="btn primary" type="button">
              Cerrar caja
            </button>
          </div>
        }
      />

      {message && <div className="notice warning">{message}</div>}
      {loading && <div className="notice">Cargando finanzas...</div>}

      <div className="stats-grid">
        <Stat
          icon={FiDollarSign}
          label="Caja disponible"
          value={money(cashAvailable)}
        />
        <Stat
          icon={FiArrowUp}
          label="Ingresos mes"
          value={money(incomeMonth)}
          tone="green"
        />
        <Stat
          icon={FiArrowDown}
          label="Gastos mes"
          value={money(expensesMonth)}
          tone="red"
        />
        <Stat
          icon={FiTrendingUp}
          label="Ganancia neta"
          value={money(netProfit)}
          tone="blue"
        />
      </div>

      <div className="two-col">
        <Card title="Flujo de caja">
          {cashMovements.some((movement) => Number(movement.monto) > 0) ? (
            <div className="stack">
              {cashMovements.map((movement) => (
                <div className={`finance-row ${movement.tipo}`} key={movement.concepto}>
                  <span>{movement.concepto}</span>
                  <strong>
                    {movement.tipo === "income"
                      ? "+ "
                      : movement.tipo === "expense"
                        ? "- "
                        : ""}
                    {money(movement.monto)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Finanzas en cero"
              text="Cuando cobres pedidos o registres compras, el flujo aparecera aqui."
            />
          )}
        </Card>

        <Card title={realMode ? "Ingresos por canal" : "Metodos de pago"}>
          {paymentMix.length ? (
            <div className="payment-grid">
              {paymentMix.map((payment) => (
                <div className="payment-card" key={payment.metodo}>
                  <div>
                    <strong>{payment.metodo}</strong>
                    <span>{payment.transacciones} transacciones</span>
                  </div>
                  <div className="load-meter">
                    <i style={{ "--bar": `${(payment.monto / paymentTotal) * 100}%` }} />
                  </div>
                  <strong>{money(payment.monto)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin cobros"
              text="Los canales de ingreso se llenan al cobrar pedidos."
            />
          )}
        </Card>
      </div>

      <div className="two-col">
        <Card title="Centros de costo">
          {costCenters.length ? (
            <div className="stack">
              {costCenters.map((center) => (
                <div className="cost-row" key={center.centro}>
                  <div>
                    <strong>{center.centro}</strong>
                    <span>
                      Meta {center.meta}% / acumulado {money(center.monto)}
                    </span>
                  </div>
                  <div className="load-meter">
                    <i style={{ "--bar": `${Math.min(center.valor, 100)}%` }} />
                  </div>
                  <Badge tone={center.valor > center.meta ? "red" : "green"}>
                    {center.valor}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin costos"
              text="Compras y mermas alimentan esta lectura."
            />
          )}
        </Card>

        <Card title="Checklist de cierre">
          <div className="stack">
            {closures.map((item) => (
              <div className="check-row" key={item.tarea}>
                <FiCheckSquare />
                <div>
                  <strong>{item.tarea}</strong>
                  <span>{item.responsable}</span>
                </div>
                <Badge tone={item.estado === "Listo" ? "green" : "amber"}>
                  {item.estado}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Modulos relacionados">
        <div className="module-link-grid">
          <div className="module-link-card">
            <Badge tone="blue">RRHH</Badge>
            <strong>Planilla, comisiones y asistencia</strong>
            <span>El detalle laboral vive separado para que finanzas no se sature.</span>
            <FiExternalLink />
          </div>
          <div className="module-link-card">
            <Badge tone="red">Merma</Badge>
            <strong>Perdidas y desperdicio</strong>
            <span>La perdida operativa se revisa en su propio modulo con causas.</span>
            <FiExternalLink />
          </div>
          <div className="module-link-card">
            <Badge tone="amber">Inventario</Badge>
            <strong>Compras y proveedores</strong>
            <span>Costos de insumos y compras recientes quedan en stock.</span>
            <FiExternalLink />
          </div>
        </div>
      </Card>
    </div>
  );
}
