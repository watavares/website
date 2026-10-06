// watavares.com: progressive enhancement only. Everything is readable without JS.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CHARGENET_API = "https://ca-api-dev.happytree-a55da5f4.northeurope.azurecontainerapps.io";
// "Ask about me" backend (Azure Function). Empty = the assistant stays hidden.
const ASK_API = "";

document.addEventListener("DOMContentLoaded", () => {
  window.siteReady = true;
  themeToggle();
  spotlight();
  reveal();
  activeSection();
  portrait();
  askAboutMe();
  liveStatus();
  lastDeploy();
});

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

// ---------- Ask about me: questions answered by Claude from my CV ----------
function askAboutMe() {
  const box = document.getElementById("ask");
  if (!box || !ASK_API) return;
  box.hidden = false;
  const form = document.getElementById("ask-form");
  const input = document.getElementById("ask-input");
  const button = form.querySelector("button");
  const out = document.getElementById("ask-answer");

  async function ask(question) {
    question = question.trim();
    if (question.length < 3) return;
    button.disabled = true;
    const q = document.createElement("span");
    q.className = "q";
    q.textContent = question;
    const typing = document.createElement("span");
    typing.className = "typing";
    typing.setAttribute("aria-label", "Thinking");
    typing.innerHTML = "<span></span><span></span><span></span>";
    out.replaceChildren(q, typing);
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(`${ASK_API}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      // Text only, never HTML: the answer can't inject markup into the page
      if (res.ok && data.answer) {
        out.replaceChildren(q, document.createTextNode(data.answer));
      } else {
        const err = document.createElement("span");
        err.className = "err";
        err.textContent = data.error || "The assistant is unavailable right now. Email info@watavares.com instead.";
        out.replaceChildren(q, err);
      }
    } catch (e) {
      const err = document.createElement("span");
      err.className = "err";
      err.textContent = "The assistant didn't respond. Please try again, or email info@watavares.com.";
      out.replaceChildren(q, err);
    } finally {
      button.disabled = false;
    }
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); input.value = ""; });
  box.querySelectorAll(".ask-chips button").forEach((chip) => chip.addEventListener("click", () => ask(chip.textContent)));
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
