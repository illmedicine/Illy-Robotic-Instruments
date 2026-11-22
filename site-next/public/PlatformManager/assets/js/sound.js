// Tactile button sounds. Every major button function has its own short synthesised click, always
// the same one, so people learn what a button did by ear. Toggles share a voice per function: the
// pitch rises when it turns on (or opens) and falls when it turns off (or closes).
// Web Audio only: no audio files, nothing fetched, nothing inline, so the CSP is untouched.

const KEY = "ppm-sound";
const MASTER = 0.22;

// A voice is a tone (osc: wave, f -> f2 Hz) or a burst of filtered noise (hz centre), starting at
// `at` ms, lasting `d` ms, at relative gain `g`.
const tone = (f, f2, d, g = 0.4, at = 0, w = "sine") => ({ osc: w, f, f2, d, g, at });
const noise = (hz, d, g = 0.4, at = 0, q = 1.2) => ({ hz, d, g, at, q });

export const SOUNDS = {
  tap: [noise(3200, 10, 0.45), tone(900, 600, 30, 0.3)],
  primary: [noise(2400, 8, 0.4), tone(523, 523, 45, 0.4, 0, "triangle"), tone(784, 784, 70, 0.38, 45, "triangle")],
  navigate: [noise(1800, 12, 0.4), tone(320, 240, 50, 0.5, 0, "triangle")],
  sync: [tone(440, 440, 45, 0.3, 0, "triangle"), tone(554, 554, 45, 0.3, 40, "triangle"), tone(659, 659, 70, 0.32, 80, "triangle")],
  download: [tone(988, 988, 45, 0.3), tone(784, 784, 45, 0.3, 45), tone(587, 587, 70, 0.32, 90)],
  upload: [tone(587, 587, 45, 0.3), tone(784, 784, 45, 0.3, 45), tone(988, 988, 70, 0.32, 90)],
  copy: [noise(6000, 6, 0.3), tone(1760, 1760, 20, 0.28), tone(2093, 2093, 24, 0.28, 55)],
  search: [tone(1319, 1319, 160, 0.26), tone(1976, 1976, 120, 0.12, 10)],
  ai: [tone(880, 880, 150, 0.2), tone(1109, 1109, 150, 0.2, 35), tone(1319, 1319, 180, 0.2, 70)],
  close: [noise(1500, 8, 0.3), tone(880, 330, 75, 0.32)],
  external: [noise(4000, 6, 0.3), tone(500, 1500, 75, 0.28)],
  caution: [tone(196, 190, 110, 0.16, 0, "square"), tone(185, 180, 110, 0.12, 0, "square")],
  page: [noise(2200, 45, 0.45, 0, 0.7), tone(600, 900, 28, 0.2, 10)],
  chip: [noise(6000, 5, 0.35), tone(1200, 1200, 22, 0.26)],
  theme: {
    on: [noise(4000, 6, 0.3), tone(660, 1320, 95, 0.36)],
    off: [noise(1200, 10, 0.35), tone(990, 440, 115, 0.36)],
  },
  menu: {
    on: [tone(220, 220, 18, 0.22, 0, "square"), tone(330, 330, 22, 0.22, 50, "square")],
    off: [tone(330, 330, 18, 0.22, 0, "square"), tone(220, 220, 22, 0.22, 50, "square")],
  },
  pin: {
    on: [noise(5000, 6, 0.4), tone(1400, 1400, 20, 0.16, 25, "square")],
    off: [tone(1000, 1000, 20, 0.16, 0, "square"), noise(5000, 6, 0.4, 25)],
  },
  expand: {
    on: [noise(2600, 6, 0.25), tone(420, 720, 55, 0.34)],
    off: [noise(2600, 6, 0.25), tone(720, 420, 55, 0.34)],
  },
  select: {
    on: [tone(700, 1000, 38, 0.32, 0, "triangle")],
    off: [tone(1000, 700, 38, 0.32, 0, "triangle")],
  },
  check: {
    on: [tone(1600, 1600, 12, 0.14, 0, "square"), tone(2000, 2000, 32, 0.24, 20)],
    off: [tone(1200, 900, 34, 0.26)],
  },
  sound: {
    on: [tone(660, 660, 30, 0.28), tone(990, 990, 45, 0.28, 45)],
    off: [tone(990, 990, 30, 0.28), tone(660, 660, 45, 0.28, 45)],
  },
};

let ac = null;
let noiseBuf = null;
let lastKey = "";
let lastAt = 0;

export function enabled() {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

function audio() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    noiseBuf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.2), ac.sampleRate);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}

function envelope(ctx, t0, d, g) {
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.linearRampToValueAtTime(g * MASTER, t0 + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  amp.connect(ctx.destination);
  return amp;
}

function voice(ctx, v, now) {
  const t0 = now + v.at / 1000;
  const d = Math.max(v.d, 5) / 1000;
  const amp = envelope(ctx, t0, d, v.g);
  let src;
  if (v.osc) {
    src = ctx.createOscillator();
    src.type = v.osc;
    src.frequency.setValueAtTime(v.f, t0);
    if (v.f2 !== v.f) src.frequency.exponentialRampToValueAtTime(v.f2, t0 + d);
    src.connect(amp);
  } else {
    src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = v.hz;
    bp.Q.value = v.q;
    src.connect(bp).connect(amp);
  }
  src.start(t0);
  src.stop(t0 + d + 0.02);
}

// Plays a named sound. `on` picks the direction of a toggle sound (true up, false down).
export function play(name, on = true, force = false) {
  if (!force && !enabled()) return;
  const def = SOUNDS[name];
  if (!def) return;
  const voices = Array.isArray(def) ? def : on ? def.on : def.off;
  const key = name + ":" + on;
  const t = performance.now();
  if (key === lastKey && t - lastAt < 40) return;
  lastKey = key;
  lastAt = t;
  const ctx = audio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + 0.005;
    for (const v of voices) voice(ctx, v, now);
  } catch { /* audio unavailable: stay silent */ }
}

const CONTROL = 'button, a[href], [role="tab"], [role="button"], input[type="checkbox"], input[type="radio"], input[type="file"], summary';
const SEG = ".seg, .segs, .lg-seg, .fx-seg, [role=\"tablist\"]";
const CAUTION = /^(delete|remove|clear|reset|revoke|discard|apply this fix)\b/i;
const PAGE = /^(next|previous|prev|back|show more|more|load more)\b/i;

function iconOf(el) {
  return el.querySelector("svg[data-icon]")?.dataset.icon || "";
}

// Works out the button's function and toggle direction. The listener runs in the capture phase,
// so aria-pressed, aria-expanded and the theme still hold the state before the click; a checkbox
// is the exception, the browser has already flipped `checked`.
export function classify(el) {
  if (!el || el.id === "soundbtn") return null;
  const text = (el.textContent || el.getAttribute("aria-label") || "").trim();
  const ic = iconOf(el);
  const pressed = el.getAttribute("aria-pressed");
  const expanded = el.getAttribute("aria-expanded");
  if (el.id === "themebtn") return ["theme", document.documentElement.dataset.theme === "dark"];
  if (el.id === "menubtn") return ["menu", expanded !== "true"];
  if (el.classList.contains("nav-pin")) return ["pin", pressed !== "true"];
  if (el.matches('input[type="checkbox"]')) return ["check", el.checked];
  if (el.matches('input[type="radio"]')) return ["select", true];
  if (el.matches('input[type="file"]')) return ["upload", true];
  if (el.id === "syncbtn" || ic === "refresh" || /^sync\b/i.test(text)) return ["sync", true];
  if (el.matches("a[target=_blank]") || ic === "external") return ["external", true];
  if (el.tagName === "A") return ["navigate", true];
  if (el.querySelector(".spark")) return ["ai", true];
  if (ic === "close" || /^close$/i.test(el.getAttribute("aria-label") || "")) return ["close", true];
  if (ic === "download" || /^(csv|export|download)\b/i.test(text)) return ["download", true];
  if (ic === "copy" || /^copy\b/i.test(text)) return ["copy", true];
  if (ic === "search" || /^search\b/i.test(text)) return ["search", true];
  if (el.classList.contains("danger") || CAUTION.test(text)) return ["caution", true];
  if (el.classList.contains("fx-nav") || PAGE.test(text)) return ["page", true];
  if (el.matches('[role="tab"]') || el.closest(SEG)) return ["select", true];
  if (pressed !== null) return ["select", pressed !== "true"];
  if (expanded !== null || el.tagName === "SUMMARY") return ["expand", expanded !== null ? expanded !== "true" : !el.parentElement?.open];
  if (el.classList.contains("chip")) return ["chip", true];
  if (el.classList.contains("primary")) return ["primary", true];
  return ["tap", true];
}

function paintButton(btn, mk) {
  const on = enabled();
  btn.replaceChildren(mk(on ? "sound" : "mute"));
  btn.setAttribute("aria-pressed", String(on));
  btn.title = on ? "Button sounds on" : "Button sounds off";
}

// Wires the page-wide listener and the mute toggle in the title bar.
export function initSound(btn, mk) {
  document.addEventListener("click", (e) => {
    if (!e.isTrusted) return;
    const el = e.target.closest?.(CONTROL);
    if (!el || el.disabled || el.getAttribute("aria-disabled") === "true") return;
    const hit = classify(el);
    if (hit) play(hit[0], hit[1]);
  }, true);
  if (!btn) return;
  paintButton(btn, mk);
  btn.addEventListener("click", () => {
    const on = !enabled();
    try { localStorage.setItem(KEY, on ? "on" : "off"); } catch { /* storage blocked */ }
    play("sound", on, true);
    paintButton(btn, mk);
  });
}
