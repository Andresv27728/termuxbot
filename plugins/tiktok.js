import fetch from 'node-fetch';

const tiktokCommand = {
  name: 'tiktok',
  category: 'descargas',
  description: 'Descarga videos de TikTok o busca videos por texto.',
  aliases: ['tt', 'tiktokdl'],

  async execute({ sock, msg, args }) {
    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, { text: '*[❗] Por favor, ingresa un enlace de TikTok o texto para buscar...*' }, { quoted: msg });
    }

    const query = args.join(' ');
    const isUrl = query.includes('tiktok.com');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    if (isUrl) {
      await this.handleDownload(sock, msg, query);
    } else {
      await this.handleSearch(sock, msg, query);
    }
  },

  async handleDownload(sock, msg, url) {
    try {
      let videoUrl, audioUrl, images;

      // --- Primary API ---
      try {
        const api1 = `https://gawrgura-api.onrender.com/download/tiktok?url=${encodeURIComponent(url)}`;
        const res1 = await fetch(api1);
        const json1 = await res1.json();
        if (json1.status && json1.result) {
          videoUrl = json1.result.video_nowm;
          audioUrl = json1.result.audio_url;
          images = json1.result.slides;
        }
      } catch (e) {
        console.error("TikTok API v1 failed:", e);
      }

      // --- Fallback API ---
      if (!videoUrl && (!images || images.length === 0)) {
        try {
          const api2 = `https://gawrgura-api.onrender.com/download/tiktok-v2?url=${encodeURIComponent(url)}`;
          const res2 = await fetch(api2);
          const json2 = await res2.json();
          if (json2.status && json2.result.data) {
            videoUrl = json2.result.data.play;
            audioUrl = json2.result.data.music;
            images = json2.result.data.images;
          }
        } catch (e) {
          console.error("TikTok API v2 failed:", e);
        }
      }

      if ((!videoUrl || videoUrl.length === 0) && (!images || images.length === 0)) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        return sock.sendMessage(msg.key.remoteJid, { text: '❌ No se pudo descargar el contenido de TikTok.' }, { quoted: msg });
      }

      if (images && images.length > 0) {
        for (const img of images) {
          await sock.sendMessage(msg.key.remoteJid, { image: { url: img.url || img } }, { quoted: msg });
        }
      } else if (videoUrl) {
        await sock.sendMessage(msg.key.remoteJid, {
          video: { url: videoUrl },
          mimetype: 'video/mp4'
        }, { quoted: msg });
      }

      if (audioUrl) {
        await sock.sendMessage(msg.key.remoteJid, {
          audio: { url: audioUrl },
          mimetype: 'audio/mp4'
        }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      console.error("Error en la descarga de TikTok:", e);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Ocurrió un error al descargar el video.' }, { quoted: msg });
    }
  },

  async handleSearch(sock, msg, query) {
    try {
      const api = `https://gawrgura-api.onrender.com/search/tiktok?q=${encodeURIComponent(query)}`;
      const res = await fetch(api);
      const json = await res.json();

      if (!json.status || !json.result || json.result.length === 0) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        return sock.sendMessage(msg.key.remoteJid, { text: '❌ No se encontraron videos para esa búsqueda.' }, { quoted: msg });
      }

      for (const video of json.result) {
        const caption = `*Título:* ${video.title}\n*Autor:* ${video.author.nickname}`;

        if (video.play) {
          await sock.sendMessage(msg.key.remoteJid, {
            video: { url: video.play },
            caption: caption,
            mimetype: 'video/mp4'
          }, { quoted: msg });
        }

        if (video.music) {
          await sock.sendMessage(msg.key.remoteJid, {
            audio: { url: video.music },
            mimetype: 'audio/mp4'
          }, { quoted: msg });
        }
      }
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });
    } catch (e) {
      console.error("Error en la búsqueda de TikTok:", e);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(msg.key.remoteJid, { text: '❌ Ocurrió un error al buscar los videos.' }, { quoted: msg });
    }
  }
};

export default tiktokCommand;
