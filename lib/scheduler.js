import fetch from 'node-fetch';
import yts from 'yt-search';
import { savetube } from './yt-savetube.js';
import { getNextVideo, removeVideoFromQueue } from './db.js';

const TARGET_CHANNEL_ID = '120363423384954071@newsletter';
let sockInstance;

async function downloadVideo(url) {
  let videoUrl;

  if (/(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.watch)\b/i.test(url)) {
    const api = `https://gawrgura-api.onrender.com/download/facebook?url=${encodeURIComponent(url)}`;
    const res = await fetch(api);
    const json = await res.json();
    if (!json.status || !json.result?.media?.video_hd) throw new Error('No se pudo obtener el video de Facebook.');
    videoUrl = json.result.media.video_hd;

  } else if (/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\b/i.test(url)) {
    const searchResults = await yts(url);
    const video = searchResults.videos[0];
    if (!video) throw new Error('No se encontraron resultados para el video de YouTube.');
    const downloadResult = await savetube.download(video.url, '720');
    if (!downloadResult.status || !downloadResult.result.download) throw new Error('No se pudo obtener el enlace de descarga de YouTube.');
    videoUrl = downloadResult.result.download;

  } else if (/(?:https?:\/\/)?(?:www\.)?instagram\.com\b/i.test(url)) {
    const res = await fetch(`https://api.dorratz.com/igdl?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    const videoItem = data.data?.find(item => item.url.includes('.mp4'));
    if (!videoItem) throw new Error('No se pudo obtener el video de Instagram.');
    videoUrl = videoItem.url;

  } else if (/(?:https?:\/\/)?(?:www\.)?tiktok\.com\b/i.test(url)) {
    const api = `https://gawrgura-api.onrender.com/download/tiktok?url=${encodeURIComponent(url)}`;
    const res = await fetch(api);
    const json = await res.json();
    if (!json.status || !json.result?.video_nowm) throw new Error('No se pudo obtener el video de TikTok.');
    videoUrl = json.result.video_nowm;

  } else {
    throw new Error('URL no compatible.');
  }

  return videoUrl;
}

async function processQueue() {
  const video = await getNextVideo();
  if (video) {
    try {
      const videoUrl = await downloadVideo(video.url);
      if (videoUrl) {
        await sockInstance.sendMessage(TARGET_CHANNEL_ID, {
          video: { url: videoUrl },
          caption: 'power by yo soy yo',
          mimetype: 'video/mp4'
        });
      }
      await removeVideoFromQueue();
    } catch (error) {
      console.error('Error al procesar la cola de videos:', error);
    }
  }
}

function startScheduler(sock) {
  sockInstance = sock;
  setTimeout(() => {
    processQueue();
    setInterval(processQueue, 20 * 60 * 1000); // 20 minutes
  }, 5 * 60 * 1000); // 5 minutes
}

export { startScheduler };
