const express = require('express');
const path = require('path');
const app = express();

const port = process.env.PORT || 10000;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes - send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend server running on port ${port}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'dist')}`);
});