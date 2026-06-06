import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiClipboard,
  FiPlus,
  FiTarget,
  FiTrendingDown,
} from "react-icons/fi";

import { Badge, Card, EmptyState, PageHeader, Stat } from "../components/UI";
import { useTenant } from "../context/TenantContext";
import { demoMetrics, demoWaste, demoWasteActions, demoWasteCauses } from "../data/demo";
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

function normalizeWaste(item) {
  return {
    id: item.id || `${item.item}-${item.causa}`,
    item: item.item || item.descripcion,
    causa: item.causa,
    cantidad: item.cantidad ? `${item.cantidad} ${item.unidad || ""}`.trim() : "-",
    perdida: Number(item.perdida ?? item.costo) || 0,
    area: item.area || "Operacion",
    responsable: item.responsable || "Por definir",
    recuperable: Number(item.recuperable) || 0,
    estado: item.estado || "Registrada",
    created_at: item.created_at,
  };
}

export default function Merma() {
  const { negocioId } = useTenant();
  const realMode = authEnabled && Boolean(supabase);
  const [waste, setWaste] = useState(() =>
    realMode ? [] : demoWaste.map(normalizeWaste)
  );
  const [loading, setLoading] = useState(realMode);
  const [message, setMessage] = useState("");

  const loadWaste = useCallback(async () => {
    if (!realMode) {
      setWaste(demoWaste.map(normalizeWaste));
      setLoading(false);
      return;
    }

    if (!negocioId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("mermas")
      .select("id,descripcion,cantidad,unidad,causa,costo,created_at")
      .eq("negocio_id", negocioId)
      .gte("created_at", monthStartIso())
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(
        `${supabaseMessage(error)}. Vuelve a ejecutar supabase/restoguard.sql.`
      );
      setLoading(false);
      return;
    }

    setWaste((data || []).map(normalizeWaste));
    setLoading(false);
  }, [negocioId, realMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadWaste();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadWaste]);

  const wasteValue = waste.reduce((sum, item) => sum + item.perdida, 0);
  const todayWaste = waste
    .filter((item) => !realMode || item.created_at >= todayStartIso())
    .reduce((sum, item) => sum + item.perdida, 0);
  const recoverable = waste.reduce((sum, item) => sum + item.recuperable, 0);
  const pending = waste.filter((item) => item.estado !== "Registrada");
  const causes = useMemo(() => {
    if (!realMode) return demoWasteCauses;

    const grouped = new Map();
    waste.forEach((item) => {
      const current = grouped.get(item.causa) || {
        causa: item.causa || "Sin causa",
        valor: 0,
        monto: 0,
      };
      current.valor += 1;
      current.monto += item.perdida;
      grouped.set(current.causa, current);
    });

    return Array.from(grouped.values());
  }, [realMode, waste]);
  const maxCause = Math.max(...causes.map((cause) => cause.valor), 1);
  const actions = realMode
    ? causes.slice(0, 3).map((cause) => ({
        accion: `Revisar ${cause.causa}`,
        impacto: `${money(cause.monto)} acumulados este mes.`,
        responsable: "Supervisor",
      }))
    : demoWasteActions;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Control de perdida"
        title="Merma"
        subtitle="Perdidas, desperdicios, roturas, vencimientos y acciones para recuperar margen."
        action={
          <div className="actions">
            <button className="btn ghost" type="button">
              <FiClipboard /> Auditoria
            </button>
            <button className="btn primary" type="button">
              <FiPlus /> Registrar merma
            </button>
          </div>
        }
      />

      {message && <div className="notice warning">{message}</div>}
      {loading && <div className="notice">Cargando merma...</div>}

      <div className="stats-grid">
        <Stat
          icon={FiTrendingDown}
          label="Merma mes"
          value={money(realMode ? wasteValue : demoMetrics.mermaMes)}
          hint="Acumulado"
          tone="red"
        />
        <Stat
          icon={FiAlertTriangle}
          label="Merma hoy"
          value={money(todayWaste)}
          hint={`${waste.length} registros`}
          tone="amber"
        />
        <Stat
          icon={FiTarget}
          label="Recuperable"
          value={money(recoverable)}
          hint="Puede salvarse"
          tone="green"
        />
        <Stat
          label="Pendientes"
          value={pending.length}
          hint="Requieren revision"
          tone="blue"
        />
      </div>

      <div className="two-col">
        <Card title="Causas principales">
          {causes.length ? (
            <div className="bar-list">
              {causes.map((cause) => (
                <div className="bar-row waste" key={cause.causa}>
                  <span>{cause.causa}</span>
                  <div className="bar-track">
                    <i style={{ "--bar": `${(cause.valor / maxCause) * 100}%` }} />
                  </div>
                  <strong>{money(cause.monto)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin causas"
              text="Cuando registres mermas, se agruparan por causa."
            />
          )}
        </Card>

        <Card title="Acciones correctivas">
          {actions.length ? (
            <div className="stack">
              {actions.map((item) => (
                <div className="action-row" key={item.accion}>
                  <Badge tone="blue">{item.responsable}</Badge>
                  <div>
                    <strong>{item.accion}</strong>
                    <span>{item.impacto}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin acciones"
              text="Las acciones aparecen cuando hay perdidas registradas."
            />
          )}
        </Card>
      </div>

      <Card title="Registro de merma por producto">
        {waste.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Causa</th>
                  <th>Area</th>
                  <th>Cantidad</th>
                  <th>Perdida</th>
                  <th>Recuperable</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {waste.map((item) => (
                  <tr key={item.id}>
                    <td>{item.item}</td>
                    <td>{item.causa}</td>
                    <td>{item.area}</td>
                    <td>{item.cantidad}</td>
                    <td>{money(item.perdida)}</td>
                    <td>{money(item.recuperable)}</td>
                    <td>{item.responsable}</td>
                    <td>
                      <Badge
                        tone={
                          item.estado === "Registrada"
                            ? "green"
                            : item.estado === "Pendiente"
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
            title="Merma en cero"
            text="Todavia no hay perdidas registradas para este negocio."
          />
        )}
      </Card>
    </div>
  );
}
