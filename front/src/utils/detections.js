export function getPeople(predictions) {
  return predictions.filter((prediction) => prediction.class === "person");
}

export function drawDetections(ctx, people) {
  ctx.lineWidth = 2;
  ctx.strokeStyle = "red";
  ctx.fillStyle = "red";
  ctx.font = "14px sans-serif";
  people.forEach(({ bbox, class: label, score }) => {
    ctx.beginPath();
    ctx.rect(...bbox);
    ctx.stroke();
    ctx.fillText(
      `${label} - ${Math.round(score * 100)}%`,
      bbox[0],
      bbox[1] > 10 ? bbox[1] - 5 : 10,
    );
  });
}
