import { useState } from 'react';
import axios from 'axios';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Card, 
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  useTheme
} from '@mui/material';
import jsPDF from 'jspdf';
import { 
  Send, 
  CheckCircle, 
  Cancel, 
  Info 
} from '@mui/icons-material';

const DetectionPage = () => {
  const theme = useTheme();
  const [newsContent, setNewsContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [detectionMethod, setDetectionMethod] = useState('ml');
  const [twitterLink, setTwitterLink] = useState('');
  const getWordCount = (text) => {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).filter(Boolean);
    return words.length;
  };
  const splitSentences = (text) => {
    if (!text) return [];
    const normalized = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    const parts = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    return parts.map(s => s.trim()).filter(Boolean);
  };
  const analyzeSentence = (s) => {
    const words = s.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const charCount = s.length;
    const exclamations = (s.match(/!/g) || []).length;
    const questions = (s.match(/\?/g) || []).length;
    const urls = (s.match(/https?:\/\/\S+/gi) || []).length;
    const numbers = (s.match(/\b\d+[\d,.:\/]*\b/g) || []).length;
    const months = 'january|february|march|april|may|june|july|august|september|october|november|december';
    const datesLike = (s.match(new RegExp(`\\b((?:${months})\\b|\\d{1,2}[\/.-]\\d{1,2}[\/.-]\\d{2,4}|\\b(?:19|20)\\d{2}\\b)`, 'ig')) || []).length;
    const uppercaseWords = words.filter(w => w.length > 1 && /^[A-Z]{2,}$/.test(w.replace(/[^A-Za-z]/g, ''))).length;
    const uppercaseWordRatio = wordCount ? +(uppercaseWords / wordCount).toFixed(3) : 0;
    const hedgingList = ['allegedly','reportedly','claims','claim','sources say','might','could','unconfirmed','rumor','rumour','suggests','appears','likely','unlikely','possibly','unclear'];
    const foundHedging = hedgingList.filter(h => new RegExp(`\\b${h.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&')}\\b`, 'i').test(s));
    return { wordCount, charCount, exclamations, questions, urls, numbers, datesLike, uppercaseWordRatio, hedging: foundHedging };
  };
  const getRiskScore = (a) => {
    let score = 0;
    if (a.exclamations > 0) score += 2;
    if (a.uppercaseWordRatio > 0.12) score += 2;
    if (a.uppercaseWordRatio > 0.2) score += 1;
    if (a.hedging.length > 0) score += 1;
    if (a.urls > 0) score += 1;
    return score;
  };
  const getRiskColor = (score) => {
    if (score >= 4) return [200, 0, 60];
    if (score >= 2) return [210, 120, 0];
    return [0, 140, 80];
  };
  const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const tokenizeSentence = (s) => {
    const hedgingList = ['allegedly','reportedly','claims','claim','sources say','might','could','unconfirmed','rumor','rumour','suggests','appears','likely','unlikely','possibly','unclear'];
    const hedgingAlt = hedgingList.map(escapeRegex).join('|');
    const monthsAlt = 'january|february|march|april|may|june|july|august|september|october|november|december';
    const pattern = new RegExp(`(https?:\\/\\/\\S+)|(\\b(?:${hedgingAlt})\\b)|([A-Z]{2,}[A-Z0-9]*)|(\\b\\d+[\\d,.:\\/]*\\b)|(\\b(?:${monthsAlt})\\b|\\b\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{2,4}\\b|\\b(?:19|20)\\d{2}\\b)|([!?])|(\\s+)|(.)`, 'g');
    const tokens = [];
    let m;
    while ((m = pattern.exec(s)) !== null) {
      let type = 'text';
      if (m[1]) type = 'url';
      else if (m[2]) type = 'hedge';
      else if (m[3]) type = 'upper';
      else if (m[4]) type = 'number';
      else if (m[5]) type = 'date';
      else if (m[6]) type = m[6] === '!' ? 'exclam' : 'question';
      else if (m[7]) type = 'space';
      const text = m[0];
      tokens.push({ type, text });
    }
    return tokens;
  };
  const drawColoredSentence = (doc, margin, yStart, s, ensureSpace, lineHeight = 21) => {
    const maxWidth = 515;
    let x = margin;
    let y = yStart;
    const tokens = tokenizeSentence(s);
    tokens.forEach(t => {
      let color = [0,0,0];
      if (t.type === 'url') color = [30, 90, 200];
      else if (t.type === 'hedge') color = [210, 120, 0];
      else if (t.type === 'upper') color = [200, 0, 60];
      else if (t.type === 'number' || t.type === 'date') color = [0, 150, 150];
      else if (t.type === 'exclam') color = [200, 0, 60];
      else if (t.type === 'question') color = [210, 120, 0];
      const w = doc.getTextWidth(t.text);
      if (x - margin + w > maxWidth) {
        ensureSpace(lineHeight);
        y += lineHeight;
        x = margin;
      }
      doc.setTextColor(...color);
      doc.text(t.text, x, y);
      x += w;
    });
    doc.setTextColor(0,0,0);
    return y;
  };
  const alphaWords = (text) => (text.toLowerCase().match(/[a-z']+/g) || []);
  const countSyllables = (word) => {
    const w = word.toLowerCase().replace(/e$/,'');
    const m = w.match(/[aeiouy]+/g);
    return Math.max(1, m ? m.length : 0);
  };
  const computeReadability = (text) => {
    const sentences = splitSentences(text);
    const words = alphaWords(text);
    const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
    const S = Math.max(1, sentences.length);
    const W = Math.max(1, words.length);
    const sylPerWord = syllables / W;
    const wordsPerSentence = W / S;
    const fre = 206.835 - 1.015 * wordsPerSentence - 84.6 * sylPerWord;
    const fkgl = 0.39 * wordsPerSentence + 11.8 * sylPerWord - 15.59;
    return { sentences: S, words: W, syllables, fre: +fre.toFixed(2), fkgl: +fkgl.toFixed(2), wordsPerSentence: +wordsPerSentence.toFixed(2), sylPerWord: +sylPerWord.toFixed(2) };
  };
  const stopwords = new Set(['the','is','in','at','of','a','and','to','for','on','with','as','by','an','be','it','that','this','from','or','are','was','were','has','have','had','not','but','they','their','its','he','she','we','you','i','his','her','them','which','who','what','when','where','why','how','into','about','over','after','before','between','than','then','there','here','also']);
  const topKeywords = (text, n = 12) => {
    const words = alphaWords(text).filter(w => w.length > 2 && !stopwords.has(w) && !/^\d+$/.test(w));
    const freq = new Map();
    words.forEach(w => freq.set(w, (freq.get(w) || 0) + 1));
    return Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).slice(0,n);
  };
  const extractEntities = (text) => {
    const entities = new Map();
    const pattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4})\b/g;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const ent = m[1].trim();
      entities.set(ent, (entities.get(ent) || 0) + 1);
    }
    return Array.from(entities.entries()).sort((a,b)=>b[1]-a[1]).slice(0,15);
  };
  const extractDomains = (text) => {
    const urls = text.match(/https?:\/\/[^\s)]+/gi) || [];
    const counts = new Map();
    urls.forEach(u => {
      try {
        const d = new URL(u).hostname.replace(/^www\./,'');
        counts.set(d, (counts.get(d) || 0) + 1);
      } catch {}
    });
    return Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
  };
  const positiveLex = new Set(['true','accurate','confirmed','evidence','verified','official','reliable','credible','balanced','fair','transparent','corroborated','authentic']);
  const negativeLex = new Set(['fake','false','hoax','misleading','fabricated','rumor','fraud','debunked','baseless','unfounded','scam','propaganda']);
  const sentimentScore = (text) => {
    const words = alphaWords(text);
    let pos = 0, neg = 0;
    words.forEach(w => { if (positiveLex.has(w)) pos += 1; if (negativeLex.has(w)) neg += 1; });
    const score = pos - neg;
    const label = score > 1 ? 'positive' : score < -1 ? 'negative' : 'neutral';
    return { pos, neg, score, label };
  };
  const quoteStats = (text) => {
    const quotes = (text.match(/"[^"]+"|'[^']+'/g) || []).length;
    const said = (text.match(/\b(said|stated|according to|told|wrote|claimed)\b/gi) || []).length;
    return { quotes, attributions: said };
  };
  const temporalStats = (text) => {
    const years = (text.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number);
    const count = years.length;
    const min = count ? Math.min(...years) : null;
    const max = count ? Math.max(...years) : null;
    return { count, min, max };
  };
  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'detection_result.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const totalWords = getWordCount(newsContent);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = 595;
    const pageBottom = 800;
    const lineSpacing = 1.5;
    const baseLineHeight = 14;
    const lineHeight = baseLineHeight * lineSpacing;
    let y = margin;
    const ensureSpace = (height = lineHeight) => {
      if (y + height > pageBottom) { doc.addPage(); y = margin; }
    };
    const drawSection = (title) => {
      ensureSpace(32);
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, y - 18, pageWidth - 2 * margin, 26, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 80);
      doc.text(title, margin + 8, y - 3);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      y += lineHeight + 6;
    };
    const drawSubSection = (title) => {
      ensureSpace(26);
      doc.setFont('helvetica','bold');
      doc.setFontSize(12);
      doc.text(title, margin, y);
      doc.setFontSize(11);
      y += lineHeight + 4;
    };
    const drawKeyValue = (key, value, color = [0, 0, 0]) => {
      ensureSpace(lineHeight);
      doc.setFont('helvetica','bold');
      doc.text(key + ':', margin, y);
      doc.setFont('helvetica','normal');
      doc.setTextColor(...color);
      doc.text(String(value), margin + doc.getTextWidth(key + ': ') + 4, y);
      doc.setTextColor(0, 0, 0);
      y += lineHeight;
    };
    if (totalWords > 250) {
      const sentences = splitSentences(newsContent);
      const analyses = sentences.map(analyzeSentence);
      const status = result.isFake ? 'Potentially False' : 'Likely Authentic';
      const statusColor = result.isFake ? [200, 0, 60] : [0, 140, 80];
      const readability = computeReadability(newsContent);
      const sent = sentimentScore(newsContent);
      const entities = extractEntities(newsContent);
      const domains = extractDomains(newsContent);
      const quotes = quoteStats(newsContent);
      const temporal = temporalStats(newsContent);
      const keywords = topKeywords(newsContent);
      const totalRiskyIndicators = analyses.reduce((sum, a) => sum + getRiskScore(a), 0);
      doc.setFont('helvetica','bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 60, 120);
      doc.text('FAKE NEWS DETECTION REPORT', margin, y);
      doc.setTextColor(0, 0, 0);
      y += 36;
      doc.setFontSize(10);
      doc.setFont('helvetica','normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += lineHeight + 14;
      drawSection('EXECUTIVE SUMMARY');
      doc.setFont('helvetica','normal');
      ensureSpace(24);
      doc.setFontSize(16);
      doc.setFont('helvetica','bold');
      doc.setTextColor(...statusColor);
      doc.text(`Status: ${status}`, margin, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      y += lineHeight + 10;
      const summaryBox = [
        [`Detection Confidence`, `${result.confidence}%`],
        [`Total Word Count`, `${totalWords} words`],
        [`Total Sentences`, `${sentences.length}`],
        [`Analysis Method`, detectionMethod.toUpperCase()],
        [`Risk Indicators Found`, `${totalRiskyIndicators}`]
      ];
      summaryBox.forEach(([key, value]) => {
        drawKeyValue(key, value);
      });
      y += lineHeight;
      drawSection('TEXT QUALITY METRICS');
      doc.setFont('helvetica','normal');
      drawSubSection('Readability');
      drawKeyValue('Flesch Reading Ease', readability.fre + ' (higher = easier)');
      drawKeyValue('Flesch-Kincaid Grade Level', readability.fkgl + ' (grade level)');
      drawKeyValue('Average Words per Sentence', readability.wordsPerSentence);
      drawKeyValue('Average Syllables per Word', readability.sylPerWord);
      y += lineHeight / 2;
      drawSubSection('Sentiment Analysis');
      const sentColor = sent.label === 'positive' ? [0, 140, 80] : sent.label === 'negative' ? [200, 0, 60] : [100, 100, 100];
      drawKeyValue('Overall Sentiment', sent.label.toUpperCase(), sentColor);
      drawKeyValue('Positive Words', sent.pos);
      drawKeyValue('Negative Words', sent.neg);
      drawKeyValue('Sentiment Score', sent.score);
      y += lineHeight / 2;
      drawSubSection('Source Attribution');
      drawKeyValue('Quoted Text Instances', quotes.quotes);
      drawKeyValue('Attribution Phrases', quotes.attributions + ' (said, stated, etc.)');
      if (temporal.count > 0) {
        drawKeyValue('Temporal References', `${temporal.count} year(s) mentioned`);
        drawKeyValue('Year Range', `${temporal.min} - ${temporal.max}`);
      }
      y += lineHeight;
      if (entities.length > 0 || domains.length > 0 || keywords.length > 0) {
        drawSection('CONTENT ANALYSIS');
        doc.setFont('helvetica','normal');
        if (keywords.length) {
          drawSubSection('Top Keywords');
          const kwText = keywords.slice(0, 10).map(([k, c]) => `${k} (${c})`).join(', ');
          const kwLines = doc.splitTextToSize(kwText, pageWidth - 2 * margin);
          kwLines.forEach(line => { ensureSpace(lineHeight); doc.text(line, margin, y); y += lineHeight; });
          y += lineHeight / 2;
        }
        if (entities.length) {
          drawSubSection('Named Entities');
          const entText = entities.slice(0, 12).map(([e, c]) => `${e} (${c})`).join(', ');
          const entLines = doc.splitTextToSize(entText, pageWidth - 2 * margin);
          entLines.forEach(line => { ensureSpace(lineHeight); doc.text(line, margin, y); y += lineHeight; });
          y += lineHeight / 2;
        }
        if (domains.length) {
          drawSubSection('Referenced Domains');
          const domText = domains.map(([d, c]) => `${d} (${c})`).join(', ');
          const domLines = doc.splitTextToSize(domText, pageWidth - 2 * margin);
          domLines.forEach(line => { ensureSpace(lineHeight); doc.text(line, margin, y); y += lineHeight; });
          y += lineHeight / 2;
        }
        y += lineHeight / 2;
      }
      drawSection('ORIGINAL TEXT');
      doc.setFont('helvetica','normal');
      doc.setFillColor(250, 250, 252);
      const textHeight = Math.min(160, newsContent.length / 3);
      doc.rect(margin, y, pageWidth - 2 * margin, textHeight, 'F');
      const originalLines = doc.splitTextToSize(newsContent, pageWidth - 2 * margin - 16);
      const maxLines = 7;
      originalLines.slice(0, maxLines).forEach((line, idx) => {
        ensureSpace(lineHeight);
        doc.text(line, margin + 8, y + lineHeight + idx * lineHeight);
      });
      if (originalLines.length > maxLines) {
        doc.text('...', margin + 8, y + lineHeight + maxLines * lineHeight);
      }
      y += Math.max(textHeight + 12, (Math.min(maxLines, originalLines.length) + 1) * lineHeight + 12);
      drawSection('SENTENCE-BY-SENTENCE ANALYSIS');
      doc.setFont('helvetica','normal');
      doc.setFontSize(10);
      ensureSpace(24);
      doc.text('Legend:', margin, y);
      y += lineHeight;
      const legendItems = [
        { label: 'URL', color: [30, 90, 200] },
        { label: 'Hedging words', color: [210, 120, 0] },
        { label: 'ALL CAPS', color: [200, 0, 60] },
        { label: 'Numbers/Dates', color: [0, 150, 150] },
        { label: '! Exclamation', color: [200, 0, 60] },
        { label: '? Question', color: [210, 120, 0] }
      ];
      let lx = margin;
      legendItems.forEach((item, idx) => {
        if (idx === 3) { y += lineHeight + 4; lx = margin; ensureSpace(lineHeight); }
        doc.setFillColor(...item.color);
        doc.rect(lx, y - 8, 8, 8, 'F');
        doc.setTextColor(0, 0, 0);
        doc.text(item.label, lx + 12, y);
        lx += idx === 0 || idx === 3 ? 60 : 100;
      });
      y += lineHeight + 8;
      doc.setFontSize(11);
      sentences.forEach((s, idx) => {
        const a = analyses[idx];
        const score = getRiskScore(a);
        const riskColor = getRiskColor(score);
        const riskLabel = score >= 4 ? 'HIGH RISK' : score >= 2 ? 'MEDIUM RISK' : 'LOW RISK';
        ensureSpace(32);
        doc.setFillColor(248, 248, 250);
        doc.rect(margin, y - 4, pageWidth - 2 * margin, 22, 'F');
        doc.setFont('helvetica','bold');
        doc.setTextColor(...riskColor);
        doc.setFontSize(12);
        doc.text(`Sentence ${idx + 1}`, margin + 4, y + 11);
        doc.setFontSize(10);
        doc.text(`[${riskLabel}]`, margin + 90, y + 11);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica','normal');
        doc.text(`${a.wordCount} words | ${a.charCount} chars`, pageWidth - margin - 130, y + 11);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        y += 24;
        doc.setFillColor(...riskColor);
        const barWidth = Math.min(150, 30 * score);
        doc.rect(margin, y, barWidth, 4, 'F');
        y += 12;
        y = drawColoredSentence(doc, margin, y, s, ensureSpace, lineHeight);
        y += lineHeight;
        doc.setFont('helvetica','normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const metricsData = [
          `Exclamations: ${a.exclamations}`,
          `Questions: ${a.questions}`,
          `URLs: ${a.urls}`,
          `Numbers: ${a.numbers}`,
          `Dates: ${a.datesLike}`,
          `CAPS ratio: ${(a.uppercaseWordRatio * 100).toFixed(1)}%`
        ];
        const metricsLine = metricsData.join('  |  ');
        ensureSpace(lineHeight);
        doc.text(metricsLine, margin, y);
        y += lineHeight;
        if (a.hedging.length > 0) {
          ensureSpace(lineHeight);
          doc.setTextColor(210, 120, 0);
          doc.text(`Hedging words found: ${a.hedging.join(', ')}`, margin, y);
          doc.setTextColor(0, 0, 0);
          y += lineHeight;
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        y += lineHeight / 2;
      });
      drawSection('MODEL EXPLANATION');
      doc.setFont('helvetica','normal');
      const explanation = doc.splitTextToSize(String(result.explanation || 'No explanation provided.'), pageWidth - 2 * margin);
      explanation.forEach(line => { ensureSpace(lineHeight); doc.text(line, margin, y); y += lineHeight; });
      if (Array.isArray(result.factors) && result.factors.length) {
        y += lineHeight / 2;
        drawSubSection('Key Analysis Factors');
        doc.setFont('helvetica','normal');
        result.factors.forEach(f => {
          const lines = doc.splitTextToSize(`• ${f}`, pageWidth - 2 * margin - 10);
          lines.forEach(line => { ensureSpace(lineHeight); doc.text(line, margin + 4, y); y += lineHeight; });
        });
      }
      doc.save('detailed_detection_report.pdf');
    } else {
      let y2 = margin;
      doc.setFont('helvetica','bold');
      doc.setFontSize(18);
      doc.text('Fake News Detection Report', margin, y2);
      y2 += lineHeight + 14;
      doc.setFontSize(12);
      doc.setFont('helvetica','normal');
      const status = result.isFake ? 'Potentially False' : 'Likely Authentic';
      const statusColor = result.isFake ? [200, 0, 60] : [0, 140, 80];
      doc.setTextColor(...statusColor);
      doc.text(`Status: ${status}`, margin, y2);
      doc.setTextColor(0,0,0);
      y2 += lineHeight + 6;
      doc.text(`Confidence: ${result.confidence}%`, margin, y2);
      y2 += lineHeight + 12;
      doc.setFont('helvetica','bold');
      doc.text('Explanation', margin, y2);
      y2 += lineHeight + 4;
      doc.setFont('helvetica','normal');
      const explanation = doc.splitTextToSize(String(result.explanation || ''), 515);
      explanation.forEach(line => { doc.text(line, margin, y2); y2 += lineHeight; });
      if (Array.isArray(result.factors) && result.factors.length) {
        y2 += lineHeight / 2;
        doc.setFont('helvetica','bold');
        doc.text('Analysis Factors', margin, y2);
        y2 += lineHeight;
        doc.setFont('helvetica','normal');
        result.factors.forEach(f => {
          const lines = doc.splitTextToSize(`• ${f}`, 515);
          lines.forEach(line => { doc.text(line, margin, y2); y2 += lineHeight; });
        });
      }
      y2 += lineHeight;
      doc.setFont('helvetica','bold');
      doc.text('Raw JSON', margin, y2);
      y2 += lineHeight;
      doc.setFont('helvetica','normal');
      const json = doc.splitTextToSize(JSON.stringify(result, null, 2), 515);
      json.forEach(line => { if (y2 > 780) { doc.addPage(); y2 = margin; } doc.text(line, margin, y2); y2 += lineHeight * 0.85; });
      doc.save('detection_report.pdf');
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let response;
      const apiUrl = 'https://newsdetection.cloud/api';
      
      if (detectionMethod === 'ml') {
        response = await axios.post(`${apiUrl}/ml/predict`, { content: newsContent });
      } else if (detectionMethod === 'gpt') {
        response = await axios.post(`${apiUrl}/detect/gpt`, { content: newsContent, twitterLink: twitterLink && twitterLink.trim() ? twitterLink.trim() : undefined });
      } else if (detectionMethod === 'llama') {
        response = await axios.post(`${apiUrl}/detect/llama`, { content: newsContent, twitterLink: twitterLink && twitterLink.trim() ? twitterLink.trim() : undefined });
      }
      
      setResult(response.data);
    } catch (err) {
      console.error("Error detecting fake news:", err);
      setError("Failed to analyze the content. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };


  const methodDescriptions = {
    ml: 'Local ML model trained on real datasets with 96.4% accuracy',
    gpt: 'GPT language model for comprehensive fact-checking',
    llama: 'Llama language model for advanced content analysis'
  };
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h2" 
          align="center" 
          gutterBottom
          sx={{ fontWeight: 700, mb: 1 }}
        >
          Fake News Detection
        </Typography>
        <Typography 
          variant="body1" 
          align="center" 
          color="text.secondary"
          sx={{ mb: 4 }}
        >
          Analyze news articles and content for potential misinformation
        </Typography>

        <Card elevation={0} sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Enter news content to analyze"
                placeholder="Paste the news article or content here..."
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                required={detectionMethod !== 'gpt'}
                sx={{ mb: 3 }}
              />

              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend" sx={{ mb: 1, fontWeight: 600 }}>
                  Detection Method
                </FormLabel>
                <RadioGroup
                  row
                  value={detectionMethod}
                  onChange={(e) => setDetectionMethod(e.target.value)}
                >
                  <FormControlLabel 
                    value="ml" 
                    control={<Radio />} 
                    label="Local ML Model" 
                  />
                  <FormControlLabel 
                    value="gpt" 
                    control={<Radio />} 
                    label="GPT" 
                  />
                  <FormControlLabel 
                    value="llama" 
                    control={<Radio />} 
                    label="Llama" 
                  />
                </RadioGroup>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {methodDescriptions[detectionMethod]}
                </Typography>
              </FormControl>

              {(detectionMethod === 'gpt' || detectionMethod === 'llama') && (
                <TextField
                  fullWidth
                  type="url"
                  label="Twitter Link"
                  placeholder="https://twitter.com/... or https://x.com/..."
                  value={twitterLink}
                  onChange={(e) => setTwitterLink(e.target.value)}
                  sx={{ mb: 3 }}
                />
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={
                  isLoading || (
                    detectionMethod === 'ml' && !newsContent.trim()
                  ) || (
                    detectionMethod === 'gpt' && !newsContent.trim() && !(twitterLink && twitterLink.trim())
                  ) || (
                    detectionMethod === 'llama' && !newsContent.trim() && !(twitterLink && twitterLink.trim())
                  )
                }
                startIcon={isLoading ? <CircularProgress size={20} /> : <Send />}
                sx={{
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {isLoading ? 'Analyzing...' : 'Analyze Content'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <Card elevation={0} sx={{ mb: 3 }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Analyzing content with AI...
              </Typography>
            </CardContent>
          </Card>
        )}

        {result && !isLoading && (
          <Card 
            elevation={0}
            sx={{ 
              border: `2px solid ${result.isFake ? theme.palette.error.main : theme.palette.success.main}`,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {result.isFake ? (
                    <Cancel sx={{ fontSize: 32, color: theme.palette.error.main }} />
                  ) : (
                    <CheckCircle sx={{ fontSize: 32, color: theme.palette.success.main }} />
                  )}
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      color: result.isFake ? theme.palette.error.main : theme.palette.success.main
                    }}
                  >
                    {result.isFake ? 'Potentially False' : 'Likely Authentic'}
                  </Typography>
                </Box>
                
                <Chip 
                  label={`Confidence: ${result.confidence}%`}
                  color={result.isFake ? 'error' : 'success'}
                  sx={{ 
                    fontSize: '1rem',
                    fontWeight: 600,
                    px: 2,
                    py: 2.5
                  }}
                />
                <Button variant="outlined" onClick={handleDownload} sx={{ mr: 1 }}>Download JSON</Button>
                <Button variant="contained" color="secondary" onClick={handleDownloadPdf}>{getWordCount(newsContent) > 250 ? 'Download Detailed PDF' : 'Download PDF'}</Button>
              </Box>

              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  mb: 3, 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(66, 66, 66, 0.3)' 
                    : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                  <Info sx={{ fontSize: 20, color: theme.palette.primary.main, mt: 0.3 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Explanation
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {result.explanation}
                </Typography>
              </Paper>

              {result.factors && result.factors.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Analysis Factors
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {result.factors.map((factor, index) => (
                      <Chip 
                        key={index}
                        label={factor}
                        variant="outlined"
                        sx={{ py: 2 }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default DetectionPage;
