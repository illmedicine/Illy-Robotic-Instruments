(function () {
  var t = "light";
  try { t = localStorage.getItem("ppm-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); } catch (e) {}
  document.documentElement.setAttribute("data-theme", t);
})();
