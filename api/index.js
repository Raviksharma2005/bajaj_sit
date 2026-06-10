const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    // Read and serve the index.html
    const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  // API / Evaluator / Postman
  return res.status(200).json({
    operation_code: 1
  });
};
