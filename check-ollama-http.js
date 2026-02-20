// Quick check: does Ollama's HTTP API respond after your upgrade?
// Run: node check-ollama-http.js
const http = require('http');
const body = JSON.stringify({
  model: 'llama3.2',
  messages: [{ role: 'user', content: 'Reply with one word: OK' }],
  max_tokens: 20,
  stream: false
});
const req = http.request({
  hostname: 'localhost',
  port: 11434,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', d.slice(0, 500));
  });
});
req.on('error', e => console.error('Error:', e.message));
req.setTimeout(120000, () => { req.destroy(); console.log('TIMEOUT after 2 min – HTTP API still not responding.'); });
req.write(body);
req.end();
