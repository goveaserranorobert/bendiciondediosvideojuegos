/* ==================================================================
   LA BENDICIÓN DE DIOS — script.js (v2, alineado al layout Tailwind)
   Bloque 3: Lógica de Interacción Avanzada, Estado y Webhooks
   Módulo autocontenido (IIFE)
   ================================================================== */

(function laBendicionDeDiosApp() {
  "use strict";

  const CONFIG = {
    // Reemplazar por la URL real del webhook antes de publicar
    WEBHOOK_URL: "https://hooks.example.com/la-bendicion-de-dios/contacto",
    STORAGE_KEY: "la_bendicion_de_dios_contact_draft",
    SUBMIT_TIMEOUT_MS: 12000
  };

  function sanitizeText(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.from((scope || document).querySelectorAll(selector));
  }

  /* ==================================================================
     MÓDULO 1 — HEADER: blur/fondo sólido al hacer scroll
     ================================================================== */
  function initHeaderScroll() {
    const header = qs("#site-header");
    if (!header) return;

    const applyState = () => {
      if (window.scrollY > 24) {
        header.classList.add("bg-gray-950/85", "backdrop-blur-md", "shadow-lg", "shadow-black/20");
      } else {
        header.classList.remove("bg-gray-950/85", "backdrop-blur-md", "shadow-lg", "shadow-black/20");
      }
    };

    applyState();
    window.addEventListener("scroll", applyState, { passive: true });
  }

  /* ==================================================================
     MÓDULO 2 — MENÚ MÓVIL (hamburguesa)
     ================================================================== */
  function initMobileMenu() {
    const toggle = qs("#menu-toggle");
    const menu = qs("#mobile-menu");
    if (!toggle || !menu) return;

    const close = () => {
      menu.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const isHidden = menu.classList.contains("hidden");
      menu.classList.toggle("hidden");
      toggle.setAttribute("aria-expanded", String(isHidden));
    });

    // Cierra el menú al elegir una opción
    qsa("a", menu).forEach((link) => link.addEventListener("click", close));

    // Cierra el menú si la pantalla pasa a tamaño desktop
    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) close();
    });
  }

  /* ==================================================================
     MÓDULO 3 — ACORDEÓN FAQ (clases .accordion-trigger / .accordion-panel)
     ================================================================== */
  function initAccordion() {
    const triggers = qsa(".accordion-trigger");
    if (!triggers.length) return;

    triggers.forEach((trigger) => {
      const panel = trigger.nextElementSibling;
      const icon = qs("span", trigger);

      trigger.addEventListener("click", () => {
        const isOpen = trigger.getAttribute("aria-expanded") === "true";

        // Cierra los demás ítems (uno a la vez)
        triggers.forEach((t) => {
          t.setAttribute("aria-expanded", "false");
          t.nextElementSibling?.classList.remove("is-open");
          const otherIcon = qs("span", t);
          if (otherIcon) otherIcon.style.transform = "rotate(0deg)";
        });

        if (!isOpen) {
          trigger.setAttribute("aria-expanded", "true");
          panel?.classList.add("is-open");
          if (icon) icon.style.transform = "rotate(45deg)";
        }
      });
    });
  }

  /* ==================================================================
     MÓDULO 4 — VALIDACIÓN INLINE (regex Ecuador)
     ================================================================== */
  const PATTERNS = {
    name: /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,60}$/,
    phone: /^(\+593\s?9\d{8}|09\d{8})$/
  };

  const ERROR_MESSAGES = {
    name: "Escribe tu nombre completo (mínimo 3 letras, sin números).",
    phone: "Usa un celular ecuatoriano válido, ej: 0991234567."
  };

  function ensureErrorEl(field) {
    let errorEl = field.parentElement.querySelector(".field__error");
    if (!errorEl) {
      errorEl = document.createElement("small");
      errorEl.className = "field__error text-[var(--orange)] text-xs";
      errorEl.setAttribute("role", "alert");
      field.parentElement.appendChild(errorEl);
    }
    return errorEl;
  }

  function validateField(field) {
    const pattern = PATTERNS[field.name];
    if (!pattern) return true;

    const value = field.value.trim();
    const isValid = pattern.test(value);
    const errorEl = ensureErrorEl(field);

    if (!isValid && value.length > 0) {
      errorEl.textContent = ERROR_MESSAGES[field.name] || "Este campo no es válido.";
      field.setAttribute("aria-invalid", "true");
      field.classList.add("border-[var(--orange)]");
    } else {
      errorEl.textContent = "";
      field.removeAttribute("aria-invalid");
      field.classList.remove("border-[var(--orange)]");
    }

    return isValid || value.length === 0;
  }

  function validateForm(form) {
    const requiredFields = qsa("input[required]", form);
    let allValid = true;

    requiredFields.forEach((field) => {
      const value = field.value.trim();
      const fieldValid = value.length > 0 && validateField(field);
      if (!fieldValid) allValid = false;
    });

    return allValid;
  }

  /* ==================================================================
     MÓDULO 5 — PERSISTENCIA LOCAL (localStorage)
     ================================================================== */
  function initPersistence(form) {
    const fields = ["name", "phone", "message"];

    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || "{}");
      fields.forEach((name) => {
        const field = form.elements.namedItem(name);
        if (field && saved[name]) field.value = saved[name];
      });
    } catch (err) {
      console.warn("No se pudo restaurar el borrador del formulario:", err);
    }

    form.addEventListener("input", () => {
      const draft = {};
      fields.forEach((name) => {
        const field = form.elements.namedItem(name);
        if (field) draft[name] = field.value;
      });
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(draft));
      } catch (err) {
        console.warn("No se pudo guardar el borrador del formulario:", err);
      }
    });
  }

  function clearPersistence() {
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
    } catch (err) {
      console.warn("No se pudo limpiar el borrador del formulario:", err);
    }
  }

  /* ==================================================================
     MÓDULO 6 — UI DE ÉXITO / ERROR (estilada con clases Tailwind)
     ================================================================== */
  function showBanner(form, message, variant) {
    const selector = variant === "error" ? ".form-network-error" : ".form-success";
    let el = qs(selector, form.parentElement);

    const baseClasses = "mt-3 rounded-lg px-4 py-3 text-sm border opacity-0 -translate-y-1 transition-all duration-300";
    const variantClasses = variant === "error"
      ? "bg-[var(--orange)]/10 border-[var(--orange)] text-orange-200 form-network-error"
      : "bg-blue-500/10 border-blue-500 text-blue-100 form-success";

    if (!el) {
      el = document.createElement("div");
      el.className = `${baseClasses} ${variantClasses}`;
      el.setAttribute("role", variant === "error" ? "alert" : "status");
      form.insertAdjacentElement("afterend", el);
    }

    el.textContent = sanitizeText(message);
    requestAnimationFrame(() => el.classList.remove("opacity-0", "-translate-y-1"));
    setTimeout(() => el.classList.add("opacity-0", "-translate-y-1"), 6000);
  }

  /* ==================================================================
     MÓDULO 7 — PÍXELES DE CONVERSIÓN
     ================================================================== */
  function trackConversion(eventName, payload) {
    try {
      if (typeof window.fbq === "function") window.fbq("track", eventName, payload || {});
      if (typeof window.gtag === "function") window.gtag("event", eventName, payload || {});
      if (typeof window.ttq === "object" && window.ttq && typeof window.ttq.track === "function") {
        window.ttq.track(eventName, payload || {});
      }
    } catch (err) {
      console.warn("No se pudo disparar el píxel de conversión:", err);
    }
  }

  /* ==================================================================
     MÓDULO 8 — ENVÍO DEL FORMULARIO (Honeypot + Fetch + Estado)
     ================================================================== */
  function initContactForm() {
    const form = qs("#contact-form");
    if (!form) return;

    initPersistence(form);

    qsa("input[required]", form).forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitBtn = qs('button[type="submit"]', form);

      const honeypot = form.elements.namedItem("website");
      if (honeypot && honeypot.value.trim() !== "") {
        form.reset();
        showBanner(form, "¡Listo! Recibimos tu mensaje, te contactamos por WhatsApp en breve.", "success");
        return;
      }

      if (!validateForm(form)) return;
      if (submitBtn.classList.contains("btn-loading")) return;

      submitBtn.classList.add("btn-loading");
      submitBtn.disabled = true;

      const formData = new FormData(form);
      const payload = {
        name: sanitizeText(formData.get("name")),
        phone: sanitizeText(formData.get("phone")),
        message: sanitizeText(formData.get("message")),
        source: "la-bendicion-de-dios-web",
        submittedAt: new Date().toISOString()
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.SUBMIT_TIMEOUT_MS);

      try {
        const response = await fetch(CONFIG.WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        if (!response.ok) throw new Error("El servidor respondió con estado " + response.status);

        form.reset();
        clearPersistence();
        showBanner(form, "¡Listo! Recibimos tu mensaje, te contactamos por WhatsApp en breve.", "success");
        trackConversion("Lead", { content_name: "Formulario de contacto" });
      } catch (err) {
        console.error("Error al enviar el formulario:", err);
        showBanner(form, "No pudimos enviar tu mensaje. Revisa tu conexión o escríbenos directo por WhatsApp.", "error");
      } finally {
        clearTimeout(timeoutId);
        submitBtn.classList.remove("btn-loading");
        submitBtn.disabled = false;
      }
    });
  }

  /* ==================================================================
     MÓDULO 9 — TRACKING DE CLICS EN WHATSAPP
     ================================================================== */
  function initWhatsappTracking() {
    qsa('a[href*="wa.me"]').forEach((link) => {
      link.addEventListener("click", () => {
        trackConversion("Contact", { content_name: "WhatsApp CTA" });
      });
    });
  }

  /* ==================================================================
     MÓDULO 10 — SCROLL REVEAL (tarjetas de Opiniones)
     IntersectionObserver ultraligero: agrega .reveal-active cuando la
     tarjeta entra en pantalla; el resto de la animación vive en CSS.
     ================================================================== */
  function initScrollReveal() {
    const targets = qsa(".reveal-left, .reveal-right");
    if (!targets.length) return;

    // Sin soporte de IntersectionObserver: mostrar todo de inmediato
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("reveal-active"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-active");
            obs.unobserve(entry.target); // se anima una sola vez
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -60px 0px" }
    );

    targets.forEach((el) => observer.observe(el));
  }

  /* ==================================================================
     MÓDULO 11 — LAZY LOAD DE VIDEO (Quiénes Somos)
     El video no descarga nada hasta que está a punto de entrar en
     pantalla; así no compite por ancho de banda con lo que sí es
     crítico al cargar la página (Hero, imágenes above-the-fold).
     ================================================================== */
  function initLazyVideo() {
    const video = qs("#about-video");
    if (!video || !video.dataset.src) return;

    if (!("IntersectionObserver" in window)) {
      video.src = video.dataset.src;
      video.play().catch(() => {});
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.src = video.dataset.src;
            video.play().catch(() => {}); // algunos navegadores piden gesto del usuario
            obs.unobserve(video);
          }
        });
      },
      { rootMargin: "200px 0px" } // empieza a cargar un poco antes de que sea visible
    );

    observer.observe(video);
  }

  /* ==================================================================
     INICIALIZACIÓN
     ================================================================== */
  function init() {
    initHeaderScroll();
    initMobileMenu();
    initAccordion();
    initContactForm();
    initWhatsappTracking();
    initScrollReveal();
    initLazyVideo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
