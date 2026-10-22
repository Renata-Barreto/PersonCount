function formatTime(seconds) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function createChartConfig(history, alertThreshold) {
  const timed = history.every(({ tempo }) => typeof tempo === "number");
  const datasets = [
    {
      label: "Pessoas por amostra",
      data: history.map(({ personCount }) => personCount),
      borderColor: "#345b4f",
      backgroundColor: "rgba(52, 91, 79, 0.08)",
      borderWidth: 2,
      pointRadius: history.length > 100 ? 0 : 2,
      fill: true,
      tension: 0.2,
    },
  ];
  if (alertThreshold)
    datasets.push({
      label: `Limiar de alerta (${alertThreshold})`,
      data: history.map(() => alertThreshold),
      borderColor: "#a13931",
      borderDash: [6, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  return {
    type: "line",
    data: {
      labels: history.map(({ idFrame, tempo }) =>
        timed ? formatTime(tempo) : idFrame,
      ),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            title: ([item]) =>
              timed
                ? `${formatTime(history[item.dataIndex].tempo)} · amostra ${history[item.dataIndex].idFrame}`
                : `Amostra ${history[item.dataIndex].idFrame}`,
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: timed ? "Tempo do vídeo (min:s)" : "Amostra (idFrame)",
          },
          grid: { display: false },
          ticks: { maxTicksLimit: 12, autoSkip: true },
        },
        y: {
          title: { display: true, text: "Quantidade de pessoas" },
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  };
}
