// Minimal handler without Express - for Vercel
module.exports = async (req, res) => {
  console.log('[Handler] Request received');
  
  // Simple JSON response for health check
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'production'
  }));
};