const express = require('express');
const cors = require('cors');
const path = require('path');
const { processGraph } = require('./lib/graphProcessor');

const app = express();
const PORT = process.env.PORT || 3000;

const USER_INFO = {
  user_id: 'Ravi_15032005',
  email_id: 'ravi.sharma.btech2023@sitpune.edu.in',
  enrollment_number: '23070122176'
};

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  const accept = req.headers.accept || "";
  const userAgent = req.headers["user-agent"] || "";

  const isBrowser =
    accept.includes("text/html") &&
    (
      userAgent.includes("Mozilla") ||
      userAgent.includes("Chrome") ||
      userAgent.includes("Safari") ||
      userAgent.includes("Firefox")
    );

  if (isBrowser) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  // Evaluator / Postman
  return res.json({
    operation_code: 1
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/graph', (req, res) => {
  try {
    const { edges } = req.body || {};

    if (!edges || !Array.isArray(edges)) {
      return res.status(400).json({
        error: 'Invalid request body. Expected: { "edges": ["A->B", "C->D", ...] }'
      });
    }

    const result = processGraph(edges, USER_INFO);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Graph processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/graph`);
});
