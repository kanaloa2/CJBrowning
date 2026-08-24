(function () {
  "use strict";

  // Mobile nav toggle
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Parallax backgrounds — JS-simulated background-attachment: fixed.
  // Real background-attachment: fixed is janky on desktop Safari and
  // silently forced to "scroll" (no pinning at all) on every mobile
  // browser, so this pins the image to the viewport by hand instead:
  // each frame, translate it by the exact inverse of its section's own
  // scroll movement, so it holds still while the section's content
  // scrolls over it — on every browser, including mobile.
  (function initParallax() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
    if (!els.length) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Always recompute every parallax element's position on every scroll
    // frame — there are only ever a couple of these on the page, so this
    // is cheap. An earlier version only updated elements while an
    // IntersectionObserver considered them "visible," to save work, but
    // that observer fires asynchronously and can fall out of sync with
    // scroll events, leaving a section's background transform stuck at a
    // stale offset — which pushes the pinned image out of its section's
    // clipping window and shows blank space instead.
    var ticking = false;

    function update() {
      ticking = false;
      els.forEach(function (el) {
        var rect = el.parentElement.getBoundingClientRect();
        el.style.transform = "translate3d(0, " + (-rect.top).toFixed(1) + "px, 0)";
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  })();

  // Lead form submission
  var form = document.getElementById("leadForm");
  var msg = document.getElementById("formMsg");
  var submitBtn = document.getElementById("submitBtn");

  function showMsg(text, ok) {
    msg.textContent = text;
    msg.classList.remove("ok", "err");
    msg.classList.add("show", ok ? "ok" : "err");
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var data = new FormData(form);
      var insuranceTypes = data.getAll("insuranceTypes");

      var payload = {
        website: data.get("website") || "",
        name: (data.get("name") || "").toString().trim(),
        phone: (data.get("phone") || "").toString().trim(),
        email: (data.get("email") || "").toString().trim(),
        zip: (data.get("zip") || "").toString().trim(),
        insuranceTypes: insuranceTypes,
        message: (data.get("message") || "").toString().trim(),
        consent: form.querySelector("#consent").checked,
        source: window.location.href,
      };

      if (!payload.name || !payload.phone || !payload.email || !payload.zip) {
        showMsg("Please fill in your name, phone, email, and ZIP code.", false);
        return;
      }
      if (insuranceTypes.length === 0) {
        showMsg("Please select at least one type of coverage.", false);
        return;
      }
      if (!payload.consent) {
        showMsg("Please confirm you agree to be contacted.", false);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (body) {
            return { ok: res.ok, body: body };
          });
        })
        .then(function (result) {
          if (result.ok && result.body.ok) {
            form.reset();
            showMsg("Thanks! A local agent will reach out shortly, usually the same business day.", true);
          } else {
            showMsg((result.body && result.body.error) || "Something went wrong. Please call us at (480) 744-0944.", false);
          }
        })
        .catch(function () {
          showMsg("We couldn't send that. Please call us at (480) 744-0944.", false);
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = "Get My Free Quote";
        });
    });
  }
})();
