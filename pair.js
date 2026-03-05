const PastebinAPI = require('pastebin-js'),
pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL')
const {makeid} = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router()
const pino = require("pino");
const {
    default: France_King,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

function removeFile(FilePath){
    if(!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true })
 };

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;
    async function FLASH_MD_PAIR_CODE() {
        const {
            state,
            saveCreds
        } = await useMultiFileAuthState('./temp/'+id)
     try {
            let Pair_Code_By_France_King = France_King({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({level: "fatal"}).child({level: "fatal"})),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS('Chrome')
             });

             if(!Pair_Code_By_France_King.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g,'');
                const code = await Pair_Code_By_France_King.requestPairingCode(num)
                if(!res.headersSent){
                    await res.send({code});
                }
             }

            Pair_Code_By_France_King.ev.on('creds.update', saveCreds)
            Pair_Code_By_France_King.ev.on("connection.update", async (s) => {
                const {
                    connection,
                    lastDisconnect
                } = s;

                if (connection == "open") {
                    // Connection එක ස්ථාවර වීමට තත්පර කිහිපයක් ලබා දීම
                    await delay(10000); 

                    const credsPath = __dirname + `/temp/${id}/creds.json`;
                    
                    if (fs.existsSync(credsPath)) {
                        let data = fs.readFileSync(credsPath);
                        const jsonContent = fs.readFileSync(credsPath, 'utf8');

                        // 1. creds.json ගොනුව Document එකක් ලෙස යැවීම
                        await Pair_Code_By_France_King.sendMessage(Pair_Code_By_France_King.user.id, { 
                            document: data, 
                            mimetype: 'application/json', 
                            fileName: 'creds.json' 
                        });

                        // 2. Decoded JSON පෙළ පණිවිඩයක් ලෙස යැවීම
                        let session = await Pair_Code_By_France_King.sendMessage(Pair_Code_By_France_King.user.id, { 
                            text: jsonContent 
                        });

                        let FLASH_MD_TEXT = `
❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒
*_Pair Code Connected by 𝚳𝐒𝚵𝐋𝚫-𝐂𝚮𝐔𝚰-𝚾𝚳𝐃*
______________________________________
╔════◇
║ *『 THANKS 👍 FOR SHOWING LOVE』*
║ _You Have Completed the First Step to Deploy a Whatsapp Bot._
╚════════════════════════╝
╔═════◇
║ 『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
║❒ *Owner:* _https://wa.me/260769355624_
║❒ *Repo:* _https://github.com/Mselachui03/MSELA-CHUI-BOT
║❒ *WaChannel:* _https://whatsapp.com/channel/0029Vb6Thzr90x2zmqGF9G0J_
╚════════════════════════╝
_____________________________________
❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒❒`

                        await Pair_Code_By_France_King.sendMessage(Pair_Code_By_France_King.user.id, { text: FLASH_MD_TEXT }, { quoted: session });
                    }

                    await delay(2000);
                    await Pair_Code_By_France_King.ws.close();
                    return await removeFile('./temp/'+id);

                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000);
                    FLASH_MD_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("service restated");
            await removeFile('./temp/'+id);
            if(!res.headersSent){
                await res.send({code:"Service is Currently Unavailable"});
            }
        }
    }
    return await FLASH_MD_PAIR_CODE()
});

module.exports = router;
