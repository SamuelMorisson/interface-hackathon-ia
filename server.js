const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const TRITON_URL = process.env.TRITON_URL || 'http://localhost:8000';

app.use(express.json());

// Ollama — streaming chat
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req.body, stream: true }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Ollama unreachable' });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Triton — inférence directe
app.post('/api/triton', async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await fetch(
      `${TRITON_URL}/v2/models/phi35_financial/infer`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: [{ name: 'text_input', shape: [1], datatype: 'BYTES', data: [prompt] }],
        }),
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Triton unreachable' });
    }

    const data = await response.json();
    const text = data.outputs[0].data[0];
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check des deux backends
app.get('/api/status', async (req, res) => {
  const status = { ollama: false, triton: false };

  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    status.ollama = r.ok;
  } catch {}

  try {
    const r = await fetch(`${TRITON_URL}/v2/health/ready`, { signal: AbortSignal.timeout(2000) });
    status.triton = r.ok;
  } catch {}

  res.json(status);
});

const distPath = path.join(__dirname, 'client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
