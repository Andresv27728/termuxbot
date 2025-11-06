import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const youtubeRegexID =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;

const play2Command = {
  name: "play2",
  category: "descargas",
  description:
    "Busca y descarga un video de YouTube y lo envía como video.",
  aliases: ["ytmp4"],

  async execute({ sock, msg, args }) {
    const text = args.join(" ").trim();
    try {
      if (!text) {
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "Por favor, ingresa el nombre o link del video." },
          { quoted: msg }
        );
      }

      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "⌛", key: msg.key },
      });

      let videoIdToFind = text.match(youtubeRegexID) || null;
      let searchResult = await yts(
        videoIdToFind === null
          ? text
          : "https://youtu.be/" + videoIdToFind[1]
      );

      let videoInfo = null;
      if (videoIdToFind) {
        const videoId = videoIdToFind[1];
        videoInfo =
          searchResult.all.find((item) => item.videoId === videoId) ||
          searchResult.videos.find((item) => item.videoId === videoId);
      }
      videoInfo =
        videoInfo ||
        searchResult.all?.[0] ||
        searchResult.videos?.[0] ||
        searchResult;

      if (!videoInfo || videoInfo.length === 0) {
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: "❌", key: msg.key },
        });
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "No se encontraron resultados para tu búsqueda." },
          { quoted: msg }
        );
      }

      const { title, thumbnail, url, timestamp, author, views } = videoInfo;

      // 🔹 Enviar vista previa con la miniatura
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: thumbnail },
          caption: `🎵 *${title}*\n👤 ${author?.name || "Desconocido"}\n🕒 ${timestamp || "Duración desconocida"}\n👁️ ${views?.toLocaleString() || "N/A"} vistas\n\n_Descargando video..._`,
        },
        { quoted: msg }
      );

      let downloadUrl;
      let videoTitle = title;
      let sourceApi = "";

      // Intentar con la primera API
      try {
        const ytdlUrl = `https://gawrgura-api.onrender.com/download/ytdl?url=${encodeURIComponent(url)}`;
        const ytdlRes = await fetch(ytdlUrl);
        const ytdlData = await ytdlRes.json();

        if (ytdlData.status && ytdlData.result.mp4) {
          downloadUrl = ytdlData.result.mp4;
          videoTitle = ytdlData.result.title || title;
          sourceApi = "gawrgura-api (ytdl)";
        }
      } catch (e) {
        console.error("Error con la API ytdl:", e);
      }

      // Si la primera API falla, intentar con la segunda
      if (!downloadUrl) {
        try {
          const ytmp4Url = `https://gawrgura-api.onrender.com/download/ytmp4?url=${encodeURIComponent(url)}`;
          const ytmp4Res = await fetch(ytmp4Url);
          const ytmp4Data = await ytmp4Res.json();

          if (ytmp4Data.status && ytmp4Data.result) {
            downloadUrl = ytmp4Data.result;
            sourceApi = "gawrgura-api (ytmp4)";
          }
        } catch (e) {
          console.error("Error con la API ytmp4:", e);
        }
      }

      if (!downloadUrl) {
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: "❌", key: msg.key },
        });
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "No se pudo descargar el video desde ninguna de las APIs." },
          { quoted: msg }
        );
      }

      const videoResponse = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
      });
      const videoBuffer = videoResponse.data;

      await sock.sendMessage(
        msg.key.remoteJid,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          caption: `${videoTitle}\n\n🔗 *Fuente:* ${sourceApi}`,
        },
        { quoted: msg }
      );

      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (error) {
      console.error("Error en el comando play2:", error);
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "❌", key: msg.key },
      });
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: `Ocurrió un error inesperado: ${error.message}` },
        { quoted: msg }
      );
    }
  },
};

export default play2Command;
