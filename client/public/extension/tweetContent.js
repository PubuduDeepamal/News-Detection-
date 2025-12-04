(() => {
  const API = 'https://newsdetection.cloud/api';
  const SELECTOR = 'article[data-testid="tweet"] [data-testid="tweetText"], article div[data-testid="tweetText"], article [data-testid="tweetText"]';
  const BADGE_CLASS = 'nd-badge';
  const PANEL_CLASS = 'nd-panel';
  const DETAILS_CLASS = 'nd-details';

  let liveEnabled = true;
  let method = 'gpt';
  const queue = [];
  let busy = false;
  let observerStarted = false;

  const style = document.createElement('style');
  style.textContent = `
  .${BADGE_CLASS}{
    display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;margin-top:6px;cursor:pointer;border:1px solid rgba(255,255,255,.12)
  }
  .${BADGE_CLASS}.fake{background:rgba(200,0,60,.12);color:#c8003c}
  .${BADGE_CLASS}.auth{background:rgba(0,140,80,.12);color:#008c50}
  .${PANEL_CLASS}{
    position:fixed;right:16px;bottom:16px;width:360px;max-height:60vh;overflow:auto;background:#fff;color:#111;border:1px solid #ddd;border-radius:12px;box-shadow:0 12px 30px rgba(0,0,0,.2);padding:12px;z-index:999999
  }
  .${PANEL_CLASS} .title{font-weight:700;margin-bottom:6px}
  .${PANEL_CLASS} .row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .${PANEL_CLASS} .close{cursor:pointer}
  .${PANEL_CLASS} .chips{display:flex;flex-wrap:wrap;gap:6px}
  .${PANEL_CLASS} .chip{border:1px solid #ccc;border-radius:12px;padding:4px 8px}
  .${DETAILS_CLASS}{margin-top:6px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(14,26,58,.92);color:#e9eef8}
  .${DETAILS_CLASS} .t{font-weight:700;margin-bottom:6px}
  .${DETAILS_CLASS} .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .${DETAILS_CLASS} .chip{border:1px solid #2453ff;color:#aac3ff;padding:4px 8px;border-radius:999px;background:#0b1430}
  .${DETAILS_CLASS} .link{color:#9bb0d4;cursor:pointer;margin-top:8px;display:inline-block}
  `;
  document.documentElement.appendChild(style);

  function showToast(){
    const id = 'nd-live-toast';
    if(document.getElementById(id)) return;
    const el = document.createElement('div');
    el.id = id;
    el.textContent = 'NewsDetection Live Detect ON';
    el.style.position = 'fixed';
    el.style.right = '16px';
    el.style.top = '16px';
    el.style.zIndex = '999999';
    el.style.background = 'rgba(47,91,255,.9)';
    el.style.color = '#fff';
    el.style.padding = '8px 12px';
    el.style.borderRadius = '8px';
    el.style.fontWeight = '700';
    document.documentElement.appendChild(el);
    setTimeout(()=>{ el.remove(); }, 2000);
  }

  function getTweetContainer(node){
    let el = node.closest('article');
    return el || null;
  }

  function getText(node){
    return node ? node.innerText.trim() : '';
  }

  // local explainer removed per request; only show API-provided details

  function createBadge(isFake, confidence){
    const span = document.createElement('span');
    span.className = `${BADGE_CLASS} ${isFake ? 'fake' : 'auth'}`;
    span.textContent = `${isFake ? 'Potentially False' : 'Likely Authentic'} · ${confidence || 0}%`;
    return span;
  }
  function createDetails(data, content){
    const wrap = document.createElement('div');
    wrap.className = DETAILS_CLASS;
    const isFake = !!data.isFake;
    const headColor = isFake ? '#ff99c2' : '#8fffc1';
    const title = isFake ? "Why it's potentially false" : "Why it's likely authentic";
    const explanation = String(data.explanation || '').slice(0,800);
    const factors = Array.isArray(data.factors) ? data.factors : [];
    const body = explanation || factors.length ?
      `<div>${explanation}</div>${factors.length?`<div class=\"chips\">${factors.map(f=>`<span class=\"chip\">${String(f)}</span>`).join('')}</div>`:''}`
      : `<div>No explanation provided</div>`;
    wrap.innerHTML = `<div class="t" style="color:${headColor}">${title}</div>${body}<div class="link">Open full panel</div>`;
    wrap.querySelector('.link').addEventListener('click', ()=> openPanel(data, content));
    return wrap;
  }
  function createPendingBadge(){
    const span = document.createElement('span');
    span.className = `${BADGE_CLASS}`;
    span.style.background = 'rgba(127,160,255,.12)';
    span.style.color = '#9bb0d4';
    span.textContent = 'Analyzing…';
    return span;
  }

  function attachBadge(container, data, content){
    const existing = container.querySelector(`.${BADGE_CLASS}`);
    const badge = createBadge(!!data.isFake, typeof data.confidence==='number'? data.confidence: 0);
    const detailsExisting = container.querySelector(`.${DETAILS_CLASS}`);
    const details = createDetails(data, content);
    if(existing){ existing.replaceWith(badge); }
    else {
      const textNode = container.querySelector(SELECTOR);
      if(textNode && textNode.parentElement){ textNode.parentElement.insertAdjacentElement('afterend', badge); }
      else { (container.querySelector('div[role="group"]') || container).appendChild(badge); }
    }
    if(detailsExisting){ detailsExisting.replaceWith(details); }
    else {
      if(badge.nextSibling) badge.parentElement.insertBefore(details, badge.nextSibling);
      else badge.parentElement.appendChild(details);
    }
    details.hidden = false;
    badge.addEventListener('click', ()=>{ details.hidden = !details.hidden; });
  }
  function attachError(container, pending){
    const errorBadge = document.createElement('span');
    errorBadge.className = BADGE_CLASS;
    errorBadge.style.background = 'rgba(200,0,60,.12)';
    errorBadge.style.color = '#c8003c';
    errorBadge.textContent = 'Error';
    if(pending && pending.replaceWith) pending.replaceWith(errorBadge); else container.appendChild(errorBadge);
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

  async function detect(content){
    try{
      return new Promise((resolve)=>{
        chrome.runtime.sendMessage({ type:'nd-detect', method, text: content }, (res)=>{
          if(res && res.ok) resolve(res.data); else resolve(null);
        });
      });
    }catch(e){ return null; }
  }

  async function processNode(node){
    const container = getTweetContainer(node);
    if(!container) return;
    const hasBadge = !!container.querySelector(`.${BADGE_CLASS}`);
    if(container.getAttribute('data-nd-processed')==='1' && hasBadge) return;
    container.setAttribute('data-nd-processed','1');
    const textNode = container.querySelector(SELECTOR);
    const text = getText(textNode);
    if(!text || text.length < 5) return;
    const pending = createPendingBadge();
    if(textNode && textNode.parentElement){ textNode.parentElement.insertAdjacentElement('afterend', pending); }
    else { (container.querySelector('div[role="group"]') || container).appendChild(pending); }
    queue.push({ container, text, pending });
    pumpQueue();
  }

  async function pumpQueue(){
    if(busy) return;
    const job = queue.shift();
    if(!job) return;
    busy = true;
    try{
      const data = await detect(job.text);
      if(data) attachBadge(job.container, data, job.text);
      else attachError(job.container, job.pending);
    }catch(_e){ attachError(job.container, job.pending); }
    setTimeout(()=>{ busy=false; pumpQueue(); }, 900);
  }

  function observe(){
    if(observerStarted) return;
    observerStarted = true;
    const obs = new MutationObserver(muts=>{
      if(!liveEnabled) return;
      muts.forEach(m=>{
        m.addedNodes && m.addedNodes.forEach(n=>{
          if(!(n instanceof HTMLElement)) return;
          if(n.matches && n.matches('article[data-testid="tweet"], article')) processNode(n);
          n.querySelectorAll && n.querySelectorAll('article[data-testid="tweet"], article').forEach(el=>processNode(el));
        });
      });
    });
    obs.observe(document.documentElement,{subtree:true, childList:true});
    const scanAll = () => document.querySelectorAll('article[data-testid="tweet"], article').forEach(el=>processNode(el));
    scanAll();
    setInterval(()=>{ if(liveEnabled) scanAll(); }, 5000);
  }

  chrome.storage.sync.get(['nd_live','nd_method'], (res)=>{
    liveEnabled = (res && typeof res.nd_live==='boolean') ? res.nd_live : true;
    method = 'gpt';
    if(liveEnabled){ showToast(); observe(); }
  });

  chrome.storage.onChanged.addListener((changes, area)=>{
    if(area !== 'sync') return;
    if(changes.nd_live){ liveEnabled = !!changes.nd_live.newValue; if(liveEnabled){ showToast(); observe(); } }
    if(changes.nd_method){ method = 'gpt'; }
  });
})();


