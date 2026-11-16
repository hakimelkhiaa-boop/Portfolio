// Easter egg n°1 : « Pluie d'or ».
// Déclencheur : le Konami code (↑ ↑ ↓ ↓ ← → ← → B A) ou taper « hakim » au clavier.
// Effet : une pluie de pièces, de losanges et d'étincelles dorées tombe sur la page, un halo doré
// s'allume, une phrase apparaît, et un clic fait jaillir une gerbe d'or. Ça dure environ 8 secondes.
// Ce fichier est autonome : pour retirer l'easter egg, supprimez simplement sa balise <script>.
(() => {
  "use strict";
  const tr = window.tr || ((text) => text);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  const WORD = "hakim";
  const RAIN_MS = 4400; // durée pendant laquelle la pluie se déclenche
  const MAX_PARTICLES = 520;

  let recentKeys = [];
  let typed = "";
  let active = false;

  const style = document.createElement("style");
  style.textContent = `
    .gold-canvas { position: fixed; inset: 0; z-index: 96; width: 100%; height: 100%; pointer-events: none; }
    .gold-flash {
      position: fixed; inset: 0; z-index: 95; pointer-events: none; opacity: 0;
      background: radial-gradient(ellipse at 50% 0%, rgba(245, 217, 139, 0.5), rgba(214, 184, 122, 0.16) 45%, transparent 75%);
      animation: gold-flash 2.2s ease-out forwards;
    }
    .gold-banner {
      position: fixed; left: 50%; top: 38%; z-index: 97; display: grid; gap: 10px; justify-items: center;
      text-align: center; pointer-events: none; opacity: 0; translate: -50% 0;
      animation: gold-banner 5.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
    .gold-banner__title {
      margin: 0; font-family: var(--display, Georgia, serif); font-size: clamp(3.4rem, 10vw, 9rem);
      font-style: italic; font-weight: 500; line-height: 1;
      background: linear-gradient(180deg, #fff3c4 0%, #e9c46a 45%, #b98a3e 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      filter: drop-shadow(0 0 28px rgba(233, 196, 106, 0.55));
    }
    .gold-banner__sub {
      margin: 0; color: #f0d58f; font-family: var(--mono, monospace); font-size: 0.8rem;
      letter-spacing: 0.3em; text-transform: uppercase; text-shadow: 0 0 14px rgba(233, 196, 106, 0.6);
    }
    @keyframes gold-flash { 0% { opacity: 0; } 14% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes gold-banner {
      0% { opacity: 0; transform: translateY(26px) scale(0.96); }
      12%, 76% { opacity: 1; transform: none; }
      100% { opacity: 0; transform: translateY(-14px); }
    }
  `;
  document.head.append(style);

  /* Sprites pré-dessinés : plus rapide que de redessiner chaque particule. */
  function makeSprite(draw, size = 64) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    draw(canvas.getContext("2d"), size);
    return canvas;
  }

  const sprites = [
    // pièce
    makeSprite((x, s) => {
      const g = x.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2);
      g.addColorStop(0, "#fff6d2");
      g.addColorStop(0.35, "#f0cf7e");
      g.addColorStop(0.72, "#c99a45");
      g.addColorStop(1, "rgba(201,154,69,0)");
      x.fillStyle = g;
      x.beginPath();
      x.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      x.fill();
    }),
    // losange
    makeSprite((x, s) => {
      x.translate(s / 2, s / 2);
      x.rotate(Math.PI / 4);
      const g = x.createLinearGradient(-s * 0.28, -s * 0.28, s * 0.28, s * 0.28);
      g.addColorStop(0, "#fff6d2");
      g.addColorStop(0.5, "#e9c46a");
      g.addColorStop(1, "#a97a2c");
      x.fillStyle = g;
      x.fillRect(-s * 0.26, -s * 0.26, s * 0.52, s * 0.52);
    }),
    // étincelle à quatre branches
    makeSprite((x, s) => {
      x.translate(s / 2, s / 2);
      const r = s * 0.48;
      const q = s * 0.06;
      x.beginPath();
      x.moveTo(0, -r);
      x.quadraticCurveTo(q, -q, r, 0);
      x.quadraticCurveTo(q, q, 0, r);
      x.quadraticCurveTo(-q, q, -r, 0);
      x.quadraticCurveTo(-q, -q, 0, -r);
      x.fillStyle = "#fff3c4";
      x.shadowColor = "#f0cf7e";
      x.shadowBlur = 8;
      x.fill();
    }),
  ];

  let canvas = null;
  let ctx = null;
  let particles = [];
  let W = 0;
  let H = 0;
  let dpr = 1;
  let startedAt = 0;
  let lastTime = 0;
  let rafId = 0;
  const pointer = { x: -9999, y: -9999 };
  const extras = [];

  function resize() {
    if (!canvas) {
      return;
    }
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  function pickSprite() {
    const roll = Math.random();
    return roll < 0.5 ? 0 : roll < 0.8 ? 1 : 2;
  }

  function spawnRain(count) {
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i += 1) {
      const kind = pickSprite();
      particles.push({
        kind,
        x: Math.random() * (W + 80) - 40,
        y: -30,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 2 + Math.random() * 3.4,
        size: kind === 2 ? 10 + Math.random() * 16 : 8 + Math.random() * 14,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.08,
        spin: Math.random() * Math.PI * 2,
        vs: 0.04 + Math.random() * 0.1,
        tw: Math.random() * Math.PI * 2,
        gravity: 0.012 + Math.random() * 0.02,
      });
    }
  }

  function burst(x, y) {
    for (let i = 0; i < 34 && particles.length < MAX_PARTICLES + 80; i += 1) {
      const kind = pickSprite();
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 5 + Math.random() * 8;
      particles.push({
        kind,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 14,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.15,
        spin: Math.random() * Math.PI * 2,
        vs: 0.06 + Math.random() * 0.12,
        tw: Math.random() * Math.PI * 2,
        gravity: 0.22,
      });
    }
  }

  function frame(now) {
    const dt = Math.min(2.5, (now - lastTime) / 16.67 || 1);
    lastTime = now;
    const elapsed = now - startedAt;

    if (elapsed < RAIN_MS) {
      spawnRain(3);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.vy += p.gravity * dt;
      p.vx += Math.sin(p.tw) * 0.01 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.spin += p.vs * dt;
      p.tw += 0.12 * dt;

      // Le curseur repousse doucement les particules.
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 130 * 130 && d2 > 1) {
        const d = Math.sqrt(d2);
        const push = (1 - d / 130) * 1.4 * dt;
        p.vx += (dx / d) * push;
        p.vy += (dy / d) * push * 0.6;
      }

      if (p.y > H + 60 || p.x < -90 || p.x > W + 90) {
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }

      const flip = p.kind === 1 ? Math.cos(p.spin) : 1;
      const cos = Math.cos(p.rot) * p.size;
      const sin = Math.sin(p.rot) * p.size;
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(p.tw);
      ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin * flip, dpr * cos * flip, dpr * p.x, dpr * p.y);
      ctx.drawImage(sprites[p.kind], -0.5, -0.5, 1, 1);
    }

    if (elapsed > RAIN_MS && particles.length === 0) {
      finish();
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function onMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  function onDown(event) {
    burst(event.clientX, event.clientY);
  }

  function finish() {
    cancelAnimationFrame(rafId);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("resize", resize);
    extras.splice(0).forEach((element) => element.remove());
    canvas?.remove();
    canvas = ctx = null;
    particles = [];
    active = false;
  }

  function start() {
    if (active) {
      return;
    }
    active = true;

    const flash = document.createElement("div");
    flash.className = "gold-flash";
    flash.setAttribute("aria-hidden", "true");

    const banner = document.createElement("div");
    banner.className = "gold-banner";
    banner.setAttribute("role", "status");
    banner.innerHTML = `<p class="gold-banner__title">${tr("Pluie d’or")}</p><p class="gold-banner__sub">${tr("Vous avez trouvé un secret ✦")}</p>`;

    document.body.append(flash, banner);
    extras.push(flash, banner);

    if (reduce) {
      // Mouvement réduit : on affiche seulement la phrase, sans particules.
      setTimeout(() => {
        extras.splice(0).forEach((element) => element.remove());
        active = false;
      }, 5800);
      return;
    }

    canvas = document.createElement("canvas");
    canvas.className = "gold-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.append(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);

    particles = [];
    startedAt = performance.now();
    lastTime = startedAt;
    rafId = requestAnimationFrame(frame);
  }

  window.addEventListener("keydown", (event) => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
      return;
    }

    const key = event.key.toLowerCase();
    recentKeys = [...recentKeys, key].slice(-KONAMI.length);
    typed = key.length === 1 && key >= "a" && key <= "z" ? (typed + key).slice(-WORD.length) : "";

    if (recentKeys.join("|") === KONAMI.join("|") || typed === WORD) {
      recentKeys = [];
      typed = "";
      start();
    }
  });
})();