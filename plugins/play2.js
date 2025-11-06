import fetch from "node-fetch";
import yts from "yt-search";
import axios from "axios";

const youtubeRegexID =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\\?v=|embed\\/))([a-zA-Z0-9_-]{11})/;

// Función para probar una API
const tryApi = async (apiName, apiUrl, title) => {
  try {
    const res = await fetch(apiUrl);
    const text = await res.text();
    if (text.startsWith("<")) return null; // Si Render devuelve HTML
    const data = JSON.parse(text);
    if (!data.status) return null;

    if (apiName === "ytdl" && data.result?.mp4)
      return { url: data.result.mp4, title: data.result.title, api: apiName };
    if (apiName === "ytmp4" && data.result)
      return { url: data.result, title, api: apiName };
    return null;
  } catch (e) {
    console.error(`Error con la API ${apiName}:`, e.message);
    return null;
  }
};

// Animación circular (rotativa)
const startCircularLoading = (sock, chatId, key) => {
  const frames = ["🔵⚪⚪⚪", "⚪🔵⚪⚪", "⚪⚪🔵⚪", "⚪⚪⚪🔵"];
  let i = 0;
  let stopped = false;

  const interval = setInterval(async () => {
    if (stopped) return clearInterval(interval);
    try {
      await sock.sendMessage(chatId, {
        react: { text: frames[i], key },
      });
      i = (i + 1) % frames.length;
    } catch {}
  }, 2000); // cambia de frame cada 2 segundos

  return () => {
    stopped = true;
    clearInterval(interval);
  };
};

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
          { text: "Por favor, ingresa el nombre o link del video." },
          { quoted: msg }
        );
      }

      await sock.sendMessage(msg.key.remoteJid, {
        react: { text: "🔄", key: msg.key },
      });

      // Buscar en YouTube
      let videoIdToFind = text.match(youtubeRegexID) || null;
      let searchResult = await yts(
        videoIdToFind === null ? text : "https://youtu.be/" + videoIdToFind[1]
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

      // Enviar vista previa
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          image: { url: thumbnail },
          caption: `🎵 *${title}*\n👤 ${author?.name || "Desconocido"}\n🕒 ${
            timestamp || "Duración desconocida"
          }\n👁️ ${views?.toLocaleString() || "N/A"} vistas\n\n⌛ *Preparando la descarga... esto puede tardar unos minutos si el video es grande.*`,
        },
        { quoted: msg }
      );

      const chatId = msg.key.remoteJid;
      const stopAnimation = startCircularLoading(sock, chatId, msg.key);

      const ytdlUrl = `https://gawrgura-api.onrender.com/download/ytdl?url=${encodeURIComponent(
        url
      )}`;
      const ytmp4Url = `https://gawrgura-api.onrender.com/download/ytmp4?url=${encodeURIComponent(
        url
      )}`;

      // Ejecutar ambas APIs al mismo tiempo
      const [resYtdl, resYtmp4] = await Promise.allSettled([
        tryApi("ytdl", ytdlUrl, title),
        tryApi("ytmp4", ytmp4Url, title),
      ]);

      // Parar la animación al obtener respuesta
      stopAnimation();

      const validResult =
        resYtdl.value || resYtmp4.value || null;

      if (!validResult) {
        await sock.sendMessage(msg.key.remoteJid, {
          react: { text: "❌", key: msg.key },
        });
        return sock.sendMessage(
          chatId,
          {
            text: "❌ No se pudo obtener respuesta de las APIs. Intenta más tarde (Render puede estar dormido).",
          },
          { quoted: msg }
        );
      }

      const downloadUrl = validResult.url;
      const videoTitle = validResult.title || title;
      const sourceApi =
        validResult.api === "ytdl"
          ? "gawrgura-api (ytdl)"
          : "gawrgura-api (ytmp4)";

      // Descargar el video
      const videoResponse = await axios.get(downloadUrl, {
        responseType: "arraybuffer",
      });
      const videoBuffer = videoResponse.data;

      await sock.sendMessage(
        chatId,
        {
          video: videoBuffer,
          mimetype: "video/mp4",
          caption: `${videoTitle}\n\n🔗 *Fuente:* ${sourceApi}`,
        },
        { quoted: msg }
      );

      await sock.sendMessage(chatId, {
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
