import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetiredDemoAccount } from '../src/services/demoAccess.js';

test('bloqueia a antiga conta compartilhada de demonstração', () => {
  assert.equal(isRetiredDemoAccount({ email: 'demo@vetcare.com' }), true);
  assert.equal(isRetiredDemoAccount({ email: ' DEMO@VETCARE.COM ' }), true);
});

test('bloqueia também os outros usuários da clínica de demonstração', () => {
  assert.equal(isRetiredDemoAccount({ email: 'admin@vetcare.com', clinica_email: 'demo@vetcare.com' }), true);
  assert.equal(isRetiredDemoAccount({ email: 'veterinario@example.com', clinica_email: ' DEMO@VETCARE.COM ' }), true);
});

test('preserva contas de clínicas reais e não usa correspondência parcial', () => {
  assert.equal(isRetiredDemoAccount({ email: 'admin@vetcare.com', clinica_email: 'clinica@example.com' }), false);
  assert.equal(isRetiredDemoAccount({ email: 'demo@outraclinica.com', clinica_email: 'clinicademo@example.com' }), false);
  assert.equal(isRetiredDemoAccount({ email: 'demo@vetcare.com.br' }), false);
  assert.equal(isRetiredDemoAccount(), false);
});
