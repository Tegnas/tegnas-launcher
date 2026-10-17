(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const menu = $('.menu-toggle'), navigation = $('#nav-links');
  function closeMenu() { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('is-open'); }
  menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('is-open', open); });
  $$('a', navigation).forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest?.('.navigation')) closeMenu(); });
  window.addEventListener('resize', () => { if (window.innerWidth > 800) closeMenu(); });

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
  $$('[data-color]').forEach(button => button.addEventListener('click', () => {
    const color = button.dataset.color;
    if (!/^#[a-f0-9]{6}$/i.test(color)) return;
    $('#game-preview').style.setProperty('--preview-accent', color);
    $$('[data-color]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  }));
  $$('[data-profile]').forEach(button => button.addEventListener('click', () => {
    const version = button.dataset.profile;
    if (!['26.3', '1.21.10'].includes(version)) return;
    $('#profile-name').textContent = 'Tegnas ' + version;
    $('#profile-meta').textContent = 'Minecraft ' + version + ' · Fabric';
    $$('[data-profile]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  }));
  $('#year').textContent = String(new Date().getFullYear());

  function safeRepositoryUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.toLowerCase().startsWith('/tegnas/tegnas-launcher/'); } catch { return false; }
  }
  async function loadRelease() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch('https://api.github.com/repos/Tegnas/tegnas-launcher/releases/latest', { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) return;
      const release = await response.json();
      if (release.draft || !/^v?\d+\.\d+\.\d+(?:[.\-][a-z0-9.\-]+)?$/i.test(release.tag_name || '') || !safeRepositoryUrl(release.html_url)) return;
      const installer = Array.isArray(release.assets) ? release.assets.find(asset => asset.name === 'TegnasLauncher.exe' && safeRepositoryUrl(asset.browser_download_url)) : null;
      if (!installer) return;
      const version = 'v' + release.tag_name.replace(/^v/i, '');
      $$('[data-version]').forEach(element => { element.textContent = version; });
      $$('[data-download]').forEach(link => { link.href = installer.browser_download_url; });
      $('#release-link').href = release.html_url;
      $('#release-channel').textContent = release.prerelease || /beta|alpha|rc/i.test(release.tag_name) ? 'BETA' : 'RELEASE';
      const client = String(release.name || '').match(/Client\s+v([\d]+(?:\.[\d]+)+(?:[.\-][a-z0-9.\-]+)?)/i);
      $('#client-version').textContent = client ? 'v' + client[1] : '(siehe Release-Notes)';
      const date = new Date(release.published_at);
      $('#release-date').textContent = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }).format(date);
      const notes = typeof release.body === 'string' ? release.body.split(/\r?\n/).map(line => line.replace(/^\s*[-*#]+\s*/, '').trim()).filter(line => line.length >= 28 && !/^https?:\/\//i.test(line)).slice(0, 3) : [];
      const list = $('#release-notes'); list.replaceChildren();
      (notes.length ? notes : ['Die Änderungen findest du in den vollständigen Release-Notes auf GitHub.']).forEach(note => { const item = document.createElement('li'); item.textContent = note; list.append(item); });
    } catch { /* Downloads remain usable when the GitHub API is unavailable. */ }
    finally { clearTimeout(timeout); }
  }
  loadRelease();
})();
