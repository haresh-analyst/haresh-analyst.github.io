/* ================================================================
   PORTFOLIO STARTUP LOADER — CRITICAL READY, NOT FULL-DOWNLOAD
   ================================================================
   The recruiter should enter quickly, but only after the essentials
   are genuinely ready:
     • profile photo
     • SLB video is playback-ready (metadata + enough buffer to play)
     • all document pages
     • fonts + chart engine

   Heavy secondary media (sales demo + dashboards) never blocks entry.
   They are available on demand and may warm in the background.

   IMPORTANT: A video being "ready" does NOT mean the browser must
   download all 3–4 MB before the recruiter can enter. The browser can
   keep buffering the rest while the recruiter reads the portfolio.
================================================================ */
(function () {
  'use strict';

  const overlay = document.getElementById('bootLoader');
  const percentEl = document.getElementById('bootPercent');
  const barEl = document.getElementById('bootBar');
  const statusEl = document.getElementById('bootStatus');
  const detailEl = document.getElementById('bootDetail');
  const countEl = document.getElementById('bootCount');
  const etaEl = document.getElementById('bootEta');
  const errorBox = document.getElementById('bootError');
  const retryBtn = document.getElementById('bootRetry');

  let data = null;
  let critical = [];
  let states = new Map();
  let startedAt = performance.now();
  let lastProgress = 0;
  let lastProgressAt = startedAt;
  let speed = 0;
  let mainScriptLoaded = false;

  const setText = (el, value) => { if (el) el.textContent = value; };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return Math.round(bytes) + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 1) return 'almost ready';
    if (seconds < 60) return Math.ceil(seconds) + ' sec';
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return m + ' min ' + s + ' sec';
  }

  function completedCount() {
    return critical.filter(a => states.get(a.id)?.status === 'ready').length;
  }

  function progressPercent() {
    if (!critical.length) return 100;
    return (critical.reduce((sum, a) => sum + clamp(states.get(a.id)?.progress || 0, 0, 1), 0) / critical.length) * 100;
  }

  function updateSpeed(percent) {
    const now = performance.now();
    const dt = (now - lastProgressAt) / 1000;
    if (dt >= 0.35 && percent > lastProgress) {
      const instant = (percent - lastProgress) / dt;
      speed = speed ? (speed * 0.70 + instant * 0.30) : instant;
      lastProgress = percent;
      lastProgressAt = now;
    }
  }

  function render(currentLabel, detail) {
    const p = Math.round(clamp(progressPercent(), 0, 100));
    updateSpeed(p);
    setText(percentEl, p + '%');
    if (barEl) barEl.style.width = p + '%';
    setText(statusEl, p >= 100 ? 'Portfolio ready' : 'Preparing your portfolio…');
    setText(detailEl, currentLabel || detail || 'Preparing your portfolio…');

    const done = completedCount();
    setText(countEl, done + ' of ' + critical.length + ' critical resources ready · ' + Math.max(0, critical.length - done) + ' remaining');

    if (p >= 100) {
      setText(etaEl, 'Everything required for review is ready. Entering your portfolio…');
    } else if (speed > 0) {
      setText(etaEl, 'Estimated time remaining: ' + formatTime((100 - p) / speed));
    } else {
      setText(etaEl, 'Preparing the required resources…');
    }
  }

  function setState(id, status, progress, message) {
    const current = states.get(id) || {};
    states.set(id, { ...current, status, progress: clamp(progress, 0, 1), message });
    render(message || ('Preparing ' + id + '…'), status === 'ready' ? 'Ready' : 'Loading…');
  }

  function fetchBlob(url, expectedSize, onProgress) {
    return fetch(url, { cache: 'force-cache' }).then(async response => {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const total = Number(response.headers.get('content-length')) || expectedSize || 0;
      if (!response.body || !response.body.getReader) {
        const blob = await response.blob();
        onProgress(blob.size, total || blob.size);
        return blob;
      }
      const reader = response.body.getReader();
      const chunks = [];
      let loaded = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        chunks.push(part.value);
        loaded += part.value.byteLength;
        onProgress(loaded, total || expectedSize || loaded);
      }
      return new Blob(chunks, { type: response.headers.get('content-type') || '' });
    });
  }

  function applyBlob(dataObj, asset, blob) {
    const url = URL.createObjectURL(blob);
    dataObj._blobUrls = dataObj._blobUrls || [];
    dataObj._blobUrls.push(url);
    if (asset.id === 'photo') dataObj.photo = url;
    if (asset.id.startsWith('doc-')) {
      const [, docKey, pageIndex] = asset.id.split('-');
      if (dataObj.docs?.[docKey]?.pages?.[Number(pageIndex)]) {
        dataObj.docs[docKey].pages[Number(pageIndex)] = url;
      }
    }
  }

  function warmVideo(asset) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:2px;height:2px;opacity:0;pointer-events:none;';
      document.body.appendChild(video);

      const cleanup = () => {
        video.removeEventListener('canplay', ready);
        video.removeEventListener('loadeddata', fallbackReady);
        video.removeEventListener('error', failed);
      };
      const ready = () => {
        cleanup();
        window.__slbWarmVideo = video;
        resolve(video);
      };
      const fallbackReady = () => {
        // HAVE_CURRENT_DATA / HAVE_FUTURE_DATA is enough to start playback.
        if (video.readyState >= 2) ready();
      };
      const failed = () => { cleanup(); video.remove(); reject(new Error(asset.label + ' could not be loaded.')); };
      video.addEventListener('canplay', ready, { once: true });
      video.addEventListener('loadeddata', fallbackReady);
      video.addEventListener('error', failed, { once: true });
      video.src = asset.url;
      video.load();
    });
  }

  async function loadCriticalAsset(asset) {
    setState(asset.id, 'loading', 0, 'Loading ' + asset.label + '…');

    if (asset.type === 'video') {
      const video = await warmVideo(asset);
      setState(asset.id, 'ready', 1, asset.label + ' is playback-ready');
      return video;
    }

    const blob = await fetchBlob(asset.url, Number(asset.size) || 0, (loaded, total) => {
      const fraction = total ? clamp(loaded / total, 0, 0.98) : 0.5;
      setState(asset.id, 'loading', fraction, 'Loading ' + asset.label + '… ' + formatBytes(loaded) + '');
    });
    applyBlob(data, asset, blob);
    setState(asset.id, 'ready', 1, '✓ ' + asset.label + ' ready');
    return blob;
  }

  async function waitForFonts() {
    if (!document.fonts?.ready) return;
    try { await document.fonts.ready; } catch (_) {}
  }

  async function waitForChart() {
    const deadline = performance.now() + 12000;
    while (typeof window.Chart === 'undefined' && performance.now() < deadline) {
      await new Promise(r => setTimeout(r, 60));
    }
    if (typeof window.Chart === 'undefined') {
      throw new Error('The chart engine could not be loaded. Please refresh and try again.');
    }
  }

  function loadMainScripts() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'js/main.js?v=20260811';
      script.onload = () => { mainScriptLoaded = true; resolve(); };
      script.onerror = () => reject(new Error('The portfolio interface could not start. Please reload the page.'));
      document.body.appendChild(script);
    });
  }

  async function boot() {
    document.body.classList.add('portfolio-booting');
    startedAt = performance.now();

    try {
      data = window.SITE_DATA;
      if (!data) throw new Error('Portfolio data could not be loaded.');
      window.PAYLOAD = data;

      // Compatibility hooks used by the interactive modules. The startup
      // screen no longer needs a permanent side status panel, so these are
      // intentionally lightweight and never block the page.
      window.setAssetStatus = window.setAssetStatus || function () {};
      window.updateMediaProgress = window.updateMediaProgress || function () {};
      window.getMediaPercent = window.getMediaPercent || function (media) {
        if (!media || !media.duration || !media.buffered?.length) return 0;
        return Math.round((media.buffered.end(media.buffered.length - 1) / media.duration) * 100);
      };

      const all = Array.isArray(data.preload) ? data.preload : [];
      critical = all.filter(a => a.critical !== false);
      states = new Map(critical.map(a => [a.id, { status: 'pending', progress: 0 }]));
      render('Preparing critical resources…', 'Starting…');

      // Load independent critical assets in parallel. This is much faster
      // than downloading the photo, documents and video one after another.
      const results = await Promise.allSettled(critical.map(loadCriticalAsset));
      const failed = results.find(r => r.status === 'rejected');
      if (failed) throw failed.reason;

      setText(statusEl, 'Finishing portfolio preparation…');
      setText(detailEl, 'Fonts, chart and interface are being checked…');
      await waitForFonts();
      await waitForChart();
      await loadMainScripts();

      // The main script creates the chart synchronously once Chart.js exists.
      // Give the browser one paint to finish the chart/counters before entry.
      await new Promise(requestAnimationFrame);
      render('Everything required is ready', 'Portfolio ready');

      document.body.classList.remove('portfolio-booting');
      overlay.classList.add('complete');
      setTimeout(() => {
        overlay.remove();
        window.dispatchEvent(new Event('portfolio:ready'));
        startOptionalWarmup(all.filter(a => a.critical === false));
      }, Number(window.SITE_CONFIG?.loading?.minimumScreenTimeMs || 450));
    } catch (error) {
      overlay.classList.add('has-error');
      errorBox.hidden = false;
      setText(document.getElementById('bootErrorText'), error?.message || 'Portfolio loading failed.');
    }
  }

  function startOptionalWarmup(optional) {
    if (!window.SITE_CONFIG?.loading?.warmOptionalMediaInBackground) return;
    optional.forEach(asset => {
      if (asset.type === 'video') {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.src = asset.url;
        v.load();
        window.__optionalMediaWarmup = window.__optionalMediaWarmup || [];
        window.__optionalMediaWarmup.push(v);
      }
    });
  }

  retryBtn?.addEventListener('click', () => location.reload());
  boot();
})();
