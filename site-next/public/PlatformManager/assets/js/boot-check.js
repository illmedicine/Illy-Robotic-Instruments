// Boot watchdog (classic script, so it runs even when the module graph fails). The app's ~50 ES modules load as one unit:
// if a single file times out on a poor connection, nothing starts and the page stays on "Connecting...". main.js sets
// window.__ppmReady once every module loaded. If that has not happened, reload twice automatically, then offer a button.
(function () {
  var KEY = "ppm-boot-retry", WAIT_MS = 15000, MAX_AUTO = 2;
  setTimeout(function () {
    if (window.__ppmReady) return;
    var tries = 0;
    try { tries = parseInt(sessionStorage.getItem(KEY) || "0", 10) || 0; } catch (e) { tries = MAX_AUTO; }
    if (tries < MAX_AUTO) {
      try { sessionStorage.setItem(KEY, String(tries + 1)); } catch (e) { /* storage blocked */ }
      location.reload();
      return;
    }
    var main = document.getElementById("main"), text = document.getElementById("livetext");
    if (text) text.textContent = "Could not load";
    if (!main) return;
    var btn = document.createElement("button");
    btn.className = "btn";
    btn.type = "button";
    btn.textContent = "Reload";
    btn.addEventListener("click", function () {
      try { sessionStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }
      location.reload();
    });
    main.textContent = "";
    var box = document.createElement("div");
    box.className = "loading";
    box.appendChild(document.createTextNode("Platform Manager could not finish loading. A file did not arrive from the server, usually because of a slow or interrupted network connection."));
    box.appendChild(document.createElement("br"));
    box.appendChild(btn);
    main.appendChild(box);
  }, WAIT_MS);
})();
