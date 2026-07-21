const test=require('node:test');const assert=require('node:assert/strict');const{validUrl,parseJson}=require('../src/partner-profile');
test('partner website requires HTTP or HTTPS',()=>{assert.equal(validUrl('example.com'),null);assert.equal(validUrl('javascript:alert(1)'),null);assert.equal(validUrl('https://example.com'),'https://example.com/')});
test('partner profile parser salvages a JSON object',()=>assert.deepEqual(parseJson('answer: {"offerings":"security"}'),{offerings:'security'}));
