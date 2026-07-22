const test=require('node:test'),assert=require('node:assert/strict');const{validatePerson}=require('../src/person-analysis');
test('person analysis requires captured employment history',()=>assert.match(validatePerson({profile:{name:'A',experience:[]},partner:{companyName:'P',offerings:'X'}}),/employment history/));
test('person analysis accepts a grounded profile',()=>assert.equal(validatePerson({profile:{name:'A',experience:[{title:'CEO',company:'Acme'}]},partner:{companyName:'P',offerings:'X'}}),null));
