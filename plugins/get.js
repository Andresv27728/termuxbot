import fetch from 'node-fetch';
import { format } from 'util';

const getCommand = {
  name: 'get',
  category: 'propietario',
  description: 'Obtiene el contenido de una URL.',
  aliases: ['fetch'],

  async execute({ sock, msg, args }) {
    const text = args.join(' ');
    if (!/^https?:\/\//.test(text)) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Ingresa un link de una página' }, { quoted: msg });
    }

    try {
      const url = new URL(text);
      const res = await fetch(url.toString());

      if (res.headers.get('content-length') > 100 * 1024 * 1024) { // 100 MB limit
        return sock.sendMessage(msg.key.remoteJid, { text: `Content-Length excede el límite: ${res.headers.get('content-length')}` }, { quoted: msg });
      }

      const contentType = res.headers.get('content-type');
      if (!/text|json/.test(contentType)) {
        const buffer = await res.buffer();
        // Nota: La función sendFile no existe en Baileys de esta forma.
        // Se debe enviar como documento.
        return sock.sendMessage(
          msg.key.remoteJid,
          { document: buffer, mimetype: contentType, fileName: url.pathname.split('/').pop() || 'file' },
          { quoted: msg }
        );
      }

      let txt = await res.text();
      try {
        // Si es JSON, lo formatea para mejor lectura
        txt = format(JSON.parse(txt));
      } catch (e) {
        // No es JSON, se deja como texto plano
      }

      await sock.sendMessage(msg.key.remoteJid, { text: txt.slice(0, 65536) }, { quoted: msg });
    } catch (error) {
      console.error('Error en el comando get:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error al obtener la URL: ${error.message}` }, { quoted: msg });
    }
  }
};

export default getCommand;
