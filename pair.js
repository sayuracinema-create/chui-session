const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const mongoose = require("mongoose");
const {
    default: France_King,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

// ================= MongoDB Setup =================
// උඹේ MongoDB URI එක මෙතන තියෙනවා
const MONGO_URI = "mongodb+srv://sayuaradark_db_user:qK3BV8XVv2JJJD5a@cluster0.w8wb15r.mongodb.net/Sayura_DB?retryWrites=true&w=majority&appName=Cluster0";

// සෙෂන් දත්ත ගබඩා කරන Schema එක
const credsSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    credsJson: { type: Object, required: true },
    updatedAt: { type: Date, default: Date.now }
});

let CredsModel;
try {
    // දැනටමත් Model එකක් තිබේ නම් එය ලබා ගනී
    CredsModel = mongoose.model("SayuraMDCreds");
} catch {
    // නැතිනම් අලුතින් සාදයි
    CredsModel = mongoose.model("SayuraMDCreds", credsSchema);
}

// MongoDB සම්බන්ධ කිරීම
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ API connected to MongoDB Successfully"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// ================= Utils =================
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// ================= API Route =================
router.get('/', async (req, res) => {
    const id = makeid();
    const customSessionId = `SAYURA-${id}`; // පැනල් එකේ දිස්වන නම
    let num = req.query.number;

    if (!num) {
        return res.status(400).send({ error: "Phone number is required" });
    }

    async function FLASH_MD_PAIR_CODE() {
        // තාවකාලිකව creds තබා ගන්නා තැන
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            let Pair_Code_By_France_King = France_King({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS('Chrome') // Browser එක පෙන්වීම වැදගත්
            });

            // Pairing Code එක ලබා ගැනීම
            if (!Pair_Code_By_France_King.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Pair_Code_By_France_King.requestPairingCode(num);
                
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Pair_Code_By_France_King.ev.on('creds.update', saveCreds);
            
            Pair_Code_By_France_King.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    // Connection එක ස්ථාවර වීමට තත්පර 5ක් ලබා දීම
                    await delay(5000); 

                    const credsPath = __dirname + `/temp/${id}/creds.json`;
                    
                    if (fs.existsSync(credsPath)) {
                        const jsonContent = fs.readFileSync(credsPath, 'utf8');
                        const credsObj = JSON.parse(jsonContent);

                        // --- 🚀 MongoDB එකට Auto-Save කිරීම ---
                        try {
                            await CredsModel.findOneAndUpdate(
                                { sessionId: customSessionId },
                                { 
                                    sessionId: customSessionId, 
                                    credsJson: credsObj, 
                                    updatedAt: new Date() 
                                },
                                { upsert: true, new: true }
                            );
                            console.log(`💾 Session ${customSessionId} saved to MongoDB`);
                        } catch (dbErr) {
                            console.error("❌ Database Save Error:", dbErr.message);
                        }

                        // WhatsApp එකට යන උපදෙස් පණිවිඩය
                        let SUCCESS_TEXT = `✅ *SAYURA-MD SESSION CONNECTED*

💡 *උපදෙස්:*

මෙම කෝඩ් එක භාවිතා කර ලින්ක් ඩිවයිස් (Link Device) කළ පසු, අප්ඩේට් වූ පසු විනාඩි 2ක් ඇතුළත *Sayura Cinema MINI MD* සාර්ථකව Connect වනු ඇත.

*Session ID:* ${customSessionId}`;

                        await Pair_Code_By_France_King.sendMessage(Pair_Code_By_France_King.user.id, { text: SUCCESS_TEXT });
                    }

                    // වැඩේ අවසන් වූ පසු තාවකාලික ෆයිල් ඉවත් කිරීම
                    await delay(2000);
                    await Pair_Code_By_France_King.ws.close();
                    return await removeFile('./temp/' + id);

                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    FLASH_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error("Internal Error:", err);
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "Service Temporarily Unavailable" });
            }
        }
    }
    return await FLASH_MD_PAIR_CODE();
});

module.exports = router;
