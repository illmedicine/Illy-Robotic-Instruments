// The Echo Vue mark in the browser tab, turning like the header logo. Browsers ignore animation inside a favicon, so this
// draws the SVG onto a canvas at each step of the turn and swaps it in. The static favicon stays as the fallback.
(function () {
  function iconLink() {
    var link = document.querySelector('link[rel~="icon"]');
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    return link;
  }
  var canvas = document.createElement("canvas"), size = 64, ctx = canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = canvas.height = size;
  var turn = 16000; // one full turn every 16 seconds, as the file's own animation
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  fetch("/assets/echo-vue/favicon.svg")
    .then(function (r) { return r.text(); })
    .then(function (text) {
      var still = text.replace(/<animateTransform[^>]*\/>/g, "");
      var url = URL.createObjectURL(new Blob([still], { type: "image/svg+xml" }));
      var img = new Image();
      img.onload = function () {
        function draw(angle) {
          ctx.clearRect(0, 0, size, size);
          ctx.save();
          ctx.translate(size / 2, size / 2);
          ctx.rotate(angle);
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();
          var link = iconLink();
          link.type = "image/png";
          link.href = canvas.toDataURL("image/png");
        }
        var started = Date.now();
        draw(0);
        if (!reduce) setInterval(function () { draw(((Date.now() - started) % turn) / turn * Math.PI * 2); }, 125);
      };
      img.src = url;
    })
    .catch(function () { /* the static icon stays in place */ });
})();
