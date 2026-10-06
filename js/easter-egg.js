(() => {
  const sequences = ["hakim", "cancel"];
  const storageKey = "portfolio-easter-egg";
  const root = document.documentElement;
  const progress = new Map(sequences.map((sequence) => [sequence, 0]));

  try {
    if (localStorage.getItem(storageKey) === "true") {
      root.dataset.easterEgg = "true";
    }
  } catch (error) {
    console.warn("Impossible de restaurer l’easter egg depuis le stockage local.", error);
  }

  function setEasterEggEnabled(enabled) {
    if (enabled) {
      root.dataset.easterEgg = "true";
    } else {
      delete root.dataset.easterEgg;
      document.querySelector(".easter-egg-signature")?.remove();
    }

    try {
      if (enabled) {
        localStorage.setItem(storageKey, "true");
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn("Impossible de mémoriser l’état de l’easter egg.", error);
    }
  }

  function showSignature() {
    const shell = document.querySelector(".page-shell");
    if (!shell || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    shell.querySelector(".easter-egg-signature")?.remove();

    const signature = document.createElement("div");
    signature.className = "easter-egg-signature";
    signature.setAttribute("aria-hidden", "true");

    const lettering = document.createElement("span");
    lettering.className = "easter-egg-signature__name";
    lettering.textContent = "Hakim";
    signature.append(lettering);

    for (let index = 0; index < 7; index += 1) {
      const hexagon = document.createElement("span");
      hexagon.className = "easter-egg-signature__hexagon";
      signature.append(hexagon);
    }

    signature.addEventListener("animationend", (event) => {
      if (event.target === signature) {
        signature.remove();
      }
    });
    shell.append(signature);
  }

  const viewfinderSelector = [
    ".intro__link",
    ".theme-toggle",
    ".skill-card__link",
    ".contact__cta",
    ".contact__link",
    ".project__open",
  ].join(", ");
  const viewfinder = document.createElement("div");
  viewfinder.className = "viewfinder";
  viewfinder.setAttribute("aria-hidden", "true");

  const frame = document.createElement("div");
  frame.className = "viewfinder__frame";
  for (let index = 0; index < 4; index += 1) {
    const corner = document.createElement("span");
    corner.className = "viewfinder__corner";
    frame.append(corner);
  }

  const label = document.createElement("span");
  label.className = "viewfinder__label";
  label.textContent = "FOCUS  /  01";
  frame.append(label);

  const focus = document.createElement("span");
  focus.className = "viewfinder__focus";
  frame.append(focus);
  viewfinder.append(frame);
  document.body.append(viewfinder);

  let hoveredTarget = null;
  let focusedTarget = null;
  let currentTarget = null;
  let pointerMode = false;

  function findViewfinderTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const matchedTarget = target.closest(viewfinderSelector);
    return matchedTarget?.closest(".project--expanded") ? null : matchedTarget;
  }

  function positionViewfinder(target) {
    const rect = target.getBoundingClientRect();
    const padding = 12;
    const width = Math.min(rect.width + padding * 2, window.innerWidth - 32);
    const height = Math.min(rect.height + padding * 2, window.innerHeight - 32);
    const left = Math.max(
      16,
      Math.min(rect.left - padding, window.innerWidth - width - 16),
    );
    const top = Math.max(
      16,
      Math.min(rect.top - padding, window.innerHeight - height - 16),
    );

    frame.style.setProperty("--frame-left", `${left}px`);
    frame.style.setProperty("--frame-top", `${top}px`);
    frame.style.setProperty("--frame-width", `${width}px`);
    frame.style.setProperty("--frame-height", `${height}px`);
  }

  function syncViewfinder() {
    const nextTarget = pointerMode ? hoveredTarget : focusedTarget || hoveredTarget;
    if (!nextTarget) {
      viewfinder.classList.remove("is-visible");
      currentTarget = null;
      return;
    }

    positionViewfinder(nextTarget);
    if (nextTarget !== currentTarget) {
      viewfinder.classList.remove("is-visible");
      currentTarget = nextTarget;
      requestAnimationFrame(() => viewfinder.classList.add("is-visible"));
      return;
    }

    viewfinder.classList.add("is-visible");
  }

  window.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    pointerMode = true;
    const target = findViewfinderTarget(event.target);
    if (target === hoveredTarget) {
      return;
    }

    hoveredTarget = target;
    syncViewfinder();
  });

  window.addEventListener("pointerout", (event) => {
    if (event.pointerType === "touch") {
      return;
    }

    const target = findViewfinderTarget(event.target);
    if (!target || target !== hoveredTarget) {
      return;
    }

    const nextTarget = findViewfinderTarget(event.relatedTarget);
    if (nextTarget === target) {
      return;
    }

    hoveredTarget = null;
    syncViewfinder();
  });

  window.addEventListener("focusin", (event) => {
    focusedTarget = findViewfinderTarget(event.target);
    syncViewfinder();
  });

  window.addEventListener("focusout", (event) => {
    if (!focusedTarget || findViewfinderTarget(event.relatedTarget) === focusedTarget) {
      return;
    }

    focusedTarget = null;
    syncViewfinder();
  });

  window.addEventListener("scroll", () => {
    if (currentTarget?.isConnected) {
      positionViewfinder(currentTarget);
    } else if (currentTarget) {
      hoveredTarget = null;
      focusedTarget = null;
      syncViewfinder();
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (currentTarget?.isConnected) {
      positionViewfinder(currentTarget);
    }
  });

  window.addEventListener("keydown", (event) => {
    pointerMode = false;
    focusedTarget = findViewfinderTarget(document.activeElement);
    syncViewfinder();

    const target = event.target;
    const isEditable =
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement);

    if (event.repeat || isEditable || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    const key = event.key.toLocaleLowerCase();
    if (key.length !== 1 || key < "a" || key > "z") {
      return;
    }

    for (const sequence of sequences) {
      const currentProgress = progress.get(sequence);
      const candidate = sequence.slice(0, currentProgress) + key;
      const nextProgress = sequence.startsWith(candidate)
        ? candidate.length
        : key === sequence[0]
          ? 1
          : 0;

      progress.set(sequence, nextProgress);
      if (nextProgress !== sequence.length) {
        continue;
      }

      progress.set(sequence, 0);
      if (sequence === "hakim") {
        setEasterEggEnabled(true);
        showSignature();
      } else {
        setEasterEggEnabled(false);
      }
    }
  }, { capture: true });
})();
