import { addVideoToQueue } from '../lib/db.js';

const TARGET_CHANNEL_ID = '120363423384954071@newsletter';

const chCommand = {
  name: 'ch',
  category: 'propietario',
  description: 'Añade un video a la cola de envío para el canal.',
  aliases: ['channeldl'],

  async execute({ sock, msg, args }) {
    if (TARGET_CHANNEL_ID === 'PUT_YOUR_CHANNEL_ID_HERE' || !TARGET_CHANNEL_ID) {
      return sock.sendMessage(msg.key.remoteJid, { text: '❌ *Configuración requerida!*\n\nPor favor, edita el archivo `plugins/ch.js` y establece el `TARGET_CHANNEL_ID` con el ID de tu canal de WhatsApp.' }, { quoted: msg });
    }

    const url = args[0];
    if (!url) {
      return sock.sendMessage(msg.key.remoteJid, { text: '📥 Por favor, proporciona un enlace de Facebook, YouTube, Instagram o TikTok.' }, { quoted: msg });
    }

    try {
      await addVideoToQueue(url);
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Video añadido a la cola de envío.' }, { quoted: msg });
    } catch (error) {
      console.error("Error en el comando ch:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Ocurrió un error: ${error.message}` }, { quoted: msg });
    }
  }
};

export default chCommand;
