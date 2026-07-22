const test=require('node:test'),assert=require('node:assert/strict');
const{unredirect,allowed,effectiveCompanyName,scoreCandidate}=require('../src/company-url');
test('unwraps LinkedIn outbound website links',()=>assert.equal(unredirect('https://www.linkedin.com/redir/redirect?url=https%3A%2F%2Facme.example%2F'),'https://acme.example/'));
test('blocks directory and social domains',()=>{assert.equal(allowed('https://linkedin.com/company/acme'),null);assert.equal(allowed('https://crunchbase.com/org/acme'),null)});
test('prefers domains matching company name',()=>assert.ok(scoreCandidate('https://vivasoftltd.com/','Vivasoft Limited')>scoreCandidate('https://example.com/','Vivasoft Limited')));
test('recovers company name from LinkedIn title when DOM name is an industry',()=>assert.equal(effectiveCompanyName({companyName:'IT Services and IT Consulting',pageTitle:'fram^ | LinkedIn',url:'https://www.linkedin.com/company/fram/'}),'fram^'));
test('recovers company name from LinkedIn slug when title is unavailable',()=>assert.equal(effectiveCompanyName({companyName:'IT Services and IT Consulting',url:'https://www.linkedin.com/company/rain-networks/'}),'rain networks'));
test('scores the FRAM official domain using recovered identity',()=>assert.ok(scoreCandidate('https://wearefram.com/',{companyName:'IT Services and IT Consulting',pageTitle:'fram^ | LinkedIn',url:'https://www.linkedin.com/company/fram/'},'Your Leading Software Development Company in Vietnam','Fram software development')>=8));
