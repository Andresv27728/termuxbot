import fetch from 'node-fetch';
import fs from 'fs';
import pkg from 'file-type';
const { fileTypeFromBuffer } = pkg;
import FormData from 'form-data';

const uploadCommand = {
  name: "upload",
  category: "utilidades",
  description: "Sube una imagen y obtén un enlace directo usando HackStoreX.",
  aliases: ["subir", "img", "imagen"],

  async execute({ sock, msg, args }) {
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imageMessage = quotedMsg?.imageMessage || msg.message?.imageMessage;
    
    if (!imageMessage) {
      const usageMessage = `📤 *Uso correcto del comando:*\n\n` +
        `1. Envía una imagen con el caption: .upload\n` +
        `2. O responde a una imagen con: .upload\n\n` +
        `*Ejemplo:*\n[Imagen adjunta]\n.upload`;
      return sock.sendMessage(msg.key.remoteJid, { text: usageMessage }, { quoted: msg });
    }

    try {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '⬆️', key: msg.key } });
      const buffer = await sock.downloadMediaMessage(quotedMsg || msg);
      
      if (!buffer) {
        throw new Error('No se pudo descargar la imagen.');
      }

      // Verificar tipo de archivo
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType || !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(fileType.mime)) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        return sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ Formato no válido. Solo se aceptan: JPG, PNG, GIF, WebP' 
        }, { quoted: msg });
      }

      //  (máx 5MB después me quedo off)
      const maxSize = 5 * 1024 * 1024;
      if (buffer.length > maxSize) {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
        return sock.sendMessage(msg.key.remoteJid, { 
          text: '❌ La imagen es muy pesada. Tamaño máximo: 5MB' 
        }, { quoted: msg });
      }

      await sock.sendMessage(msg.key.remoteJid, { 
        text: `⏳ Subiendo imagen (${(buffer.length / 1024).toFixed(2)} KB)...` 
      }, { quoted: msg });
      const form = new FormData();
      form.append('image', buffer, {
        filename: `image.${fileType.ext}`,
        contentType: fileType.mime
      });

      const response = await fetch('https://upload.hackstorex.com/apiup/', {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const json = await response.json();

      if (!response.ok || !json.url) {
        throw new Error(json.error || 'Error al subir la imagen');
      }

      // Enviar respuesta exitosa
      const successMessage = `✅ *Imagen subida exitosamente*\n\n` +
        `🔗 *URL:* ${json.url}\n\n` +
        `📋 Copia el enlace para compartir tu imagen.`;

      await sock.sendMessage(msg.key.remoteJid, { 
        text: successMessage 
      }, { quoted: msg });

      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      console.error("Error en el comando upload:", error);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `❌ Error al subir la imagen: ${error.message}\n\nIntenta nuevamente o verifica que la imagen sea válida.` 
      }, { quoted: msg });
    }
  }
};

export default uploadCommand;
