const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");

const PORT = process.env.PORT || 5000;
const __path = process.cwd();

let code = require('./pair');

require('events').EventEmitter.defaultMaxListeners = 500;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/code', code);

app.get('/pair', async (req, res) => {
    res.sendFile(path.join(__path, 'pair.html'));
});

app.get('/', (req, res) => {
    res.redirect('/pair');
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
      SAYURA-MD PAIR SERVER IS LIVE 🚀
      
      Server running on port: ${PORT}
      Redirecting root (/) to /pair
╚════════════════════════════════════════╝
    `);
});

module.exports = app;
