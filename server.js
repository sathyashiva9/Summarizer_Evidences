// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const claimRoute = require('./routes/claim');

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve index.html

app.use('/api/claim', claimRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
