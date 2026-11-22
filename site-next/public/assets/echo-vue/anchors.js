// In-page section links scroll to their section and leave the address clean, without a "#".
(function () {
  function scrollTo(id) {
    var el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth" });
    return true;
  }
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target) return;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname !== location.pathname || !u.hash) return;
    if (!scrollTo(decodeURIComponent(u.hash.slice(1)))) return;
    e.preventDefault();
    history.replaceState(null, "", u.pathname);
  }, true);
  if (location.hash.length > 1) {
    var id = decodeURIComponent(location.hash.slice(1));
    window.addEventListener("load", function () {
      if (scrollTo(id)) history.replaceState(null, "", location.pathname);
    });
  }
})();
