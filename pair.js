const { makeid } = require("./id");
const express = require("express");
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

// ================= MongoDB Setup (උඹේ Uploader එකේ විදිහටම) =================
const MONGO_URI = "mongodb+srv://sayuaradark_db_user:qK3BV8XVv2JJJD5a@cluster0.w8wb15r.mongodb.net/Sayura_DB?retryWrites=true&w=majority&appName=Cluster0";

const credsSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    credsJson: { type: Object, required: true },
    updatedAt: { type: Date, default: Date.now }
});

let CredsModel;
try {
    CredsModel = mongoose.model("SayuraMDCreds");
} catch {
    CredsModel = mongoose.model("SayuraMDCreds", credsSchema);
}

// DB කනෙක්ට් වීම
let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    await mongoose.connect(MONGO_URI);
    isConnected = true;
}

// ================= Utils =================
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// ================= API Route =================
router.get("/", async (req, res) => {
    await connectDB();
    const id = makeid();
    const customSessionId = `SAYURA-${id}`; // Uploader එකේ වගේම ID එකක් හැදීම
    let num = req.query.number;

    if (!num) {
        return res.status(400).send({ error: "Phone number is required" });
    }

    async function FLASH_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState("./temp/" + id);

        try {
            let Pair_Code_By_France_King = France_King({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" }).child({ level: "fatal" }),
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Chrome"),
            });

            if (!Pair_Code_By_France_King.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, "");
                const code = await Pair_Code_By_France_King.requestPairingCode(num);

                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Pair_Code_By_France_King.ev.on("creds.update", saveCreds);

            Pair_Code_By_France_King.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    console.log(`✅ Session Linked: ${customSessionId}`);
                    await delay(10000); // සෙෂන් එක ස්ටේබල් වෙන්න වෙලාව දීම

                    const credsPath = __dirname + `/temp/${id}/creds.json`;

                    if (fs.existsSync(credsPath)) {
                        const jsonContent = fs.readFileSync(credsPath, "utf8");
                        const credsObj = JSON.parse(jsonContent);

                        // --- 🚀 මෙන්න මෙතනදී තමයි Uploader එකේ වගේම සේව් වෙන්නේ ---
                        try {
                            await CredsModel.findOneAndUpdate(
                                { sessionId: customSessionId },
                                {
                                    sessionId: customSessionId,
                                    credsJson: credsObj,
                                    updatedAt: new Date(),
                                },
                                { upsert: true, new: true }
                            );
                            console.log(`💾 Auto-Uploaded Session: ${customSessionId}`);
                        } catch (dbErr) {
                            console.error("❌ DB Save Error:", dbErr.message);
                        }

                        // WhatsApp එකට යන මැසේජ් එක
                        try {
                            const targetJid = jidNormalizedUser(Pair_Code_By_France_King.user.id);
                            let SUCCESS_TEXT = `✅ *SAYURA-MD AUTO-LINK SUCCESS*\n\n💡 *උපදෙස්:* මෙම කෝඩ් එක භාවිතා කර ලින්ක් ඩිවයිස් කළ පසු, විනාඩි 2ක් ඇතුළත බොට් පණ ගැන්වෙනු ඇත.\n\n*Session ID:* ${customSessionId}`;
                            await Pair_Code_By_France_King.sendMessage(targetJid, { text: SUCCESS_TEXT });
                        } catch (e) { console.log("Msg error"); }
                    }

                    await delay(5000);
                    await Pair_Code_By_France_King.ws.close();
                    return await removeFile("./temp/" + id);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    FLASH_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error("Error:", err);
            await removeFile("./temp/" + id);
            if (!res.headersSent) res.send({ code: "Error" });
        }
    }
    return await FLASH_MD_PAIR_CODE();
});

module.exports = router;
