export async function uploadHistory(history, signal, { alertThreshold } = {}) {
  const query = alertThreshold ? `?limiar=${Number(alertThreshold)}` : "";
  const response = await fetch(`/upload-history${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(history),
    signal,
  });
  if (!response.ok) throw new Error("Não foi possível salvar as contagens.");
  const result = await response.json();
  if (result.status !== "ok")
    throw new Error("Resposta inesperada do servidor.");
  return result;
}
