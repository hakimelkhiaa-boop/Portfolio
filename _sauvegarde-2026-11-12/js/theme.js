const themeToggle = document.querySelector(".theme-toggle");

if (themeToggle) {
  const root = document.documentElement;
  let theme = "dark";

  try {
    const savedTheme = localStorage.getItem("portfolio-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      theme = savedTheme;
    }
  } catch {}

  function applyTheme(nextTheme) {
    theme = nextTheme;
    const isLight = theme === "light";

    root.dataset.theme = theme;
    themeToggle.textContent = isLight ? "Mode sombre" : "Mode clair";
    themeToggle.setAttribute(
      "aria-label",
      isLight ? "Activer le mode sombre" : "Activer le mode clair",
    );
    themeToggle.setAttribute("aria-pressed", String(isLight));
  }

  applyTheme(theme);

  themeToggle.addEventListener("click", () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);

    try {
      localStorage.setItem("portfolio-theme", nextTheme);
    } catch {}
  });
}