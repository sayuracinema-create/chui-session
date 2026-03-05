const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");

// Replit එකේදී Port එක Auto-assign කරගැනීම
const PORT = process.env.PORT || 5000;
const __path = process.cwd();

// පරණ QR එක අයින් කරලා, Pair Code එක විතරක් ගත්තා
let code = require('./pair');

// EventEmitter එකේ සීමාව වැඩි කිරීම (Baileys සම්බන්ධතා සඳහා වැදගත්)
require('events').EventEmitter.defaultMaxListeners = 500;

// Middleware - මේවා අනිවාර්යයෙන්ම Routes වලට කලින් තිබිය යුතුයි
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Routes Configuration ---

// Pairing Code Logic එක ක්‍රියාත්මක වන තැන (/code?number=... ලෙස)
app.use('/code', code);

// Pairing Page එක (HTML Form එක පෙන්වීමට)
app.get('/pair', async (req, res) => {
    res.sendFile(path.join(__path, 'pair.html'));
});

// Index.html එපා කිව්ව නිසා, කවුරුහරි Main URL එකට ආවොත් /pair වෙත Redirect කිරීම
app.get('/', (req, res) => {
    res.redirect('/pair');
});

// Server එක පණ ගැන්වීම
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
      SAYURA-MD PAIR SERVER IS LIVE 🚀
      
      Server running on: http://localhost:${PORT}
      Redirecting root (/) to /pair
╚════════════════════════════════════════╝
    `);
});

module.exports = app;
