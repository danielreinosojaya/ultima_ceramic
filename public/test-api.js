console.log('Testing UILabels API...');

// Test GET
fetch('/api/data?key=uiLabels')
  .then(response => {
    console.log('GET Response status:', response.status);
    console.log('GET Response headers:', Object.fromEntries(response.headers.entries()));
    return response.json();
  })
  .then(data => {
    console.log('GET Success:', data);
    
    // Test POST
    return fetch('/api/data?key=uiLabels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxIdLabel: 'Cédula de Prueba' })
    });
  })
  .then(response => {
    console.log('POST Response status:', response.status);
    console.log('POST Response headers:', Object.fromEntries(response.headers.entries()));
    return response.json();
  })
  .then(data => {
    console.log('POST Success:', data);
  })
  .catch(error => {
    console.error('API Test Failed:', error);
  });