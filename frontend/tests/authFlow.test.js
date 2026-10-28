import test from 'node:test';
import assert from 'node:assert/strict';
import { authDestination, selectedAuthPlan } from '../src/utils/authFlow.js';

test('acesso e cadastro preservam contratação do plano completo e só redirecionam para destinos internos',()=>{
 for(const plano of ['complete','pro','premium','clinica']) {assert.equal(selectedAuthPlan(`?plano=${plano}`),'complete');assert.equal(authDestination(`?plano=${plano}`),'/checkout?plano=complete');}
 for(const query of ['','?plano=free','?plano=https://example.test','?redirect=https://example.test','?plano=unknown']) {assert.equal(selectedAuthPlan(query),'free');assert.equal(authDestination(query),'/');}
});
