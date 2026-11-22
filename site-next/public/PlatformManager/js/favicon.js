// The Platform Manager mark in the browser tab, turning like the logo in the header. The static icon in each page is the fallback
// (no script, or reduced motion). Browsers only animate a favicon when the page keeps swapping it, so this redraws it on a timer.
(function () {
  var link = document.querySelector('link[rel~="icon"]');
  if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
  var canvas = document.createElement("canvas"), size = 64, ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = canvas.height = size;
  var colours = ["#0f6cbd", "#2b88d8", "#84c341", "#9db7d2"];
  var cells = [[4, 4], [26, 4], [4, 26], [26, 26]]; // the four tiles on the 48-unit artboard, as in favicon.svg
  var k = size / 48, turn = 16000; // one full turn every 16 seconds, as the header logo
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function tile(x, y, s, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + s - r, y); ctx.quadraticCurveTo(x + s, y, x + s, y + r);
    ctx.lineTo(x + s, y + s - r); ctx.quadraticCurveTo(x + s, y + s, x + s - r, y + s);
    ctx.lineTo(x + r, y + s); ctx.quadraticCurveTo(x, y + s, x, y + s - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath(); ctx.fill();
  }
  function draw(angle) {
    ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(angle); ctx.translate(-size / 2, -size / 2);
    cells.forEach(function (c, i) { ctx.fillStyle = colours[i]; tile(c[0] * k, c[1] * k, 18 * k, 2 * k); });
    ctx.restore();
    link.type = "image/png";
    link.href = canvas.toDataURL("image/png");
  }
  var started = Date.now();
  draw(0);
  if (!reduce) setInterval(function () { draw(((Date.now() - started) % turn) / turn * Math.PI * 2); }, 125);
})();
