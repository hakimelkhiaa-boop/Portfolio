// Bascule clair / sombre. Le thème mémorisé est déjà appliqué dans le <head> (pas de flash).
// Le changement se fait en « tache d'encre » : une éclaboussure jaillit du bouton et s'étale
// comme un liquide ; à l'intérieur de la tache, on voit déjà le site dans le nouveau thème.
const themeToggle = document.querySelector(".theme-toggle");

if (themeToggle) {
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const INK = { light: "#f6f5f1", dark: "#0a0907" };
  const DURATION = 1700; // durée de l'étalement, en millisecondes
  const GOO_SCALE = 0.5; // le calque liquide est calculé en demi-résolution (plus rapide)
  const GOO_BLUR = 6; // flou avant seuil : plus il est fort, plus les gouttes fusionnent
  let theme = root.dataset.theme === "light" ? "light" : "dark";
  let switching = false;
  let layer = null;

  function applyTheme(nextTheme) {
    theme = nextTheme;
    const isLight = theme === "light";

    root.dataset.theme = theme;
    // Le libellé visible annonce l'action : pas besoin d'un état « pressé » en plus.
    themeToggle.textContent = isLight ? "Mode sombre" : "Mode clair";
    themeColor?.setAttribute("content", INK[theme]);
  }

  applyTheme(theme);

  /* ---------------------------------------------------------------- */
  /* Calque d'encre : créé au premier clic, réutilisé ensuite          */
  /* ---------------------------------------------------------------- */
  function buildLayer() {
    const style = document.createElement("style");
    style.textContent = `
      .ink { position: fixed; inset: 0; z-index: 400; overflow: hidden; pointer-events: none; opacity: 1; }
      .ink[hidden] { display: none; }
      .ink.is-leaving { opacity: 0; transition: opacity 0.45s ease; }
      .ink canvas { position: absolute; top: 0; left: 0; display: block; }
      .ink__goo, .ink__crisp { width: 100%; height: 100%; }
    `;
    document.head.append(style);

    const element = document.createElement("div");
    element.className = "ink";
    element.hidden = true;
    element.setAttribute("aria-hidden", "true");
    element.innerHTML = `<canvas class="ink__goo"></canvas><canvas class="ink__crisp"></canvas>`;
    document.body.append(element);
    // Effet liquide : les formes sont floutées sur un calque caché, puis on ne garde que les
    // pixels assez opaques (seuil). Les gouttes proches fusionnent ainsi comme de l'encre.
    const blurCanvas = document.createElement("canvas");
    return {
      element,
      goo: element.querySelector(".ink__goo"),
      crisp: element.querySelector(".ink__crisp"),
      blur: blurCanvas,
      blurContext: blurCanvas.getContext("2d", { willReadFrequently: true }),
    };
  }

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Tire au hasard la forme de l'éclaboussure : elle est différente à chaque clic.
  function buildSplat(x, y, width, height) {
    const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
    // Corps de la tache : un cœur, un second gros lobe décentré, des bosses sur le pourtour.
    const lobes = [{ angle: 0, distance: 0, size: 1, phase: 0 }];
    lobes.push({ angle: random(0, Math.PI * 2), distance: random(0.62, 0.8), size: random(0.52, 0.66), phase: random(0, 6) });
    for (let i = 0; i < 9; i += 1) {
      lobes.push({ angle: random(0, Math.PI * 2), distance: random(0.72, 0.98), size: random(0.2, 0.42), phase: random(0, 6) });
    }
    // Giclures fines qui rayonnent autour du corps.
    const spikes = Array.from({ length: 84 }, () => ({
      angle: random(0, Math.PI * 2),
      length: 0.1 + Math.pow(Math.random(), 2.2) * 0.62,
      width: random(0.012, 0.045),
      bead: Math.random() < 0.45 ? random(0.012, 0.03) : 0,
    }));
    // Grosses gouttes retombées à distance : elles grossissent puis rejoignent la tache.
    const drops = Array.from({ length: 16 }, () => {
      const angle = random(0, Math.PI * 2);
      const distance = reach * random(0.22, 0.95);
      return {
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: reach * random(0.012, 0.045),
        delay: random(0.04, 0.3),
        phase: random(0, 6),
      };
    });
    // Mouchetures : des centaines de points minuscules, plus denses près de l'impact.
    const count = Math.round(Math.min(420, (width * height) / 3600));
    const specks = Array.from({ length: count }, () => {
      const angle = random(0, Math.PI * 2);
      const distance = reach * Math.pow(Math.random(), 0.75) * 1.05;
      return {
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        size: 0.6 + Math.pow(Math.random(), 3) * 4.2,
        delay: 0.03 + (distance / reach) * 0.22 + random(0, 0.08),
      };
    });
    return { x, y, reach, lobes, spikes, drops, specks };
  }

  /* ---------------------------------------------------------------- */
  /* Version principale : l'encre « découpe » le nouveau thème          */
  /* ---------------------------------------------------------------- */
  // Le navigateur photographie la page avant/après (View Transitions). La photo « après »
  // n'est visible qu'à l'intérieur de la tache : on voit donc le vrai site dans l'encre.
  // La tache est un champ de « métaballes » (les gouttes proches fusionnent comme un
  // liquide), dont on trace le contour (marching squares) pour en faire un clip-path.

  function inkState(splat, t, now) {
    const { x, y, reach } = splat;
    const burst = easeOutBack(clamp01(t / 0.2)) * 0.19;
    const creep = clamp01((t - 0.2) / 0.34) * 0.05;
    const flood = easeInOut(clamp01((t - 0.5) / 0.5));
    const radius = reach * (burst + creep + flood * 1.0);
    const balls = [];
    splat.lobes.forEach((lobe) => {
      const wobble = 1 + 0.07 * Math.sin(now * 0.006 + lobe.phase);
      const distance = radius * lobe.distance * (1 - flood * 0.5);
      const size = radius * (lobe.size + (1 - lobe.size) * flood * 0.6) * (lobe.distance ? wobble : 1);
      balls.push([x + Math.cos(lobe.angle) * distance, y + Math.sin(lobe.angle) * distance, size]);
    });
    splat.drops.forEach((drop) => {
      const pop = easeOutBack(clamp01((t - drop.delay) / 0.14));
      if (pop > 0) {
        const size = drop.size * pop * (1 + flood * 7) * (1 + 0.08 * Math.sin(now * 0.008 + drop.phase));
        balls.push([drop.x, drop.y, size]);
      }
    });
    return { radius, flood, spikeGrow: clamp01(t / 0.16), balls };
  }

  const fmt = (value) => Math.round(value * 10) / 10;
  // Cercle orienté dans le sens horaire (même sens que le contour : les formes s'additionnent).
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

  // Contour du champ de métaballes : renvoie des boucles fermées, sens horaire.
  function metaballContour(balls, width, height) {
    // Grille de calcul : une maille de 8 à 10 px suffit, le contour est interpolé entre les nœuds.
    const cell = Math.max(8, Math.round(Math.max(width, height) / 160));
    const count = balls.length;
    const bx = new Float32Array(count);
    const by = new Float32Array(count);
    const br2 = new Float32Array(count);
    balls.forEach(([cx, cy, r], k) => {
      bx[k] = cx;
      by[k] = cy;
      br2[k] = r * r;
    });
    const nx = Math.ceil(width / cell) + 3;
    const ny = Math.ceil(height / cell) + 3;
    const field = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j += 1) {
      const py = (j - 1) * cell;
      for (let i = 0; i < nx; i += 1) {
        // Bordure forcée à zéro : quand la page est couverte, le contour fait le tour de l'écran.
        if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) {
          continue;
        }
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

    // Point de passage sur une arête (interpolé là où le champ vaut exactement 1).
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

  function inkPath(splat, t, now, width, height) {
    const { x, y } = splat;
    const state = inkState(splat, t, now);
    const { radius, flood, spikeGrow } = state;
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
    let d = parts.join("");

    // Bord réel de la tache dans une direction : les gouttes fusionnées la rendent plus large
    // que son rayon, donc on le cherche en avançant le long du rayon.
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

    if (flood < 0.98) {
      splat.spikes.forEach((spike) => {
        const cos = Math.cos(spike.angle);
        const sin = Math.sin(spike.angle);
        const edge = edgeAlong(cos, sin);
        const base = edge - radius * 0.12;
        const tip = edge + radius * spike.length * spikeGrow * (1 - flood * 0.7);
        const half = radius * spike.width;
        d += polygonPath([
          [x + cos * base - sin * half, y + sin * base + cos * half],
          [x + cos * tip, y + sin * tip],
          [x + cos * base + sin * half, y + sin * base - cos * half],
        ]);
        if (spike.bead) {
          const beadAt = tip + radius * 0.035;
          d += circlePath(x + cos * beadAt, y + sin * beadAt, Math.max(0.5, radius * spike.bead * spikeGrow));
        }
      });
      splat.specks.forEach((speck) => {
        const pop = clamp01((t - speck.delay) / 0.06);
        if (pop > 0) {
          d += circlePath(speck.x, speck.y, speck.size * pop * (1 + flood * 2.5));
        }
      });
    }
    return d ? `path(nonzero, "${d}")` : "inset(0 0 100% 0)";
  }

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

    switching = true;
    const transition = document.startViewTransition(() => applyTheme(nextTheme));
    transition.ready
      .then(() => {
        const first = inkPath(splat, 0, performance.now(), width, height);
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
          const shape = inkPath(splat, t, now, width, height);
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

  // Seuil appliqué au calque flouté : opaque au-dessus de 50 %, avec une marge douce
  // de quelques niveaux pour garder des bords lissés.
  function threshold(source, target, rgb) {
    const image = source.getImageData(0, 0, source.canvas.width, source.canvas.height);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = (data[i + 3] - 118) * 14;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = alpha < 0 ? 0 : alpha > 255 ? 255 : alpha;
    }
    target.putImageData(image, 0, 0);
  }

  function drawSplat(splat, t, now, gooContext, crispContext, width, height, color) {
    const { x, y, reach } = splat;
    // Trois temps : l'impact (jaillissement), une lente coulée, puis l'inondation de la page.
    const burst = easeOutBack(clamp01(t / 0.2)) * 0.19;
    const creep = clamp01((t - 0.2) / 0.34) * 0.05;
    const flood = easeInOut(clamp01((t - 0.5) / 0.5));
    const radius = reach * (burst + creep + flood * 1.0);

    const blurContext = layer.blurContext;
    blurContext.setTransform(1, 0, 0, 1, 0, 0);
    blurContext.filter = "none";
    blurContext.clearRect(0, 0, layer.blur.width, layer.blur.height);
    blurContext.filter = `blur(${GOO_BLUR}px)`;
    blurContext.setTransform(GOO_SCALE, 0, 0, GOO_SCALE, 0, 0);
    blurContext.fillStyle = color;
    blurContext.beginPath();
    const gooPath = blurContext;
    splat.lobes.forEach((lobe) => {
      // Les lobes ondulent légèrement : c'est ce qui donne l'impression de liquide.
      const wobble = 1 + 0.07 * Math.sin(now * 0.006 + lobe.phase);
      const distance = radius * lobe.distance * (1 - flood * 0.5);
      const cx = x + Math.cos(lobe.angle) * distance;
      const cy = y + Math.sin(lobe.angle) * distance;
      const size = radius * (lobe.size + (1 - lobe.size) * flood * 0.6) * (lobe.distance ? wobble : 1);
      gooPath.moveTo(cx + size, cy);
      gooPath.arc(cx, cy, size, 0, Math.PI * 2);
    });
    splat.drops.forEach((drop) => {
      const pop = easeOutBack(clamp01((t - drop.delay) / 0.14));
      if (pop <= 0) {
        return;
      }
      const size = drop.size * pop * (1 + flood * 7) * (1 + 0.08 * Math.sin(now * 0.008 + drop.phase));
      gooPath.moveTo(drop.x + size, drop.y);
      gooPath.arc(drop.x, drop.y, size, 0, Math.PI * 2);
    });
    gooPath.fill();
    threshold(blurContext, gooContext, splat.rgb);

    // Détails nets (hors filtre) : giclures et mouchetures.
    crispContext.clearRect(0, 0, width, height);
    crispContext.fillStyle = color;
    crispContext.beginPath();
    const spikeGrow = clamp01(t / 0.16);
    splat.spikes.forEach((spike) => {
      const cos = Math.cos(spike.angle);
      const sin = Math.sin(spike.angle);
      const base = radius * 0.86;
      const tip = radius * (1 + spike.length * spikeGrow * (1 - flood * 0.7));
      const half = radius * spike.width;
      crispContext.moveTo(x + cos * base - sin * half, y + sin * base + cos * half);
      crispContext.lineTo(x + cos * tip, y + sin * tip);
      crispContext.lineTo(x + cos * base + sin * half, y + sin * base - cos * half);
      if (spike.bead) {
        const beadAt = tip + radius * 0.035;
        const beadSize = radius * spike.bead * spikeGrow;
        crispContext.moveTo(x + cos * beadAt + beadSize, y + sin * beadAt);
        crispContext.arc(x + cos * beadAt, y + sin * beadAt, beadSize, 0, Math.PI * 2);
      }
    });
    splat.specks.forEach((speck) => {
      const pop = clamp01((t - speck.delay) / 0.06);
      if (pop <= 0) {
        return;
      }
      const size = speck.size * pop * (1 + flood * 2.5);
      crispContext.moveTo(speck.x + size, speck.y);
      crispContext.arc(speck.x, speck.y, size, 0, Math.PI * 2);
    });
    crispContext.fill();
  }

  function inkSwitch(nextTheme) {
    layer = layer || buildLayer();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const density = Math.min(2, window.devicePixelRatio || 1);
    const rect = themeToggle.getBoundingClientRect();
    const splat = buildSplat(rect.left + rect.width / 2, rect.top + rect.height / 2, width, height);
    const color = INK[nextTheme];
    const gooContext = layer.goo.getContext("2d");
    const crispContext = layer.crisp.getContext("2d");

    layer.goo.width = layer.blur.width = Math.ceil(width * GOO_SCALE);
    layer.goo.height = layer.blur.height = Math.ceil(height * GOO_SCALE);
    const hex = color.slice(1);
    splat.rgb = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
    layer.crisp.width = Math.round(width * density);
    layer.crisp.height = Math.round(height * density);
    crispContext.setTransform(density, 0, 0, density, 0, 0);
    layer.element.classList.remove("is-leaving");
    layer.element.hidden = false;
    switching = true;

    const startedAt = performance.now();
    const step = (now) => {
      const t = clamp01((now - startedAt) / DURATION);
      drawSplat(splat, t, now, gooContext, crispContext, width, height, color);
      if (t < 1) {
        requestAnimationFrame(step);
        return;
      }
      // La page est entièrement recouverte : on change le thème dessous, puis l'encre s'efface.
      gooContext.fillStyle = color;
      gooContext.fillRect(0, 0, layer.goo.width, layer.goo.height);
      applyTheme(nextTheme);
      requestAnimationFrame(() => {
        layer.element.classList.add("is-leaving");
        setTimeout(() => {
          layer.element.hidden = true;
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
      // Navigateurs plus anciens : la tache est peinte en aplat, puis le thème change.
      inkSwitch(nextTheme);
    }

    try {
      localStorage.setItem("portfolio-theme", nextTheme);
    } catch {}
  });
}
