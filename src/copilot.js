const cheerio = require('cheerio');

const MAX_PAGE_TEXT = 12000;
const MAX_THREAD_MESSAGES = 80;

function clean(value, max = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function externalUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (/(^|\.)linkedin\.com$/i.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

function validate(body) {
  if (!['research_message', 'thread_reply'].includes(body?.mode)) return 'Invalid workflow mode.';
  if (!body?.page || typeof body.page !== 'object') return 'LinkedIn page context is required.';
  if (!body?.partner?.companyName || !body?.partner?.offerings) return 'Partner company name and offerings are required.';
  if (body.mode === 'thread_reply' && (!Array.isArray(body.thread) || !body.thread.length)) return 'No visible conversation messages were found.';
  return null;
}

async function fetchText(url, timeout = 15000) {
  const response = await fetch(url, {
    redirect: 'follow', signal: AbortSignal.timeout(timeout),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DRiXResearch/1.0)' },
  });
  if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  $('script,style,nav,footer,header,aside,form,noscript').remove();
  const title = clean($('title').first().text() || $('h1').first().text(), 200);
  const text = clean($('main,article,[role="main"]').first().text() || $('body').text(), MAX_PAGE_TEXT);
  return { title, text, url: response.url || url };
}

async function tdeResearch(url, name, env) {
  if (!env.TDE_BASE_URL || !url) return null;
  const headers = { 'Content-Type': 'application/json' };
  if (env.TDE_API_KEY) headers['x-api-key'] = env.TDE_API_KEY;
  const response = await fetch(`${env.TDE_BASE_URL.replace(/\/+$/, '')}/intel/research/company`, {
    method: 'POST', headers, signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ url, name, role: 'customer' }),
  });
  if (!response.ok) throw new Error(`TDE returned HTTP ${response.status}`);
  return response.json();
}

async function research(body, env) {
  const page = body.page;
  const companyUrl = [page.companyWebsite, ...(page.externalLinks || [])].map(externalUrl).find(Boolean) || null;
  const sources = [{ title: 'Visible LinkedIn context', url: clean(page.url, 1000), text: clean(page.visibleText, MAX_PAGE_TEXT) }];
  let tde = null;
  if (companyUrl) {
    try { tde = await tdeResearch(companyUrl, page.companyName, env); } catch (error) { console.warn('[copilot] TDE fallback:', error.message); }
    try {
      const site = await fetchText(companyUrl);
      if (site.text) sources.push(site);
    } catch (error) { console.warn('[copilot] website unavailable:', error.message); }
  }
  const thread = (body.thread || []).slice(-MAX_THREAD_MESSAGES).map(item => ({
    sender: clean(item.sender, 160), text: clean(item.text, 2500), timestamp: clean(item.timestamp, 100),
  })).filter(item => item.text);
  return {
    page: { type: clean(page.type, 40), url: clean(page.url, 1000), personName: clean(page.personName, 200), personHeadline: clean(page.personHeadline, 500), companyName: clean(page.companyName, 300), companyWebsite: companyUrl },
    tde, sources, thread,
  };
}

function promptFor(body, intel) {
  const reply = body.mode === 'thread_reply';
  return `You are DRiX, a rigorous B2B sales research copilot using Targeted Decomposition principles.

WORKFLOW: ${reply ? 'Analyze the conversation and draft a response.' : 'Assess fit and draft LinkedIn outreach.'}
SELLER PROFILE:\n${JSON.stringify(body.partner, null, 2)}
PROSPECT INTELLIGENCE:\n${JSON.stringify(intel, null, 2)}

Use only supplied intelligence. Do not invent facts, news, technology, metrics, case studies, or URLs. Separate facts from hypotheses and lower confidence for hypotheses. The message must sound human and never mention AI, scraping, or a fit score. ${reply ? 'Answer what was asked, match the thread tone, and advance one step.' : 'Write 45-100 words with a low-friction CTA.'}

Return JSON only:
{"fit":"high|medium|low","fit_reason":"string","evidence":[{"claim":"string","source_url":"supplied URL or null","confidence":0}],"angle":"string","draft_message":"string","conversation_summary":"${reply ? 'string' : ''}","intent":"${reply ? 'string' : ''}","unanswered_points":[],"sources":[{"title":"string","url":"supplied URL","supports":"string"}]}`;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) try { return JSON.parse(fenced[1]); } catch {}
  const object = text.match(/\{[\s\S]*\}/);
  if (object) try { return JSON.parse(object[0]); } catch {}
  return null;
}

async function analyze(body, env = process.env) {
  const error = validate(body);
  if (error) throw Object.assign(new Error(error), { status: 400 });
  if (!env.OPENROUTER_API_KEY) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured.'), { status: 503 });
  const intel = await research(body, env);
  const response = await fetch(`${env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'}/chat/completions`, {
    method: 'POST', signal: AbortSignal.timeout(90000), headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json',
      'HTTP-Referer': 'https://drix.ai', 'X-Title': 'DRiX LinkedIn Copilot',
    }, body: JSON.stringify({ model: env.OPENROUTER_MODEL_ID || 'anthropic/claude-sonnet-4.5', temperature: 0.2, max_tokens: 2600, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'Return valid JSON only. Ground every claim in the supplied context.' }, { role: 'user', content: promptFor(body, intel) },
    ] }),
  });
  if (!response.ok) throw new Error(`OpenRouter returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const result = parseJson(data.choices?.[0]?.message?.content || '');
  if (!result) throw new Error('The model returned no usable JSON.');
  const allowedUrls = new Set(intel.sources.map(source => externalUrl(source.url) || source.url).filter(Boolean));
  const fit = clean(result.fit, 16).toLowerCase();
  return {
    mode: body.mode, fit: ['high', 'medium', 'low'].includes(fit) ? fit : 'medium', fit_reason: clean(result.fit_reason, 700),
    evidence: (result.evidence || []).map(item => ({ claim: clean(item.claim || item, 500), source_url: externalUrl(item.source_url), confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)) })).filter(item => item.claim).slice(0, 6),
    angle: clean(result.angle, 900), draft_message: clean(result.draft_message, 3000),
    conversation_summary: body.mode === 'thread_reply' ? clean(result.conversation_summary, 1200) : '', intent: body.mode === 'thread_reply' ? clean(result.intent, 300) : '',
    unanswered_points: body.mode === 'thread_reply' ? (result.unanswered_points || []).map(x => clean(x, 300)).filter(Boolean).slice(0, 8) : [],
    sources: (result.sources || []).map(item => ({ title: clean(item.title, 180), url: externalUrl(item.url), supports: clean(item.supports, 400) })).filter(item => item.url && allowedUrls.has(item.url)).slice(0, 8),
    researched_at: new Date().toISOString(), research_path: intel.tde ? `TDE:${intel.tde.source || 'research'}` : 'direct',
  };
}

module.exports = { analyze, validate, externalUrl, fetchText, research, parseJson };
