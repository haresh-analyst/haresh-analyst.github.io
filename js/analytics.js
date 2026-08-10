/* ================================================================
   ANALYTICS — optional, isolated from the portfolio itself
   ================================================================
   Google Analytics and Microsoft Clarity are loaded only after the
   basic page is available. They are deliberately NOT part of the
   0–100% portfolio loading calculation.

   To change/remove them, edit config/site-config.js.
================================================================ */
(function () {
  const cfg = window.SITE_CONFIG?.analytics || {};

  if (cfg.googleAnalyticsId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', cfg.googleAnalyticsId, { anonymize_ip: true });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.googleAnalyticsId);
    document.head.appendChild(script);
  }

  if (cfg.microsoftClarityId) {
    (function (c, l, a, r, i) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      const t = l.createElement(r);
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + encodeURIComponent(i);
      const y = l.getElementsByTagName(r)[0];
      y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', cfg.microsoftClarityId);
  }

  // Safe helper used by the portfolio UI. It is a no-op when GA is disabled.
  window.trackEvent = function (name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  };
})();
