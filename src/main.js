// watavares.com: progressive enhancement only. Everything is readable without JS.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CHARGENET_API = "https://ca-api-dev.happytree-a55da5f4.northeurope.azurecontainerapps.io";

document.addEventListener("DOMContentLoaded", () => {
  window.siteReady = true;
  splitName();
  staggerIndexes();
  themeToggle();
  rotator();
  scrollEffects();
  counters();
  spotlight();
  reveal();
  activeSection();
  portrait();
  liveStatus();
  lastDeploy();
});

// ---------- Name rises in letter by letter ----------
function splitName() {
  document.querySelectorAll(".split").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true"); // the heading keeps its aria-label
      s.style.setProperty("--i", i);
      s.textContent = ch;
      el.append(s);
    });
    el.classList.add("ready");
  });
}

// Index children of [data-stagger] so they animate one after another
function staggerIndexes() {
  document.querySelectorAll("[data-stagger]").forEach((list) => {
    [...list.children].forEach((child, i) => child.style.setProperty("--i", i));
  });
}

// ---------- Rotating last word of the tagline ----------
function rotator() {
  const el = document.querySelector(".rotator");
  if (!el || reduceMotion) return;
  const words = el.dataset.words.split("|");
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    const current = el.querySelector("span:not(.out)");
    i = (i + 1) % words.length;
    const next = document.createElement("span");
    next.className = "in";
    next.textContent = words[i];
    el.append(next);
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove("in")));
    current.classList.add("out");
    setTimeout(() => current.remove(), 700);
  }, 2600);
}

// ---------- Scroll: progress bar and the experience timeline fill ----------
function scrollEffects() {
  const root = document.documentElement;
  const jobs = document.querySelector(".jobs");
  const items = jobs ? [...jobs.querySelectorAll(".job")] : [];
  let queued = false;
  const update = () => {
    queued = false;
    const max = root.scrollHeight - window.innerHeight;
    root.style.setProperty("--progress", max > 0 ? (window.scrollY / max).toFixed(4) : 0);
    if (!jobs) return;
    // The line fills up to the point 60% down the viewport
    const r = jobs.getBoundingClientRect();
    const mark = window.innerHeight * 0.6;
    const fill = Math.min(Math.max((mark - r.top) / r.height, 0), 1);
    jobs.style.setProperty("--fill", fill.toFixed(4));
    items.forEach((li) => li.classList.toggle("reached", li.getBoundingClientRect().top + 30 < mark));
  };
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

// ---------- Numbers count up when they come into view ----------
function counters() {
  const els = document.querySelectorAll("[data-count]");
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const target = Number(e.target.dataset.count);
      if (!target) return;
      const start = performance.now(), duration = 1100;
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        e.target.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      };
      e.target.textContent = "0";
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

// ---------- Theme ----------
function themeToggle() {
  document.querySelector(".theme-toggle")?.addEventListener("click", () => {
    const root = document.documentElement;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = (root.dataset.theme || (systemDark ? "dark" : "light")) === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });
}

// ---------- Soft light following the cursor ----------
function spotlight() {
  if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
  const root = document.documentElement;
  let frame = 0;
  window.addEventListener("pointermove", (e) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      root.style.setProperty("--mx", `${e.clientX}px`);
      root.style.setProperty("--my", `${e.clientY}px`);
    });
  }, { passive: true });
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
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  items.forEach((el) => io.observe(el));
}

// ---------- Highlight the section in view in the left navigation ----------
function activeSection() {
  const links = new Map([...document.querySelectorAll(".toc a")].map((a) => [a.hash.slice(1), a]));
  if (!links.size || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove("active"));
      links.get(e.target.id)?.classList.add("active");
    });
  }, { rootMargin: "-35% 0px -60% 0px" });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
}

// ---------- Portrait: use me.jpg when it exists, initials otherwise ----------
function portrait() {
  const box = document.querySelector(".portrait");
  if (!box) return;
  const img = new Image();
  img.alt = "";
  img.onload = () => { box.replaceChildren(img); };
  img.src = "me.jpg";
}

// ---------- Live ChargeNet status on the case study ----------
async function liveStatus() {
  const pill = document.getElementById("live-pill");
  if (!pill) return;
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 12000); // the API scales to zero; allow for a cold start
    const res = await fetch(`${CHARGENET_API}/api/sites`, { signal: ctrl.signal });
    if (!res.ok) return;
    const sites = await res.json();
    const total = sites.reduce((n, s) => n + s.Stations, 0);
    const online = sites.reduce((n, s) => n + s.Available + s.Charging, 0);
    const mw = sites.reduce((n, s) => n + s.PowerKw, 0) / 1000;
    pill.querySelector(".txt").textContent = `Live: ${online}/${total} stations online · ${mw.toFixed(2)} MW`;
    pill.hidden = false;
  } catch (e) { /* stay hidden: the case study reads fine without it */ }
}

// ---------- Footer: last deploy, from GitHub ----------
async function lastDeploy() {
  try {
    const res = await fetch("https://api.github.com/repos/watavares/website/commits/main");
    if (!res.ok) return;
    const c = await res.json();
    const when = new Date(c.commit.committer.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const el = document.getElementById("deploy");
    const a = document.createElement("a");
    a.href = c.html_url;
    a.textContent = c.sha.slice(0, 7);
    el.replaceChildren("Built by hand · last deployed ", when, " (", a, ")");
  } catch (e) { /* keep the static footer */ }
}
