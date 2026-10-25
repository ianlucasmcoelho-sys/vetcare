// Carrega o backend ESM sem exigir o módulo com top-level await de forma síncrona.
import('./backend/src/index.js').catch((error) => {
  console.error('Falha ao carregar o backend VetCare:', error);
  process.exit(1);
});
