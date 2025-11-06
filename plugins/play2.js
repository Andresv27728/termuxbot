import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const youtubeRegexID =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/;

const play2Command = {
  name: "play2",
  category: "descargas",
  description: "Busca y descarga un video de YouTube y lo envía como video.",
  aliases: ["ytmp4"],

  async execute({ sock, msg, args }) {
    const text = args.join(" ").trim();
    try {
      if (!text) {
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "🔎 Ingresa el nombre o link del video que deseas descargar." },
          { quoted: msg }
        );
      }

      // Reacción inicial
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "⌛", key: msg.key },
      });

      // Buscar el video
      let videoIdMatch = text.match(youtubeRegexID);
      let searchResult = await yts(
        videoIdMatch ? `https://youtu.be/${videoIdMatch[1]}` : text
      );

      let videoInfo = null;
      if (videoIdMatch) {
        const videoId = videoIdMatch[1];
        videoInfo =
          searchResult.all.find((v) => v.videoId === videoId) ||
          searchResult.videos.find((v) => v.videoId === videoId);
      }
      videoInfo =
        videoInfo ||
        searchResult.all?.[0] ||
        searchResult.videos?.[0] ||
        null;

      if (!videoInfo) {
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: "❌", key: msg.key },
        });
        return sock.sendMessage(
          msg.key.remoteJid,
          { text: "❌ No se encontraron resultados para tu búsqueda." },
          { quoted: msg }
        );
      }

      const { title, thumbnail, url, timestamp, author, views } = videoInfo;

      // Vista previa
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: thumbnail },
          caption: `🎬 *${title}*\n👤 ${author?.name || "Desconocido"}\n🕒 ${timestamp || "Duración desconocida"}\n👁️ ${views?.toLocaleString() || "N/A"} vistas\n\n_Descargando video, esto puede tardar varios minutos si el archivo es grande..._ ⌛`,
        },
        { quoted: msg }
      );

      let downloadUrl = null;
      let videoTitle = title;
      let sourceApi = "";

      // 🔹 API 1: /ytdl
      try {
        const ytdlUrl = `https://gawrgura-api.onrender.com/download/ytdl?url=${encodeURIComponent(
          url
        )}`;
        const ytdlRes = await fetch(ytdlUrl, { timeout: 600000 }); // 10 minutos máximo
        const ytdlText = await ytdlRes.text();

        if (ytdlText.startsWith("<!DOCTYPE")) {
          console.warn("⚠️ Respuesta HTML (API ytdl): servidor dormido o error 404");
        } else {
          const ytdlData = JSON.parse(ytdlText);
          if (ytdlData.status && ytdlData.result?.mp4) {
            downloadUrl = ytdlData.result.mp4;
            videoTitle = ytdlData.result.title || title;
            sourceApi = "gawrgura-api (ytdl)";
          }
        }
      } catch (err) {
        console.error("❌ Error con la API ytdl:", err.message);
      }

      // 🔹 API 2: /ytmp4 (si la primera falla)
      if (!downloadUrl) {
        try {
          const ytmp4Url = `https://gawrgura-api.onrender.com/download/ytmp4?url=${encodeURIComponent(
            url
          )}`;
          const ytmp4Res = await fetch(ytmp4Url, { timeout: 600000 });
          const ytmp4Text = await ytmp4Res.text();

          if (ytmp4Text.startsWith("<!DOCTYPE")) {
            console.warn("⚠️ Respuesta HTML (API ytmp4): servidor dormido o error 404");
          } else {
            const ytmp4Data = JSON.parse(ytmp4Text);
            if (ytmp4Data.status && ytmp4Data.result) {
              downloadUrl = ytmp4Data.result;
              sourceApi = "gawrgura-api (ytmp4)";
            }
          }
        } catch (err) {
          console.error("❌ Error con la API ytmp4:", err.message);
        }
      }

      if (!downloadUrl) {
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: "❌", key: msg.key },
        });
        return sock.sendMessage(
          msg.key.remoteJid,
          {
            text: "⚠️ No se pudo descargar el video desde ninguna API. Intenta más tarde o con otro enlace.",
          },
          { quoted: msg }
        );
      }

      // 🔹 Descargar video (espera larga)
      const response = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
        timeout: 600000, // 10 minutos máximo de espera
      });
      const buffer = response.data;

      // Enviar el video al chat
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          video: buffer,
          mimetype: "video/mp4",
          caption: `🎥 *${videoTitle}*\n\n✅ Descargado desde: ${sourceApi}\n\n⚡ _Gracias por tu paciencia_ 💙`,
        },
        { quoted: msg }
      );

      // Reacción final
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "✅", key: msg.key },
      });
    } catch (error) {
      console.error("Error en el comando play2:", error);
      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "❌", key: msg.key },
      });
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `❌ Ocurrió un error inesperado:\n> ${error.message}\n\n⚠️ Puede que el servidor de descarga esté temporalmente inactivo.`,
        },
        { quoted: msg }
      );
    }
  },
};

export default play2Command; 
