// Portfolio « ruche » : tout ce qui réagit au défilement et à la souris.
// Aucune bibliothèque externe : canvas 2D, IntersectionObserver et requestAnimationFrame.
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  /* ------------------------------------------------------------------ */
  /* Découpage du texte (lettres du hero, mots des titres et du profil) */
  /* ------------------------------------------------------------------ */
  function wrapWords(node, make) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) {
            return;
          }
          fragment.append(/^\s+$/.test(part) ? " " : make(part, node));
        });
        child.replaceWith(fragment);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        wrapWords(child, make);
      }
    });
  }

  let charIndex = 0;
  $$("[data-chars]").forEach((line) => {
    const text = line.textContent.trim();
    line.textContent = "";
    Array.from(text).forEach((letter) => {
      const span = document.createElement("span");
      span.className = "char";
      span.style.setProperty("--i", String(charIndex++));
      span.textContent = letter;
      line.append(span);
    });
  });

  $$(".split").forEach((title) => {
    let index = 0;
    wrapWords(title, (word) => {
      const outer = document.createElement("span");
      const inner = document.createElement("span");
      outer.className = "word";
      inner.textContent = word;
      inner.style.setProperty("--i", String(index++));
      outer.append(inner);
      return outer;
    });
  });

  const scrub = $("[data-scrub]");
  let scrubWords = [];
  if (scrub) {
    wrapWords(scrub, (word, parent) => {
      const span = document.createElement("span");
      span.className = parent.classList.contains("hl") ? "w hl" : "w";
      span.textContent = word;
      return span;
    });
    scrubWords = $$(".w", scrub);
  }

  /* Apparition des titres et blocs quand ils entrent dans l'écran. */
  [".projects__side", ".skills__intro", ".contact__row", ".contact__links", ".contact__signature"].forEach((selector) => {
    $$(selector).forEach((element) => element.setAttribute("data-reveal", ""));
  });

  if ("IntersectionObserver" in window && !reduce) {
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            reveal.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    $$(".split, [data-reveal]").forEach((element) => reveal.observe(element));
  } else {
    $$(".split, [data-reveal]").forEach((element) => element.classList.add("in-view"));
  }

  /* ------------------------------------------------------------------ */
  /* Défilement doux (inertie) et liens d'ancre                          */
  /* ------------------------------------------------------------------ */
  const smooth = fine && !reduce;
  const maxScroll = () => Math.max(0, root.scrollHeight - window.innerHeight);
  let target = window.scrollY;
  let current = target;

  if (smooth) {
    window.addEventListener(
      "wheel",
      (event) => {
        if (root.classList.contains("js-loading") || event.ctrlKey || body.classList.contains("page--project-open") || $("dialog[open]")) {
          return;
        }
        event.preventDefault();
        const delta = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY;
        target = clamp(target + delta, 0, maxScroll());
      },
      { passive: false },
    );

    // Clavier, barre de défilement, retour de page : on recale la cible.
    window.addEventListener(
      "scroll",
      () => {
        if (Math.abs(window.scrollY - current) > 1.5) {
          target = current = window.scrollY;
        }
      },
      { passive: true },
    );
  }

  function scrollToY(top) {
    if (smooth) {
      target = clamp(top, 0, maxScroll());
    } else {
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    }
  }

  function goTo(element) {
    const top = element.id === "accueil" ? 0 : element.getBoundingClientRect().top + window.scrollY;
    if (smooth) {
      target = clamp(top, 0, maxScroll());
    } else {
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!link) {
      return;
    }
    const element = document.getElementById(link.getAttribute("href").slice(1));
    if (element) {
      event.preventDefault();
      goTo(element);
      // Lien d'évitement : le focus clavier suit jusqu'au contenu.
      if (link.classList.contains("skip-link")) {
        element.focus({ preventScroll: true });
      }
    }
  });

  /* Menu des petits écrans : un bouton ouvre et ferme la navigation. */
  const menuToggle = $(".menu-toggle");
  const menu = $("#menu");
  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.textContent = open ? "Fermer" : "Menu";
  }
  if (menuToggle && menu) {
    menuToggle.addEventListener("click", () => setMenu(!menu.classList.contains("is-open")));
    menu.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("a")) {
        setMenu(false);
      }
    });
    document.addEventListener("click", (event) => {
      if (menu.classList.contains("is-open") && event.target instanceof Element && !event.target.closest(".topbar")) {
        setMenu(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setMenu(false);
        menuToggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Éléments de la page                                                 */
  /* ------------------------------------------------------------------ */
  const progressBar = $(".scroll-progress");
  const hero = $(".hero");
  const about = $(".about");
  const projectsSection = $(".projects");
  const projectsList = $(".projects__list");
  const cards = $$(".project");
  const counter = $(".projects__counter b");
  const bar = $(".projects__bar");
  const skillCards = $$(".skill-card");
  const ticker = $(".ticker__track");
  const sectionIds = ["accueil", "profil", "projets", "competences", "contact"];
  const sections = sectionIds.map((id) => document.getElementById(id));
  const navLinks = $$(".topbar__links a, .rail a");

  const heroChars = $$(".hero .char");
  const footerMark = $(".footer-mark");

  skillCards.forEach((card, index) => card.style.setProperty("--i", String(index)));

  /* Boutons « magnétiques » : ils se rapprochent légèrement du curseur. */
  if (fine && !reduce) {
    $$(".btn").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) * 0.25;
        const y = (event.clientY - (rect.top + rect.height / 2)) * 0.35;
        button.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      button.addEventListener("pointerleave", () => {
        button.style.translate = "";
      });
    });
  }

  function pinProgress(element) {
    if (!element) {
      return 0;
    }
    const rect = element.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    return total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
  }

  /* Projets : le défilement vertical fait avancer la bande de cartes. */
  let wide = false;
  let distance = 0;

  let skillTops = [];
  function layoutProjects() {
    skillTops = skillCards.map((card) => parseFloat(getComputedStyle(card).top) || 0);
    wide = window.innerWidth >= 900 && !reduce;
    if (!projectsSection || !projectsList) {
      return;
    }
    if (!wide) {
      projectsSection.style.height = "";
      projectsList.style.transform = "";
      cards.forEach((card) => {
        card.style.removeProperty("--sc");
        card.style.removeProperty("--op");
        card.style.removeProperty("--px");
      });
      return;
    }
    distance = Math.max(0, projectsList.offsetWidth - window.innerWidth);
    projectsSection.style.height = `${distance + window.innerHeight}px`;
  }

  // Sécurité pour les navigateurs sans « overflow: clip » : la bande ne doit jamais défiler toute seule.
  const projectsPin = $(".projects__pin");
  projectsPin?.addEventListener("scroll", () => {
    projectsPin.scrollLeft = 0;
    projectsPin.scrollTop = 0;
  });

  projectsList?.addEventListener("focusin", (event) => {
    const card = event.target instanceof Element ? event.target.closest(".project") : null;
    if (!wide || !card || card.classList.contains("project--expanded") || body.classList.contains("page--project-open")) {
      return;
    }
    // offsetLeft ignore les transformations (échelle, inclinaison) appliquées aux cartes.
    const x = clamp(card.offsetLeft + card.offsetWidth / 2 - window.innerWidth * 0.4, 0, distance);
    scrollToY(projectsSection.getBoundingClientRect().top + window.scrollY + x);
  });

  /* Inclinaison 3D des cartes au survol. */
  if (fine && !reduce) {
    projectsList?.addEventListener("pointermove", (event) => {
      const card = event.target instanceof Element ? event.target.closest(".project:not(.project--expanded)") : null;
      if (!card) {
        return;
      }
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
      card.style.setProperty("--rx", `${((0.5 - y) * 6).toFixed(2)}deg`);
    });
    projectsList?.addEventListener("pointerout", (event) => {
      const card = event.target instanceof Element ? event.target.closest(".project") : null;
      if (card && !card.contains(event.relatedTarget)) {
        card.style.setProperty("--rx", "0deg");
        card.style.setProperty("--ry", "0deg");
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* Fenêtre de projet : projet précédent / suivant, clavier, balayage  */
  /* ---------------------------------------------------------------- */
  const projectTotal = String(cards.length).padStart(2, "0");
  const titleOf = (card) => $(".project__title", card)?.textContent.trim() || "";

  cards.forEach((card, index) => {
    const number = $(".project__number", card);
    if (number) {
      number.dataset.total = projectTotal;
    }
    const nav = document.createElement("nav");
    nav.className = "project__nav";
    nav.setAttribute("aria-label", "Autres projets");
    nav.innerHTML = `
      <button type="button" class="project__nav-btn" data-dir="-1">
        <span class="project__nav-label">← Précédent</span><span class="project__nav-title"></span>
      </button>
      <button type="button" class="project__nav-btn" data-dir="1">
        <span class="project__nav-label">Suivant →</span><span class="project__nav-title"></span>
      </button>`;
    const [previousTitle, nextTitle] = $$(".project__nav-title", nav);
    previousTitle.textContent = titleOf(cards[(index - 1 + cards.length) % cards.length]);
    nextTitle.textContent = titleOf(cards[(index + 1) % cards.length]);
    card.append(nav);
  });

  // Dans la bande horizontale, recentre une carte (utilisé quand on change de projet).
  function centerCard(card) {
    if (!wide) {
      return;
    }
    const rect = projectsSection.getBoundingClientRect();
    if (rect.top > 0 || rect.bottom < window.innerHeight * 0.5) {
      return; // la bande n'est pas à l'écran (projet ouvert depuis « Compétences »)
    }
    const x = clamp(card.offsetLeft + card.offsetWidth / 2 - window.innerWidth * 0.4, 0, distance);
    scrollToY(rect.top + window.scrollY + x);
  }

  document.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest(".project__nav-btn") : null;
    if (!button) {
      return;
    }
    const index = cards.findIndex((card) => card.classList.contains("project--expanded"));
    if (index < 0) {
      return;
    }
    const next = cards[(index + Number(button.dataset.dir) + cards.length) % cards.length];
    next.inert = false; // projects.js rend les autres cartes inertes tant qu'un projet est ouvert
    $(".project__open", next).click();
    centerCard(next);
  });

  // Flèches gauche / droite : photo précédente / suivante.
  function stepGallery(direction) {
    const open = $(".project--expanded");
    const buttons = open ? $$(".project__gallery-navigation", open) : [];
    if (buttons.length === 2 && !buttons[direction > 0 ? 1 : 0].disabled) {
      buttons[direction > 0 ? 1 : 0].click();
      return true;
    }
    return false;
  }

  document.addEventListener("keydown", (event) => {
    if ($("dialog[open]") || !$(".project--expanded")) {
      return;
    }
    if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && stepGallery(event.key === "ArrowRight" ? 1 : -1)) {
      event.preventDefault();
    }
  });

  // Balayage tactile sur la grande image.
  let swipeStart = null;
  let swiped = false;
  document.addEventListener("pointerdown", (event) => {
    const onStage = event.target instanceof Element && event.target.closest(".project--expanded .project__images");
    swipeStart = onStage && event.pointerType === "touch" ? event.clientX : null;
  });
  document.addEventListener("pointerup", (event) => {
    if (swipeStart === null) {
      return;
    }
    const delta = event.clientX - swipeStart;
    swipeStart = null;
    if (Math.abs(delta) > 50 && stepGallery(delta < 0 ? 1 : -1)) {
      swiped = true;
      setTimeout(() => (swiped = false), 350);
    }
  });
  document.addEventListener(
    "click",
    (event) => {
      if (swiped) {
        event.stopPropagation();
        event.preventDefault();
      }
    },
    true,
  );

  /* Statistiques : compteur animé quand le profil est lu. */
  let counted = false;
  function countUp() {
    counted = true;
    $$("[data-count]").forEach((element) => {
      const end = Number(element.dataset.count);
      const start = performance.now();
      const tick = (now) => {
        const t = clamp((now - start) / 1100, 0, 1);
        element.textContent = String(Math.round(end * ease(t))).padStart(2, "0");
        if (t < 1) {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  /* Bouton « Copier l'adresse ». */
  $$("[data-copy]").forEach((button) => {
    const original = button.textContent;
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "Adresse copiée ✓";
      } catch {
        button.textContent = button.dataset.copy;
      }
      setTimeout(() => (button.textContent = original), 2200);
    });
  });

  /* ------------------------------------------------------------------ */
  /* Le fond : des fils de soie très fins qui ondulent                   */
  /* ------------------------------------------------------------------ */
  const canvas = $("#hive");
  const context = canvas?.getContext("2d");
  const pointer = { x: -9999, y: -9999 };
  let W = 0;
  let H = 0;
  let dpr = 1;
  let lineCount = 56;
  let accent = "#d6b87a";
  let accentRgb = "214,184,122";
  let pageColor = "#0a0907";
  let baseAlpha = 0.11;

  function readColors() {
    accent = getComputedStyle(root).getPropertyValue("--accent").trim() || accent;
    pageColor = getComputedStyle(root).getPropertyValue("--bg").trim() || pageColor;
    const hex = accent.replace("#", "");
    const full = hex.length === 3 ? hex.replace(/./g, "$&$&") : hex;
    accentRgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0).join(",");
    baseAlpha = root.dataset.theme === "light" ? 0.12 : 0.11;
  }

  function resizeHive() {
    if (!canvas) {
      return;
    }
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    lineCount = W < 700 ? 34 : 56;
  }

  const ripples = [];
  window.addEventListener("pointerdown", (event) => {
    ripples.push({ x: event.clientX, y: event.clientY, t: performance.now() });
    if (ripples.length > 4) {
      ripples.shift();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Serpent en hologramme                                               */
  /* ------------------------------------------------------------------ */
  // Le serpent suit une « colonne vertébrale » (une suite de points, de la tête à la queue).
  // Le même dessin sert à l'accueil (il s'enroule autour de l'anneau) et au chargement
  // (il glisse sur la barre de progression).

  // Épaisseur du corps : cou fin derrière la tête, corps plein, queue qui finit en pointe.
  const serpentWidth = (s) => (0.62 + 0.38 * Math.sin(Math.min(1, s / 0.3) * (Math.PI / 2))) * Math.pow(1 - s, 0.75);

  // Tête vue de profil, dans un repère local : x vers l'avant, y vers le dos (unité = « size »).
  // Le profil est décrit par son dessus et son dessous à différents x : crâne large et plat,
  // plus gros que le cou, long museau arrondi, mâchoire qui remonte vers le bout du nez.
  const HEAD_PROFILE = [
    // x, dessus, dessous
    [0, 0.66, -0.66],
    [0.45, 0.86, -0.84],
    [0.95, 1.0, -0.96],
    [1.45, 1.04, -0.94],
    [1.95, 0.98, -0.84],
    [2.45, 0.84, -0.7],
    [2.85, 0.66, -0.54],
    [3.15, 0.46, -0.36],
    [3.36, 0.22, -0.16],
    [3.44, 0.02, 0.02],
  ];
  // Interpolation douce (Catmull-Rom) entre les points du profil.
  function headEdge(x, column) {
    const rows = HEAD_PROFILE;
    let k = 0;
    while (k < rows.length - 2 && rows[k + 1][0] < x) {
      k += 1;
    }
    const p0 = rows[Math.max(0, k - 1)][column];
    const p1 = rows[k][column];
    const p2 = rows[k + 1][column];
    const p3 = rows[Math.min(rows.length - 1, k + 2)][column];
    const t = Math.min(1, Math.max(0, (x - rows[k][0]) / (rows[k + 1][0] - rows[k][0])));
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
  }
  const HEAD_LENGTH = 3.44;
  const fixed = (value) => value.toFixed(3);
  function buildHead() {
    const STEPS = 40;
    const top = [];
    const bottom = [];
    for (let k = 0; k <= STEPS; k += 1) {
      const x = (k / STEPS) * HEAD_LENGTH;
      top.push(`${fixed(x)} ${fixed(headEdge(x, 1))}`);
      bottom.push(`${fixed(x)} ${fixed(headEdge(x, 2))}`);
    }
    const outline = "M" + top.join("L") + "L" + bottom.reverse().join("L");
    // Maillage : lignes qui suivent la forme de la tête, et coupes en travers.
    let mesh = "";
    for (let row = 1; row < 8; row += 1) {
      const t = row / 8;
      const line = [];
      for (let k = 0; k <= STEPS - 2; k += 1) {
        const x = (k / STEPS) * HEAD_LENGTH;
        const lower = headEdge(x, 2);
        const upper = headEdge(x, 1);
        // Les lignes se resserrent vers le haut et le bas, comme sur une surface bombée.
        const curved = 0.5 - 0.5 * Math.cos(t * Math.PI);
        line.push(`${fixed(x)} ${fixed(lower + (upper - lower) * curved)}`);
      }
      mesh += "M" + line.join("L");
    }
    for (let column = 1; column < 15; column += 1) {
      const x = (column / 15) * HEAD_LENGTH * 0.97;
      const lower = headEdge(x, 2);
      const upper = headEdge(x, 1);
      const line = [];
      for (let k = 0; k <= 10; k += 1) {
        const t = k / 10;
        // La coupe bombe légèrement vers l'avant, comme un anneau vu de biais.
        line.push(`${fixed(x + Math.sin(t * Math.PI) * 0.09)} ${fixed(lower + (upper - lower) * t)}`);
      }
      mesh += "M" + line.join("L");
    }
    return { outline, mesh };
  }
  const HEAD_SHAPE = buildHead();
  const SERPENT_HEAD = new Path2D(HEAD_SHAPE.outline + "Z"); // rempli
  const SERPENT_HEAD_LINE = new Path2D(HEAD_SHAPE.outline); // tracé, sans trait à la jonction du cou
  const SERPENT_MESH = new Path2D(HEAD_SHAPE.mesh);
  // Détails : arcade sourcilière marquée, grand œil en amande, narine, longue ligne de la gueule.
  const SERPENT_FACE = new Path2D(
    "M1.35 0.66 C1.7 0.86 2.25 0.86 2.62 0.6 " +
      "M1.58 0.4 C1.75 0.62 2.15 0.62 2.32 0.38 C2.15 0.24 1.75 0.24 1.58 0.4 Z " +
      "M3.12 0.3 C3.2 0.36 3.26 0.3 3.22 0.24 " +
      "M3.38 -0.06 C2.9 -0.16 2.2 -0.22 1.45 -0.26 C1.2 -0.26 1.02 -0.2 0.92 -0.12",
  );

  // upRef : un point du côté du ventre (le centre de l'anneau, ou un point sous la barre).
  // options.clip : ne dessine que dans cette zone ; options.cover : couleur de fond posée sous
  // le serpent (pour qu'il masque l'anneau quand il passe devant) ; options.dim : atténuation.
  function drawSerpent(ctx, spine, size, time, alpha, color, upRef, options = {}) {
    const count = spine.length;
    if (count < 4 || alpha <= 0.01) {
      return;
    }
    // Repère de chaque point : avant (vers la tête) et dos (à l'opposé de upRef).
    const frames = [];
    for (let i = 0; i < count; i += 1) {
      const [ax, ay] = spine[Math.max(0, i - 1)];
      const [bx, by] = spine[Math.min(count - 1, i + 1)];
      const length = Math.hypot(ax - bx, ay - by) || 1;
      const fx = (ax - bx) / length;
      const fy = (ay - by) / length;
      let ux = -fy;
      let uy = fx;
      if (ux * (spine[i][0] - upRef[0]) + uy * (spine[i][1] - upRef[1]) < 0) {
        ux = -ux;
        uy = -uy;
      }
      frames.push([fx, fy, ux, uy]);
    }

    // Corps.
    const back = [];
    const belly = [];
    for (let i = 0; i < count; i += 1) {
      const [px, py] = spine[i];
      const [, , ux, uy] = frames[i];
      const half = size * serpentWidth(i / (count - 1));
      back.push([px + ux * half, py + uy * half]);
      belly.push([px - ux * half, py - uy * half]);
    }
    const silhouette = new Path2D();
    back.concat(belly.slice().reverse()).forEach(([px, py], index) => (index ? silhouette.lineTo(px, py) : silhouette.moveTo(px, py)));
    silhouette.closePath();
    const [hx, hy] = spine[0];
    // La tête n'est pas figée dans l'axe du cou : elle tourne et se relève doucement,
    // comme un serpent qui observe autour de lui.
    const look = reduce ? 0 : Math.sin(time * 0.0013) * 0.16 + Math.sin(time * 0.0031 + 1.3) * 0.06;
    const [bfx, bfy, bux, buy] = frames[0];
    const lookCos = Math.cos(look);
    const lookSin = Math.sin(look);
    const hfx = bfx * lookCos + bux * lookSin;
    const hfy = bfy * lookCos + buy * lookSin;
    const hux = bux * lookCos - bfx * lookSin;
    const huy = buy * lookCos - bfy * lookSin;
    const headScale = size * 1.15;
    const headMatrix = new DOMMatrix([hfx * headScale, hfy * headScale, hux * headScale, huy * headScale, hx, hy]);
    silhouette.addPath(SERPENT_HEAD, headMatrix);

    const flicker = reduce ? 1 : 0.84 + 0.12 * Math.sin(time * 0.013) + 0.04 * Math.sin(time * 0.071);
    const strength = alpha * flicker * (options.dim || 1);
    const strokeLine = (points) => {
      ctx.beginPath();
      points.forEach(([px, py], index) => (index ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.stroke();
    };
    const strokeLocal = (path) => {
      const outline = new Path2D();
      outline.addPath(path, headMatrix);
      ctx.stroke(outline);
    };
    const at = (f, u) => [hx + (hfx * f + hux * u) * headScale, hy + (hfy * f + huy * u) * headScale];

    ctx.save();
    if (options.clip) {
      ctx.clip(options.clip, "evenodd");
    }
    if (options.cover) {
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = options.cover;
      ctx.fill(silhouette, "nonzero");
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    // Maillage 3D façon hologramme : le corps est un tube en fil de fer. Des lignes courent
    // le long du tube et des anneaux le coupent en travers ; la face cachée est plus pâle.
    ctx.globalAlpha = strength * 0.07;
    ctx.fill(silhouette, "nonzero");
    ctx.shadowColor = color;
    const LONGITUDES = 13;
    const twist = reduce ? 0 : time * 0.0012; // le maillage glisse doucement le long du corps
    const front = new Path2D();
    const hidden = new Path2D();
    for (let k = 0; k < LONGITUDES; k += 1) {
      let previous = null;
      for (let i = 0; i < count; i += 1) {
        const angle = (k / LONGITUDES) * Math.PI * 2 + twist;
        const half = size * serpentWidth(i / (count - 1));
        const [px, py] = spine[i];
        const [, , ux, uy] = frames[i];
        const point = [px + ux * half * Math.cos(angle), py + uy * half * Math.cos(angle), Math.sin(angle)];
        if (previous) {
          const path = previous[2] + point[2] >= 0 ? front : hidden;
          path.moveTo(previous[0], previous[1]);
          path.lineTo(point[0], point[1]);
        }
        previous = point;
      }
    }
    // Anneaux : une ellipse vue en perspective tous les deux points.
    for (let i = 1; i < count - 1; i += 1) {
      const half = size * serpentWidth(i / (count - 1));
      if (half < 1.5) {
        continue;
      }
      const [px, py] = spine[i];
      const [, , ux, uy] = frames[i];
      const rotation = Math.atan2(uy, ux);
      const depth = half * 0.32;
      // Une moitié d'anneau visible, l'autre (la face cachée) plus pâle.
      front.moveTo(px + ux * half, py + uy * half);
      front.ellipse(px, py, half, depth, rotation, 0, Math.PI);
      hidden.moveTo(px - ux * half, py - uy * half);
      hidden.ellipse(px, py, half, depth, rotation, Math.PI, Math.PI * 2);
    }
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = strength * 0.22;
    ctx.stroke(hidden);
    ctx.shadowBlur = 6;
    ctx.globalAlpha = strength * 0.75;
    ctx.stroke(front);

    // Contours lumineux, plus marqués.
    ctx.shadowBlur = 14;
    ctx.globalAlpha = strength;
    ctx.lineWidth = 1.4;
    strokeLine(back);
    strokeLine(belly);
    // La tête est posée par-dessus le corps sur un fond plein : la queue qu'il mord et le
    // reste du corps ne se voient pas à travers.
    const headArea = new Path2D();
    headArea.addPath(SERPENT_HEAD, headMatrix);
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pageColor;
    ctx.fill(headArea);
    ctx.globalAlpha = strength * 0.12;
    ctx.fillStyle = color;
    ctx.fill(headArea);
    ctx.restore();
    strokeLocal(SERPENT_HEAD_LINE);
    ctx.lineWidth = 1;
    ctx.globalAlpha = strength * 0.8;
    strokeLocal(SERPENT_MESH);
    strokeLocal(SERPENT_FACE);
    ctx.shadowBlur = 0;

    // Œil (pupille en fente) et langue fourchue qui sort par moments.
    ctx.globalAlpha = strength;
    ctx.lineWidth = 1.4;
    const [irisX, irisY] = at(1.95, 0.4);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(irisX, irisY, Math.max(1.5, size * 0.13), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    strokeLine([at(1.95, 0.52), at(1.95, 0.28)]);
    // Langue : sorties rapides et irrégulières, deux petits coups à chaque fois.
    const tongueCycle = Math.max(0, Math.sin(time * 0.0037) + Math.sin(time * 0.0011) * 0.6 - 0.7);
    const flick = reduce ? 0 : Math.min(1, tongueCycle * 2.5) * Math.abs(Math.sin(time * 0.02));
    if (flick > 0.05) {
      const tip = 3.42 + flick * 1.1;
      ctx.lineWidth = 1.2;
      strokeLine([at(3.3, -0.06), at(tip, 0.0)]);
      strokeLine([at(tip, 0.0), at(tip + 0.32, 0.16)]);
      strokeLine([at(tip, 0.0), at(tip + 0.32, -0.16)]);
    }
    ctx.restore();
    return silhouette;
  }

  // Ouroboros : le cercle de l'accueil EST le serpent, qui tourne dans le sens des aiguilles
  // d'une montre en se mordant la queue.
  //
  // Le corps suit un chemin : la tête avance et chaque point du corps passe là où la tête est
  // passée. Le chemin = la barre de chargement (droite, parcourue vers la gauche), puis, au bout
  // de la barre, un cercle parcouru dans le sens horaire : depuis le bas, la tête remonte,
  // fait le tour et revient mordre la queue qui arrive par la barre.
  const OUROBOROS_POINTS = 150;
  const INTRO_MS = 2600; // durée de l'enroulement après le chargement
  const SPIN = 0.00028; // vitesse de rotation sur l'anneau (radians par milliseconde)
  let intro = null; // { start, from: { x, y, length, size }, radius } pendant l'enroulement
  let ring = null; // { angle, time } : position de la tête sur l'anneau à un instant donné

  // Longueur du corps sur l'anneau : un tour moins la longueur avalée, pour que le bout de la
  // queue finisse caché dans la gueule (devant le cou, sous la tête).
  const ringArc = (radius, size) => Math.PI * 2 - (size * 1.15 * HEAD_LENGTH * 0.55) / radius;

  function serpentOnPath(pointAt, headS, length, size, time) {
    const spine = [];
    const t = reduce ? 0 : time;
    for (let i = 0; i < OUROBOROS_POINTS; i += 1) {
      const s = i / (OUROBOROS_POINTS - 1);
      const [x, y, nx, ny] = pointAt(headS - s * length);
      // Petite ondulation qui parcourt le corps, et un coup de fouet au bout de la queue.
      const wave =
        Math.sin(s * Math.PI * 12 - t * 0.004) * size * 0.14 * Math.min(1, s * 5) +
        Math.sin(s * Math.PI * 20 - t * 0.007) * size * 0.2 * Math.max(0, (s - 0.88) / 0.12);
      spine.push([x + nx * wave, y + ny * wave]);
    }
    return spine;
  }

  function drawOuroboros(cx, cy, radius, time, alpha) {
    const size = Math.max(11, radius * 0.085);
    const elapsed = intro ? time - intro.start : Infinity;
    if (intro && elapsed < INTRO_MS) {
      // --- Enroulement : la tête quitte la barre, remonte en tournant et fait le tour. ---
      const R = intro.radius;
      const from = intro.from;
      const u = clamp(elapsed / INTRO_MS, 0, 1);
      const arc = ringArc(R, size) * R;
      // La tête démarre doucement, file, puis ralentit jusqu'à la vitesse de croisière.
      const travel = arc * 1.12;
      const headS = travel * (1 - Math.pow(1 - u, 2.4));
      // Le corps s'allonge depuis la queue (encore posée sur la barre) jusqu'à faire le tour.
      const length = Math.min(arc, from.length + headS * 0.85);
      const bodySize = lerp(from.size, size, ease(clamp(u * 1.6, 0, 1)));
      // Le cercle se forme au bout de la barre, puis glisse au centre de l'écran.
      const slide = ease(clamp((u - 0.35) / 0.65, 0, 1));
      const centerX = lerp(from.x, cx, slide);
      const centerY = lerp(from.y - R, cy, slide);
      const barY = centerY + R;
      const pointAt = (s) => {
        if (s <= 0) {
          // Sur la barre : la tête allait vers la gauche, le corps s'étire vers la droite.
          return [centerX - s, barY, 0, 1];
        }
        const angle = Math.PI / 2 + s / R; // depuis le bas du cercle, sens horaire
        return [centerX + Math.cos(angle) * R, centerY + Math.sin(angle) * R, Math.cos(angle), Math.sin(angle)];
      };
      const spine = serpentOnPath(pointAt, headS, length, bodySize, time);
      drawSerpent(context, spine, bodySize, time, alpha, accent, [centerX, centerY]);
      ring = { angle: Math.PI / 2 + headS / R, time };
      return;
    }
    // --- Sur l'anneau : il tourne en se mordant la queue. ---
    if (!ring) {
      ring = { angle: -Math.PI / 2, time };
    }
    const spun = reduce ? 0 : time - ring.time;
    // Vitesse irrégulière (il avance, ralentit, repart) ; toutes les variations partent de 0.
    const headAngle = ring.angle + spun * SPIN + Math.sin(spun * 0.0009) * 0.04;
    const arcAngle = ringArc(radius, size);
    const pointAt = (s) => {
      const angle = headAngle + s; // ici s est un angle
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, Math.cos(angle), Math.sin(angle)];
    };
    const spine = serpentOnPath(pointAt, 0, arcAngle, size, time);
    drawSerpent(context, spine, size, time, alpha, accent, [cx, cy]);
  }

  // Serpent de l'écran de chargement : il glisse sur la barre, sa progression = celle du chargement.
  const loaderCanvas = $(".loader__serpent");
  let loaderSnake = null; // dernière position du serpent-barre, à l'écran
  const loaderContext = loaderCanvas?.getContext("2d");
  function drawLoaderSerpent(progress, time) {
    if (!loaderContext) {
      return;
    }
    const density = Math.min(2, window.devicePixelRatio || 1);
    const width = loaderCanvas.clientWidth;
    const height = loaderCanvas.clientHeight;
    if (loaderCanvas.width !== Math.round(width * density)) {
      loaderCanvas.width = Math.round(width * density);
      loaderCanvas.height = Math.round(height * density);
    }
    const ctx = loaderContext;
    ctx.setTransform(density, 0, 0, density, 0, 0);
    ctx.clearRect(0, 0, width, height);
    // Le serpent EST la barre de chargement : sa queue reste fixée à droite et il s'allonge
    // vers la gauche à mesure que le site charge (0 % = minuscule, 100 % = toute la largeur).
    // Arrivé au bout, il remontera en tournant pour former le cercle de l'accueil.
    const size = Math.max(7, Math.min(11, width / 40));
    const headLength = size * 1.15 * HEAD_LENGTH;
    const right = width - 8;
    const left = headLength + 8;
    const barY = height * 0.5;
    const headX = right - size * 3 - (right - left - size * 3) * progress;
    const bodyLength = right - headX;

    const POINTS = 80;
    const spine = [];
    for (let i = 0; i < POINTS; i += 1) {
      const s = i / (POINTS - 1);
      const x = headX + s * bodyLength;
      // Une ondulation légère parcourt le corps : la barre reste lisible mais vit.
      const wave = Math.sin(x * 0.045 - time * 0.006) * size * 0.32 * Math.min(1, s * 6);
      const flick = Math.sin(s * Math.PI * 10 - time * 0.012) * size * 0.3 * Math.max(0, (s - 0.85) / 0.15);
      spine.push([x, barY + wave + flick]);
    }
    const rect = loaderCanvas.getBoundingClientRect();
    loaderSnake = { x: rect.left + headX, y: rect.top + barY, length: bodyLength, size };
    ctx.save();
    drawSerpent(ctx, spine, size, time, 1, accent, [headX, height * 4]);
    ctx.restore();
  }

  function drawHive(time, heroP, velocity) {
    if (!context) {
      return;
    }
    const p = ease(heroP);
    const t = time * 0.00011;
    const amplitude = (22 + clamp(Math.abs(velocity) * 1.4, 0, 46)) * (1 + p * 0.9);
    const scrollPhase = window.scrollY * 0.0011;
    const step = 14;

    for (let i = ripples.length - 1; i >= 0; i -= 1) {
      if (time - ripples[i].t > 1400) {
        ripples.splice(i, 1);
      }
    }
    const waves = ripples.map((ripple) => ({
      x: ripple.x,
      y: ripple.y,
      radius: (time - ripple.t) * 0.5,
      life: 1 - (time - ripple.t) / 1400,
    }));

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, W, H);

    const base = new Path2D();
    const halo = new Path2D();
    const core = new Path2D();

    for (let i = 0; i < lineCount; i += 1) {
      const baseY = (i / (lineCount - 1)) * H * 1.2 - H * 0.1;
      let started = false;
      let haloOn = false;
      let coreOn = false;
      for (let x = -10; x <= W + 10; x += step) {
        const nx = x / W;
        let y =
          baseY +
          Math.sin(nx * 3.1 + t * 3.2 + i * 0.16 + scrollPhase) * amplitude * 0.62 +
          Math.sin(nx * 6.4 - t * 2.1 + i * 0.29) * amplitude * 0.28 +
          Math.sin(i * 0.5 + t) * 8;

        // Le curseur écarte doucement les fils et les éclaire.
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const f = Math.exp(-(dx * dx + dy * dy) / (2 * 150 * 150));
        y += dy * 0.3 * f;

        // Onde circulaire déclenchée par un clic.
        for (const wave of waves) {
          const d = Math.hypot(x - wave.x, y - wave.y);
          const e = (d - wave.radius) / 55;
          y += Math.sin((d - wave.radius) * 0.06) * 20 * wave.life * Math.exp(-e * e);
        }

        if (!started) {
          base.moveTo(x, y);
          started = true;
        } else {
          base.lineTo(x, y);
        }
        if (f > 0.09) {
          if (haloOn) {
            halo.lineTo(x, y);
          } else {
            halo.moveTo(x, y);
            haloOn = true;
          }
        } else {
          haloOn = false;
        }
        if (f > 0.34) {
          if (coreOn) {
            core.lineTo(x, y);
          } else {
            core.moveTo(x, y);
            coreOn = true;
          }
        } else {
          coreOn = false;
        }
      }
    }

    context.lineWidth = 1;
    context.strokeStyle = `rgba(${accentRgb},${baseAlpha})`;
    context.stroke(base);
    context.strokeStyle = `rgba(${accentRgb},0.3)`;
    context.stroke(halo);
    context.strokeStyle = `rgba(${accentRgb},0.8)`;
    context.stroke(core);

    // Le serpent qui se mord la queue forme le grand cercle de l'accueil ; on le traverse en défilant.
    if (heroP < 0.999) {
      const cx = W / 2;
      const cy = H / 2;
      const radius = lerp(Math.min(W, H) * 0.3, Math.max(W, H) * 0.95, p);
      const alpha = 1 - heroP;
      // Pendant le chargement, le serpent est encore sur la barre (dans l'écran de chargement).
      if (!root.classList.contains("js-loading") || intro) {
        drawOuroboros(cx, cy, radius, time, alpha);
      }
      context.save();
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
      glow.addColorStop(0, `rgba(${accentRgb},0)`);
      glow.addColorStop(1, `rgba(${accentRgb},0.5)`);
      context.globalAlpha = alpha * 0.08;
      context.fillStyle = glow;
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  });

  /* ------------------------------------------------------------------ */
  /* Boucle d'animation                                                  */
  /* ------------------------------------------------------------------ */
  let lastY = window.scrollY;
  let velocity = 0;
  let tickerX = 0;
  let activeSection = "";
  let litWords = -1;
  let activeCard = -1;

  function frame(now) {
    if (document.hidden) {
      requestAnimationFrame(frame);
      return;
    }
    // Inertie du défilement.
    if (smooth) {
      const diff = target - current;
      if (Math.abs(diff) > 0.05) {
        current += diff * 0.1;
        window.scrollTo(0, current);
      }
    }
    const y = window.scrollY;
    velocity = lerp(velocity, y - lastY, 0.25);
    lastY = y;

    scrollCue?.classList.toggle("is-hidden", y > 60);
    progressBar?.style.setProperty("--p", maxScroll() > 0 ? (y / maxScroll()).toFixed(4) : "0");

    // Accueil.
    const heroP = pinProgress(hero);
    hero?.style.setProperty("--hero-p", heroP.toFixed(4));

    // Titre : les lettres proches du curseur se soulèvent et passent en jaune.
    if (fine && !reduce && heroP < 0.5) {
      heroChars.forEach((char) => {
        const rect = char.getBoundingClientRect();
        const distanceToPointer = Math.hypot(rect.left + rect.width / 2 - pointer.x, rect.top + rect.height / 2 - pointer.y);
        const k = clamp(1 - distanceToPointer / 300, 0, 1);
        char.style.setProperty("--k", k.toFixed(3));
      });
    }

    // Nom géant du bas de page : il se remplit quand on arrive en fin de page.
    if (footerMark) {
      const left = maxScroll() - y;
      footerMark.style.setProperty("--fp", clamp(1 - left / (window.innerHeight * 0.7), 0, 1).toFixed(3));
    }

    // Profil : mots allumés selon la progression.
    if (scrubWords.length) {
      const aboutP = pinProgress(about);
      const lit = reduce ? scrubWords.length : Math.round(clamp((aboutP - 0.06) / 0.74, 0, 1) * scrubWords.length);
      if (lit !== litWords) {
        litWords = lit;
        scrubWords.forEach((word, index) => word.classList.toggle("on", index < lit));
      }
      if (!counted && aboutP > 0.3) {
        countUp();
      }
    }

    // Projets : bande horizontale, parallaxe des images, compteur.
    if (wide && projectsList) {
      const p = pinProgress(projectsSection);
      projectsList.style.transform = `translate3d(${(-p * distance).toFixed(1)}px,0,0)`;
      let closest = 0;
      let best = Infinity;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const offset = (rect.left + rect.width / 2 - window.innerWidth / 2) / window.innerWidth;
        const focusOffset = (rect.left + rect.width / 2 - window.innerWidth * 0.4) / window.innerWidth;
        const focus = clamp((1 - clamp(Math.abs(focusOffset) * 1.8, 0, 1)) * 1.6, 0, 1);
        card.style.setProperty("--px", clamp(offset, -1, 1).toFixed(3));
        card.style.setProperty("--sc", (0.9 + 0.1 * focus).toFixed(3));
        card.style.setProperty("--op", (0.5 + 0.5 * focus).toFixed(3));
        if (Math.abs(focusOffset) < best) {
          best = Math.abs(focusOffset);
          closest = index;
        }
      });
      bar?.style.setProperty("--bar", p.toFixed(4));
      if (closest !== activeCard) {
        activeCard = closest;
        if (counter) {
          counter.textContent = String(closest + 1).padStart(2, "0");
        }
      }
    }

    // Compétences : les cartes qui arrivent font reculer les précédentes.
    if (skillCards.length > 1) {
      const overlaps = skillCards.map((card, index) => {
        if (index === 0) {
          return 0;
        }
        const stickyTop = skillTops[index];
        const rect = card.getBoundingClientRect();
        return clamp(1 - (rect.top - stickyTop) / Math.max(1, card.offsetHeight), 0, 1);
      });
      skillCards.forEach((card, index) => {
        let push = 0;
        for (let j = index + 1; j < skillCards.length; j += 1) {
          push += overlaps[j];
        }
        card.style.setProperty("--s", (1 - 0.04 * push).toFixed(4));
      });
    }

    // Bandeau : plus on défile vite, plus il file, et il change de sens avec le défilement.
    if (ticker && !reduce) {
      const half = ticker.scrollWidth / 2;
      const direction = velocity < -0.5 ? -1 : 1;
      tickerX -= (0.6 + Math.abs(velocity) * 0.35) * direction;
      if (tickerX <= -half) {
        tickerX += half;
      } else if (tickerX > 0) {
        tickerX -= half;
      }
      ticker.style.transform = `translate3d(${tickerX.toFixed(1)}px,0,0)`;
    }

    // Section active (navigation + rail).
    let currentSection = sectionIds[0];
    sections.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= window.innerHeight * 0.45) {
        currentSection = sectionIds[index];
      }
    });
    if (currentSection !== activeSection) {
      activeSection = currentSection;
      navLinks.forEach((link) => {
        if (link.getAttribute("href") === `#${currentSection}`) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    // Ruche.
    if (!reduce) {
      drawHive(now, heroP, velocity);
    }

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                           */
  /* ------------------------------------------------------------------ */
  readColors();
  resizeHive();
  layoutProjects();
  new MutationObserver(readColors).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeHive();
      layoutProjects();
      if (window.innerWidth >= 900 && menu?.classList.contains("is-open")) {
        setMenu(false);
      }
      target = current = window.scrollY;
    }, 120);
  });
  window.addEventListener("load", () => {
    layoutProjects();
    if (reduce) {
      drawHive(0, 0, 0);
    }
  });

  if (reduce) {
    drawHive(0, 0, 0);
  }

  // Intro d'ouverture : le monogramme se dessine, le serpent-barre se remplit, puis il
  // s'enroule pour devenir le cercle de l'accueil.
  const loader = $(".loader");
  const scrollCue = $(".scroll-cue");
  function openSite() {
    root.classList.remove("js-loading");
    root.classList.add("is-ready");
    // L'indicateur de défilement apparaît quand le titre a fini de s'animer.
    setTimeout(() => scrollCue?.classList.add("is-shown"), reduce ? 0 : 2400);
  }

  if (root.classList.contains("js-loading") && loader) {
    const count = $(".loader__count", loader);
    const startedAt = performance.now();
    let loaded = document.readyState === "complete";
    window.addEventListener("load", () => {
      loaded = true;
    });
    const step = (now) => {
      const t = clamp((now - startedAt) / 4600, 0, 1); // durée du chargement : 4,6 s
      const value = ease(t);
      count.textContent = String(Math.round(value * 100)).padStart(3, "0");
      loader.style.setProperty("--lp", value.toFixed(3));
      drawLoaderSerpent(value, now);
      if (t < 1 || !loaded) {
        requestAnimationFrame(step);
        return;
      }
      // Le fond de l'écran de chargement s'efface ; le serpent passe sur le canvas de l'accueil,
      // exactement au même endroit, puis s'enroule jusqu'à se mordre la queue.
      if (loaderSnake) {
        intro = { start: performance.now(), from: loaderSnake, radius: Math.min(W, H) * 0.3 };
      }
      loader.classList.add("is-handoff");
      try {
        sessionStorage.setItem("hakim-intro", "1");
      } catch (error) {
        /* stockage indisponible : l'intro se rejouera, sans gravité */
      }
      // L'accueil (titre, textes, boutons) apparaît quand le cercle est presque refermé.
      setTimeout(openSite, INTRO_MS * 0.72);
    };
    requestAnimationFrame(step);
  } else {
    openSite();
  }

  requestAnimationFrame(frame);
})();