const express = require("express");
const path = require("path");
const fs = require("fs");
let router = express.Router();
const pino = require("pino");
const mongoose = require("mongoose");
const {
    default: France_King,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");

// 1. MongoDB Setup
const MONGO_URI = "mongodb+srv://sayuaradark_db_user:qK3BV8XVv2JJJD5a@cluster0.w8wb15r.mongodb.net/Sayura_DB?retryWrites=true&w=majority&appName=Cluster0";

const credsSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    credsJson: { type: Object, required: true },
    updatedAt: { type: Date, default: Date.now }
});

let CredsModel;
try { CredsModel = mongoose.model("SayuraMDCreds"); } 
catch { CredsModel = mongoose.model("SayuraMDCreds", credsSchema); }

// 2. ID Generator
function generateId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 10; i++) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return result;
}

// 3. API Route
router.get("/", async (req, res) => {
    if (mongoose.connection.readyState !== 1) await mongoose.connect(MONGO_URI);

    const randomId = generateId();
    const customSessionId = `SAYURA-${randomId}`; 
    let num = req.query.number;

    if (!num) return res.status(400).send({ error: "Number required" });

    // Vercel /tmp path
    const tempPath = path.join("/tmp", randomId);
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });

    async function START_PAIRING() {
        const { state, saveCreds } = await useMultiFileAuthState(tempPath);

        try {
            let sock = France_King({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
                },
                printQRInTerminal: false,
                browser: Browsers.macOS("Chrome"),
                logger: pino({ level: "fatal" })
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, "");
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) res.send({ code });
            }

            // 🚀 මෙතන තමයි වැදගත්ම කෑල්ල - Creds update වෙන හැමවෙලේම DB එකට දානවා
            sock.ev.on("creds.update", async () => {
                await saveCreds();
                // ලොග් වුණාම විතරක් DB එකට සම්පූර්ණ JSON එක යවනවා
                if (state.creds && state.creds.me) {
                    try {
                        await CredsModel.findOneAndUpdate(
                            { sessionId: customSessionId },
                            { 
                                sessionId: customSessionId, 
                                credsJson: state.creds, // සම්පූර්ණ creds object එකම යනවා
                                updatedAt: new Date() 
                            },
                            { upsert: true, new: true }
                        );
                        console.log(`💾 JSON Uploaded to Mongo: ${customSessionId}`);
                    } catch (err) { console.error("DB Error:", err); }
                }
            });

            sock.ev.on("connection.update", async (update) => {
                const { connection } = update;
                if (connection === "open") {
                    console.log("✅ Session Opened!");
                    await delay(5000);

                    // WhatsApp Confirmation
                    const targetJid = jidNormalizedUser(sock.user.id);
                    const msg = `✅ *SAYURA-MD AUTO-LINK SUCCESS*\n\n💡 *උපදෙස්:* මෙම කෝඩ් එක භාවිතා කර ලින්ක් ඩිවයිස් කළ පසු, විනාඩි 2ක් ඇතුළත බොටී පණ ගැන්වෙනු ඇත.\n\n*Session ID:* ${customSessionId}`;
                    await sock.sendMessage(targetJid, { text: msg });

                    await delay(3000);
                    await sock.ws.close();
                    fs.rmSync(tempPath, { recursive: true, force: true });
                }
            });

        } catch (e) {
            console.log("Pairing Error:", e);
            if (!res.headersSent) res.send({ code: "Error" });
        }
    }
    START_PAIRING();
});

module.exports = router;
