const { processGraph } = require('../lib/graphProcessor');

const USER_INFO = {
  user_id: 'Ravi_15032005',
  email_id: 'ravi.sharma.btech2023@sitpune.edu.in',
  enrollment_number: '23070122176'
};

module.exports = async (req, res) => {
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

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
};
