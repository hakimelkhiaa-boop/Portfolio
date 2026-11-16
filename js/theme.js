// Bascule clair / sombre. Le thème mémorisé est déjà appliqué dans le <head> (pas de flash).
// Le changement se fait en « tache d'encre » : une éclaboussure jaillit du bouton et s'étale
// comme un liquide ; à l'intérieur de la tache, on voit déjà le site dans le nouveau thème.
const themeToggle = document.querySelector(".theme-toggle");

if (themeToggle) {
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const INK = { light: "#f6f5f1", dark: "#0a0907" };
  const DURATION = 2000; // durée de l'animation, en millisecondes
  let theme = root.dataset.theme === "light" ? "light" : "dark";
  let switching = false;

  function applyTheme(nextTheme) {
    theme = nextTheme;
    const isLight = theme === "light";

    root.dataset.theme = theme;
    // Le libellé visible annonce l'action : pas besoin d'un état « pressé » en plus.
    themeToggle.textContent = (window.tr || String)(isLight ? "Mode sombre" : "Mode clair");
    themeColor?.setAttribute("content", INK[theme]);
  }

  applyTheme(theme);

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------------------------------------------------------------- */
  /* Forme de l'éclaboussure (tirée au hasard à chaque clic)           */
  /* ---------------------------------------------------------------- */
  function buildSplat(x, y, width, height) {
    const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
    // Corps : un cœur et un second gros lobe décentré.
    const lobes = [{ angle: 0, distance: 0, size: 1, phase: 0 }];
    // Chaque lobe avance à son rythme : le contour se déforme pendant que l'encre coule.
    lobes.push({ angle: random(0, Math.PI * 2), distance: random(0.55, 0.72), size: random(0.5, 0.62), grow: random(1, 1.5), phase: random(0, 6) });
    for (let i = 0; i < 6; i += 1) {
      lobes.push({ angle: random(0, Math.PI * 2), distance: random(0.7, 0.9), size: random(0.24, 0.4), grow: random(0.7, 1.7), phase: random(0, 6) });
    }
    // Bourrelets : petites bosses tout autour, qui rendent le bord irrégulier et « coulant ».
    const bumps = Array.from({ length: 22 }, (_, index) => ({
      angle: ((index + random(-0.35, 0.35)) / 22) * Math.PI * 2,
      out: random(0, 0.2),
      size: random(0.05, 0.16),
      phase: random(0, 6),
    }));
    // Filets : des traînées projetées à l'impact, qui retombent et restent sur place
    // (l'encre du corps les recouvre ensuite). Elles s'effilent et lâchent une gouttelette.
    // Les filets partent surtout vers l'intérieur de l'écran (le bouton est dans un coin).
    const inward = Math.atan2(height / 2 - y, width / 2 - x);
    const arms = Array.from({ length: 11 }, (_, index) => ({
      angle: inward + ((index + random(-0.35, 0.35)) / 11 - 0.5) * Math.PI * 1.7,
      reach: reach * random(0.26, 0.5),
      width: reach * random(0.007, 0.014),
      bend: random(-0.28, 0.28),
      wave: random(-0.05, 0.05),
      drop: random(0.5, 0.9),
      gap: random(0.6, 2.2),
      delay: random(0, 0.04),
      round: false,
    }));
    // Coulures courtes et rondes entre les filets.
    const stubs = Array.from({ length: 14 }, () => ({
      angle: random(0, Math.PI * 2),
      reach: reach * random(0.2, 0.26),
      width: reach * random(0.012, 0.022),
      bend: random(-0.2, 0.2),
      wave: 0,
      drop: 0,
      gap: 0,
      delay: random(0.02, 0.08),
      round: true,
    }));
    // Gouttes projetées loin : elles partent du centre, retombent, puis la tache les rejoint.
    const drops = Array.from({ length: 12 }, () => ({
      angle: random(0, Math.PI * 2),
      distance: reach * random(0.26, 0.85),
      size: reach * random(0.008, 0.026),
      delay: random(0, 0.05),
      phase: random(0, 6),
    }));
    // Mouchetures : des petits points, plus denses près de l'impact.
    const count = Math.round(Math.min(180, (width * height) / 8000));
    const specks = Array.from({ length: count }, () => {
      const angle = random(0, Math.PI * 2);
      const distance = reach * (0.12 + Math.pow(Math.random(), 0.9) * 0.85);
      return {
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: 0.8 + Math.pow(Math.random(), 3) * 5,
        delay: 0.02 + (distance / reach) * 0.12 + random(0, 0.05),
      };
    });
    return { x, y, reach, lobes, bumps, arms, stubs, drops, specks };
  }

  // Instant de l'impact : jaillissement sec, puis étalement qui ralentit (comme un liquide).
  const IMPACT = 0.1;
  const HOLD = 0.3;
  const impactRadius = (splat) => splat.reach * 0.16;

  // État de la tache à l'instant t (0 → 1) : rayon et « métaballes » qui forment le corps.
  function inkState(splat, t, now) {
    const { x, y, reach } = splat;
    // 1) impact sec (0 → 10 %), 2) la tache se pose et frémit (10 → 30 %),
    // 3) elle s'étale vite puis de plus en plus lentement jusqu'à couvrir la page.
    const burst = easeOutBack(clamp01(t / IMPACT)) * 0.16 + clamp01((t - IMPACT) / (HOLD - IMPACT)) * 0.03;
    const spread = 1 - Math.pow(1 - clamp01((t - HOLD) / (1 - HOLD)), 2.2);
    const radius = reach * (burst + spread * 0.98);
    const balls = [];
    splat.lobes.forEach((lobe) => {
      const wobble = lobe.distance ? 1 + 0.05 * Math.sin(now * 0.005 + lobe.phase) : 1;
      const distance = radius * lobe.distance * (1 - 0.4 * spread);
      const size = radius * lobe.size * Math.pow(lobe.grow || 1, spread) * wobble;
      balls.push([x + Math.cos(lobe.angle) * distance, y + Math.sin(lobe.angle) * distance, size]);
    });
    splat.bumps.forEach((bump) => {
      const distance = radius * (0.92 + bump.out + 0.03 * Math.sin(now * 0.007 + bump.phase));
      balls.push([x + Math.cos(bump.angle) * distance, y + Math.sin(bump.angle) * distance, radius * bump.size]);
    });
    splat.drops.forEach((drop) => {
      // La goutte vole du centre jusqu'à son point de chute, puis s'élargit un peu en s'écrasant.
      const flight = easeOut(clamp01((t - drop.delay) / 0.2));
      if (flight > 0) {
        const landed = clamp01((t - drop.delay - 0.2) / 0.1);
        const size = drop.size * (0.6 + 0.4 * flight) * (1 + 0.35 * landed + spread * 2) * (1 + 0.05 * Math.sin(now * 0.008 + drop.phase));
        const distance = drop.distance * flight;
        balls.push([x + Math.cos(drop.angle) * distance, y + Math.sin(drop.angle) * distance, size]);
      }
    });
    return { radius, flood: spread, balls };
  }

  /* ---------------------------------------------------------------- */
  /* Tracé : contour liquide (métaballes) + filets + gouttelettes      */
  /* ---------------------------------------------------------------- */
  const fmt = (value) => Math.round(value * 10) / 10;
  // Cercle orienté dans le sens horaire (même sens que le reste : les formes s'additionnent).
  const circlePath = (cx, cy, r) =>
    `M${fmt(cx + r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx - r)} ${fmt(cy)}A${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(cx + r)} ${fmt(cy)}Z`;
  const polygonPath = (points) => {
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      area += ax * by - bx * ay;
    }
    const list = area < 0 ? points.slice().reverse() : points;
    return "M" + list.map(([px, py]) => `${fmt(px)} ${fmt(py)}`).join("L") + "Z";
  };

  // Contour du champ de métaballes (marching squares) : boucles fermées [x0, y0, x1, y1, …].
  function metaballContour(balls, width, height) {
    // Grille de calcul : une maille de 8 à 10 px suffit, le contour est interpolé entre les nœuds.
    const cell = Math.max(8, Math.round(Math.max(width, height) / 160));
    const nx = Math.ceil(width / cell) + 3;
    const ny = Math.ceil(height / cell) + 3;
    const count = balls.length;
    const bx = new Float32Array(count);
    const by = new Float32Array(count);
    const br2 = new Float32Array(count);
    balls.forEach(([cx, cy, r], k) => {
      bx[k] = cx;
      by[k] = cy;
      br2[k] = r * r;
    });
    const field = new Float32Array(nx * ny);
    for (let j = 1; j < ny - 1; j += 1) {
      const py = (j - 1) * cell;
      for (let i = 1; i < nx - 1; i += 1) {
        // La bordure reste à zéro : quand la page est couverte, le contour fait le tour de l'écran.
        const px = (i - 1) * cell;
        let sum = 0;
        for (let k = 0; k < count; k += 1) {
          const dx = px - bx[k];
          const dy = py - by[k];
          sum += br2[k] / (dx * dx + dy * dy + 1e-3);
          if (sum >= 4) {
            break; // largement à l'intérieur : inutile de continuer
          }
        }
        field[j * nx + i] = sum;
      }
    }

    // Arête n° k : 2 × (nœud de départ) + 0 pour l'horizontale, + 1 pour la verticale.
    const edges = 2 * nx * ny;
    const pointX = new Float32Array(edges);
    const pointY = new Float32Array(edges);
    const next = new Int32Array(edges).fill(-1);
    const starts = [];
    const setPoint = (key, i1, j1, i2, j2) => {
      const a = field[j1 * nx + i1];
      const t = Math.min(1, Math.max(0, (1 - a) / (field[j2 * nx + i2] - a)));
      pointX[key] = (i1 - 1 + (i2 - i1) * t) * cell;
      pointY[key] = (j1 - 1 + (j2 - j1) * t) * cell;
    };
    // Coins dans le sens horaire : haut-gauche, haut-droit, bas-droit, bas-gauche.
    const ci = [0, 1, 1, 0];
    const cj = [0, 0, 1, 1];
    const inside = [false, false, false, false];
    const keys = [0, 0, 0, 0];
    const eventKey = [0, 0, 0, 0];
    const eventExit = [false, false, false, false];
    for (let j = 0; j < ny - 1; j += 1) {
      for (let i = 0; i < nx - 1; i += 1) {
        const node = j * nx + i;
        inside[0] = field[node] >= 1;
        inside[1] = field[node + 1] >= 1;
        inside[2] = field[node + nx + 1] >= 1;
        inside[3] = field[node + nx] >= 1;
        if (inside[0] === inside[1] && inside[1] === inside[2] && inside[2] === inside[3]) {
          continue;
        }
        keys[0] = node * 2; // haut
        keys[1] = (node + 1) * 2 + 1; // droite
        keys[2] = (node + nx) * 2; // bas
        keys[3] = node * 2 + 1; // gauche
        let events = 0;
        for (let e = 0; e < 4; e += 1) {
          const f = (e + 1) % 4;
          if (inside[e] !== inside[f]) {
            setPoint(keys[e], i + ci[e], j + cj[e], i + ci[f], j + cj[f]);
            eventKey[events] = keys[e];
            eventExit[events] = inside[e];
            events += 1;
          }
        }
        // Chaque sortie rejoint l'entrée qui la précède : les zones pleines restent séparées.
        for (let e = 0; e < events; e += 1) {
          if (eventExit[e]) {
            next[eventKey[e]] = eventKey[(e - 1 + events) % events];
            starts.push(eventKey[e]);
          }
        }
      }
    }

    const loops = [];
    const seen = new Uint8Array(edges);
    starts.forEach((start) => {
      if (seen[start]) {
        return;
      }
      const loop = [];
      let key = start;
      while (key >= 0 && !seen[key]) {
        seen[key] = 1;
        loop.push(pointX[key], pointY[key]);
        key = next[key];
      }
      if (loop.length > 4) {
        loops.push(loop);
      }
    });
    return loops;
  }

  // Filet d'encre : un ruban légèrement courbe, large à la base, qui s'effile jusqu'à une pointe
  // fine (ou s'arrondit pour une coulure courte), avec une gouttelette détachée au bout.
  function armPath(cx, cy, arm, start, end) {
    const length = end - start;
    if (length < 3) {
      return "";
    }
    const cos = Math.cos(arm.angle);
    const sin = Math.sin(arm.angle);
    const STEPS = 12;
    const center = [];
    for (let k = 0; k <= STEPS; k += 1) {
      const s = k / STEPS;
      const along = start + length * s;
      // La courbure dépend de la distance au centre : le filet ne « tourne » pas quand il raccourcit.
      // Courbe douce + petite ondulation : un filet d'encre n'est jamais rectiligne.
      const side = arm.bend * (along * along) / (arm.reach * 2.2) + arm.wave * arm.reach * Math.sin((along / arm.reach) * Math.PI * 2.4);
      center.push([cx + cos * along - sin * side, cy + sin * along + cos * side]);
    }
    const thickness = arm.width * Math.min(1, length / (arm.width * 3));
    const left = [];
    const right = [];
    for (let k = 0; k <= STEPS; k += 1) {
      const s = k / STEPS;
      const [px, py] = center[k];
      const [ax, ay] = center[Math.max(0, k - 1)];
      const [bx, by] = center[Math.min(STEPS, k + 1)];
      const tx = bx - ax;
      const ty = by - ay;
      const norm = Math.hypot(tx, ty) || 1;
      const half = arm.round
        ? thickness * (0.62 + 0.38 * Math.pow(1 - s, 1.5))
        : thickness * (0.24 + 0.76 * Math.pow(1 - s, 1.4) + 0.2 * Math.pow(s, 6));
      left.push([px - (ty / norm) * half, py + (tx / norm) * half]);
      right.push([px + (ty / norm) * half, py - (tx / norm) * half]);
    }
    const [ex, ey] = center[STEPS];
    let d = polygonPath(left.concat(right.reverse()));
    if (arm.round) {
      d += circlePath(ex, ey, thickness * 0.62);
    } else if (arm.drop) {
      // Bout du filet gonflé en goutte, et une gouttelette détachée un peu plus loin.
      d += circlePath(ex, ey, thickness * 0.5);
      const at = end + arm.width * (1.2 + arm.gap);
      const side = arm.bend * (at * at) / (arm.reach * 2.2) + arm.wave * arm.reach * Math.sin((at / arm.reach) * Math.PI * 2.4);
      d += circlePath(cx + cos * at - sin * side, cy + sin * at + cos * side, arm.width * arm.drop * 0.7);
    }
    return d;
  }

  function inkShape(splat, t, now, width, height) {
    const { x, y } = splat;
    const state = inkState(splat, t, now);
    const { radius, flood } = state;
    // Un seul sens pour toutes les boucles du contour (les trous éventuels gardent le sens inverse).
    const loops = metaballContour(state.balls, width, height);
    let area = 0;
    loops.forEach((loop) => {
      const n = loop.length;
      for (let i = 0; i < n; i += 2) {
        area += loop[i] * loop[(i + 3) % n] - loop[(i + 2) % n] * loop[i + 1];
      }
    });
    const flip = area < 0;
    const parts = [];
    loops.forEach((loop) => {
      const n = loop.length / 2;
      let text = "M";
      for (let k = 0; k < n; k += 1) {
        const index = (flip ? n - 1 - k : k) * 2;
        text += (k ? "L" : "") + Math.round(loop[index]) + " " + Math.round(loop[index + 1]);
      }
      parts.push(text + "Z");
    });

    if (flood < 0.98) {
      // Bord réel de la tache dans une direction (les gouttes fusionnées l'élargissent).
      const fieldAt = (px, py) => {
        let sum = 0;
        state.balls.forEach(([bx, by, br]) => {
          const dx = px - bx;
          const dy = py - by;
          sum += (br * br) / (dx * dx + dy * dy + 1e-3);
        });
        return sum;
      };
      const edgeAlong = (cos, sin) => {
        let distance = radius * 0.5;
        const stepSize = Math.max(2, radius * 0.04);
        while (distance < radius * 3 && fieldAt(x + cos * distance, y + sin * distance) >= 1) {
          distance += stepSize;
        }
        return distance;
      };
      // Les filets jaillissent à l'impact puis restent posés : leur pointe ne bouge plus et
      // le corps de la tache, en s'étalant, les recouvre petit à petit.
      const drawArm = (arm) => {
        const shot = easeOut(clamp01((t - arm.delay) / 0.14));
        const tip = impactRadius(splat) * 0.7 + (arm.reach - impactRadius(splat) * 0.7) * shot;
        const edge = edgeAlong(Math.cos(arm.angle), Math.sin(arm.angle));
        if (shot > 0 && tip > edge - arm.width) {
          parts.push(armPath(x, y, arm, Math.max(edge - arm.width * 2, 0), tip));
        }
      };
      splat.arms.forEach(drawArm);
      splat.stubs.forEach(drawArm);
      splat.specks.forEach((speck) => {
        const pop = clamp01((t - speck.delay) / 0.06);
        if (pop > 0) {
          parts.push(circlePath(speck.x, speck.y, speck.size * pop * (1 + flood * 1.5)));
        }
      });
    }
    return parts.join("");
  }

  /* ---------------------------------------------------------------- */
  /* Version principale : l'encre « découpe » le nouveau thème          */
  /* ---------------------------------------------------------------- */
  // Le navigateur photographie la page avant/après (View Transitions). La photo « après »
  // n'est visible qu'à l'intérieur de la tache : on voit donc le vrai site dans l'encre.
  let transitionStyle = null;
  function viewTransitionSwitch(nextTheme) {
    if (!transitionStyle) {
      transitionStyle = document.createElement("style");
      transitionStyle.textContent = `
        ::view-transition-old(root), ::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
        ::view-transition-old(root) { z-index: 1; }
        ::view-transition-new(root) { z-index: 2; clip-path: inset(0 0 100% 0); }
      `;
      document.head.append(transitionStyle);
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const rect = themeToggle.getBoundingClientRect();
    const splat = buildSplat(rect.left + rect.width / 2, rect.top + rect.height / 2, width, height);
    const clip = (d) => (d ? `path(nonzero, "${d}")` : "inset(0 0 100% 0)");

    switching = true;
    const transition = document.startViewTransition(() => applyTheme(nextTheme));
    transition.ready
      .then(() => {
        const first = clip(inkShape(splat, 0, performance.now(), width, height));
        const animation = root.animate(
          { clipPath: [first, first] },
          { duration: DURATION + 1000, fill: "forwards", pseudoElement: "::view-transition-new(root)" },
        );
        const startedAt = performance.now();
        const step = (now) => {
          const t = clamp01((now - startedAt) / DURATION);
          if (t >= 1) {
            animation.finish();
            return;
          }
          const shape = clip(inkShape(splat, t, now, width, height));
          animation.effect.setKeyframes({ clipPath: [shape, shape] });
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      })
      .catch(() => {});
    transition.finished.finally(() => {
      switching = false;
    });
  }

  /* ---------------------------------------------------------------- */
  /* Navigateurs plus anciens : la tache est peinte en aplat           */
  /* ---------------------------------------------------------------- */
  let layer = null;
  function canvasSwitch(nextTheme) {
    if (!layer) {
      layer = document.createElement("canvas");
      layer.setAttribute("aria-hidden", "true");
      layer.style.cssText =
        "position:fixed;inset:0;z-index:400;width:100%;height:100%;pointer-events:none;transition:opacity .45s ease";
      document.body.append(layer);
    }
    const width = window.innerWidth;
    const height = window.innerHeight;
    const density = Math.min(2, window.devicePixelRatio || 1);
    const rect = themeToggle.getBoundingClientRect();
    const splat = buildSplat(rect.left + rect.width / 2, rect.top + rect.height / 2, width, height);
    const context = layer.getContext("2d");
    layer.width = Math.round(width * density);
    layer.height = Math.round(height * density);
    layer.style.opacity = "1";
    layer.hidden = false;
    context.setTransform(density, 0, 0, density, 0, 0);
    context.fillStyle = INK[nextTheme];
    switching = true;

    const startedAt = performance.now();
    const step = (now) => {
      const t = clamp01((now - startedAt) / DURATION);
      context.clearRect(0, 0, width, height);
      if (t < 1) {
        context.fill(new Path2D(inkShape(splat, t, now, width, height)), "nonzero");
        requestAnimationFrame(step);
        return;
      }
      // Page recouverte : on change le thème dessous, puis l'encre s'efface.
      context.fillRect(0, 0, width, height);
      applyTheme(nextTheme);
      requestAnimationFrame(() => {
        layer.style.opacity = "0";
        setTimeout(() => {
          layer.hidden = true;
          switching = false;
        }, 470);
      });
    };
    requestAnimationFrame(step);
  }

  themeToggle.addEventListener("click", () => {
    if (switching) {
      return;
    }
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (reduceMotion.matches) {
      applyTheme(nextTheme);
    } else if (document.startViewTransition && CSS.supports("clip-path", 'path(nonzero, "M0 0L1 0L1 1Z")')) {
      viewTransitionSwitch(nextTheme);
    } else {
      canvasSwitch(nextTheme);
    }

    try {
      localStorage.setItem("portfolio-theme", nextTheme);
    } catch {}
  });
}
