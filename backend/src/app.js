const express = require('express');
const path = require('path');
const treeRoutes = require('./src/routes/treeRoutes');

const app = express();

app.use(express.json());

app.use('/api/tree', treeRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

module.exports = app;