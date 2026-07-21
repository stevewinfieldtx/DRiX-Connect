const cheerio = require('cheerio');

function clean(value, max = 8000) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max); }
function validUrl(value) { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

async function siteResearch(url) {
  const response = await fetch(url, { redirect:'follow', signal:AbortSignal.timeout(20000), headers:{'User-Agent':'Mozilla/5.0 (compatible; DRiXResearch/1.0)'} });
  if (!response.ok) throw new Error(`Company website returned HTTP ${response.status}`);
  const $ = cheerio.load(await response.text());
  $('script,style,nav,footer,header,aside,form,noscript').remove();
  const text = clean($('main,article,[role="main"]').first().text() || $('body').text(), 18000);
  if (text.length < 100) throw new Error('The company website did not provide enough readable content.');
  return { url: response.url || url, title: clean($('title').text(), 200), text };
}

async function draftPartnerProfile(body, env = process.env) {
  const companyName = clean(body?.companyName, 200);
  const website = validUrl(body?.website);
  if (!companyName) throw Object.assign(new Error('Enter the PartnerCompany name.'), { status:400 });
  if (!website) throw Object.assign(new Error('Enter a complete company website, including https://'), { status:400 });
  if (!env.OPENROUTER_API_KEY) throw Object.assign(new Error('OPENROUTER_API_KEY is not configured on the backend.'), { status:503 });
  const site = await siteResearch(website);
  const prompt = `Research the seller company below and draft an internal sales knowledge profile for human review. Use only the supplied website text. Do not invent customers, metrics, awards, integrations, or case studies. When proof is not explicitly present, say "No verified proof points found on the reviewed page."\n\nCompany: ${companyName}\nSource: ${site.url}\nWebsite text:\n${site.text}\n\nReturn JSON only: {"companyName":"string","offerings":"specific products/services and problems solved","idealCustomers":"industries, company types, roles, and situations supported by evidence","differentiators":"evidence-backed differentiators; label reasonable inferences","proofPoints":"named case studies, customer evidence, certifications, metrics, or the required no-proof statement","tone":"recommended outreach style and claims to avoid","summary":"short explanation of what was found","sources":[{"title":"string","url":"${site.url}","supports":"string"}]}`;
  const response = await fetch(`${env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'}/chat/completions`, { method:'POST', signal:AbortSignal.timeout(90000), headers:{Authorization:`Bearer ${env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','X-Title':'DRiX Partner Profile Research'}, body:JSON.stringify({model:env.OPENROUTER_MODEL_ID || 'anthropic/claude-sonnet-4.5',temperature:0.1,max_tokens:2200,response_format:{type:'json_object'},messages:[{role:'system',content:'Return grounded JSON only. Never fabricate company claims.'},{role:'user',content:prompt}]}) });
  if (!response.ok) throw new Error(`OpenRouter returned HTTP ${response.status}: ${(await response.text()).slice(0,250)}`);
  const result = parseJson((await response.json()).choices?.[0]?.message?.content);
  if (!result) throw new Error('The model returned no usable company profile.');
  return { companyName:clean(result.companyName,200)||companyName, offerings:clean(result.offerings), idealCustomers:clean(result.idealCustomers), differentiators:clean(result.differentiators), proofPoints:clean(result.proofPoints), tone:clean(result.tone), summary:clean(result.summary,1000), sources:[{title:clean(result.sources?.[0]?.title,200)||site.title||companyName,url:site.url,supports:clean(result.sources?.[0]?.supports,500)||'PartnerCompany profile research'}], researchedAt:new Date().toISOString() };
}
module.exports = { draftPartnerProfile, validUrl, parseJson };
