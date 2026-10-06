/**
 * Theme toggle — persists light/dark preference.
 * Default: dark (The Library).
 */
(function () {
  var KEY = "the-library-theme";
  var root = document.documentElement;

  function preferred() {
    try {
      var saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return "dark";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    var isDark = theme === "dark";
    btn.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
    btn.setAttribute("title", isDark ? "Light" : "Dark");
    btn.setAttribute("aria-pressed", isDark ? "true" : "false");
  }

  function toggle() {
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
    apply(next);
  }

  apply(preferred());

  document.addEventListener("DOMContentLoaded", function () {
    apply(preferred());
    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) btn.addEventListener("click", toggle);
  });
})();
