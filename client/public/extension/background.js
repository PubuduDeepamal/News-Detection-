self.addEventListener('install', ()=>self.skipWaiting());
self.addEventListener('activate', (e)=>{ e.waitUntil(self.clients.claim()); });

const API = 'https://newsdetection.cloud/api';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse)=>{
  if(!msg || msg.type!=='nd-detect') return;
  (async ()=>{
    try{
      const endpoint = `${API}/detect/gpt`;
      const body = { content: msg.text };
      const resp = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data = await resp.json();
      sendResponse({ ok:true, data });
    }catch(e){
      sendResponse({ ok:false, error: e && e.message ? e.message : 'fetch failed' });
    }
  })();
  return true;
});


