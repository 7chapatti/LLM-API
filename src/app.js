const express = require('express');
const triageRoute = require('./routes/triage');
const app = express();
app.use(express.json());
app.use('/', triageRoute);
module.exports = app;
