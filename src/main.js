// watavares.com: progressive enhancement only. Everything readable without JS.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CHARGENET_API = "https://ca-api-dev.happytree-a55da5f4.northeurope.azurecontainerapps.io";

document.addEventListener("DOMContentLoaded", () => {
  window.siteReady = true;
  themeToggle();
  stickyNav();
  reveal();
  tilt();
  network(document.getElementById("network"));
  liveFigures();
  lastDeploy();
  document.getElementById("year").textContent = new Date().getFullYear();
});

// ---------- Theme ----------
function themeToggle() {
  const btn = document.querySelector(".theme-toggle");
  btn.addEventListener("click", () => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = root.dataset.theme || (systemDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
}

function stickyNav() {
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// ---------- Scroll reveal ----------
function reveal() {
  const items = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach((el) => io.observe(el));
}

// ---------- 3D tilt on project cards (fine pointers only) ----------
function tilt() {
  if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
  document.querySelectorAll(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg) translateY(-2px)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

// ---------- Hero: rotating 3D network sphere ----------
function network(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const N = 150;
  const NEIGHBOURS = 3;

  // Points evenly spread on a sphere (Fibonacci lattice)
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, hub: i % 23 === 0 });
  }

  // Connect each point to its nearest neighbours
  const edges = [];
  const seen = new Set();
  pts.forEach((p, i) => {
    pts
      .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, NEIGHBOURS)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) { seen.add(key); edges.push([i, j]); }
      });
  });

  // Data pulses travelling along edges
  const pulses = [];
  const spawn = () => pulses.push({ e: edges[(Math.random() * edges.length) | 0], t: 0, s: 0.006 + Math.random() * 0.01 });

  let w = 0, h = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let rotY = 0.6, rotX = -0.35, targetX = 0, targetY = 0, mouseX = 0, mouseY = 0;
  window.addEventListener("pointermove", (e) => {
    mouseX = e.clientX / window.innerWidth - 0.5;
    mouseY = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const colours = () => {
    const s = getComputedStyle(document.documentElement);
    return { text: s.getPropertyValue("--text").trim(), accent: s.getPropertyValue("--accent").trim() };
  };

  function project(p) {
    // Rotate around Y, then X; simple perspective projection
    const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    const x1 = p.x * cy - p.z * sy;
    const z1 = p.x * sy + p.z * cy;
    const y1 = p.y * cx - z1 * sx;
    const z2 = p.y * sx + z1 * cx;
    const R = Math.min(w, h) * 0.38;
    const f = 2.6 / (2.6 + z2);
    return { x: w / 2 + x1 * R * f, y: h / 2 + y1 * R * f, z: z2, f };
  }

  function frame() {
    const { text, accent } = colours();
    ctx.clearRect(0, 0, w, h);
    targetY += reduceMotion ? 0 : 0.0016;
    rotY += (targetY + 0.6 + mouseX * 0.6 - rotY) * 0.05;
    rotX += (-0.35 + mouseY * 0.4 - rotX) * 0.05;

    const P = pts.map(project);

    // Edges, fainter at the back
    ctx.lineWidth = 1;
    for (const [a, b] of edges) {
      const depth = (P[a].z + P[b].z) / 2; // -1 front .. 1 back
      ctx.globalAlpha = 0.05 + 0.22 * (1 - (depth + 1) / 2);
      ctx.strokeStyle = text;
      ctx.beginPath(); ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); ctx.stroke();
    }

    // Nodes
    pts.forEach((p, i) => {
      const q = P[i];
      const front = 1 - (q.z + 1) / 2;
      ctx.globalAlpha = 0.25 + 0.75 * front;
      ctx.fillStyle = p.hub ? accent : text;
      ctx.beginPath();
      ctx.arc(q.x, q.y, (p.hub ? 3.4 : 1.6) * q.f * (0.7 + front * 0.6), 0, Math.PI * 2);
      ctx.fill();
    });

    // Pulses
    if (!reduceMotion && pulses.length < 14 && Math.random() < 0.08) spawn();
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pu = pulses[i];
      pu.t += pu.s;
      if (pu.t >= 1) { pulses.splice(i, 1); continue; }
      const A = P[pu.e[0]], B = P[pu.e[1]];
      const x = A.x + (B.x - A.x) * pu.t, y = A.y + (B.y - A.y) * pu.t;
      const front = 1 - ((A.z + B.z) / 2 + 1) / 2;
      ctx.globalAlpha = 0.3 + 0.7 * front;
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.arc(x, y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Only animate while visible and the tab is active
  let raf = 0, visible = true;
  const loop = () => { frame(); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden && !reduceMotion) loop(); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  resize();
  frame();
  new ResizeObserver(() => { resize(); frame(); }).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  // Redraw in the new colours when the theme changes
  new MutationObserver(frame).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  start();
}

// ---------- Live ChargeNet figures ----------
async function liveFigures() {
  const set = (k, v) => { const el = document.querySelector(`[data-stat="${k}"]`); if (el) el.textContent = v; };
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 12000); // the API scales to zero; allow for a cold start
    const res = await fetch(`${CHARGENET_API}/api/sites`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(res.status);
    const sites = await res.json();
    const total = sites.reduce((n, s) => n + s.Stations, 0);
    const online = sites.reduce((n, s) => n + s.Available + s.Charging, 0);
    const kw = sites.reduce((n, s) => n + s.PowerKw, 0);
    const kwh = sites.reduce((n, s) => n + (s.EnergyTodayKwh || 0), 0);
    set("online", `${online}/${total}`);
    set("power", `${(kw / 1000).toFixed(2)} MW`);
    set("energy", kwh >= 1000 ? `${(kwh / 1000).toFixed(2)} MWh` : `${Math.round(kwh)} kWh`);
    set("sites", sites.length);
  } catch (e) {
    document.querySelector(".pulse")?.classList.add("down");
    document.querySelector(".live-sub").textContent =
      "Live figures are unavailable right now. The status page has the latest readings.";
  }
}

// ---------- Footer: last deploy, from GitHub ----------
async function lastDeploy() {
  try {
    const res = await fetch("https://api.github.com/repos/watavares/website/commits/main", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return;
    const c = await res.json();
    const when = new Date(c.commit.committer.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const sha = c.sha.slice(0, 7);
    const el = document.getElementById("deploy");
    el.innerHTML = "";
    el.append("Last deployed ", when, " · ");
    const a = document.createElement("a");
    a.href = c.html_url; a.textContent = sha;
    el.append(a, " · hand-built, deployed by GitHub Actions");
  } catch (e) { /* keep the static footer text */ }
}
