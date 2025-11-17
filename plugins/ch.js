import fetch from 'node-fetch';
import yts from 'yt-search';
import { savetube } from '../lib/yt-savetube.js';
import config from '../config.js';

// =================================================================================================
// 🚨 ¡IMPORTANTE! 🚨
// Reemplaza 'PUT_YOUR_CHANNEL_ID_HERE' con el ID de tu canal de WhatsApp.
// El ID del canal generalmente se ve así: '123456789012345678@newsletter'
// =================================================================================================
const TARGET_CHANNEL_ID = 'PUT_YOUR_CHANNEL_ID_HERE';

const chCommand = {
  name: 'ch',
  category: 'propietario',
  description: 'Descarga un video de una red social y lo envía a un canal específico.',
  aliases: ['channeldl'],

  async execute({ sock, msg, args }) {
    // 1. Validar configuración del canal
    if (TARGET_CHANNEL_ID === 'PUT_YOUR_CHANNEL_ID_HERE' || !TARGET_CHANNEL_ID) {
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ *Configuración requerida!*\n\nPor favor, edita el archivo `plugins/ch.js` y establece el `TARGET_CHANNEL_ID` con el ID de tu canal de WhatsApp.' }, { quoted: msg });
    }

    const url = args[0];
    if (!url) {
      return sock.sendMessage(msg.key.remoteJid, { text: '📥 Por favor, proporciona un enlace de Facebook, YouTube, Instagram o TikTok.' }, { quoted: msg });
    }

    await sock.sendMessage(msg.key.remoteJid, { text: '🔍 Procesando enlace... Por favor espera.' }, { quoted: msg });

    try {
      let videoUrl, caption = '';

      // --- Facebook ---
      if (/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch)\b/i.test(url)) {
        const api = `https://gawrgura-api.onrender.com/download/facebook?url=${encodeURIComponent(url)}`;
        const res = await fetch(api);
        const json = await res.json();
        if (!json.status || !json.result?.media?.video_hd) throw new Error('No se pudo obtener el video de Facebook.');
        videoUrl = json.result.media.video_hd;
        caption = `📹 *Video de Facebook Descargado*\n\n*Título:* ${json.result.info.title}`;

      // --- YouTube ---
      } else if (/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\b/i.test(url)) {
        const searchResults = await yts(url);
        const video = searchResults.videos[0];
        if (!video) throw new Error('No se encontraron resultados para el video de YouTube.');
        const downloadResult = await savetube.download(video.url, '720');
        if (!downloadResult.status || !downloadResult.result.download) throw new Error('No se pudo obtener el enlace de descarga de YouTube.');
        videoUrl = downloadResult.result.download;
        caption = `📹 *Video de YouTube Descargado*\n\n*Título:* ${video.title}`;

      // --- Instagram ---
      } else if (/(?:https?:\/\/)?(?:www\.)?instagram\.com\b/i.test(url)) {
        const res = await fetch(`https://api.dorratz.com/igdl?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        const videoItem = data.data?.find(item => item.url.includes('.mp4'));
        if (!videoItem) throw new Error('No se pudo obtener el video de Instagram.');
        videoUrl = videoItem.url;
        caption = `📹 Aquí está tu video de Instagram.`;

      // --- TikTok ---
      } else if (/(?:https?:\/\/)?(?:www\.)?tiktok\.com\b/i.test(url)) {
        const api = `https://gawrgura-api.onrender.com/download/tiktok?url=${encodeURIComponent(url)}`;
        const res = await fetch(api);
        const json = await res.json();
        if (!json.status || !json.result?.video_nowm) throw new Error('No se pudo obtener el video de TikTok.');
        videoUrl = json.result.video_nowm;
        caption = `📹 *Video de TikTok Descargado*`;

      } else {
        return sock.sendMessage(msg.key.remoteJid, { text: '🔗 El enlace no es compatible. Por favor, usa un enlace de Facebook, YouTube, Instagram o TikTok.' }, { quoted: msg });
      }

      if (videoUrl) {
        await sock.sendMessage(TARGET_CHANNEL_ID, {
          video: { url: videoUrl },
          caption: caption,
          mimetype: 'video/mp4'
        });
        await sock.sendMessage(msg.key.remoteJid, { text: `✅ Video enviado correctamente al canal.` }, { quoted: msg });
      } else {
        throw new Error('No se obtuvo una URL de video válida para enviar.');
      }

    } catch (error) {
      console.error("Error en el comando ch:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Ocurrió un error: ${error.message}` }, { quoted: msg });
    }
  }
};

export default chCommand;
