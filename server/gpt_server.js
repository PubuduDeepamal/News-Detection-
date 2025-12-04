import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.GPT_PORT || 5001;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let twitterBearerToken = '';
let twitterBearerFetchedAt = 0;

app.use(cors());
app.use(express.json());

const logsDir = path.join(__dirname, '..', 'ml', 'logs');
const gptCsvPath = path.join(logsDir, 'gpt_feedback.csv');

async function ensureLogs() {
  try { await fsp.mkdir(logsDir, { recursive: true }); } catch {}
  const exists = fs.existsSync(gptCsvPath);
  if (!exists) {
    await fsp.writeFile(gptCsvPath, 'timestamp,method,content,isFake,confidence,explanation,factors\n');
  }
}

function toCsvRow(values) {
  const esc = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  return values.map(esc).join(',') + '\n';
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'gpt-api' });
});

async function getTwitterBearer() {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    if (!apiKey || !apiSecret) return '';
    const now = Date.now();
    if (twitterBearerToken && now - twitterBearerFetchedAt < 3600_000) return twitterBearerToken;
    const creds = Buffer.from(encodeURIComponent(apiKey) + ':' + encodeURIComponent(apiSecret)).toString('base64');
    const resp = await axios.post('https://api.twitter.com/oauth2/token', 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      timeout: 10000
    });
    const token = resp.data && resp.data.access_token ? resp.data.access_token : '';
    if (token) {
      twitterBearerToken = token;
      twitterBearerFetchedAt = now;
    }
    return token;
  } catch {
    return '';
  }
}

async function fetchTweetTextFromX(twitterLink) {
  try {
    const idMatch = twitterLink && twitterLink.match(/status\/(\d+)/);
    if (!idMatch || !idMatch[1]) return '';
    const bearer = await getTwitterBearer();
    if (!bearer) return '';
    const url = `https://api.twitter.com/1.1/statuses/show.json?id=${idMatch[1]}&tweet_mode=extended`;
    const resp = await axios.get(url, { headers: { Authorization: `Bearer ${bearer}` }, timeout: 10000 });
    const data = resp.data || {};
    const text = data.full_text || data.text || '';
    return String(text || '').trim();
  } catch {
    return '';
  }
}

app.post('/api/detect/gpt', async (req, res) => {
  try {
    const { content, twitterLink } = req.body;
    if (!(content && String(content).trim()) && !(twitterLink && String(twitterLink).trim())) {
      return res.status(400).json({ error: 'Either content or twitterLink is required' });
    }

    let tweetContext = '';
    if (twitterLink && typeof twitterLink === 'string' && /https?:\/\/(twitter\.com|x\.com)\//i.test(twitterLink)) {
      try {
        const viaApi = await fetchTweetTextFromX(twitterLink);
        if (viaApi) tweetContext = viaApi;
      } catch {}
      try {
        const resp = await axios.get(twitterLink, { timeout: 10000, headers: { 'User-Agent': 'newsdetection-bot/1.0' } });
        const html = String(resp.data || '');
        const m = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
        if (!tweetContext && m && m[1]) tweetContext = m[1];
      } catch {}
      if (!tweetContext) {
        try {
          const proxied = 'https://r.jina.ai/http/' + twitterLink.replace(/^https?:\/\//, '');
          const resp2 = await axios.get(proxied, { timeout: 10000, headers: { 'User-Agent': 'newsdetection-bot/1.0' } });
          const txt = String(resp2.data || '');
          const tweetMatch = txt.match(/Tweet\s*by[\s\S]{0,200}?\n([\s\S]{0,500}?)(?:\n\n|—|\|)/i) || txt.match(/\n([^\n]{20,420})\n/);
          if (tweetMatch && tweetMatch[1]) tweetContext = tweetMatch[1].trim();
        } catch {}
      }
      if (!tweetContext) {
        try {
          const idMatch = twitterLink.match(/status\/(\d+)/);
          if (idMatch && idMatch[1]) {
            const nitterUrl = `https://r.jina.ai/http/nitter.net/i/status/${idMatch[1]}`;
            const resp3 = await axios.get(nitterUrl, { timeout: 10000, headers: { 'User-Agent': 'newsdetection-bot/1.0' } });
            const txt2 = String(resp3.data || '');
            const lines = txt2.split('\n').map(s => s.trim()).filter(Boolean);
            const candidate = lines.find(s => s.length >= 20 && s.length <= 420 && !/Twitter|Like|Retweet|Reply|Sign in|Login|Cookies/i.test(s));
            if (candidate) tweetContext = candidate;
          }
        } catch {}
      }
    }
    const baseContent = (content && String(content).trim()) ? content : (tweetContext || `Tweet: ${twitterLink || ''}`);
    const prompt = `Analyze the following news content for authenticity and respond ONLY with a JSON object having keys: isFake (boolean), confidence (0-100 integer), explanation (string), factors (array of 3-6 short strings). If a Twitter link context is provided, use it as an additional reference and note if it corroborates or contradicts the claim. Be concise and output only JSON.\n\nContent:\n"""${baseContent}"""\n\nTwitterContext:${tweetContext ? `"""${tweetContext}"""` : '""""""'}`;

    async function getResponse(model) {
      return await openai.responses.create({
        model,
        input: prompt
      });
    }

    let response;
    try {
      response = await getResponse('gpt-5-nano');
    } catch (err) {
      const status = err?.status || err?.response?.status;
      const code = err?.error?.code || err?.response?.data?.error?.code;
      if (status === 404 || code === 'model_not_found') {
        response = await getResponse('gpt-4.1-mini');
      } else {
        throw err;
      }
    }

    const text = response.output_text;
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (_) {
      const match = text && text.match && text.match(/\{[\s\S]*\}/);
      if (!match) return res.status(502).json({ error: 'GPT returned non-JSON output', raw: text });
      try { parsed = JSON.parse(match[0]); } catch { return res.status(502).json({ error: 'GPT returned invalid JSON', raw: text }); }
    }

    try {
      await ensureLogs();
      const row = toCsvRow([
        new Date().toISOString(),
        'gpt-5-nano',
        baseContent,
        parsed.isFake,
        parsed.confidence,
        parsed.explanation,
        Array.isArray(parsed.factors) ? parsed.factors.join('|') : ''
      ]);
      await fsp.appendFile(gptCsvPath, row);
    } catch {}

    return res.json(parsed);
  } catch (error) {
    console.error('Error with GPT detection:', error?.response?.data || error.message);
    return res.status(502).json({ error: 'GPT service error', details: error?.response?.data || error.message });
  }
});

app.listen(PORT, () => {
  console.log(`GPT API server running on port ${PORT}`);
});



