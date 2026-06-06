import { FiCpu, FiTarget, FiTrendingDown, FiTrendingUp } from "react-icons/fi";

import { Badge, Card, PageHeader, Stat } from "../components/UI";
import {
  demoChannelMix,
  demoBenchmarkIdeas,
  demoForecast,
  demoInventory,
  demoMenuEngineering,
  demoMetrics,
  demoSmartActions,
} from "../data/demo";
import { money } from "../utils/format";

export default function Analisis() {
  const riskyItems = demoInventory.filter((item) => item.estado !== "OK");
  const maxForecast = Math.max(
    ...demoForecast.map((day) => day.salon + day.barra + day.delivery)
  );
  const bestChannel = demoChannelMix.reduce((best, item) =>
    item.ventas > best.ventas ? item : best
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Decision inteligente"
        title="Analisis"
        subtitle="Recomendaciones para comprar mejor, vender mas, perder menos y ajustar la carta."
        action={<button className="btn primary">Generar analisis</button>}
      />

      <div className="stats-grid">
        <Stat icon={FiCpu} label="Confianza demo" value="91%" tone="blue" />
        <Stat
          icon={FiTrendingDown}
          label="Merma mes"
          value={money(demoMetrics.mermaMes)}
          tone="red"
        />
        <Stat
          icon={FiTarget}
          label="Acciones sugeridas"
          value={demoSmartActions.length}
          tone="amber"
        />
        <Stat
          icon={FiTrendingUp}
          label="Canal lider"
          value={bestChannel.canal}
          hint={money(bestChannel.ventas)}
          tone="green"
        />
      </div>

      <div className="two-col wide-left">
        <Card title="Prioridades automaticas">
          <div className="priority-list">
            {demoSmartActions.map((action, index) => (
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

        <Card title="Forecast por canal">
          <div className="forecast-list">
            {demoForecast.map((day) => {
              const total = day.salon + day.barra + day.delivery;

              return (
                <div className="forecast-row" key={day.dia}>
                  <strong>{day.dia}</strong>
                  <div className="stacked-bar" style={{ "--bar": `${(total / maxForecast) * 100}%` }}>
                    <i style={{ "--bar": `${(day.salon / total) * 100}%` }} />
                    <b style={{ "--bar": `${(day.barra / total) * 100}%` }} />
                    <em style={{ "--bar": `${(day.delivery / total) * 100}%` }} />
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
        </Card>
      </div>

      <Card title="Ingenieria de menu">
        <div className="menu-matrix">
          {demoMenuEngineering.map((item) => (
            <div className="menu-card" key={item.plato}>
              <Badge
                tone={
                  item.cuadrante === "Estrella"
                    ? "green"
                    : item.cuadrante === "Rompecabezas"
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
          <div className="promo-grid">
            <div className="recommendation">
              <Badge tone="green">Hoy</Badge>
              <strong>Combo barra rapida</strong>
              <p>
                2 cocteles + piqueo con margen alto para horario de menor
                trafico.
              </p>
            </div>
            <div className="recommendation">
              <Badge tone="amber">Stock</Badge>
              <strong>Menu del dia con pollo</strong>
              <p>
                Usar pollo fresco antes de vencimiento y recuperar venta antes
                de registrar merma.
              </p>
            </div>
            <div className="recommendation">
              <Badge tone="blue">Fin de semana</Badge>
              <strong>Paquete familiar</strong>
              <p>
                Subir ticket promedio con bebida incluida y preparacion
                controlada.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Riesgos detectados">
          <div className="stack">
            {riskyItems.map((item) => (
              <div className="row-item" key={item.id}>
                <div>
                  <strong>{item.nombre}</strong>
                  <span>
                    Stock {item.stock} {item.unidad} / uso diario{" "}
                    {item.usoDiario} {item.unidad}
                  </span>
                </div>
                <Badge tone={item.estado === "CRITICO" ? "red" : "amber"}>
                  {item.estado}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
