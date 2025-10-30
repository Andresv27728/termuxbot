import fetch from 'node-fetch';

const facebookCommand = {
  name: "facebook",
  category: "descargas",
  description: "Descarga un video de Facebook desde un enlace.",
  aliases: ["fb", "fbdl", "fbvideo"],

  async execute({ sock, msg, args }) {
    const url = args[0];
    const fbRegex = /https?:\/\/(www\.|web\.)?(facebook\.com|fb\.watch)\/[^\s]+/i;

    if (!url || !fbRegex.test(url)) {
      const usageMessage = `📥 *Uso correcto del comando:*\n\n.facebook <enlace de Facebook>\n\n*Ejemplo:*\n.facebook https://www.facebook.com/watch/?v=1234567890`;
      return sock.sendMessage(msg.key.remoteJid, { text: usageMessage }, { quoted: msg });
    }

    try {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '🕒', key: msg.key } });

      const api = `https://gawrgura-api.onrender.com/download/facebook?url=${encodeURIComponent(url)}`;
      const res = await fetch(api);
      const json = await res.json();

      if (!json.status || !json.result || !json.result.media || !json.result.media.video_hd) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        return sock.sendMessage(msg.key.remoteJid, { text: '❌ No se pudo obtener el video. Verifica el enlace e intenta nuevamente.' }, { quoted: msg });
      }

      const { title } = json.result.info;
      const { video_hd } = json.result.media;

      const caption = `📹 *Video de Facebook Descargado*\n\n*Título:* ${title}`;

      await sock.sendMessage(msg.key.remoteJid, {
        video: { url: video_hd },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

    } catch (e) {
      console.error("Error en el comando facebook:", e);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Ocurrió un error inesperado al descargar el video.' }, { quoted: msg });
    }
  }
};

export default facebookCommand;
