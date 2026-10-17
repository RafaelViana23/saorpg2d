const ROTATION = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

export function drawAttackVfx(context, { attack, direction, frame, x, y }) {
  if (frame < 1 || frame > 3) return;
  const vorpal = attack === "vorpal-arc";
  const strength = frame === 2 ? 1 : 0.42;
  context.save();
  context.translate(x, y);
  context.rotate(ROTATION[direction] ?? 0);
  context.globalAlpha = strength;
  context.lineCap = "round";
  context.shadowColor = vorpal ? "#43bfff" : "#ffe29a";
  context.shadowBlur = vorpal ? 10 : 4;
  context.strokeStyle = vorpal ? "#b9efff" : "#fff0b8";
  context.lineWidth = vorpal ? 6 : 3;
  context.beginPath();
  context.arc(7, 0, vorpal ? 42 : 27, -1.05, 1.05);
  context.stroke();
  if (vorpal) {
    context.globalAlpha *= 0.55;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(7, 0, 34, -1.18, 1.18);
    context.stroke();
  }
  context.restore();
}
