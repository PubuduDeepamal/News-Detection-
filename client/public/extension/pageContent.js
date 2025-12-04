(() => {
  const API = 'https://newsdetection.cloud/api';
  const BADGE_CLASS = 'nd-badge';
  const PANEL_CLASS = 'nd-panel';
  let liveEnabled = true;

  const style = document.createElement('style');
  style.textContent = `
  .${BADGE_CLASS}{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;margin-top:6px;cursor:pointer;border:1px solid rgba(0,0,0,.12)}
  .${BADGE_CLASS}.fake{background:rgba(200,0,60,.12);color:#c8003c}
  .${BADGE_CLASS}.auth{background:rgba(0,140,80,.12);color:#008c50}
  .${PANEL_CLASS}{position:fixed;right:16px;bottom:16px;width:360px;max-height:60vh;overflow:auto;background:#fff;color:#111;border:1px solid #ddd;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.2);padding:12px;z-index:999999}
  .${PANEL_CLASS} .title{font-weight:700;margin-bottom:6px}
  .${PANEL_CLASS} .row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .${PANEL_CLASS} .close{cursor:pointer}
  .${PANEL_CLASS} .chips{display:flex;flex-wrap:wrap;gap:6px}
  .${PANEL_CLASS} .chip{border:1px solid #ccc;border-radius:12px;padding:4px 8px}
  `;
  document.documentElement.appendChild(style);

  function getPlatformSelectors(){
    const h = location.hostname;
    if(/reddit\.com$/i.test(h) || /\.reddit\.com$/i.test(h)) return {
      container: 'div[data-testid="post-container"], div.Post',
      textNode: 'div[data-click-id="text"], h1, h2, p'
    };
    if(/facebook\.com$/i.test(h) || /\.facebook\.com$/i.test(h)) return {
      container: 'div[role="article"]',
      textNode: 'div[dir="auto"], span[dir="auto"], p'
    };
    if(/threads\.net$/i.test(h) || /\.threads\.net$/i.test(h)) return {
      container: 'article, div[role="dialog"] article',
      textNode: 'article div, article p'
    };
    return { container: 'article, div', textNode: 'p, div' };
  }

  function extractText(container, textSel){
    const nodes = container.querySelectorAll(textSel);
    let text = '';
    nodes.forEach(n => { const t = (n.innerText||'').trim(); if(t) text += (text ? '\n' : '') + t; });
    return text.slice(0, 5000);
  }

  function createBadge(isFake, confidence){
    const span = document.createElement('span');
    span.className = `${BADGE_CLASS} ${isFake ? 'fake' : 'auth'}`;
    span.textContent = `${isFake ? 'Potentially False' : 'Likely Authentic'} · ${confidence || 0}%`;
    return span;
  }

  function openPanel(data, content){
    closePanel();
    const panel = document.createElement('div');
    panel.className = PANEL_CLASS;
    panel.innerHTML = `
      <div class="row"><div class="title">NewsDetection</div><div class="close">✕</div></div>
      <div><b>Status:</b> ${data.isFake?'<span style="color:#c8003c">Potentially False</span>':'<span style="color:#008c50">Likely Authentic</span>'}</div>
      <div><b>Confidence:</b> ${typeof data.confidence==='number'?data.confidence:0}%</div>
      ${data.explanation?`<div style="margin-top:8px"><b>Explanation</b><div>${String(data.explanation)}</div></div>`:''}
      ${Array.isArray(data.factors)&&data.factors.length?`<div style="margin-top:8px"><b>Factors</b><div class="chips">${data.factors.map(f=>`<span class="chip">${String(f)}</span>`).join('')}</div></div>`:''}
      <details style="margin-top:8px"><summary>Raw JSON</summary><pre style="white-space:pre-wrap">${JSON.stringify(data,null,2)}</pre></details>
      <details style="margin-top:8px"><summary>Original Text</summary><pre style="white-space:pre-wrap">${(content||'').slice(0,5000)}</pre></details>
    `;
    panel.querySelector('.close').addEventListener('click', closePanel);
    document.documentElement.appendChild(panel);
  }

  function closePanel(){
    const p = document.querySelector(`.${PANEL_CLASS}`);
    if(p) p.remove();
  }

  function attachBadge(container, data, content){
    const existing = container.querySelector(`.${BADGE_CLASS}`);
    const badge = createBadge(!!data.isFake, typeof data.confidence==='number'? data.confidence: 0);
    if(existing){ existing.replaceWith(badge); }
    else { container.insertAdjacentElement('afterbegin', badge); }
    badge.addEventListener('click', ()=> openPanel(data, content));
  }

  function attachError(container){
    const errorBadge = document.createElement('span');
    errorBadge.className = BADGE_CLASS;
    errorBadge.style.background = 'rgba(200,0,60,.12)';
    errorBadge.style.color = '#c8003c';
    errorBadge.textContent = 'Error';
    container.insertAdjacentElement('afterbegin', errorBadge);
  }

  function normalizeText(t){
    return (t||'').replace(/\s+/g,' ').trim();
  }

  function getContainers(){
    const sel = getPlatformSelectors();
    return { nodes: document.querySelectorAll(sel.container), textSel: sel.textNode };
  }

  function analyze(text){
    return new Promise((resolve)=>{
      chrome.runtime.sendMessage({ type:'nd-detect', method: 'gpt', text }, (res)=>{
        if(res && res.ok) resolve(res.data); else resolve(null);
      });
    });
  }

  async function processContainer(el, textSel){
    if(el.getAttribute('data-nd-processed')==='1') return;
    el.setAttribute('data-nd-processed','1');
    const text = normalizeText(extractText(el, textSel));
    if(!text || text.length < 20) return;
    try{
      const data = await analyze(text);
      if(data) attachBadge(el, data, text); else attachError(el);
    }catch(_e){ attachError(el); }
  }

  function scanAll(){
    const { nodes, textSel } = getContainers();
    nodes.forEach(el => processContainer(el, textSel));
  }

  function observe(){
    const obs = new MutationObserver(muts=>{
      if(!liveEnabled) return;
      muts.forEach(m=>{
        m.addedNodes && m.addedNodes.forEach(n=>{
          if(!(n instanceof HTMLElement)) return;
          const { nodes, textSel } = getContainers();
          if(nodes && nodes.length){ processContainer(n, textSel); }
          n.querySelectorAll && n.querySelectorAll(getPlatformSelectors().container).forEach(el=>processContainer(el, getPlatformSelectors().textNode));
        });
      });
    });
    obs.observe(document.documentElement,{subtree:true, childList:true});
    scanAll();
    setInterval(()=>{ if(liveEnabled) scanAll(); }, 5000);
  }

  chrome.storage.sync.get(['nd_live'], (res)=>{
    liveEnabled = res && typeof res.nd_live==='boolean' ? res.nd_live : true;
    if(liveEnabled) observe(); else { observe(); }
  });

  chrome.storage.onChanged.addListener((changes, area)=>{
    if(area !== 'sync') return;
    if(changes.nd_live){ liveEnabled = !!changes.nd_live.newValue; }
  });
})();


