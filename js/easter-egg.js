(() => {
  const sequence = "hakim";
  const root = document.documentElement;
  let progress = 0;
  let resetTimer;

  function showNameSmoke() {
    const shell = document.querySelector(".page-shell");
    if (!shell || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    shell.querySelector(".easter-egg-smoke")?.remove();
    const name = document.createElement("span");
    name.className = "easter-egg-smoke";
    name.setAttribute("aria-hidden", "true");
    name.textContent = "Hakim";
    name.addEventListener("animationend", () => name.remove(), { once: true });
    shell.append(name);
  }

  window.addEventListener("keydown", (event) => {
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

    const candidate = sequence.slice(0, progress) + key;
    progress = sequence.startsWith(candidate)
      ? candidate.length
      : key === sequence[0]
        ? 1
        : 0;

    if (progress !== sequence.length) {
      return;
    }

    progress = 0;
    root.dataset.easterEgg = "true";
    showNameSmoke();
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      delete root.dataset.easterEgg;
    }, 18000);
  }, { capture: true });
})();
