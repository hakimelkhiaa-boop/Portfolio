// Easter egg n°2 : « Lampe torche ».
// Déclencheur : cliquer 5 fois de suite (en moins de 3,5 s) sur le logo « HE » en haut à gauche.
// Effet : le site plonge dans le noir, seul un halo autour du curseur (ou du doigt) éclaire la page.
// Un message est caché quelque part dans l'obscurité : il faut le trouver avec la lampe.
// Pour éteindre : touche Échap, bouton « Rallumer », ou 5 clics de plus sur le logo.
// Ce fichier est autonome : pour retirer l'easter egg, supprimez simplement sa balise <script>.
(() => {
  "use strict";
  const tr = window.tr || ((text) => text);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CLICKS_NEEDED = 5;
  const CLICK_WINDOW_MS = 3500;
  const RADIUS = 190;

  const style = document.createElement("style");
  style.textContent = `
    .torch {
      position: fixed; inset: 0; z-index: 90; pointer-events: none; opacity: 0; transition: opacity 0.6s ease;
      background:
        radial-gradient(circle calc(var(--r, 0px) * 0.85) at var(--x, 50%) var(--y, 50%), rgba(255, 205, 130, 0.1), transparent 70%),
        radial-gradient(circle var(--r, 0px) at var(--x, 50%) var(--y, 50%),
          rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 36%, rgba(0, 0, 0, 0.62) 62%, rgb(0, 0, 0) 100%);
    }
    .torch.is-on { opacity: 1; }
    .torch-secret {
      position: fixed; z-index: 85; display: grid; gap: 8px; justify-items: center; text-align: center;
      color: #f0d58f; font-family: var(--display, Georgia, serif); text-shadow: 0 0 22px rgba(233, 196, 106, 0.55);
      translate: -50% -50%;
    }
    .torch-secret__title { margin: 0; white-space: nowrap; font-size: clamp(2rem, 4vw, 3.4rem); font-style: italic; font-weight: 500; line-height: 1; }
    .torch-secret__link {
      color: inherit; font-family: var(--mono, monospace); font-size: 0.85rem; letter-spacing: 0.14em;
      text-decoration: underline; text-underline-offset: 6px;
    }
    .torch-secret.is-found .torch-secret__title { animation: torch-pulse 1.6s ease-in-out infinite; }
    .torch-tip {
      position: fixed; left: 50%; top: clamp(24px, 6vh, 64px); z-index: 96; padding: 10px 18px; translate: -50% 0;
      border: 1px solid rgba(240, 213, 143, 0.4); border-radius: 999px; background: rgba(10, 9, 7, 0.85);
      color: #f0d58f; font-family: var(--mono, monospace); font-size: 0.74rem; letter-spacing: 0.14em;
      text-transform: uppercase; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.5s ease;
    }
    .torch-tip.is-shown { opacity: 1; }
    .torch-off {
      position: fixed; left: 50%; bottom: clamp(18px, 4vh, 36px); z-index: 96; padding: 9px 18px; translate: -50% 0;
      border: 1px solid rgba(240, 213, 143, 0.35); border-radius: 999px; background: rgba(10, 9, 7, 0.8);
      color: rgba(240, 213, 143, 0.85); font-family: var(--mono, monospace); font-size: 0.7rem; letter-spacing: 0.14em;
      text-transform: uppercase; cursor: pointer; opacity: 0; transition: opacity 0.5s ease, border-color 0.2s ease;
    }
    .torch-off.is-shown { opacity: 0.75; }
    .torch-off:hover, .torch-off:focus-visible { opacity: 1; border-color: #f0d58f; }
    @keyframes torch-pulse { 50% { text-shadow: 0 0 46px rgba(255, 224, 150, 0.95); } }
  `;
  document.head.append(style);

  let clicks = [];
  let on = false;
  let overlay = null;
  let secret = null;
  let tip = null;
  let offButton = null;
  let rafId = 0;
  let tipTimer = 0;
  let found = false;
  let startedAt = 0;
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const light = { x: pointer.x, y: pointer.y };

  function say(message, ms) {
    if (!tip) {
      return;
    }
    tip.textContent = message;
    tip.classList.add("is-shown");
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => tip?.classList.remove("is-shown"), ms);
  }

  function onMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  function onKey(event) {
    if (event.key === "Escape") {
      turnOff();
    }
  }

  function loop(now) {
    const elapsed = now - startedAt;
    // Le halo suit le pointeur avec un léger retard et vacille comme une flamme.
    light.x += (pointer.x - light.x) * 0.18;
    light.y += (pointer.y - light.y) * 0.18;
    const grow = Math.min(1, elapsed / 800);
    const flicker = reduce ? 0 : Math.sin(now * 0.011) * 4 + Math.sin(now * 0.027) * 3;
    overlay.style.setProperty("--x", `${light.x.toFixed(1)}px`);
    overlay.style.setProperty("--y", `${light.y.toFixed(1)}px`);
    overlay.style.setProperty("--r", `${((RADIUS + flicker) * (0.25 + 0.75 * grow)).toFixed(1)}px`);

    // Le message est « trouvé » quand le halo passe dessus.
    if (!found && secret) {
      const rect = secret.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - light.x;
      const dy = rect.top + rect.height / 2 - light.y;
      if (Math.hypot(dx, dy) < 110) {
        found = true;
        secret.classList.add("is-found");
        say(tr("Vous l’avez trouvé ✦"), 3200);
      }
    }
    rafId = requestAnimationFrame(loop);
  }

  function turnOn() {
    on = true;
    found = false;
    startedAt = performance.now();

    overlay = document.createElement("div");
    overlay.className = "torch";
    overlay.setAttribute("aria-hidden", "true");

    // Le message caché est posé sous l'obscurité, à un endroit différent à chaque fois.
    secret = document.createElement("div");
    secret.className = "torch-secret";
    secret.style.left = `${14 + Math.random() * 68}%`;
    secret.style.top = `${24 + Math.random() * 58}%`;
    secret.innerHTML = `<p class="torch-secret__title">${tr("Vous m’avez trouvé ✦")}</p><a class="torch-secret__link" href="mailto:hakimelkhia.pro@gmail.com">hakimelkhia.pro@gmail.com</a>`;

    tip = document.createElement("div");
    tip.className = "torch-tip";
    tip.setAttribute("role", "status");

    offButton = document.createElement("button");
    offButton.type = "button";
    offButton.className = "torch-off";
    offButton.textContent = tr("Rallumer · Échap");
    offButton.addEventListener("click", turnOff);

    document.body.append(secret, overlay, tip, offButton);
    requestAnimationFrame(() => {
      overlay.classList.add("is-on");
      offButton.classList.add("is-shown");
    });
    say(tr("Lampe torche · cherchez le message caché"), 4500);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("keydown", onKey);
    rafId = requestAnimationFrame(loop);
  }

  function turnOff() {
    if (!on) {
      return;
    }
    on = false;
    cancelAnimationFrame(rafId);
    clearTimeout(tipTimer);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("keydown", onKey);
    const elements = [overlay, secret, tip, offButton];
    overlay?.classList.remove("is-on");
    tip?.classList.remove("is-shown");
    offButton?.classList.remove("is-shown");
    setTimeout(() => elements.forEach((element) => element?.remove()), 650);
    overlay = secret = tip = offButton = null;
  }

  // 5 clics rapides sur le logo : on allume (ou on éteint) la lampe.
  document.addEventListener(
    "click",
    (event) => {
      const logo = event.target instanceof Element ? event.target.closest(".topbar__brand") : null;
      if (!logo) {
        return;
      }
      const now = performance.now();
      clicks = clicks.filter((time) => now - time < CLICK_WINDOW_MS);
      clicks.push(now);
      if (clicks.length >= CLICKS_NEEDED) {
        clicks = [];
        event.preventDefault();
        event.stopPropagation();
        if (on) {
          turnOff();
        } else {
          turnOn();
        }
      }
    },
    true,
  );
})();