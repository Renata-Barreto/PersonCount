export function createChartConfig(history) {
  return {
    type: "line",
    data: {
      labels: history.map(({ idFrame }) => idFrame),
      datasets: [
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
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "Amostra (idFrame)" },
          grid: { display: false },
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
