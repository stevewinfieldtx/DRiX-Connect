const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, externalUrl, parseJson } = require('../src/copilot');

const base = { mode: 'research_message', page: {}, partner: { companyName: 'PartnerCo', offerings: 'Security services' } };
test('validates new outreach', () => assert.equal(validate(base), null));
test('thread workflow requires visible messages', () => assert.match(validate({ ...base, mode: 'thread_reply' }), /No visible conversation/));
test('blocks unsafe and LinkedIn enrichment URLs', () => {
  assert.equal(externalUrl('javascript:alert(1)'), null);
  assert.equal(externalUrl('https://www.linkedin.com/company/acme'), null);
  assert.equal(externalUrl('https://acme.example'), 'https://acme.example/');
});
test('parses fenced model JSON', () => assert.deepEqual(parseJson('```json\n{"fit":"high"}\n```'), { fit: 'high' }));
