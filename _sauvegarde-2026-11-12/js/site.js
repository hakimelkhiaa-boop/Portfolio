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
    }
  });

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

  function layoutProjects() {
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

  /* Curseur : un anneau qui suit la souris, « VOIR » sur les projets. */
  const cursor = $(".cursor");
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let cursorTargetX = cursorX;
  let cursorTargetY = cursorY;

  if (cursor && fine && !reduce) {
    const label = $("span", cursor);
    window.addEventListener("pointermove", (event) => {
      cursorTargetX = event.clientX;
      cursorTargetY = event.clientY;
      cursor.classList.add("is-on");
    });
    window.addEventListener("pointerover", (event) => {
      const element = event.target instanceof Element ? event.target : null;
      const onCard = element?.closest(".project:not(.project--expanded)");
      const onZoom = element?.closest('.project--expanded .project__photo[data-gallery-position="current"] img');
      cursor.classList.toggle("is-view", Boolean(onCard || onZoom));
      label.textContent = onZoom ? "ZOOM" : onCard ? "VOIR" : "";
    });
    document.addEventListener("mouseleave", () => cursor.classList.remove("is-on"));
  }

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
  let baseAlpha = 0.11;

  function readColors() {
    accent = getComputedStyle(root).getPropertyValue("--accent").trim() || accent;
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

    // Grand anneau doré de l'accueil : on le traverse en défilant.
    if (heroP < 0.999) {
      const cx = W / 2;
      const cy = H / 2;
      const radius = lerp(Math.min(W, H) * 0.3, Math.max(W, H) * 0.95, p);
      const alpha = 1 - heroP;
      context.save();
      context.globalAlpha = alpha * 0.85;
      context.strokeStyle = accent;
      context.lineWidth = 1.2;
      context.shadowColor = accent;
      context.shadowBlur = 22;
      context.beginPath();
      context.arc(cx, cy, radius, 0, Math.PI * 2);
      context.stroke();
      context.shadowBlur = 0;
      context.globalAlpha = alpha * 0.35;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
      context.stroke();
      // Un arc plus épais qui tourne, terminé par un point lumineux.
      const angle = time * 0.00035;
      context.globalAlpha = alpha;
      context.lineWidth = 2.4;
      context.beginPath();
      context.arc(cx, cy, radius, angle, angle + 0.85);
      context.stroke();
      context.fillStyle = accent;
      context.beginPath();
      context.arc(cx + radius * Math.cos(angle + 0.85), cy + radius * Math.sin(angle + 0.85), 4, 0, Math.PI * 2);
      context.fill();
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
        const stickyTop = parseFloat(getComputedStyle(card).top) || 0;
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

    // Curseur.
    if (cursor && fine && !reduce) {
      cursorX = lerp(cursorX, cursorTargetX, 0.2);
      cursorY = lerp(cursorY, cursorTargetY, 0.2);
      cursor.style.transform = `translate(${cursorX.toFixed(1)}px, ${cursorY.toFixed(1)}px)`;
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

  // Intro d'ouverture : une alvéole se dessine, puis on zoome dedans.
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
      const t = clamp((now - startedAt) / 2100, 0, 1);
      const value = ease(t);
      count.textContent = String(Math.round(value * 100)).padStart(3, "0");
      loader.style.setProperty("--lp", value.toFixed(3));
      if (t < 1 || !loaded) {
        requestAnimationFrame(step);
        return;
      }
      loader.classList.add("is-done");
      try {
        sessionStorage.setItem("hakim-intro", "1");
      } catch (error) {
        /* stockage indisponible : l'intro se rejouera, sans gravité */
      }
      setTimeout(openSite, 700);
    };
    requestAnimationFrame(step);
  } else {
    openSite();
  }

  requestAnimationFrame(frame);
})();