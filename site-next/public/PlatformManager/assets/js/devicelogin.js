// Sign in with a code at Microsoft. The page only shows the code and waits; the server holds the secret part and decides who gets in.
const out = document.getElementById("out"), go = document.getElementById("go");
const say = (text, cls = "muted") => { const p = document.createElement("p"); p.className = cls; p.textContent = text; out.replaceChildren(p); };

let stopped = false;
async function post(path) {
  const r = await fetch(path, { method: "POST", headers: { "X-PPM": "1" }, credentials: "same-origin" });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `The server answered ${r.status}.`);
  return j;
}

go.addEventListener("click", async () => {
  go.disabled = true; stopped = false;
  say("Asking Microsoft for a code...");
  try {
    const c = await post("/auth/code/start");
    const code = document.createElement("div");
    code.className = "devicecode";
    code.textContent = c.userCode;
    const link = document.createElement("a");
    link.href = c.verificationUri; link.target = "_blank"; link.rel = "noopener noreferrer"; link.className = "btn primary"; link.textContent = "Open Microsoft sign-in";
    const note = document.createElement("p"); note.className = "muted"; note.textContent = `Type this code at Microsoft and sign in with your company account. It is good for ${Math.round(c.expiresIn / 60)} minutes. This page signs you in when you finish.`;
    out.replaceChildren(code, link, note);
    const deadline = Date.now() + c.expiresIn * 1000;
    while (!stopped && Date.now() < deadline) {
      await new Promise((ok) => setTimeout(ok, Math.max(3, c.interval) * 1000));
      const s = await post("/auth/code/poll");
      if (s.state === "done") { say("Signed in. Opening Platform Manager...", ""); location.replace("/"); return; }
    }
    say("The code ran out. Get a new one.", "muted");
  } catch (e) { say(e.message, "banner error"); }
  go.disabled = false;
});
