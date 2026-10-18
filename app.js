(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const menu = $('.menu-toggle'), navigation = $('#nav-links');
  function closeMenu() { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('is-open'); }
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('is-open', open); });
  $$('a', navigation).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest?.('header')) closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth >= 768) closeMenu(); });
  const tabs = $$('[data-tab]');
  function selectTab(tab, focus = false) {
    tabs.forEach(button => { const selected = button === tab; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; $('#' + button.getAttribute('aria-controls')).hidden = !selected; });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
    });
  });
  $$('[data-open-tab]').forEach(button => button.addEventListener('click', () => { const tab = tabs.find(t => t.dataset.tab === button.dataset.openTab); if (tab) selectTab(tab, true); }));
  $$('[data-color]').forEach(button => button.addEventListener('click', () => {
    const color = button.dataset.color;
    if (!/^#[a-f0-9]{6}$/i.test(color)) return;
    $('.demo-layout').style.setProperty('--demo-accent', color);
    $$('[data-color]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  }));
  function selectProfile(version) {
    if (!['26.3', '1.21.10'].includes(version)) return;
    $('#demo-profile').value = version;
    $$('[data-profile]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.profile === version)));
    const selected = $$('[data-profile]').find(button => button.dataset.profile === version);
    if (selected) selected.parentElement.prepend(selected);
  }
  $$('[data-profile]').forEach(button => button.addEventListener('click', () => selectProfile(button.dataset.profile)));
  $('#demo-profile').addEventListener('change', event => selectProfile(event.target.value));
  $('#year').textContent = String(new Date().getFullYear());
  function safeRepositoryUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.toLowerCase().startsWith('/tegnas/tegnas-launcher/'); } catch { return false; }
  }
  async function loadRelease() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch('https://api.github.com/repos/Tegnas/tegnas-launcher/releases?per_page=20', { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) return;
      const releases = await response.json();
      if (!Array.isArray(releases)) return;
      const release = releases.find(item => !item.draft && Array.isArray(item.assets) && item.assets.some(asset => asset.name === 'TegnasLauncher.exe' && safeRepositoryUrl(asset.browser_download_url)));
      if (!release) return;
      if (release.draft || !/^v?\d+\.\d+\.\d+(?:[.\-][a-z0-9.\-]+)?$/i.test(release.tag_name || '') || !safeRepositoryUrl(release.html_url)) return;
      const installer = Array.isArray(release.assets) ? release.assets.find(asset => asset.name === 'TegnasLauncher.exe' && safeRepositoryUrl(asset.browser_download_url)) : null;
      if (!installer) return;
      const version = 'v' + release.tag_name.replace(/^v/i, '');
      $$('[data-version]').forEach(element => { element.textContent = version; });
      $$('[data-download]').forEach(link => { link.href = installer.browser_download_url; });
      $('#release-link').href = release.html_url;
      $('#release-channel').textContent = release.prerelease || /beta|alpha|rc/i.test(release.tag_name) ? 'BETA' : 'RELEASE';
      const client = (String(release.name || '') + ' ' + String(release.body || '')).match(/Client\s+v([\d]+(?:\.[\d]+)+(?:[.\-][a-z0-9.\-]+)?)/i);
      $('#client-version').textContent = client ? 'v' + client[1] : '(siehe Release-Notes)';
      const date = new Date(release.published_at);
      $('#release-date').textContent = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }).format(date);
      const notes = typeof release.body === 'string' ? release.body.split(/\r?\n/).map(line => line.replace(/^\s*[-*#]+\s*/, '').trim()).filter(line => line.length >= 28 && !/^https?:\/\//i.test(line)).slice(0, 3) : [];
      const list = $('#release-notes'); list.replaceChildren();
      (notes.length ? notes : ['Die Änderungen findest du in den vollständigen Release-Notes auf GitHub.']).forEach(note => { const item = document.createElement('li'); item.textContent = note; list.append(item); });
    } catch { /* Downloads remain usable when the GitHub API is unavailable. */ }
    finally { clearTimeout(timeout); }
  }
  async function loadDownloadCount() {
    const counter = $('#download-total');
    const status = $('#download-count-status');
    if (!counter || !status) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      let total = 0, page = 1;
      const seenAssets = new Set();
      while (true) {
        const response = await fetch('https://api.github.com/repos/Tegnas/tegnas-launcher/releases?per_page=100&page=' + page, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
        if (!response.ok) throw new Error('GitHub unavailable');
        const releases = await response.json();
        if (!Array.isArray(releases)) throw new Error('Invalid releases');
        for (const release of releases) {
          if (release.draft || !Array.isArray(release.assets)) continue;
          for (const asset of release.assets) {
            if (asset.name !== 'TegnasLauncher.exe') continue;
            if (asset.id != null && seenAssets.has(asset.id)) continue;
            if (!Number.isSafeInteger(asset.download_count) || asset.download_count < 0) throw new Error('Invalid count');
            total += asset.download_count;
            if (!Number.isSafeInteger(total)) throw new Error('Invalid total');
            if (asset.id != null) seenAssets.add(asset.id);
          }
        }
        if (releases.length < 100) break;
        page += 1;
      }
      counter.textContent = new Intl.NumberFormat('de-DE').format(total);
      status.textContent = 'Quelle: GitHub · inkl. Beta-Releases';
    } catch {
      counter.textContent = '—';
      status.textContent = 'GitHub-Zähler derzeit nicht verfügbar';
    } finally { clearTimeout(timeout); }
  }
  loadRelease();
  loadDownloadCount();
})();
