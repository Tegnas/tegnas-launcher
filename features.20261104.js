(() => {
  'use strict';
  const button = document.querySelector('#cloud-demo-run');
  const progress = document.querySelector('#cloud-demo-progress');
  const percent = document.querySelector('#cloud-demo-percent');
  const title = document.querySelector('#cloud-demo-title');
  const status = document.querySelector('#cloud-demo-status');
  if (!button || !progress || !percent || !title || !status) return;
  let timer = null;
  function reset() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    button.disabled = false;
  }
  button.addEventListener('click', () => {
    if (timer !== null) return;
    button.disabled = true;
    progress.value = 0;
    percent.textContent = '0 %';
    title.textContent = 'Tegnas 26.3 · Beispiel-Abgleich';
    status.textContent = 'Simulation: Neue Dateien übertragen, unveränderte überspringen.';
    let step = 0;
    timer = window.setInterval(() => {
      step = Math.min(100, step + 10);
      progress.value = step;
      percent.textContent = step + ' %';
      if (step === 100) {
        reset();
        title.textContent = '✓ Beispiel-Abgleich abgeschlossen';
        status.textContent = 'So sieht der Abschluss aus. Es wurden keine echten Dateien übertragen.';
        button.textContent = 'Vorschau wiederholen';
      }
    }, 300);
  });
  window.addEventListener('pagehide', reset);
})();

(() => {
  'use strict';
  const list = document.querySelector('#news-list');
  const status = document.querySelector('#news-status');
  const refresh = document.querySelector('#news-refresh');
  const more = document.querySelector('#news-more');
  const filters = [...document.querySelectorAll('[data-news-filter]')];
  const tickers = [...document.querySelectorAll('[data-news-ticker]')];
  const allowed = ['Neu', 'In Arbeit', 'Bekanntes Problem', 'Erledigt'];
  let items = [], filter = 'all', expanded = false, busy = false, lastSuccess = null, tickerIndex = 0;
  const formatDate = date => new Intl.DateTimeFormat('de-DE', { day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Berlin' }).format(date);
  function updateTicker() {
    const item = items.length ? items[tickerIndex++ % items.length] : null;
    tickers.forEach(el => { el.textContent = item ? item.status + ' · ' + item.title : 'Neuigkeiten und aktuelle Arbeiten · Alle Meldungen'; });
  }
  function render() {
    if (!list) return;
    const selected = items.filter(item => filter === 'all' || item.status === filter);
    const shown = expanded ? selected : selected.slice(0, 6);
    list.replaceChildren();
    for (const item of shown) {
      const card = document.createElement('article'); card.className = 'news-card'; card.dataset.status = item.status;
      const top = document.createElement('div'); top.className = 'news-card-top';
      const badge = document.createElement('span'); badge.className = 'news-card-status'; badge.textContent = item.status;
      const time = document.createElement('time'); time.dateTime = item.updatedAt; time.textContent = formatDate(new Date(item.updatedAt));
      const heading = document.createElement('h3'); heading.textContent = item.title;
      const body = document.createElement('p'); body.className = 'news-card-body'; body.textContent = item.body;
      top.append(badge,time); card.append(top,heading,body); list.append(card);
    }
    if (!shown.length) {
      const empty = document.createElement('p'); empty.className = 'news-empty';
      empty.textContent = items.length ? 'Keine Meldungen mit diesem Status.' : lastSuccess ? 'Zurzeit sind keine Meldungen veröffentlicht.' : 'Die Meldungen sind gerade nicht verfügbar. Bitte später erneut versuchen.';
      list.append(empty);
    }
    if (more) { more.hidden = selected.length <= 6; more.textContent = expanded ? 'Weniger anzeigen' : 'Alle Meldungen anzeigen'; }
  }
  async function loadNews() {
    if (!list || busy) return;
    busy = true; if (refresh) refresh.disabled = true;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('launcher-news.json', { signal:controller.signal, cache:'no-cache', credentials:'omit' });
      if (!response.ok) throw new Error('not available');
      const text = await response.text();
      if (text.length > 1500000) throw new Error('too large');
      const feed = JSON.parse(text);
      if (feed.schema !== 1 || !Array.isArray(feed.items) || feed.items.length > 100) throw new Error('invalid feed');
      const ids = new Set();
      const valid = feed.items.every(item => item && typeof item.id === 'string' && !ids.has(item.id) && ids.add(item.id) && typeof item.title === 'string' && item.title.trim() && item.title.length <= 120 && typeof item.body === 'string' && item.body.length <= 8000 && allowed.includes(item.status) && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt)));
      if (!valid) throw new Error('invalid items');
      items = feed.items.slice().sort((a,b) => Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
      lastSuccess = new Date(); tickerIndex = 0;
      status.textContent = 'Meldungen von Tegnas · aktualisiert um ' + new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Berlin'}).format(lastSuccess) + ' Uhr';
      render(); updateTicker();
    } catch {
      status.textContent = items.length ? 'Neue Meldungen gerade nicht abrufbar. Der zuletzt geladene Stand bleibt sichtbar.' : 'Meldungen gerade nicht abrufbar. Bitte später erneut versuchen.';
      if (!items.length) render();
    } finally { clearTimeout(timeout); busy = false; if (refresh) refresh.disabled = false; }
  }
  filters.forEach(button => button.addEventListener('click', () => {
    filter = button.dataset.newsFilter; expanded = false;
    filters.forEach(other => other.setAttribute('aria-pressed',String(other === button))); render();
  }));
  more?.addEventListener('click', () => { expanded = !expanded; render(); });
  refresh?.addEventListener('click',loadNews);
  setInterval(() => { if (!document.hidden) loadNews(); }, 300000);
  setInterval(() => { if (!document.hidden) updateTicker(); }, 12000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!lastSuccess || Date.now()-lastSuccess.getTime()>300000)) loadNews(); });
  loadNews();

  const input = document.querySelector('#spelling-input');
  const mode = document.querySelector('#spelling-mode');
  const hint = document.querySelector('#spelling-hint');
  const hintWord = document.querySelector('#spelling-word');
  const accept = document.querySelector('#spelling-accept');
  const result = document.querySelector('#spelling-result');
  const reset = document.querySelector('#spelling-reset');
  if (!input || !mode || !hint || !hintWord || !accept || !result || !reset) return;
  const examples = { nciht:'nicht', nihct:'nicht', udn:'und', dnake:'danke', dsa:'das', bitet:'bitte', vieleicht:'vielleicht' };
  let current = null, undo = null;
  function lookup(value, caret) {
    if (mode.value === 'off' || value.trimStart().startsWith('/')) return null;
    const before = value.slice(0,caret), match = before.match(/(?:^|\s)([a-zäöüß]+)$/i);
    if (!match || (value[caret] && /[a-zäöüß\d_]/i.test(value[caret]))) return null;
    const from = match[1], to = examples[from.toLowerCase()];
    if (!to) return null;
    const replacement = from === from.toUpperCase() ? to.toUpperCase() : /^[A-ZÄÖÜ]/.test(from) ? to[0].toUpperCase()+to.slice(1) : to;
    return { start:caret-from.length,end:caret,from,to:replacement };
  }
  function paint() {
    current = input.selectionStart === input.selectionEnd ? lookup(input.value,input.selectionStart ?? input.value.length) : null;
    hint.classList.toggle('is-idle',!current); input.classList.toggle('is-misspelled',!!current); accept.hidden = !current;
    const label = hint.querySelector('span');
    if (current) { label.replaceChildren(document.createTextNode('Vorschlag: '),hintWord); hintWord.textContent = current.to; }
    else label.textContent = mode.value === 'off' ? 'Schreibhilfe ausgeschaltet' : 'Bereit für deine nächste Nachricht.';
  }
  function takeSuggestion() {
    paint(); if (!current) return false;
    const {start,end,to} = current, oldValue = input.value, oldCaret = input.selectionStart;
    const value = oldValue.slice(0,start)+to+oldValue.slice(end); if (value.length>256) return false;
    input.value = value; input.setSelectionRange(start+to.length,start+to.length);
    undo = { before:oldValue,caret:oldCaret,after:value };
    result.textContent = 'Vorschlag übernommen · Strg+Z nimmt ihn zurück.'; paint(); return true;
  }
  input.addEventListener('keydown',event => {
    if (event.key === 'Tab' && !event.shiftKey && mode.value !== 'off' && takeSuggestion()) event.preventDefault();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && undo && input.value === undo.after) {
      event.preventDefault(); input.value = undo.before; input.setSelectionRange(undo.caret,undo.caret); undo = null; result.textContent = 'Korrektur zurückgenommen.'; paint();
    }
  });
  input.addEventListener('input',event => {
    undo = null;
    const caret = input.selectionStart ?? input.value.length;
    if (mode.value === 'auto' && event.inputType === 'insertText' && /^[ ,.!?;]$/.test(event.data || '') && input.selectionStart === input.selectionEnd) {
      const typed = input.value, candidate = lookup(typed.slice(0,caret-1)+typed.slice(caret),caret-1);
      if (candidate) {
        const replaced = typed.slice(0,candidate.start)+candidate.to+typed.slice(candidate.end);
        if (replaced.length<=256) { input.value = replaced; const pos = caret+candidate.to.length-(candidate.end-candidate.start); input.setSelectionRange(pos,pos); undo = {before:typed,caret,after:replaced}; result.textContent = 'Typischen Tippfehler korrigiert · Strg+Z nimmt ihn zurück.'; }
      }
    }
    paint();
  });
  ['click','keyup','select'].forEach(type => input.addEventListener(type,paint));
  accept.addEventListener('click', () => { takeSuggestion(); input.focus(); });
  mode.addEventListener('change', () => { undo = null; result.textContent = mode.value === 'auto' ? 'Tippe „nciht“ und dann ein Leerzeichen.' : mode.value === 'off' ? 'Deine Eingabe wird unverändert übernommen.' : 'Probiere „nciht“, „udn“ oder „dnake“.'; paint(); });
  reset.addEventListener('click', () => { input.value = 'ich kann nciht'; input.setSelectionRange(input.value.length,input.value.length); undo = null; result.textContent = 'Probiere „nciht“, „udn“ oder „dnake“.'; paint(); input.focus(); });
  input.setSelectionRange(input.value.length,input.value.length); paint();
})();
