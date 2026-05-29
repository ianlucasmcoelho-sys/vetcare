async function testApi() {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();
    console.log('Health Check:', data);

    // Prontuarios (now should not return 500)
    // Note: This requires a token, so it might return 401, which is better than 500 or Connection Refused.
    const respPront = await fetch('http://localhost:3001/api/prontuarios');
    console.log('Prontuarios Status:', respPront.status);

    const respNotif = await fetch('http://localhost:3001/api/notificacoes/nao-lidas');
    console.log('Notificacoes Status:', respNotif.status);

  } catch (err) {
    console.error('API Test Error:', err.message);
  }
}

testApi();
