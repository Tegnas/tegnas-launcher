import {summarizeReleases, fetchAllReleases} from './release-data.mjs';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const number = new Intl.NumberFormat('de-DE');
const date = v => new Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Europe/Berlin'}).format(new Date(v));
const stamp = v => new Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Europe/Berlin'}).format(new Date(v));
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

$('#year').textContent = new Date().getFullYear();

/* ---------- Navigation ---------- */
const menu = $('#menu-toggle'), nav = $('#main-nav');
function closeMenu(focus = false) {
  menu.setAttribute('aria-expanded', 'false');
  nav.classList.remove('is-open');
  document.body.classList.remove('menu-open');
  if (focus) menu.focus();
}
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  nav.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeMenu()));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) closeMenu(true); });
document.addEventListener('click', e => { if (!e.target.closest('.header')) closeMenu(); });
matchMedia('(min-width: 961px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

const header = $('.header');
const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, {passive:true}); onScroll();

/* ---------- Tab helpers (WAI-ARIA tabs, automatic activation) ---------- */
function keys(buttons, activate) {
  buttons.forEach((b, i) => b.addEventListener('keydown', e => {
    let n = i;
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) n = (i + 1) % buttons.length;
    else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) n = (i + buttons.length - 1) % buttons.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = buttons.length - 1;
    else return;
    e.preventDefault(); activate(buttons[n]); buttons[n].focus();
  }));
}
function select(buttons, b) {
  buttons.forEach(x => { x.setAttribute('aria-selected', String(x === b)); x.tabIndex = x === b ? 0 : -1; });
}

/* ---------- Launcher preview ---------- */
const tabs = $$('[data-tab]'); let cloudTimer;
const cloudIdle = 'Beispiel · Es werden keine Dateien übertragen.';
function tab(b) {
  select(tabs, b);
  tabs.forEach(x => { $('#' + x.getAttribute('aria-controls')).hidden = x !== b; });
  if (b.dataset.tab !== 'cloud') {
    clearInterval(cloudTimer);
    $('#cloud-run').disabled = false; $('#cloud-progress').value = 0;
    $('#cloud-status').textContent = cloudIdle;
    $('.sync-visual').classList.remove('is-running', 'is-done');
  }
}
tabs.forEach(b => b.addEventListener('click', () => tab(b))); keys(tabs, tab);

$$('[data-profile]').forEach(b => b.addEventListener('click', () => {
  $$('[data-profile]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  $('#active-profile').textContent = b.querySelector('strong').textContent + ' · ' + b.dataset.profile;
}));

$$('.switch').forEach(b => b.addEventListener('click', () => {
  const active = b.getAttribute('aria-checked') !== 'true';
  b.setAttribute('aria-checked', String(active));
  $('#mod-status').textContent = b.closest('.mod-item').querySelector('strong').textContent + (active ? ' aktiviert.' : ' deaktiviert.') + ' Nur in dieser Vorschau.';
}));

$('#cloud-run').addEventListener('click', () => {
  const visual = $('.sync-visual'), p = $('#cloud-progress');
  $('#cloud-run').disabled = true; p.value = 0;
  visual.classList.remove('is-done'); visual.classList.add('is-running');
  $('#cloud-status').textContent = 'Simulation · Profildaten werden abgeglichen …';
  cloudTimer = setInterval(() => {
    p.value = Math.min(100, p.value + 10);
    if (p.value >= 70 && p.value < 100) $('#cloud-status').textContent = 'Simulation · Dateien werden geprüft und vorbereitet …';
    if (p.value === 100) {
      clearInterval(cloudTimer);
      $('#cloud-run').disabled = false;
      visual.classList.remove('is-running'); visual.classList.add('is-done');
      $('#cloud-status').textContent = 'Beispiel abgeschlossen. Keine Dateien übertragen.';
    }
  }, 240);
});

let startTimer; const dialog = $('#start-dialog');
const logLines = ['✓ Beispielprofil ausgewählt', '✓ Einstellungen bereit', '✓ Inhalte bereit', '✓ Bereit für Minecraft'];
$('#play-demo').addEventListener('click', () => {
  const profile = $('[data-profile][aria-pressed=true]');
  $('#start-profile').textContent = profile.querySelector('strong').textContent + ' · Minecraft ' + profile.dataset.profile + ' · Fabric';
  $('#start-title').textContent = 'Dein Profil startet.';
  $('#start-progress').value = 0;
  $('#start-log').textContent = logLines[0] + '\n› Start wird vorbereitet …';
  dialog.showModal();
  let n = 0;
  startTimer = setInterval(() => {
    n++;
    $('#start-progress').value = n * 25;
    const done = logLines.slice(0, Math.min(n + 1, 4)).join('\n');
    const next = ['› Inhalte werden geprüft …', '› Spielstart wird vorbereitet …', ''][Math.min(n - 1, 2)];
    $('#start-log').textContent = done + (n < 3 ? '\n' + next : '');
    if (n === 4) { clearInterval(startTimer); $('#start-title').textContent = 'Bereit für deine Welt.'; }
  }, 550);
});
function endStart() { clearInterval(startTimer); dialog.close(); }
$('#close-start').addEventListener('click', endStart);
$('#finish-start').addEventListener('click', endStart);
dialog.addEventListener('close', () => { clearInterval(startTimer); $('#play-demo').focus(); });
dialog.addEventListener('click', e => { if (e.target === dialog) endStart(); });

/* ---------- Funktionen ---------- */
const features = [
  {k:'Profile & Konten', title:'Jede Runde hat ihren Platz.',
   text:'Eigene Instanzen für verschiedene Minecraft-Versionen, mehrere Konten und getrennte Inhalte. Profile lassen sich umbenennen, duplizieren und löschen. So bleibt dein Setup übersichtlich.',
   art:'<div class="art-stack"><div class="art-card is-active"><i class="block-icon b0"></i><span><b>Feierabend</b><small>26.3 · Fabric · aktiv</small></span></div><div class="art-card"><i class="block-icon b2"></i><span><b>Citybuild</b><small>1.21.10 · Fabric</small></span></div><div class="art-card"><i class="block-icon b3"></i><span><b>Kreativbau</b><small>1.21.8 · Fabric</small></span></div></div>', tab:'profile'},
  {k:'Mods & Ressourcen', title:'Mach Minecraft zu deinem.',
   text:'Mods über Modrinth finden und verwalten. Ressourcenpakete, Shader und Skins passend zum Profil einrichten. Inhalte müssen zu deiner Minecraft-Version passen.',
   art:'<div class="art-mods"><div><i class="block-icon b0"></i><small>Mods</small></div><div><i class="block-icon b2"></i><small>Ressourcen</small></div><div><i class="block-icon b1"></i><small>Shader</small></div><div><i class="block-icon b3"></i><small>Skins</small></div></div>', tab:'mods'},
  {k:'OneDrive · Beta · optional', title:'Heute PC. Morgen Laptop.',
   text:'Ausgewählte Profile, Mods, Packs und Einstellungen mit deinem eigenen OneDrive mitnehmen. Lokale Spielordner bleiben erhalten. Die Anmeldung und gerätespezifische Einstellungen bleiben auf dem jeweiligen PC.',
   art:'<div class="art-cloud"><span><svg class="icon"><use href="#i-pc"/></svg><small>Dein PC</small></span><i></i><span class="hl"><svg class="icon"><use href="#i-cloud"/></svg><small>OneDrive</small></span><i></i><span><svg class="icon"><use href="#i-laptop"/></svg><small>Laptop</small></span></div>', tab:'cloud'}
];
let featureIndex = 0; const featureButtons = $$('[data-feature]');
function feature(b) {
  select(featureButtons, b);
  featureIndex = Number(b.dataset.feature);
  const f = features[featureIndex];
  $('#feature-panel').setAttribute('aria-labelledby', b.id);
  $('#feature-kicker').textContent = f.k;
  $('#feature-title').textContent = f.title;
  $('#feature-text').textContent = f.text;
  $('#feature-art').innerHTML = f.art;
}
featureButtons.forEach(b => b.addEventListener('click', () => feature(b))); keys(featureButtons, feature); feature(featureButtons[0]);
$('#try-feature').addEventListener('click', () => {
  const b = $('#demo-' + features[featureIndex].tab);
  tab(b);
  $('#launcher').scrollIntoView({block:'center', behavior: reducedMotion() ? 'instant' : 'smooth'});
  b.focus({preventScroll:true});
});

/* ---------- Anleitung (schematische Klick-Anleitung) ---------- */
// Each miniature marks the element to click with .target; they are schematic, not screenshots.
const steps = [
  {title:'Eine Datei. Alles dabei.',
   body:'Lade TegnasLauncher.exe aus dem Download-Bereich herunter und öffne die Datei per Doppelklick. Der Tegnas Client ist bereits enthalten. Folge den Schritten beim ersten Start.',
   tip:'Windows 10 / 11 · 64 Bit',
   mini:`<div class="mini-window"><div class="mini-bar"><i></i><span>Downloads</span></div><div class="mini-body"><div class="mini-file target"><span class="mini-exe"></span><span><b>TegnasLauncher.exe</b><small>Doppelklick zum Öffnen</small></span></div><div class="mini-file dim"><span class="mini-exe"></span><span><b>…</b><small>andere Dateien</small></span></div></div></div>`},
  {title:'Dein Konto verbinden.',
   body:'Öffne im Launcher die Kontoverwaltung und klicke auf „Konto hinzufügen“. Melde dich im offiziellen Microsoft-Login mit dem Konto an, das Minecraft: Java Edition besitzt. Die Anmeldung findet im Launcher statt.',
   tip:'Du brauchst Minecraft: Java Edition.',
   mini:`<div class="mini-window"><div class="mini-bar"><i></i><span>Kontoverwaltung</span></div><div class="mini-body"><div class="mini-row dim"><span class="mini-avatar"></span><span>Noch kein Konto</span></div><div class="mini-button target">+ Konto hinzufügen</div><small class="mini-note">Weiter im offiziellen Microsoft-Login</small></div></div>`},
  {title:'Ein Profil für deine Runde.',
   body:'Erstelle ein Profil und gib ihm einen Namen. Wähle 1.21.8, 1.21.10, 1.21.11 oder 26.3. Fabric bringt dir den Tegnas Client und passende Mods; Vanilla startet ohne diese Client-Funktionen. Der Profilordner wird automatisch angelegt.',
   tip:'Mods und Packs müssen zur Version passen.',
   mini:`<div class="mini-window"><div class="mini-bar"><i></i><span>Neues Profil</span></div><div class="mini-body"><div class="mini-field"><small>Name</small><span>Meine Welt</span></div><div class="mini-field"><small>Minecraft-Version</small><span>26.3 ▾</span></div><div class="mini-seg"><span class="target">Fabric</span><span>Vanilla</span></div></div></div>`},
  {title:'Deine Welt ist dran.',
   body:'Wähle Konto und Profil aus. Ergänze bei Bedarf Mods, Ressourcenpakete oder Shader und klicke auf „Spielen“. Beim ersten Start werden benötigte Dateien eingerichtet. Warte, bis dieser Vorgang abgeschlossen ist.',
   tip:'Beim ersten Start kann die Einrichtung etwas dauern.',
   mini:`<div class="mini-window"><div class="mini-bar"><i></i><span>Tegnas</span></div><div class="mini-body"><div class="mini-row"><span class="mini-avatar on"></span><span>Konto · Profil „Meine Welt“</span></div><div class="mini-play target">Spielen ▶</div></div></div>`}
];
let stepIndex = 0; const stepButtons = $$('[data-step]');
function guide(b) {
  select(stepButtons, b);
  stepIndex = Number(b.dataset.step);
  const s = steps[stepIndex];
  stepButtons.forEach((x, i) => x.classList.toggle('is-done', i < stepIndex));
  $('#guide-panel').setAttribute('aria-labelledby', b.id);
  $('#guide-counter').textContent = 'Schritt ' + (stepIndex + 1) + ' von 4';
  $('#guide-bar').style.width = ((stepIndex + 1) / 4 * 100) + '%';
  $('#guide-step-title').textContent = s.title;
  $('#guide-step-body').textContent = s.body;
  $('#guide-tip').textContent = s.tip;
  $('#guide-miniature').innerHTML = s.mini + '<span class="mini-caption">Schematische Darstellung</span>';
  $('#guide-download').hidden = stepIndex !== 0;
  $('#guide-prev').disabled = stepIndex === 0;
  $('#guide-next').disabled = stepIndex === 3;
}
stepButtons.forEach(b => b.addEventListener('click', () => guide(b))); keys(stepButtons, guide); guide(stepButtons[0]);
$('#guide-prev').addEventListener('click', () => guide(stepButtons[Math.max(0, stepIndex - 1)]));
$('#guide-next').addEventListener('click', () => guide(stepButtons[Math.min(3, stepIndex + 1)]));

addEventListener('pagehide', () => { clearInterval(cloudTimer); clearInterval(startTimer); });

/* ---------- Aktueller Abschnitt in der Navigation ---------- */
if ('IntersectionObserver' in window) {
  const links = [...nav.querySelectorAll('a')];
  const observer = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) links.forEach(a => {
      const on = a.hash === '#' + e.target.id;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }), {rootMargin:'-20% 0px -65% 0px'});
  ['top', 'funktionen', 'client', 'anleitung', 'download', 'updates', 'hilfe'].forEach(id => observer.observe($('#' + id)));
}

/* ---------- Ehrliche GitHub-Daten mit datiertem Fallback ---------- */
let currentData = null, loading = false;
function setStatus(state, text) {
  const box = $('#stat-status-box');
  box.classList.remove('is-live', 'is-stale', 'is-loading');
  box.classList.add('is-' + state);
  $('#stats-status').textContent = text;
}
function renderData(data, live = false) {
  currentData = data;
  $('#download-count').textContent = number.format(data.downloads);
  const r = data.latest;
  $$('[data-download]').forEach(a => a.href = r.asset.url);
  $$('[data-version]').forEach(e => e.textContent = r.tag);
  $$('[data-beta]').forEach(e => e.hidden = !r.beta);
  $$('[data-size]').forEach(e => e.textContent = number.format(Math.round(r.asset.size / 1024 / 1024 * 10) / 10) + ' MiB');
  $$('[data-date]').forEach(e => e.textContent = date(r.publishedAt));
  $('.checksum').hidden = !r.asset.sha256;
  if (r.asset.sha256) $('#checksum-value').textContent = r.asset.sha256;
  setStatus(live ? 'live' : 'stale', live ? 'Live von GitHub · ' + stamp(data.checkedAt) + ' Uhr' : 'Gespeicherter Stand: ' + stamp(data.checkedAt) + ' Uhr');
  $('#release-data-note').textContent = live ? 'Aktuelle Daten aus den GitHub-Releases.' : 'Gespeicherter Stand vom ' + stamp(data.checkedAt) + ' Uhr. Neuere Releases können auf GitHub verfügbar sein.';
  const list = $('#release-list'); list.replaceChildren();
  data.releases.forEach((rel, index) => {
    const details = document.createElement('details'); details.className = 'release'; details.open = index === 0;
    const summary = document.createElement('summary');
    const time = document.createElement('time'); time.dateTime = rel.publishedAt; time.textContent = date(rel.publishedAt);
    const title = document.createElement('span'); title.className = 'release-title'; title.textContent = rel.name;
    if (index === 0) { const n = document.createElement('span'); n.className = 'new-badge'; n.textContent = 'Neueste'; title.append(' ', n); }
    const toggle = document.createElement('span'); toggle.className = 'plus'; toggle.setAttribute('aria-hidden', 'true');
    summary.append(time, title, toggle);
    const body = document.createElement('div'); body.className = 'details-body release-body';
    const text = document.createElement('p'); text.className = 'release-text';
    text.textContent = (rel.body || 'Die vollständigen Änderungen findest du auf GitHub.').replace(/\r\n/g, '\n').trim();
    const link = document.createElement('a'); link.className = 'text-link'; link.href = rel.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.innerHTML = 'Release auf GitHub ansehen <svg class="icon" aria-hidden="true"><use href="#i-external"/></svg><span class="sr-only">(neuer Tab)</span>';
    body.append(text, link); details.append(summary, body); list.append(details);
  });
}
async function refresh() {
  if (loading) return;
  loading = true; $('#refresh-stats').disabled = true;
  setStatus('loading', currentData ? 'Gespeicherter Stand: ' + stamp(currentData.checkedAt) + ' Uhr · GitHub wird abgefragt …' : 'GitHub wird abgefragt …');
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const raw = await fetchAllReleases(fetch, controller.signal);
    renderData(summarizeReleases(raw), true);
  } catch {
    setStatus('stale', currentData ? 'Gespeicherter Stand: ' + stamp(currentData.checkedAt) + ' Uhr · GitHub gerade nicht erreichbar.' : 'Downloadzahl gerade nicht verfügbar.');
    $('#release-data-note').textContent = currentData ? 'Gespeicherter Stand vom ' + stamp(currentData.checkedAt) + ' Uhr. Neuere Releases können auf GitHub verfügbar sein.' : 'Release-Informationen gerade nicht abrufbar. Bitte öffne GitHub.';
  } finally { clearTimeout(timeout); loading = false; $('#refresh-stats').disabled = false; }
}
$('#refresh-stats').addEventListener('click', refresh);
$('#copy-checksum').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('#checksum-value').textContent); $('#copy-status').textContent = 'Prüfsumme kopiert.'; }
  catch { $('#copy-status').textContent = 'Kopieren im Browser nicht verfügbar. Du kannst die Prüfsumme oben markieren und kopieren.'; }
});
$$('[data-download]').forEach(a => a.addEventListener('click', () => {
  $('#download-feedback').textContent = 'Der Download startet über GitHub. Falls nichts passiert, nutze „Alle Versionen & Release-Notes“.';
}));

try {
  const response = await fetch('./snapshot.json', {credentials:'same-origin'});
  if (response.ok) renderData(await response.json());
} catch { /* Download bleibt auch ohne Statistik verfügbar. */ }
refresh();
