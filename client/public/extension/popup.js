async function getActiveTabUrl(){
  return new Promise((resolve)=>{
    chrome.tabs.query({active:true,currentWindow:true},(tabs)=>{
      resolve(tabs && tabs[0] ? tabs[0].url : '');
    });
  });
}

const methodEl = document.getElementById('method');
const twitterField = document.getElementById('twitterField');
const errorEl = document.getElementById('error');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btnText');
const statusBadge = document.getElementById('statusBadge');
const resultCard = document.getElementById('resultCard');
const statusText = document.getElementById('statusText');
const confText = document.getElementById('confText');
const explanationText = document.getElementById('explanationText');
const factorsWrap = document.getElementById('factors');
const factorsSection = document.getElementById('factorsSection');
const jsonPre = document.getElementById('json');
const downloadPdfBtn = document.getElementById('downloadPdf');
const liveDetectEl = document.getElementById('liveDetect');

function setLoading(isLoading){
  spinner.style.display = isLoading ? 'inline-block' : 'none';
  btnText.textContent = isLoading ? 'Analyzing...' : 'Analyze';
  statusBadge.textContent = isLoading ? 'Working' : 'Idle';
}

function showError(msg){
  errorEl.hidden = !msg;
  if(msg){ errorEl.textContent = msg; }
}

methodEl.addEventListener('change', ()=>{
  twitterField.style.display = methodEl.value === 'gpt' ? 'block' : 'none';
  chrome.storage.sync.set({ nd_method: methodEl.value });
});
twitterField.style.display = methodEl.value === 'gpt' ? 'block' : 'none';
liveDetectEl.addEventListener('change', ()=>{
  chrome.storage.sync.set({ nd_live: liveDetectEl.checked });
});
chrome.storage.sync.get(['nd_method','nd_live'], (res)=>{
  methodEl.value = 'gpt';
  twitterField.style.display = 'block';
  if(res && typeof res.nd_live==='boolean'){ liveDetectEl.checked = res.nd_live; }
  else { liveDetectEl.checked = true; chrome.storage.sync.set({ nd_live: true }); }
});

document.getElementById('analyze').addEventListener('click', async ()=>{
  const contentEl = document.getElementById('content');
  const method = methodEl.value;
  const twitterLink = document.getElementById('twitterLink').value.trim();
  let content = contentEl.value.trim();
  showError('');
  resultCard.hidden = true;
  setLoading(true);

  if(!content && method !== 'gpt'){
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if(tab && tab.id){
      try{
        const [{result}] = await chrome.scripting.executeScript({
          target:{tabId:tab.id},
          func:()=>document.body && document.body.innerText ? document.body.innerText.slice(0,5000) : ''
        });
        content = (result||'').trim();
      }catch(e){
        content='';
      }
    }
  }

  const apiUrl = 'https://newsdetection.cloud/api';
  let endpoint='';
  endpoint = `${apiUrl}/detect/gpt`;

  const body = method==='gpt' ? { content, twitterLink: twitterLink || undefined } : { content };
  try{
    const resp = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await resp.json();
    resultCard.hidden = false;
    const isFake = !!data.isFake;
    statusText.textContent = isFake ? 'Potentially False' : 'Likely Authentic';
    statusText.style.color = isFake ? '#ff99c2' : '#8fffc1';
    confText.textContent = `Confidence: ${typeof data.confidence==='number'? data.confidence: 0}%`;
    explanationText.textContent = data.explanation || '';
    factorsWrap.innerHTML = '';
    const factors = Array.isArray(data.factors) ? data.factors : [];
    factorsSection.hidden = factors.length === 0;
    factors.forEach(f=>{
      const div=document.createElement('div');
      div.className='chip';
      div.textContent=String(f);
      factorsWrap.appendChild(div);
    });
    jsonPre.textContent = JSON.stringify(data,null,2);
    downloadPdfBtn.onclick = ()=> generateDetailedPdf(content, data);
  }catch(e){
    showError('Error: '+(e && e.message ? e.message : 'Unknown error'));
  }
  setLoading(false);
});

function getWordCount(text){
  if(!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function splitSentences(text){
  if(!text) return [];
  const normalized = text.replace(/\n+/g,' ').replace(/\s+/g,' ').trim();
  const parts = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  return parts.map(s=>s.trim()).filter(Boolean);
}
function analyzeSentence(s){
  const words = s.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = s.length;
  const exclamations = (s.match(/!/g)||[]).length;
  const questions = (s.match(/\?/g)||[]).length;
  const urls = (s.match(/https?:\/\/\S+/gi)||[]).length;
  const numbers = (s.match(/\b\d+[\d,.:\/]*\b/g)||[]).length;
  const months = 'january|february|march|april|may|june|july|august|september|october|november|december';
  const datesLike = (s.match(new RegExp(`\\b((?:${months})\\b|\\d{1,2}[\/.-]\\d{1,2}[\/.-]\\d{2,4}|\\b(?:19|20)\\d{2}\\b)`, 'ig'))||[]).length;
  const uppercaseWords = words.filter(w=>w.length>1 && /^[A-Z]{2,}$/.test(w.replace(/[^A-Za-z]/g,''))).length;
  const uppercaseWordRatio = wordCount ? +(uppercaseWords/wordCount).toFixed(3) : 0;
  const hedgingList = ['allegedly','reportedly','claims','claim','sources say','might','could','unconfirmed','rumor','rumour','suggests','appears','likely','unlikely','possibly','unclear'];
  const foundHedging = hedgingList.filter(h=> new RegExp(`\\b${h.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}\\b`,'i').test(s));
  return { wordCount, charCount, exclamations, questions, urls, numbers, datesLike, uppercaseWordRatio, hedging: foundHedging };
}
function getRiskScore(a){
  let score = 0;
  if(a.exclamations>0) score+=2;
  if(a.uppercaseWordRatio>0.12) score+=2;
  if(a.uppercaseWordRatio>0.2) score+=1;
  if(a.hedging.length>0) score+=1;
  if(a.urls>0) score+=1;
  return score;
}
function getRiskColor(score){
  if(score>=4) return '#C8003C';
  if(score>=2) return '#D27800';
  return '#008C50';
}
function escapeRegex(s){return s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');}
function tokenizeSentence(s){
  const hedgingList = ['allegedly','reportedly','claims','claim','sources say','might','could','unconfirmed','rumor','rumour','suggests','appears','likely','unlikely','possibly','unclear'];
  const hedgingAlt = hedgingList.map(escapeRegex).join('|');
  const monthsAlt = 'january|february|march|april|may|june|july|august|september|october|november|december';
  const pattern = new RegExp(`(https?:\\/\\/\\S+)|(\\b(?:${hedgingAlt})\\b)|([A-Z]{2,}[A-Z0-9]*)|(\\b\\d+[\\d,.:\\/]*\\b)|(\\b(?:${monthsAlt})\\b|\\b\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4}\\b|\\b(?:19|20)\\d{2}\\b)|([!?])|(\\s+)|(.)`,'g');
  const tokens=[]; let m;
  while((m=pattern.exec(s))!==null){
    let type='text';
    if(m[1]) type='url'; else if(m[2]) type='hedge'; else if(m[3]) type='upper'; else if(m[4]) type='number'; else if(m[5]) type='date'; else if(m[6]) type=m[6]==='!'?'exclam':'question'; else if(m[7]) type='space';
    tokens.push({type, text:m[0]});
  }
  return tokens;
}
function keywordAnalysis(text){
  const stop = new Set(['the','is','in','at','of','a','and','to','for','on','with','as','by','an','be','it','that','this','from','or','are','was','were','has','have','had','not','but','they','their','its','he','she','we','you','i','his','her','them','which','who','what','when','where','why','how','into','about','over','after','before','between','than','then','there','here','also']);
  const words = (text.toLowerCase().match(/[a-z']+/g)||[]).filter(w=>w.length>2 && !stop.has(w) && !/^\d+$/.test(w));
  const freq=new Map(); words.forEach(w=>freq.set(w,(freq.get(w)||0)+1));
  return Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,12);
}
function entityExtraction(text){
  const entities=new Map();
  const pattern=/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\b/g; let m;
  while((m=pattern.exec(text))!==null){ const ent=m[1].trim(); entities.set(ent,(entities.get(ent)||0)+1); }
  return Array.from(entities.entries()).sort((a,b)=>b[1]-a[1]).slice(0,15);
}
function domainExtraction(text){
  const urls = text.match(/https?:\/\/[^\s)]+/gi)||[]; const counts=new Map();
  urls.forEach(u=>{ try{ const d=new URL(u).hostname.replace(/^www\./,''); counts.set(d,(counts.get(d)||0)+1);}catch{}});
  return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
}
function readability(text){
  const sents = splitSentences(text);
  const words = (text.toLowerCase().match(/[a-z']+/g)||[]);
  const syl = words.reduce((sum,w)=> sum + Math.max(1,(w.replace(/e$/,'').match(/[aeiouy]+/g)||[]).length),0);
  const S=Math.max(1,sents.length), W=Math.max(1,words.length);
  const sylPerWord=syl/W, wordsPerSentence=W/S;
  const fre = 206.835 - 1.015*wordsPerSentence - 84.6*sylPerWord;
  const fkgl = 0.39*wordsPerSentence + 11.8*sylPerWord - 15.59;
  return {fre:+fre.toFixed(2), fkgl:+fkgl.toFixed(2), W, S, syl};
}
function sentiments(text){
  const posLex=['true','accurate','confirmed','evidence','verified','official','reliable','credible','balanced','fair','transparent','corroborated','authentic'];
  const negLex=['fake','false','hoax','misleading','fabricated','rumor','fraud','debunked','baseless','unfounded','scam','propaganda'];
  const words=(text.toLowerCase().match(/[a-z']+/g)||[]);
  let pos=0,neg=0; words.forEach(w=>{ if(posLex.includes(w)) pos++; if(negLex.includes(w)) neg++; });
  const score=pos-neg; const label=score>1?'positive':score<-1?'negative':'neutral';
  return {pos,neg,score,label};
}
function quoteStats(text){
  const quotes=(text.match(/\"[^\"]+\"|'[^']+'/g)||[]).length;
  const said=(text.match(/\b(said|stated|according to|told|wrote|claimed)\b/gi)||[]).length;
  return {quotes, attributions:said};
}
function temporal(text){
  const years=(text.match(/\b(?:19|20)\d{2}\b/g)||[]).map(Number);
  const count=years.length; const min=count?Math.min(...years):null; const max=count?Math.max(...years):null;
  return {count,min,max};
}
function generateDetailedPdf(content, data){
  const totalWords=getWordCount(content);
  const win=window.open('', '_blank');
  const style = `body{font-family:Arial,Helvetica,sans-serif;padding:24px;}
    .title{font-size:20px;font-weight:700;margin-bottom:8px}
    .meta{margin:6px 0}
    .status{font-weight:700}
    .bar{height:8px;border-radius:4px;background:#eee;margin:6px 0;width:200px}
    .row{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
    .legend{display:flex;flex-wrap:wrap;gap:18px;margin:10px 0 16px}
    .legend .box{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px}
    .section{margin:16px 0}
    .sent{margin:10px 0}
    .url{color:#1e5ac8}
    .hedge{color:#d27800}
    .upper{color:#c8003c}
    .num{color:#009696}
    .exclam{color:#c8003c}
    .question{color:#d27800}
    code{background:#f5f5f5;padding:10px;display:block;white-space:pre-wrap}
  `;
  const docParts=[];
  const isFake=!!data.isFake;
  const statusColor=isFake?'#C8003C':'#008C50';
  docParts.push(`<div class="title">Fake News Detection Detailed Report</div>`);
  docParts.push(`<div class="meta">Prepared: ${new Date().toLocaleString()}</div>`);
  docParts.push(`<div class="meta status" style="color:${statusColor}">Status: ${isFake?'Potentially False':'Likely Authentic'}</div>`);
  docParts.push(`<div class="meta">Confidence: ${typeof data.confidence==='number'?data.confidence:0}%</div>`);
  docParts.push(`<div class="meta">Word Count: ${totalWords}</div>`);
  const sentences=splitSentences(content);
  docParts.push(`<div class="meta">Sentence Count: ${sentences.length}</div>`);
  const read=readability(content); const sent=sentiments(content); const ents=entityExtraction(content); const doms=domainExtraction(content); const quotes=quoteStats(content); const temp=temporal(content); const keys=keywordAnalysis(content);
  docParts.push(`<div class="section"><div class="title">Additional Analysis</div>
    <div>Readability: FRE ${read.fre}, FKGL ${read.fkgl}, W/S ${(read.W/read.S).toFixed(2)}, Syl/W ${(read.syl/read.W).toFixed(2)}</div>
    <div>Sentiment: ${sent.label} (pos ${sent.pos}, neg ${sent.neg}, score ${sent.score})</div>
    <div>Quotes: ${quotes.quotes}, Attributions: ${quotes.attributions}</div>
    <div>Temporal: years ${temp.count}${temp.count?`, range ${temp.min}-${temp.max}`:''}</div>
    ${ents.length?`<div>Entities: ${ents.slice(0,10).map(([e,c])=>`${e} (${c})`).join(', ')}</div>`:''}
    ${doms.length?`<div>Domains: ${doms.map(([d,c])=>`${d} (${c})`).join(', ')}</div>`:''}
    ${keys.length?`<div>Top keywords: ${keys.map(([k,c])=>`${k} (${c})`).join(', ')}</div>`:''}
  </div>`);
  docParts.push(`<div class="section"><div class="title">Legend</div>
    <div class="legend">
      <div><span class="box" style="background:#1e5ac8"></span>URL</div>
      <div><span class="box" style="background:#d27800"></span>Hedging</div>
      <div><span class="box" style="background:#c8003c"></span>Uppercase emphasis</div>
      <div><span class="box" style="background:#009696"></span>Numbers/Dates</div>
      <div><span class="box" style="background:#c8003c"></span>Exclamation</div>
      <div><span class="box" style="background:#d27800"></span>Question</div>
    </div>
  </div>`);
  docParts.push(`<div class="section"><div class="title">Original Text</div><div>${(content||'').replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</div></div>`);
  const analyses=sentences.map(analyzeSentence);
  const colored = (s)=>{
    const tokens=tokenizeSentence(s);
    return tokens.map(t=>{
      if(t.type==='space') return t.text;
      const cls = t.type==='url'?'url': t.type==='hedge'?'hedge': t.type==='upper'?'upper': (t.type==='number'||t.type==='date')?'num': t.type==='exclam'?'exclam': t.type==='question'?'question':'';
      return cls?`<span class="${cls}">${t.text.replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</span>`: t.text.replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]));
    }).join('');
  };
  const sentHtml = sentences.map((s,i)=>{
    const a=analyses[i]; const score=getRiskScore(a); const color=getRiskColor(score);
    return `<div class="sent">
      <div><b>S${i+1}</b> [${a.wordCount} words, ${a.charCount} chars]</div>
      <div class="bar" style="background:linear-gradient(90deg, ${color} ${Math.min(100,score*20)}%, #eee ${Math.min(100,score*20)}%)"></div>
      <div>${colored(s)}</div>
      <div>Exclamations: ${a.exclamations} &nbsp; Questions: ${a.questions} &nbsp; URLs: ${a.urls}</div>
      <div>Numbers: ${a.numbers} &nbsp; Dates: ${a.datesLike} &nbsp; Uppercase ratio: ${a.uppercaseWordRatio}</div>
      <div>Hedging: ${a.hedging.length}${a.hedging.length?` [${a.hedging.join(', ')}]`:''}</div>
    </div>`;
  }).join('');
  docParts.push(`<div class="section"><div class="title">Sentence-by-Sentence Analysis</div>${sentHtml}</div>`);
  docParts.push(`<div class="section"><div class="title">Model Explanation</div><div>${(data.explanation||'').replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</div></div>`);
  if(Array.isArray(data.factors) && data.factors.length){
    docParts.push(`<div class="section"><div class="title">Analysis Factors</div><div>${data.factors.map(f=>`<span style="border:1px solid #ccc;border-radius:12px;padding:6px 10px;margin:4px;display:inline-block">${String(f).replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</span>`).join('')}</div></div>`);
  }
  docParts.push(`<div class="section"><div class="title">Raw JSON</div><code>${(JSON.stringify(data,null,2)).replace(/[&<>]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</code></div>`);
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Detailed Report</title><style>${style}</style></head><body>${docParts.join('')}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); }, 500);
}

