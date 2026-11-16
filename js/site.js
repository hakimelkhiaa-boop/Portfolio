// Portfolio « ruche » : tout ce qui réagit au défilement et à la souris.
// Aucune bibliothèque externe : canvas 2D, IntersectionObserver et requestAnimationFrame.
(() => {
  const root = document.documentElement;
  const tr = window.tr || ((text) => text); // traduction (voir le script en bas de index.html)
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
    menuToggle.textContent = tr(open ? "Fermer" : "Menu");
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

  /* Halo lumineux qui suit la souris sur les cartes (projets, compétences, réseaux). */
  if (fine && !reduce) {
    document.addEventListener("pointermove", (event) => {
      const card = event.target instanceof Element ? event.target.closest(".project, .skill-card, .contact__link") : null;
      if (!card) {
        return;
      }
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`);
    });
  }

  /* Petits titres : ils se « décodent » comme un hologramme quand ils entrent à l'écran. */
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/";
  function decode(element) {
    const text = element.dataset.text;
    const startedAt = performance.now();
    const duration = 900;
    const tick = (now) => {
      const progress = clamp((now - startedAt) / duration, 0, 1);
      const settled = Math.floor(progress * text.length);
      let output = text.slice(0, settled);
      for (let i = settled; i < text.length; i += 1) {
        output += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      element.textContent = output;
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window && !reduce) {
    const eyebrows = $$(".eyebrow");
    const decoder = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            decoder.unobserve(entry.target);
            decode(entry.target);
          }
        });
      },
      { threshold: 0.6 },
    );
    eyebrows.forEach((element) => {
      element.dataset.text = element.textContent.trim();
      // Le vrai texte reste lisible par les lecteurs d'écran pendant l'effet.
      element.setAttribute("aria-label", element.dataset.text);
      decoder.observe(element);
    });
  }

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
    nav.setAttribute("aria-label", tr("Autres projets"));
    nav.innerHTML = `
      <button type="button" class="project__nav-btn" data-dir="-1">
        <span class="project__nav-label">${tr("← Précédent")}</span><span class="project__nav-title"></span>
      </button>
      <button type="button" class="project__nav-btn" data-dir="1">
        <span class="project__nav-label">${tr("Suivant →")}</span><span class="project__nav-title"></span>
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
        button.textContent = tr("Adresse copiée ✓");
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
  const RIPPLE_SPEED = 0.7; // vitesse de l'onde, en pixels par milliseconde
  window.addEventListener("pointerdown", (event) => {
    // L'onde doit atteindre le coin de l'écran le plus éloigné du clic.
    const reach = Math.hypot(Math.max(event.clientX, W - event.clientX), Math.max(event.clientY, H - event.clientY)) + 120;
    ripples.push({ x: event.clientX, y: event.clientY, t: performance.now(), reach });
    if (ripples.length > 4) {
      ripples.shift();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Scène d'ouverture : l'ange qui se dessine, puis l'éclair            */
  /* ------------------------------------------------------------------ */
  // Pendant le chargement, la scène occupe tout l'écran : les contours de l'ange se tracent
  // depuis sa tête, la couleur descend, l'éclair frappe et le nom s'écrit. Ensuite elle reste
  // en fond de l'accueil, sans l'éclair, et s'efface quand on fait défiler la page.
  // Les deux images (ange, éclair) sont en fin de fichier : sceneArt().
  const SCENE = {
    speed: 1, // 2 = deux fois plus rapide
    traceStart: 0.1,
    traceSpread: 4.5,
    segLen: 140,
    segSpeed: 120,
    segMin: 0.6,
    segMax: 1.4,
    strike: 8.9, // l'intérieur de l'éclair s'allume d'un coup, une fois l'ange complet
    fillStart: 6.1,
    fillEnd: 8.8,
    shimmerStart: 10.4,
    shimmerDur: 1.5,
    twinkles: 45,
    end: 12.2, // fin du chargement : l'accueil apparaît
    after: 1.2, // durée pendant laquelle l'éclair, le nom et la pluie s'effacent
    maxSize: 620, // taille de référence des réglages exprimés en pixels
    maxArt: 1200, // taille maximale du dessin (px CSS)
    stars: 150,
    feathers: 18,
  };

  // Couleurs de la scène selon le thème du site : or en sombre, violet en clair.
  const SCENE_THEMES = {
    dark: {
      additive: true,
      sky: ["#14100a", "#0d0b07", "#0a0907", "#18130b"],
      stops: [[255, 246, 222], [240, 214, 150], [214, 184, 122], [140, 100, 52]],
      gamma: 1.3,
      gain: 0.95,
      tint: (c) => c * 0.5 + 85,
      fresh: "rgb(255, 240, 210)",
      stars: ["#fff6e2", "#f0d58f"],
      clouds: ["rgb(30, 25, 16)", "rgb(22, 18, 12)"],
      cloudLit: "rgb(240, 210, 150)",
      storm: ["rgba(255, 225, 160, 1)", "rgba(200, 150, 80, 0.35)"],
      aura: ["rgba(214, 184, 122, 1)", "rgba(150, 110, 50, 0.4)"],
      core: [255, 250, 232],
      glow: [240, 200, 130],
      flash: "255, 236, 196",
      flashSolid: "255, 242, 214",
      rain: "#f0dcb0",
      heads: "rgba(255, 225, 160, 0.22)",
      dot: "#ffffff",
      twinkle: "255, 245, 220",
      nameShadow: "rgba(214, 184, 122, 0.55)",
      band: [255, 236, 200],
      shimmer: [150, 140, 120],
      featherMix: 153,
      rest: 0.62, // opacité de l'ange quand il reste en fond de l'accueil
    },
    light: {
      additive: false,
      sky: ["#f8f7f3", "#f6f5f1", "#f1f0ea", "#e9e7f3"],
      stops: [[150, 140, 255], [100, 85, 245], [75, 61, 242], [40, 30, 140]],
      gamma: 1,
      gain: 1,
      tint: (c) => c * 0.85,
      fresh: "rgb(42, 33, 96)",
      stars: null,
      clouds: ["rgb(226, 224, 238)", "rgb(216, 213, 232)"],
      cloudLit: "rgb(196, 190, 255)",
      storm: ["rgba(120, 105, 255, 0.5)", "rgba(120, 105, 255, 0.15)"],
      aura: ["rgba(120, 105, 255, 0.5)", "rgba(120, 105, 255, 0.15)"],
      core: [75, 61, 242],
      glow: [160, 150, 255],
      flash: "75, 61, 242",
      flashSolid: "238, 235, 255",
      rain: "#7d72d8",
      heads: "rgba(75, 61, 242, 0.18)",
      dot: "#4b3df2",
      twinkle: "75, 61, 242",
      nameShadow: "rgba(75, 61, 242, 0.3)",
      band: [255, 255, 255],
      shimmer: [255, 255, 255],
      featherMix: 90,
      rest: 0.45,
    },
  };
  const sceneTheme = () => (root.dataset.theme === "light" ? "light" : "dark");

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const easeInOut3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

  function seeded(seed) {
    // générateur pseudo-aléatoire reproductible
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function paletteAt(theme, g, out) {
    const s = theme.stops;
    const x = clamp01(g) * (s.length - 1);
    const i = Math.min(s.length - 2, Math.floor(x));
    const f = x - i;
    for (let c = 0; c < 3; c += 1) {
      out[c] = s[i][c] * (1 - f) + s[i + 1][c] * f;
    }
  }

  function blurField(src, w, h, r) {
    // flou gaussien approché (3 passes de moyenne)
    r = Math.max(1, Math.round(r));
    const a = new Float32Array(src);
    const b = new Float32Array(src.length);
    const n = 2 * r + 1;
    for (let p = 0; p < 3; p += 1) {
      for (let y = 0; y < h; y += 1) {
        const o = y * w;
        let s = 0;
        for (let x = -r; x <= r; x += 1) s += a[o + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x += 1) {
          b[o + x] = s / n;
          s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < w; x += 1) {
        let s = 0;
        for (let y = -r; y <= r; y += 1) s += b[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y += 1) {
          a[y * w + x] = s / n;
          s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
        }
      }
    }
    return a;
  }

  function makeLayer(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function layerFromPixels(w, h, fn) {
    // calque construit pixel par pixel
    const c = makeLayer(w, h);
    const ctx = c.getContext("2d");
    const im = ctx.createImageData(w, h);
    const px = [0, 0, 0, 0];
    for (let i = 0, n = w * h; i < n; i += 1) {
      fn(i, px);
      im.data[4 * i] = px[0];
      im.data[4 * i + 1] = px[1];
      im.data[4 * i + 2] = px[2];
      im.data[4 * i + 3] = px[3];
    }
    ctx.putImageData(im, 0, 0);
    return c;
  }

  // Contours du masque : suit les arêtes entre pixels pleins et vides, au sous-pixel près.
  function traceLoops(mask, soft, thr, w, h) {
    const vw = w + 1;
    const out = new Uint8Array(vw * (h + 1));
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (!mask[y * w + x]) continue;
        if (y === 0 || !mask[(y - 1) * w + x]) out[y * vw + x] |= 1;
        if (x === w - 1 || !mask[y * w + x + 1]) out[y * vw + x + 1] |= 2;
        if (y === h - 1 || !mask[(y + 1) * w + x]) out[(y + 1) * vw + x + 1] |= 4;
        if (x === 0 || !mask[y * w + x - 1]) out[(y + 1) * vw + x] |= 8;
      }
    }
    const step = [1, vw, -1, -vw];
    const loops = [];
    for (let v = 0; v < out.length; v += 1) {
      while (out[v]) {
        let d = out[v] & 1 ? 0 : out[v] & 2 ? 1 : out[v] & 4 ? 2 : 3;
        let cur = v;
        const pts = [];
        while (d >= 0) {
          out[cur] &= ~(1 << d);
          const vx = cur % vw;
          const vy = (cur / vw) | 0;
          const ix = d === 1 || d === 2 ? vx - 1 : vx;
          const iy = d >= 2 ? vy - 1 : vy;
          const ox = d === 0 ? vx : d === 1 ? vx : vx - 1;
          const oy = d === 0 ? vy - 1 : d === 3 ? vy - 1 : vy;
          const va = soft[iy * w + ix];
          const vb = ox < 0 || oy < 0 || ox >= w || oy >= h ? 0 : soft[oy * w + ox];
          const tt = va > vb ? Math.min(1, Math.max(0, (va - thr) / (va - vb))) : 0.5;
          pts.push(ix + 0.5 + (ox - ix) * tt, iy + 0.5 + (oy - iy) * tt);
          cur += step[d];
          const o = out[cur];
          const r = (d + 1) & 3;
          const l = (d + 3) & 3;
          d = (o >> r) & 1 ? r : (o >> d) & 1 ? d : (o >> l) & 1 ? l : -1;
        }
        if (pts.length >= 20) loops.push(pts);
      }
    }
    return loops;
  }

  // Préparation : masques de l'ange et de l'éclair, contours à tracer, calques de couleur.
  function prepareScene(img, boltImg, withIntro) {
    const art = sceneArt();
    const rand = seeded(7);
    const boxW = Math.min(window.innerWidth * 0.92, SCENE.maxArt);
    const boxH = Math.min(window.innerHeight, SCENE.maxArt);
    const s = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
    const cssW = Math.max(8, Math.round(img.naturalWidth * s));
    const cssH = Math.max(8, Math.round(img.naturalHeight * s));
    let scale = Math.max(1.5, Math.min(window.devicePixelRatio || 1, 2)); // rendu plus fin que l'écran
    if (cssW * cssH * scale * scale > 1.2e6) scale = Math.sqrt(1.2e6 / (cssW * cssH));
    const w = Math.round(cssW * scale);
    const h = Math.round(cssH * scale);
    const n = w * h;
    const k = Math.max(w, h) / SCENE.maxSize;

    const src = makeLayer(w, h);
    const sctx = src.getContext("2d", { willReadFrequently: true });
    sctx.drawImage(img, 0, 0, w, h);
    let d = sctx.getImageData(0, 0, w, h).data;
    const lum = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      lum[i] = ((0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2]) / 255) * (d[4 * i + 3] / 255);
    }
    const border = [];
    for (let x = 0; x < w; x += 1) border.push(lum[x], lum[(h - 1) * w + x]);
    for (let y = 0; y < h; y += 1) border.push(lum[y * w], lum[y * w + w - 1]);
    border.sort((a, b) => a - b);
    const invert = border[border.length >> 1] > 0.5; // fond clair : on inverse
    const lv = art.levels;
    for (let i = 0; i < n; i += 1) {
      lum[i] = clamp01(((invert ? 1 - lum[i] : lum[i]) - lv[0]) / (lv[1] - lv[0]));
    }
    let boltL = null;
    if (boltImg) {
      sctx.fillStyle = "#000";
      sctx.fillRect(0, 0, w, h);
      sctx.drawImage(boltImg, 0, 0, w, h);
      d = sctx.getImageData(0, 0, w, h).data;
      boltL = new Float32Array(n);
      for (let i = 0; i < n; i += 1) boltL[i] = d[4 * i] / 255;
    }

    let both = lum;
    if (boltL) {
      both = new Float32Array(n);
      for (let i = 0; i < n; i += 1) both[i] = Math.max(lum[i], boltL[i]);
    }
    const soft = blurField(both, w, h, 1);
    const mask = new Uint8Array(n);
    let x0 = w;
    let x1 = 0;
    let y0 = h;
    let y1 = 0;
    for (let i = 0; i < n; i += 1) {
      if (soft[i] > 0.33) {
        mask[i] = 1;
        const x = i % w;
        const y = (i / w) | 0;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < x0) throw new Error("image vide");

    // L'éclair est traité à part (lumière, sans dégradé).
    const fillL = new Float32Array(lum);
    if (boltL) {
      for (let i = 0; i < n; i += 1) if (boltL[i] > 0.2) fillL[i] = 0;
    }

    // Petites formes isolées (plumes) : plus claires que le reste.
    const fm = new Float32Array(n);
    for (let i = 0; i < n; i += 1) fm[i] = fillL[i] > 0.33 ? 1 : 0;
    const dil = blurField(fm, w, h, 3 * k);
    const label = new Int32Array(n);
    const stack = new Int32Array(n);
    const areas = [0];
    let count = 0;
    for (let i = 0; i < n; i += 1) {
      if (dil[i] <= 0.05 || label[i]) continue;
      count += 1;
      areas.push(0);
      let top = 0;
      stack[top++] = i;
      label[i] = count;
      while (top) {
        const p = stack[--top];
        areas[count] += 1;
        const x = p % w;
        let q;
        if (x > 0 && !label[(q = p - 1)] && dil[q] > 0.05) { label[q] = count; stack[top++] = q; }
        if (x < w - 1 && !label[(q = p + 1)] && dil[q] > 0.05) { label[q] = count; stack[top++] = q; }
        if (p >= w && !label[(q = p - w)] && dil[q] > 0.05) { label[q] = count; stack[top++] = q; }
        if (p < n - w && !label[(q = p + w)] && dil[q] > 0.05) { label[q] = count; stack[top++] = q; }
      }
    }
    const small = new Uint8Array(n);
    for (let i = 0; i < n; i += 1) small[i] = label[i] && areas[label[i]] < 0.012 * n ? 1 : 0;

    const P = { w, h, k, scale, n, x0, x1, y0, y1, fillL, small, themes: {}, segs: [], twinkles: [], strikes: [] };
    P.gradAt = (i, theme, out) =>
      paletteAt(theme, (0.45 * ((i % w) - x0)) / Math.max(1, x1 - x0) + (0.55 * (((i / w) | 0) - y0)) / Math.max(1, y1 - y0), out);

    // Le reste ne sert qu'au chargement (tracé des contours, éclair).
    if (!withIntro) return P;

    const mf = new Float32Array(n);
    for (let i = 0; i < n; i += 1) mf[i] = mask[i];
    const grown = blurField(mf, w, h, 8 * k);
    for (let i = 0; i < n; i += 1) grown[i] = grown[i] > 0.02 ? 1 : 0;
    const closed = blurField(grown, w, h, 8 * k);
    for (let i = 0; i < n; i += 1) closed[i] = closed[i] > 0.98 ? 1 : 0;
    P.solid = blurField(closed, w, h, 5 * k);
    if (boltL) {
      const g1 = blurField(boltL, w, h, 7 * k);
      const g2 = blurField(boltL, w, h, 2.5 * k);
      P.boltL = boltL;
      P.glow = new Float32Array(n);
      for (let i = 0; i < n; i += 1) P.glow[i] = Math.min(1, g1[i] * 1.5 + g2[i] * 0.6);
      P.boltZone = blurField(boltL, w, h, 4 * k);
    }

    // Segments à tracer, du plus proche de la tête au plus loin.
    const fx = art.focus[0] * w;
    const fy = art.focus[1] * h;
    let dmax = 1;
    [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach((c) => {
      dmax = Math.max(dmax, Math.hypot(c[0] - fx, c[1] - fy));
    });
    const chunk = Math.max(2, Math.round((SCENE.segLen * k) / 2));
    traceLoops(mask, soft, 0.33, w, h).forEach((loop) => {
      const pts = [];
      const m = loop.length / 2;
      for (let j = 0; j < m; j += 2) {
        // un point sur deux, lissé
        const a = ((j - 1 + m) % m) * 2;
        const b = j * 2;
        const c = ((j + 1) % m) * 2;
        pts.push((loop[a] + 2 * loop[b] + loop[c]) / 4, (loop[a + 1] + 2 * loop[b + 1] + loop[c + 1]) / 4);
      }
      pts.push(pts[0], pts[1]);
      const total = pts.length / 2;
      for (let j = 0; j < total - 1; j += chunk) {
        let seg = pts.slice(j * 2, (j + chunk + 1) * 2);
        const len = seg.length / 2;
        if (len < 2) continue;
        let d0 = Math.hypot(seg[0] - fx, seg[1] - fy);
        const d1 = Math.hypot(seg[seg.length - 2] - fx, seg[seg.length - 1] - fy);
        if (d1 < d0) {
          const rev = [];
          for (let q = len - 1; q >= 0; q -= 1) rev.push(seg[q * 2], seg[q * 2 + 1]);
          seg = rev;
          d0 = d1;
        }
        P.segs.push({
          start: SCENE.traceStart + (d0 / dmax) * SCENE.traceSpread + rand() * 0.25,
          dur: Math.min(SCENE.segMax, Math.max(SCENE.segMin, (len * 2) / k / SCENE.segSpeed)),
          pts: seg,
          len,
          done: 0,
        });
      }
    });
    P.segs.sort((a, b) => a.start - b.start);

    for (let i = 0; i < SCENE.twinkles && P.segs.length; i += 1) {
      const sg = P.segs[Math.floor(rand() * P.segs.length)];
      const pi = Math.floor(rand() * sg.len) * 2;
      const ang = rand() * 2 * Math.PI;
      const rad = (4 + rand() * 12) * k;
      P.twinkles.push({
        x: sg.pts[pi] + rad * Math.cos(ang),
        y: sg.pts[pi + 1] + rad * Math.sin(ang),
        born: SCENE.traceStart + (Math.hypot(sg.pts[pi] - fx, sg.pts[pi + 1] - fy) / dmax) * SCENE.traceSpread + 0.4,
        period: 0.5 + rand() * 0.7,
        phase: rand(),
      });
    }
    if (boltL) {
      let bcx = 0;
      let bcy = 0;
      let bn = 0;
      let tipD = 1e9;
      for (let i = 0; i < n; i += 1) {
        if (boltL[i] <= 0.2) continue;
        const x = i % w;
        const y = (i / w) | 0;
        const bd = Math.hypot(x - fx, y - fy);
        if (bd < tipD) {
          tipD = bd;
          P.tipX = x;
          P.tipY = y;
        }
        bcx += x;
        bcy += y;
        bn += 1;
      }
      P.bcx = bn ? bcx / bn : w / 2;
      P.bcy = bn ? bcy / bn : h / 3;
      P.strikes.push(SCENE.strike, SCENE.strike + 0.13, SCENE.strike + 0.3); // une vraie frappe vacille
      for (let ts = SCENE.strike + 1.4; ts < SCENE.end - 0.6; ts += 1.6 + rand() * 1.2) P.strikes.push(ts);
      P.strikes.push(SCENE.end); // dernière frappe : c'est elle qui fait apparaître l'accueil
    }
    return P;
  }

  // Calques colorés pour un thème (construits une seule fois par thème).
  function sceneLayers(P, name) {
    if (P.themes[name]) return P.themes[name];
    const theme = SCENE_THEMES[name];
    const { w, h } = P;
    const pal = [0, 0, 0];
    const L = {
      fill: layerFromPixels(w, h, (i, px) => {
        P.gradAt(i, theme, pal);
        for (let c = 0; c < 3; c += 1) {
          let v = Math.pow(pal[c] / 255, theme.gamma) * 255 * theme.gain;
          if (P.small[i]) v = v * 0.35 + (pal[c] * 0.35 + 255 * 0.65) * 0.65;
          px[c] = Math.min(255, v);
        }
        px[3] = P.fillL[i] * 255; // transparent hors du dessin
      }),
      shimmer: layerFromPixels(w, h, (i, px) => {
        px[0] = theme.shimmer[0];
        px[1] = theme.shimmer[1];
        px[2] = theme.shimmer[2];
        px[3] = P.fillL[i] * 255;
      }),
    };
    if (P.segs.length) {
      L.tint = layerFromPixels(w, h, (i, px) => {
        P.gradAt(i, theme, pal);
        px[0] = theme.tint(pal[0]);
        px[1] = theme.tint(pal[1]);
        px[2] = theme.tint(pal[2]);
        px[3] = 255;
      });
      L.solid = layerFromPixels(w, h, (i, px) => {
        px[0] = theme.band[0];
        px[1] = theme.band[1];
        px[2] = theme.band[2];
        px[3] = P.solid[i] * 255;
      });
      if (P.boltL) {
        L.core = layerFromPixels(w, h, (i, px) => {
          px[0] = theme.core[0];
          px[1] = theme.core[1];
          px[2] = theme.core[2];
          px[3] = P.boltL[i] * 255;
        });
        L.glow = layerFromPixels(w, h, (i, px) => {
          px[0] = theme.glow[0];
          px[1] = theme.glow[1];
          px[2] = theme.glow[2];
          px[3] = P.glow[i] * 255;
        });
        L.boltZone = layerFromPixels(w, h, (i, px) => {
          px[0] = 200;
          px[1] = 210;
          px[2] = 255;
          px[3] = P.boltZone[i] > 0.02 ? 255 : 0;
        });
      }
    }
    P.themes[name] = L;
    return L;
  }

  // Crée la scène sur un canvas plein écran. withIntro : jouer le chargement (sinon, on part
  // directement de l'état final, en fond de l'accueil). onDone : appelé à la fin du chargement.
  function createScene(canvasEl, withIntro, onDone, skipped) {
    const art = sceneArt();
    const ctx = canvasEl.getContext("2d");
    const name = canvasEl.dataset.name || "";
    let P = null;
    let t = withIntro ? 0 : SCENE.end + SCENE.after;
    let last = 0;
    let done = !withIntro;
    let lite = false;
    let probe = 0;
    let cw = 0;
    let ch = 0;
    let ox = 0;
    let sc = 1.5;

    // Décor : étoiles, plumes, pluie (positions relatives à la page).
    const rnd = seeded(11);
    const stars = [];
    const feathers = [];
    const rain = [];
    for (let q = 0; q < SCENE.stars; q += 1) {
      stars.push({ x: rnd(), y: rnd(), r: 0.35 + rnd() * rnd() * 1.1, a: 0.25 + rnd() * 0.6, sp: 0.6 + rnd() * 2.2, ph: rnd() * 6.28, alt: rnd() < 0.3 });
    }
    for (let q = 0; q < SCENE.feathers; q += 1) {
      feathers.push({
        g: rnd(), x: rnd(), delay: rnd() * 6, speed: 70 + rnd() * 80, size: 11 + rnd() * 12,
        amp: 18 + rnd() * 34, swaySp: 0.5 + rnd() * 0.9, ph: rnd() * 6.28, rot: rnd() * 6.28, front: q % 2 === 0,
      });
    }
    for (let q = 0; q < 80; q += 1) rain.push({ x: rnd(), y: rnd(), len: 14 + rnd() * 20, sp: 750 + rnd() * 450 });

    function fit() {
      cw = Math.round(window.innerWidth * sc);
      ch = Math.round(window.innerHeight * sc);
      canvasEl.width = cw;
      canvasEl.height = ch;
      ox = P ? Math.round((cw - P.w) / 2) : 0;
    }

    function cloudTexture(tw, th, seed, cover, soft) {
      // nuages : bruit fractal, raccordable à l'horizontale pour dériver
      const r = seeded(seed);
      const grids = [];
      for (let o = 0; o < 5; o += 1) {
        const gx = 8 << o;
        const gy = Math.max(2, Math.round(((8 << o) * th) / tw));
        const g = new Float32Array(gx * (gy + 1));
        for (let i = 0; i < g.length; i += 1) g[i] = r();
        grids.push({ g, gx, gy });
      }
      const c = makeLayer(tw, th);
      const x2 = c.getContext("2d");
      const im = x2.createImageData(tw, th);
      const dd = im.data;
      for (let y = 0; y < th; y += 1) {
        const fall = Math.pow(1 - y / th, 1.4); // plus dense en haut
        for (let x = 0; x < tw; x += 1) {
          let v = 0;
          let amp = 0.55;
          let tot = 0;
          for (let o = 0; o < 5; o += 1) {
            const G = grids[o];
            const fx2 = (x / tw) * G.gx;
            const fy2 = (y / th) * G.gy;
            const ix = Math.floor(fx2);
            const iy = Math.floor(fy2);
            let ux = fx2 - ix;
            let uy = fy2 - iy;
            ux = ux * ux * (3 - 2 * ux);
            uy = uy * uy * (3 - 2 * uy);
            const a0 = G.g[iy * G.gx + (ix % G.gx)];
            const a1 = G.g[iy * G.gx + ((ix + 1) % G.gx)];
            const b0 = G.g[(iy + 1) * G.gx + (ix % G.gx)];
            const b1 = G.g[(iy + 1) * G.gx + ((ix + 1) % G.gx)];
            v += amp * ((a0 + (a1 - a0) * ux) * (1 - uy) + (b0 + (b1 - b0) * ux) * uy);
            tot += amp;
            amp *= 0.5;
          }
          v = clamp01((v / tot - (1 - cover)) / soft) * fall;
          const p = 4 * (y * tw + x);
          dd[p] = dd[p + 1] = dd[p + 2] = 255;
          dd[p + 3] = v * 255;
        }
      }
      x2.putImageData(im, 0, 0);
      return c;
    }
    function tinted(srcC, color) {
      const c = makeLayer(srcC.width, srcC.height);
      const x2 = c.getContext("2d");
      x2.drawImage(srcC, 0, 0);
      x2.globalCompositeOperation = "source-in";
      x2.fillStyle = color;
      x2.fillRect(0, 0, c.width, c.height);
      return c;
    }
    function sprite(inner, mid) {
      const c = makeLayer(256, 256);
      const x2 = c.getContext("2d");
      const g = x2.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, inner);
      g.addColorStop(0.5, mid);
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      x2.fillStyle = g;
      x2.fillRect(0, 0, 256, 256);
      return c;
    }
    const cloudTex = [cloudTexture(256, 90, 21, 0.56, 0.2), cloudTexture(320, 110, 22, 0.6, 0.2)];
    const decor = {}; // décor coloré, par thème
    function decorFor(themeName) {
      if (decor[themeName]) return decor[themeName];
      const theme = SCENE_THEMES[themeName];
      const col = [0, 0, 0];
      decor[themeName] = {
        clouds: cloudTex.map((tex, q) => ({
          dark: tinted(tex, theme.clouds[q]),
          lit: tinted(tex, theme.cloudLit),
          drift: q ? 9 : 4,
          height: q ? 0.42 : 0.55,
          alpha: q ? 0.95 : 0.8,
        })),
        storm: sprite(theme.storm[0], theme.storm[1]),
        aura: sprite(theme.aura[0], theme.aura[1]),
        feathers: feathers.map((f) => {
          paletteAt(theme, f.g, col);
          const m = theme.featherMix;
          const keep = 1 - m / 255;
          return `rgb(${Math.round(col[0] * keep + m)}, ${Math.round(col[1] * keep + m)}, ${Math.round(col[2] * keep + m)})`;
        }),
      };
      return decor[themeName];
    }

    // Calques de travail pour le tracé.
    let lines;
    let lctx;
    let white;
    let wctx;
    let tmp;
    let tctx;
    let tmp2;
    let bctx;
    let next = 0;
    let active = [];
    let introTheme = sceneTheme();

    function setupTrace() {
      lines = makeLayer(P.w, P.h);
      lctx = lines.getContext("2d");
      white = makeLayer(P.w, P.h);
      wctx = white.getContext("2d");
      tmp = makeLayer(P.w, P.h);
      tctx = tmp.getContext("2d");
      tmp2 = makeLayer(P.w, P.h);
      bctx = tmp2.getContext("2d");
      [lctx, wctx].forEach((c) => {
        c.lineWidth = Math.max(1, P.k);
        c.lineJoin = "round";
        c.lineCap = "round";
      });
      lctx.strokeStyle = "#fff";
      wctx.strokeStyle = SCENE_THEMES[introTheme].fresh;
    }

    function pulseAt() {
      let p = 0;
      for (let i = 0; i < P.strikes.length; i += 1) {
        const dd = t - P.strikes[i];
        if (dd >= 0) p += Math.exp(-Math.pow(dd / 0.13, 2));
      }
      return p;
    }
    function glowAt(theme, x, y, r, img, alpha) {
      if (alpha <= 0.002) return;
      ctx.globalCompositeOperation = theme.additive ? "lighter" : "source-over";
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.drawImage(img, x - r, y - r, 2 * r, 2 * r);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    // Dégradé linéaire le long d'un axe (ax, ay), entre les valeurs v0 et v1 de cet axe.
    function axisGradient(c2, ax, ay, cx, v0, v1, stops) {
      const n2 = ax * ax + ay * ay;
      const g = c2.createLinearGradient(cx + (ax * v0) / n2, (ay * v0) / n2, cx + (ax * v1) / n2, (ay * v1) / n2);
      for (let i = 0; i < stops.length; i += 1) g.addColorStop(i / (stops.length - 1), `rgba(0, 0, 0, ${stops[i].toFixed(3)})`);
      return g;
    }
    const BELL = [0, 0.04, 0.2, 0.61, 1, 0.61, 0.2, 0.04, 0];
    const EDGE = [1, 0.9, 0.5, 0.1, 0];

    function trace(dt) {
      while (next < P.segs.length && P.segs[next].start <= t) active.push(P.segs[next++]);
      wctx.globalCompositeOperation = "destination-out";
      wctx.fillStyle = `rgba(0, 0, 0, ${(1 - Math.exp(-dt / 1.5)).toFixed(4)})`;
      wctx.fillRect(0, 0, P.w, P.h);
      wctx.globalCompositeOperation = "source-over";
      const path = new Path2D();
      const heads = [];
      const keep = [];
      let drew = false;
      for (let i = 0; i < active.length; i += 1) {
        const s = active[i];
        const p = clamp01((t - s.start) / s.dur);
        const idx = Math.floor(easeInOut3(p) * (s.len - 1));
        if (idx > s.done) {
          path.moveTo(s.pts[s.done * 2], s.pts[s.done * 2 + 1]);
          for (let j = s.done + 1; j <= idx; j += 1) path.lineTo(s.pts[j * 2], s.pts[j * 2 + 1]);
          s.done = idx;
          drew = true;
        }
        if (p < 1) {
          heads.push(s.pts[idx * 2], s.pts[idx * 2 + 1]);
          keep.push(s);
        }
      }
      active = keep;
      if (drew) {
        lctx.stroke(path);
        wctx.stroke(path);
      }
      return heads;
    }

    function drawSky(theme, dec, lit, pulse) {
      const fadeIn = clamp01(t / 2.5);
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      theme.sky.forEach((c, i) => g.addColorStop([0, 0.45, 0.8, 1][i], c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      if (theme.stars) {
        for (let i = 0; i < stars.length; i += 1) {
          const s = stars[i];
          const tw2 = s.a * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph)) * fadeIn;
          ctx.globalAlpha = tw2;
          ctx.fillStyle = s.alt ? theme.stars[1] : theme.stars[0];
          ctx.beginPath();
          ctx.arc(s.x * cw, s.y * ch, s.r * sc, 0, 6.2832);
          ctx.fill();
          if (s.r > 1.05 && tw2 > 0.45) {
            // reflet en croix sur les plus brillantes
            const rr = s.r * sc * 4 * tw2;
            ctx.globalAlpha = tw2 * 0.5;
            ctx.fillRect(s.x * cw - rr, s.y * ch - 0.5 * sc, 2 * rr, sc);
            ctx.fillRect(s.x * cw - 0.5 * sc, s.y * ch - rr, sc, 2 * rr);
          }
        }
        ctx.globalAlpha = 1;
      }
      // Nuages d'orage, éclairés de l'intérieur par l'éclair.
      dec.clouds.forEach((cl, q) => {
        const litA = ((q ? 0.06 : 0.08) + (q ? 0.2 : 0.14) * lit + (q ? 0.6 : 0.45) * pulse) * fadeIn;
        const dh = ch * cl.height;
        const dw = ((dh * cl.dark.width) / cl.dark.height) * 1.6;
        const off = -((t * cl.drift * sc) % dw);
        for (let x = off; x < cw; x += dw) {
          ctx.globalAlpha = cl.alpha * fadeIn;
          ctx.drawImage(cl.dark, x, 0, dw + 1, dh);
          if (litA > 0.003) {
            ctx.globalCompositeOperation = theme.additive ? "lighter" : "source-over";
            ctx.globalAlpha = Math.min(1, litA * (theme.additive ? 1 : 0.5));
            ctx.drawImage(cl.lit, x, 0, dw + 1, dh);
            ctx.globalCompositeOperation = "source-over";
          }
        }
        ctx.globalAlpha = 1;
      });
      glowAt(theme, cw / 2, ch * 1.05, Math.max(cw, ch) * 0.55, dec.aura, 0.1 * fadeIn); // brume à l'horizon
      if (lit > 0) {
        const a = lit * (0.11 + 0.03 * Math.sin(t * 9.1) * Math.sin(t * 3.7)) + 0.2 * pulse;
        glowAt(theme, ox + P.bcx, P.bcy, Math.max(cw, ch) * 0.45, dec.storm, a * 1.15);
      }
      if (t > SCENE.fillStart) {
        const au = clamp01((t - SCENE.fillStart) / (SCENE.fillEnd - SCENE.fillStart));
        glowAt(theme, ox + P.w / 2, P.h * 0.6, Math.max(P.w, P.h) * 0.7, dec.aura, 0.17 * au);
      }
    }

    function drawFeathers(theme, dec, front) {
      const t0 = SCENE.fillStart - 2.5;
      const hCss = ch / sc;
      for (let i = 0; i < feathers.length; i += 1) {
        const f = feathers[i];
        const age = t - t0 - f.delay;
        if (f.front !== front || age <= 0 || (lite && !front)) continue;
        const s = f.size * (front ? 1 : 0.62) * sc;
        const span = hCss + 80;
        ctx.save();
        ctx.translate((f.x * (cw / sc) + Math.sin(t * f.swaySp + f.ph) * f.amp) * sc, (((age * f.speed * (front ? 1 : 0.7)) % span) - 40) * sc);
        ctx.rotate(f.rot + Math.sin(t * f.swaySp * 1.3 + f.ph) * 0.7);
        ctx.globalAlpha = clamp01(age) * (front ? 0.85 : 0.45) * (done ? 0.7 : 1);
        ctx.fillStyle = dec.feathers[i];
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.55, -s * 0.55, s * 0.42, s * 0.5, 0, s);
        ctx.bezierCurveTo(-s * 0.3, s * 0.45, -s * 0.36, -s * 0.5, 0, -s);
        ctx.fill();
        ctx.strokeStyle = theme.sky[2];
        ctx.lineWidth = Math.max(0.6, s * 0.06);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.8);
        ctx.quadraticCurveTo(s * 0.08, 0, 0, s * 1.3);
        ctx.moveTo(s * 0.03, s * 0.1);
        ctx.lineTo(s * 0.3, -s * 0.12);
        ctx.moveTo(s * 0.02, s * 0.45);
        ctx.lineTo(-s * 0.22, s * 0.2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    function drawRain(theme, fade) {
      const a = clamp01((t - 3.5) / 2.5) * fade;
      if (a <= 0 || lite) return;
      const wCss = cw / sc;
      const hCss = ch / sc;
      ctx.globalAlpha = 0.12 * a;
      ctx.strokeStyle = theme.rain;
      ctx.lineWidth = Math.max(1, sc * 0.8);
      ctx.beginPath();
      for (let i = 0; i < rain.length; i += 1) {
        const r = rain[i];
        const y = ((r.y * hCss + t * r.sp) % (hCss + 60)) - 30;
        const x = (r.x * 1.3 - 0.05) * wCss - y * 0.21;
        ctx.moveTo(x * sc, y * sc);
        ctx.lineTo((x - r.len * 0.21) * sc, (y + r.len) * sc);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawName(theme, fade) {
      // le nom se pose lettre par lettre, puis s'efface quand le vrai titre arrive
      const t0 = SCENE.strike + 0.35;
      if (!name || t < t0 || fade <= 0) return;
      const size = Math.max(24 * sc, Math.min(P.h * 0.07, cw * 0.11));
      const gap = size * 0.05;
      ctx.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
      ctx.textBaseline = "alphabetic";
      const ws = [];
      let total = 0;
      for (let i = 0; i < name.length; i += 1) {
        ws.push(ctx.measureText(name[i]).width);
        total += ws[i] + (i ? gap : 0);
      }
      const x0 = (cw - total) / 2;
      const y = Math.min(P.h * 0.925, ch - size * 0.6);
      const g = ctx.createLinearGradient(x0, 0, x0 + total, 0);
      const c = [0, 0, 0];
      for (let i = 0; i <= 3; i += 1) {
        paletteAt(theme, i / 3, c);
        g.addColorStop(i / 3, `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`);
      }
      const half = total * 0.62 * easeInOut3(clamp01((t - t0) / 0.9));
      ctx.strokeStyle = g;
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.7 * fade;
      ctx.lineWidth = Math.max(1, sc);
      ctx.beginPath();
      ctx.moveTo(cw / 2 - half, y + size * 0.34);
      ctx.lineTo(cw / 2 + half, y + size * 0.34);
      ctx.stroke();
      ctx.shadowColor = theme.nameShadow;
      ctx.shadowBlur = lite ? 0 : size * 0.28;
      for (let i = 0, x = x0; i < name.length; i += 1) {
        const lu = clamp01((t - t0 - 0.25 - i * 0.11) / 0.7);
        if (lu > 0) {
          ctx.globalAlpha = easeSine(lu) * fade;
          ctx.fillText(name[i], x, y + Math.pow(1 - lu, 3) * size * 0.28);
        }
        x += ws[i] + gap;
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
    }

    function draw(now, heroP) {
      if (!P) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) * SCENE.speed : 0;
      last = now;
      t += reduce ? 0 : dt;
      if (!done && t > 1 && t < 3) probe += 1;
      else if (t >= 3 && probe >= 0) {
        lite = probe < 2 * 28 * SCENE.speed; // moins de 28 images/s : mode allégé
        probe = -1;
      }
      // L'accueil apparaît au plus fort du dernier éclair (voir finalFlash plus bas).
      if (!done && t >= SCENE.end + 0.08) {
        done = true;
        onDone();
      }
      const themeName = done ? sceneTheme() : introTheme;
      const theme = SCENE_THEMES[themeName];
      const B = theme.additive ? "lighter" : "source-over";
      const dec = decorFor(themeName);
      const L = sceneLayers(P, themeName);
      const IL = P.segs.length ? sceneLayers(P, introTheme) : null; // calques du chargement
      // Après le chargement : l'éclair, la pluie et le nom s'effacent.
      const after = clamp01((t - SCENE.end) / SCENE.after);
      const keepBolt = IL && IL.core && t < SCENE.end + SCENE.after;
      const lit = keepBolt && t >= SCENE.strike ? 1 - after : 0;
      const pulse = keepBolt ? Math.min(1, pulseAt()) * (1 - after) : 0;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      drawSky(theme, dec, lit, pulse);
      drawFeathers(theme, dec, false);
      // En fond de l'accueil, l'ange recule un peu quand on commence à défiler.
      const zoom = 1 + heroP * 0.35;
      ctx.setTransform(zoom, 0, 0, zoom, ox + (P.w / 2) * (1 - zoom), (P.h * 0.55) * (1 - zoom));

      if (t < SCENE.fillEnd && IL) {
        const heads = trace(dt);
        const filling = t > SCENE.fillStart;
        let reveal;
        let front;
        tctx.globalCompositeOperation = "copy";
        tctx.drawImage(IL.tint, 0, 0);
        tctx.globalCompositeOperation = "destination-in";
        tctx.drawImage(lines, 0, 0);
        tctx.globalCompositeOperation = B;
        tctx.drawImage(white, 0, 0);
        if (filling) {
          // la couleur descend
          const u = (t - SCENE.fillStart) / (SCENE.fillEnd - SCENE.fillStart);
          front = -0.05 * P.w - 30 * P.k + (P.h + 0.1 * P.w + 110 * P.k) * u;
          reveal = axisGradient(tctx, -0.1, 1, P.w / 2, front - 44 * P.k, front, EDGE);
          tctx.globalCompositeOperation = "destination-out";
          tctx.fillStyle = reveal;
          tctx.fillRect(0, 0, P.w, P.h);
        }
        ctx.drawImage(tmp, 0, 0);
        if (filling) {
          tctx.globalCompositeOperation = "copy";
          tctx.drawImage(IL.fill, 0, 0);
          tctx.globalCompositeOperation = "destination-in";
          tctx.fillStyle = reveal;
          tctx.fillRect(0, 0, P.w, P.h);
          ctx.drawImage(tmp, 0, 0);
          tctx.globalCompositeOperation = "copy";
          tctx.drawImage(IL.solid, 0, 0);
          tctx.globalCompositeOperation = "destination-in";
          tctx.fillStyle = axisGradient(tctx, -0.1, 1, P.w / 2, front - 66 * P.k, front + 34 * P.k, BELL);
          tctx.fillRect(0, 0, P.w, P.h);
          ctx.globalCompositeOperation = B;
          ctx.globalAlpha = 0.55;
          ctx.drawImage(tmp, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
        }
        const k = P.k;
        ctx.globalCompositeOperation = B; // halo des pointes de tracé
        ctx.fillStyle = theme.heads;
        ctx.beginPath();
        for (let i = 0; i < heads.length; i += 2) {
          ctx.moveTo(heads[i] + 4.5 * k, heads[i + 1]);
          ctx.arc(heads[i], heads[i + 1], 4.5 * k, 0, 6.2832);
        }
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = theme.dot;
        ctx.beginPath();
        for (let i = 0; i < heads.length; i += 2) {
          ctx.moveTo(heads[i] + 1.3 * k, heads[i + 1]);
          ctx.arc(heads[i], heads[i + 1], 1.3 * k, 0, 6.2832);
        }
        ctx.fill();
      } else {
        // L'ange est complet : il flotte légèrement. En fond de l'accueil, il s'estompe un peu.
        const since = t - SCENE.fillEnd;
        const fl = clamp01(since / 1.5);
        ctx.save();
        ctx.translate(P.w / 2, P.h * 0.6 + Math.sin(since * 1.5) * 5 * P.k * fl);
        ctx.rotate(Math.sin(since * 1.1) * 0.012 * fl);
        ctx.translate(-P.w / 2, -P.h * 0.6);
        // Sur téléphone, le texte passe par-dessus l'ange : on l'estompe davantage.
        const rest = theme.rest * (window.innerWidth < 700 ? 0.6 : 1);
        const restAlpha = 1 - (1 - rest) * after;
        ctx.globalAlpha = restAlpha;
        ctx.drawImage(L.fill, 0, 0);
        // Reflet diagonal : une fois pendant le chargement, puis de temps en temps.
        const period = 9;
        const us = t < SCENE.end ? (t - SCENE.shimmerStart) / SCENE.shimmerDur : (((t - SCENE.end) % period) - (period - SCENE.shimmerDur)) / SCENE.shimmerDur;
        if (us > 0 && us < 1) {
          const pos = -90 * P.k + (0.55 * P.w + P.h + 180 * P.k) * easeSine(us);
          tctx = tctx || makeLayer(P.w, P.h).getContext("2d");
          tctx.globalCompositeOperation = "copy";
          tctx.drawImage(L.shimmer, 0, 0);
          tctx.globalCompositeOperation = "destination-in";
          tctx.fillStyle = axisGradient(tctx, 0.55, 1, 0, pos - 110 * P.k, pos + 110 * P.k, BELL);
          tctx.fillRect(0, 0, P.w, P.h);
          ctx.globalCompositeOperation = theme.additive ? "lighter" : "source-over";
          ctx.globalAlpha = Math.sqrt(Math.sin(Math.PI * us)) * (theme.additive ? 1 : 0.35) * restAlpha;
          ctx.drawImage(tmp || tctx.canvas, 0, 0);
        }
        ctx.restore();
      }

      if (IL && IL.core && t < SCENE.strike) {
        // avant la frappe : seul le contour de l'éclair
        bctx.globalCompositeOperation = "copy";
        bctx.drawImage(lines, 0, 0);
        bctx.globalCompositeOperation = "source-in";
        bctx.drawImage(IL.boltZone, 0, 0);
        bctx.globalCompositeOperation = "destination-in";
        bctx.drawImage(IL.boltZone, 0, 0);
        const pre = clamp01((t - (SCENE.strike - 0.9)) / 0.9); // le contour se charge juste avant de frapper
        ctx.globalCompositeOperation = B;
        ctx.globalAlpha = 0.55 + 0.45 * pre * (0.6 + 0.4 * Math.sin(t * 40));
        ctx.drawImage(tmp2, 0, 0);
        ctx.globalAlpha = 1;
      } else if (keepBolt) {
        // la frappe : l'intérieur s'allume d'un coup ; après le chargement, l'éclair s'éteint
        const since = t - SCENE.strike;
        // Juste avant l'arrivée de l'accueil, l'éclair se recharge et grésille, comme avant la
        // première frappe.
        const charge = clamp01((t - (SCENE.end - 0.9)) / 0.9) * (t < SCENE.end ? 1 : 0);
        const crackle = 1 + charge * (0.5 + 0.5 * Math.sin(t * 40));
        const power = (0.84 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 3.7)) * (1 - after) * crackle;
        const gl = power * 0.75 + pulse;
        ctx.globalCompositeOperation = B;
        ctx.globalAlpha = Math.min(1, gl);
        ctx.drawImage(IL.glow, 0, 0);
        if (gl > 1) {
          ctx.globalAlpha = Math.min(1, gl - 1);
          ctx.drawImage(IL.glow, 0, 0);
        }
        ctx.globalAlpha = Math.min(1, power + 0.3 * pulse);
        ctx.drawImage(IL.core, 0, 0);
        ctx.globalAlpha = 1;
        const sp = (0.55 + 0.45 * Math.sin(t * 23) * Math.sin(t * 7.3)) * (1 + 1.5 * Math.min(1, pulse)) * (1 - after);
        const k = P.k;
        const sg = ctx.createRadialGradient(P.tipX, P.tipY, 0, P.tipX, P.tipY, 30 * k); // étincelle à la pointe
        sg.addColorStop(0, `rgba(${theme.core.join(", ")}, ${Math.min(1, 0.75 * sp).toFixed(3)})`);
        sg.addColorStop(0.3, `rgba(${theme.glow.join(", ")}, ${Math.min(1, 0.3 * sp).toFixed(3)})`);
        sg.addColorStop(1, `rgba(${theme.glow.join(", ")}, 0)`);
        ctx.fillStyle = sg;
        ctx.fillRect(P.tipX - 30 * k, P.tipY - 30 * k, 60 * k, 60 * k);
        if (since < 0.6) {
          // éclair qui illumine toute la page
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const flash = Math.exp(-since / 0.09) * 0.55 + Math.exp(-Math.pow((since - 0.13) / 0.04, 2)) * 0.25 + Math.exp(-Math.pow((since - 0.3) / 0.05, 2)) * 0.15;
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = `rgba(${theme.flash}, ${(Math.min(0.7, flash) * (theme.additive ? 1 : 0.4)).toFixed(3)})`;
          ctx.fillRect(0, 0, cw, ch);
        }
        ctx.globalCompositeOperation = "source-over";
      }

      const fade = 1 - clamp01((t - SCENE.fillEnd) / 1.2); // scintillements
      if (fade > 0 && P.twinkles.length) {
        ctx.setTransform(zoom, 0, 0, zoom, ox + (P.w / 2) * (1 - zoom), (P.h * 0.55) * (1 - zoom));
        ctx.globalCompositeOperation = B;
        ctx.lineWidth = Math.max(1, P.k);
        for (let i = 0; i < P.twinkles.length; i += 1) {
          const tw = P.twinkles[i];
          if (t < tw.born) continue;
          const b = Math.pow(Math.sin(Math.PI * ((t - tw.born) / tw.period + tw.phase)), 2) * fade * clamp01((t - tw.born) * 3);
          if (b < 0.08) continue;
          const r = (1 + b * 1.7) * P.k;
          ctx.strokeStyle = `rgba(${theme.twinkle}, ${b.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(tw.x - r, tw.y);
          ctx.lineTo(tw.x + r, tw.y);
          ctx.moveTo(tw.x, tw.y - r);
          ctx.lineTo(tw.x, tw.y + r);
          ctx.stroke();
        }
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      drawRain(theme, 1 - after);
      drawName(theme, 1 - after);
      drawFeathers(theme, dec, true);

      // Dernier éclair : la lumière monte jusqu'à remplir tout l'écran. À ce moment, l'accueil
      // est mis en place dessous, puis le voile lumineux (.loader.is-flash) se retire.
      const finalSince = t - SCENE.end;
      if (P.strikes.length && !done && finalSince > -0.05) {
        ctx.fillStyle = `rgba(${theme.flashSolid}, ${clamp01((finalSince + 0.05) / 0.13).toFixed(3)})`;
        ctx.fillRect(0, 0, cw, ch);
      }
    }

    // Chargement des deux images (embarquées dans le fichier : marche aussi sans serveur).
    const img = new Image();
    const boltImg = new Image();
    let waiting = 2;
    const ready = () => {
      waiting -= 1;
      if (waiting) return;
      try {
        P = prepareScene(img, withIntro ? boltImg : null, withIntro);
        sc = P.scale;
        if (withIntro) setupTrace();
        fit();
      } catch (error) {
        // en cas de problème, on passe directement à l'accueil
        if (withIntro && !done) {
          done = true;
          onDone();
        }
      }
    };
    img.onload = ready;
    boltImg.onload = ready;
    img.onerror = boltImg.onerror = () => {
      if (!done) {
        done = true;
        onDone();
      }
    };
    img.src = art.src;
    boltImg.src = art.boltSrc;

    let resizeTimer2 = 0;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer2);
      resizeTimer2 = setTimeout(() => {
        // Après le chargement, on refait la mise en page de l'ange à la nouvelle taille.
        if (done && P) {
          P = prepareScene(img, null, false);
          sc = P.scale;
          tmp = null;
          tctx = null;
        }
        fit();
      }, 200);
    });

    return {
      draw,
      ready: () => Boolean(P),
      flashColor: () => `rgb(${SCENE_THEMES[sceneTheme()].flashSolid})`,
      // Échap pendant le chargement : on saute directement à la fin.
      skip() {
        if (!done) {
          t = SCENE.end;
        }
      },
    };
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
      if ((time - ripples[i].t) * RIPPLE_SPEED > ripples[i].reach) {
        ripples.splice(i, 1);
      }
    }
    const waves = ripples.map((ripple) => {
      const radius = (time - ripple.t) * RIPPLE_SPEED;
      const progress = radius / ripple.reach;
      // L'onde traverse tout l'écran : elle s'atténue un peu en route et s'éteint au bord.
      return { x: ripple.x, y: ripple.y, radius, life: (1 - 0.55 * progress) * Math.min(1, (1 - progress) * 8) };
    });

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
        // Les fils s'illuminent au passage de l'onde : sans cela on ne la verrait que près
        // du curseur, là où les fils sont déjà éclairés.
        let lit = f;
        for (const wave of waves) {
          const d = Math.hypot(x - wave.x, y - wave.y);
          const e = (d - wave.radius) / 70;
          const crest = Math.exp(-e * e);
          y += Math.sin((d - wave.radius) * 0.06) * 22 * wave.life * crest;
          lit = Math.max(lit, crest * (0.25 + 0.55 * wave.life));
        }

        if (!started) {
          base.moveTo(x, y);
          started = true;
        } else {
          base.lineTo(x, y);
        }
        if (lit > 0.09) {
          if (haloOn) {
            halo.lineTo(x, y);
          } else {
            halo.moveTo(x, y);
            haloOn = true;
          }
        } else {
          haloOn = false;
        }
        if (lit > 0.34) {
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

    // Scène de l'ange : en fond de l'accueil, elle s'efface quand on fait défiler.
    if (scene && sceneCanvas) {
      const loading = root.classList.contains("js-loading");
      const visible = loading ? 1 : 1 - heroP;
      sceneCanvas.style.opacity = visible.toFixed(3);
      if (visible > 0.001) {
        scene.draw(now, loading ? 0 : heroP);
      }
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

  // Intro d'ouverture : l'ange se dessine, l'éclair frappe, le nom s'écrit, puis l'accueil
  // apparaît par-dessus la scène, qui reste en fond (sans l'éclair).
  const loader = $(".loader");
  const scrollCue = $(".scroll-cue");
  function openSite() {
    root.classList.remove("js-loading");
    root.classList.add("is-ready");
    // L'indicateur de défilement apparaît quand le titre a fini de s'animer.
    setTimeout(() => scrollCue?.classList.add("is-shown"), reduce ? 0 : 2400);
  }

  const sceneCanvas = $(".scene");
  const withIntro = root.classList.contains("js-loading") && Boolean(loader);
  const scene = sceneCanvas
    ? createScene(sceneCanvas, withIntro, () => {
        try {
          sessionStorage.setItem("hakim-intro", "1");
        } catch (error) {
          /* stockage indisponible : l'intro se rejouera, sans gravité */
        }
        // Le flash couvre tout l'écran, l'accueil se met en place dessous, puis le flash
        // se retire en fondu.
        if (loader && scene) {
          loader.style.background = scene.flashColor();
          loader.classList.add("is-flash");
          loader.addEventListener("animationend", () => loader.classList.remove("is-flash"), { once: true });
        }
        openSite();
      })
    : null;
  if (withIntro) {
    // Pendant le chargement, le reste de la page n'est pas atteignable au clavier.
    $$("body > :not(.loader):not(.scene):not(script)").forEach((element) => {
      element.inert = true;
    });
    const release = new MutationObserver(() => {
      if (!root.classList.contains("js-loading")) {
        $$("body > *").forEach((element) => {
          element.inert = false;
        });
        release.disconnect();
      }
    });
    release.observe(root, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("js-loading")) {
        scene?.skip();
      }
    });
    if (!scene) {
      openSite();
    }
  } else {
    openSite();
  }

  requestAnimationFrame(frame);
})();

// Images de la scène d'ouverture : l'ange (aplats sombres sur fond blanc) et l'éclair,
// dessiné à part. Elles sont embarquées ici pour fonctionner aussi en ouvrant le fichier
// sans serveur. Une déclaration de fonction est disponible partout dans le fichier.
function sceneArt() {
  return (sceneArt.data ||= {
    focus: [0.61, 0.54], // point de départ du tracé (la tête)
    levels: [0.3, 0.7], // contraste : en dessous = fond, au-dessus = encre pleine
    boltSrc: "data:image/webp;base64,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O7PC5NpAO5eFNfEmkPwEnQEcrOQVV0cTlurUZ2C2I3iDTDypSQ1iYAswh0wMStWcJP7d/JdJxcyoD+1S/tV9hZVMHaAzgX/1IpPn6rThX6bv1+SFcbXi2ZpElav1gvY4cfUdOl9wtYZuTV5DrvYDtN8SU6+cp3HV5WqfQ7uFmHqpVE3+81ztXWiPKUzNnqTTi5j6UGgvWpma5W+dN4mpj4P2roOrbdGZSVz9rE5NrhaUqrmocLX60H5HXH2IzttsbaHO82wtTpNZhqsF3tNcULlaTZdmPXH13tC+z9Y+1olma7s1zvJcLTBLc9PC1V6B9hBx9d06c7naM25NTi2uthbaZcTUazg1rqe42tfQ/kRMPfyxJr8JV5sO7T5i6iXu63Tgam9D+6fK1GzXdfoSUx8I7ZUApqae0RlNTL07tCkOrjZTZypx9U0aTzW2dljzKJCrKRc1VxSuZkvRxBNXL5mh2crWKjs1S9haI2hnsrVOOhPY2kCdvmztXZ22bO1TnSFs7W2d7Hpc7Sm3BldLMzX6QgdHrUxN2aWDH5gaOU7rYDRTo8r3dE5wNVqmk1SMqXXz6qwlnl77MbRpNXla8fPQejsRT98M3anE00dDd5fC1HbpXCpBPD3EpcltSEx9KgB4ehJTD0nV9CKuPhUADhJXD0nVtGJrUwHgIHH1kFRNK7Y2EwAOElcv4dG0YmvNAOA0sfXmmo/5Wg/NW3ztLU0PvjZF05yvfQ7AWZ2vbQKQGcrXjgG4Z2drymUAlxW2Zr8H4Bix9bL5ALbytbA8AEv4Gi0G7tdjbDTks+r0//3vv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///vvvv//++++///7777///v8/igI=",
    src: "data:image/webp;base64,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",
  });
}
