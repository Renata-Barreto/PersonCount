import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { createChartConfig } from "../../utils/chartConfig";
import "./ResultsChart.scss";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
  Legend,
);

export default function ResultsChart({ history }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!history?.length) return;
    const chart = new Chart(canvasRef.current, createChartConfig(history));
    return () => chart.destroy();
  }, [history]);
  return (
    <section className="results-chart" aria-labelledby="chart-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">03 · RESULTADOS</p>
          <h2 id="chart-title">Contagem ao longo do vídeo</h2>
        </div>
      </div>
      {history?.length ? (
        <>
          <div className="results-chart__plot">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Gráfico de pessoas por amostra, com ${history.length} amostras processadas`}
            />
          </div>
          <p className="results-chart__caption">
            Cada amostra corresponde a uma detecção durante a reprodução; nem
            todos os quadros do arquivo são analisados.
          </p>
        </>
      ) : (
        <p className="results-chart__empty">
          Ao concluir a análise, o histórico de contagens aparece aqui.
        </p>
      )}
    </section>
  );
}
