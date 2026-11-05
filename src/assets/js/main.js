// Small enhancements: theme toggle, mobile menu, photo lightbox, copy buttons, local time.
(function () {
  "use strict";

  const root = document.documentElement;

  // ---------- Theme toggle ----------
  // Dark is the site's default look; the toggle lets visitors switch to light.
  const currentTheme = () => (root.getAttribute("data-theme") === "light" ? "light" : "dark");

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    const sync = () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", `Switch to ${next} theme`);
    };
    sync();
    btn.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* storage unavailable: theme still applies for this visit */
      }
      sync();
    });
  });

  // ---------- Mobile navigation ----------
  const navToggle = document.querySelector("[data-nav-toggle]");
  const nav = document.getElementById("site-nav");
  if (navToggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    navToggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        navToggle.focus();
      }
    });
  }

  // ---------- Print + copy link ----------
  // Local time in La Union on the Status card.
  document.querySelectorAll("[data-local-time]").forEach((el) => {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: el.getAttribute("data-tz") || "Asia/Manila" });
      const tick = () => (el.textContent = fmt.format(new Date()));
      tick();
      setInterval(tick, 30000);
      const wrap = el.closest("[data-local-time-wrap]");
      if (wrap) wrap.hidden = false;
    } catch (e) {
      /* unknown time zone: leave the line hidden */
    }
  });

  // Copy an email address / username to the clipboard.
  document.querySelectorAll("[data-copy-text]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const label = btn.querySelector("span") || btn;
      const original = label.textContent;
      try {
        await navigator.clipboard.writeText(btn.getAttribute("data-copy-text"));
        btn.classList.add("is-copied");
        if (label !== btn) label.textContent = "Copied!";
        else btn.setAttribute("title", "Copied!");
      } catch (e) {
        if (label !== btn) label.textContent = "Copy failed";
      }
      setTimeout(() => {
        btn.classList.remove("is-copied");
        if (label !== btn) label.textContent = original;
      }, 1800);
    });
  });

  // ---------- Lightbox ----------
  const dialog = document.querySelector("[data-lightbox]");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const img = dialog.querySelector("[data-lightbox-img]");
  const caption = dialog.querySelector("[data-lightbox-caption]");
  const count = dialog.querySelector("[data-lightbox-count]");
  let items = [];
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + items.length) % items.length;
    const item = items[index];
    img.src = item.href;
    img.alt = item.alt;
    caption.textContent = item.caption;
    caption.hidden = !item.caption;
    count.textContent = items.length > 1 ? `${index + 1} / ${items.length}` : "";
    // Warm up the neighbours so swiping feels instant.
    [index + 1, index - 1].forEach((n) => {
      const next = items[(n + items.length) % items.length];
      if (next) new Image().src = next.href;
    });
  };

  const open = (link) => {
    const group = link.getAttribute("data-gallery");
    const links = Array.from(document.querySelectorAll(`a[data-gallery="${CSS.escape(group)}"]`));
    items = links.map((a) => ({
      href: a.href,
      caption: a.getAttribute("data-caption") || "",
      alt: (a.querySelector("img") && a.querySelector("img").alt) || a.getAttribute("data-caption") || "",
    }));
    opener = link;
    dialog.classList.toggle("is-single", items.length < 2);
    show(links.indexOf(link));
    dialog.showModal();
    document.body.style.overflow = "hidden";
  };

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-gallery]");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open(link);
  });

  dialog.addEventListener("close", () => {
    document.body.style.overflow = "";
    img.removeAttribute("src");
    if (opener) opener.focus({ preventScroll: true });
  });
  dialog.querySelector("[data-lightbox-close]").addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-lightbox-prev]").addEventListener("click", () => show(index - 1));
  dialog.querySelector("[data-lightbox-next]").addEventListener("click", () => show(index + 1));
  dialog.addEventListener("click", (e) => {
    // Clicking the dark area (not the photo or buttons) closes the viewer.
    if (e.target === dialog || e.target.classList.contains("lightbox-inner")) dialog.close();
  });
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(index + 1);
    if (e.key === "ArrowLeft") show(index - 1);
  });

  let touchX = null;
  dialog.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  dialog.addEventListener("touchend", (e) => {
    if (touchX === null || items.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();
