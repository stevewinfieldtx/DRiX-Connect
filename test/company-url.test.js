const test=require('node:test'),assert=require('node:assert/strict');const{unredirect,allowed,scoreCandidate}=require('../src/company-url');
test('unwraps LinkedIn outbound website links',()=>assert.equal(unredirect('https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Facme.example%2F'),'https://acme.example/'));
test('blocks directory and social domains',()=>{assert.equal(allowed('https://linkedin.com/company/acme'),null);assert.equal(allowed('https://crunchbase.com/org/acme'),null)});
test('prefers domains matching company name',()=>assert.ok(scoreCandidate('https://vivasoftltd.com/','Vivasoft Limited')>scoreCandidate('https://example.com/','Vivasoft Limited')));
