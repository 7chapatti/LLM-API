const express = require('express');
const triageRoute = require('./routes/triage');
const app = express();
app.use(express.json());
app.get('/', (_req, res) => {
  res.json({ status: 'ok', endpoint: 'POST /triage' });
});
app.use('/', triageRoute);
module.exports = app;
