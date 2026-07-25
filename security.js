(() => {
  // GitHub Pages cannot set custom response headers. This is a small client-side
  // fallback against clickjacking; the CSP meta policy supplies the primary guard.
  if (window.top !== window.self) {
    try {
      window.top.location = window.self.location;
    } catch {
      document.documentElement.classList.add("embedded-page");
    }
  }

  // Keep every new-tab link from retaining access to this page through window.opener.
  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.relList.add("noopener", "noreferrer");
  });
})();
