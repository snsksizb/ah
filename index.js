import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import config from './config.js';
import { menuUtama, menuSticker, menuDownloader } from './menu/general.js';
import { chatAI } from './lib/ai.js';
import { tiktokDownloader, youtubePlay } from './lib/downloader.js';
import fs from 'fs-extra';
import { exec } from 'child_process';

const startBot = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    browser: [config.namaBot, 'Chrome', '1.0.0'],
    printQRInTerminal: !config.pairingCode,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    markOnlineOnConnect: true,
    syncFullHistory: false
  });

  if (config.pairingCode && !sock.authState.creds.registered) {
    const phoneNumber = config.nomorBot;
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`📱 Kode pairing: ${code}`);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔁 Reconnecting...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot siap!');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && m.type === 'notify') {
      const from = msg.key.remoteJid;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const args = text.slice(config.prefix.length).trim().split(' ');
      const command = args.shift().toLowerCase();

      let reply = '';
      let media = null;

      switch (command) {
        case 'menu':
          reply = menuUtama;
          break;
        case 'ping':
          const start = Date.now();
          await sock.sendMessage(from, { text: '⏳ Testing...' });
          const end = Date.now();
          reply = `✅ Pong! Kecepatan: ${end - start}ms`;
          break;
        case 'runtime':
          const uptime = process.uptime();
          const hours = Math.floor(uptime / 3600);
          const mins = Math.floor((uptage % 3600) / 60);
          reply = `⏱️ Bot telah aktif ${hours} jam ${mins} menit`;
          break;
        case 'owner':
          reply = `👤 Owner: wa.me/${config.owner[0]}`;
          break;
        case 'ai':
          if (!args[0]) return sock.sendMessage(from, { text: '❓ Contoh: .ai siapa presiden indonesia' });
          const aiRes = await chatAI(args.join(' '));
          reply = aiRes;
          break;
        case 'play':
          if (!args[0]) return sock.sendMessage(from, { text: '❓ Contoh: .play tulus hati hati di jalan' });
          const play = await youtubePlay(args.join(' '));
          await sock.sendMessage(from, { audio: { url: play.audio }, mimetype: 'audio/mp4' });
          break;
        case 'tiktok':
          if (!args[0]) return sock.sendMessage(from, { text: '❓ Contoh: .tiktok https://vt.tiktok.com/xxx' });
          const tiktok = await tiktokDownloader(args[0]);
          await sock.sendMessage(from, { video: { url: tiktok.video }, caption: tiktok.title });
          break;
        case 'sticker':
          if (!msg.message.imageMessage && !msg.message.videoMessage) return sock.sendMessage(from, { text: '❓ Balas gambar/video!' });
          const media = await downloadMediaMessage(msg);
          const sticker = exec(`magick ${media} -resize 512x512 sticker.webp`);
          await sock.sendMessage(from, { sticker: { url: 'sticker.webp' } });
          break;
        default:
          reply = null;
      }

      if (reply) {
        await sock.sendMessage(from, { text: reply });
      }
    }
  });
};

startBot();
