import fs from 'fs';
import path from 'path';

const savePluginCommand = {
  name: 'saveplugin',
  category: 'propietario',
  description: 'Guarda o actualiza el código de un plugin.',
  aliases: ['sp'],

  async execute({ sock, msg, args, body }) {
    if (args.length < 1) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Uso: .saveplugin <nombre_archivo.js>\\n\\n<código>' }, { quoted: msg });
    }

    const fileName = args[0].endsWith('.js') ? args[0] : `${args[0]}.js`;
    const pluginPath = path.join(process.cwd(), 'plugins', fileName);

    const codeToSave = body.substring(body.indexOf(args[0]) + args[0].length).trim();

    if (!codeToSave) {
        return sock.sendMessage(msg.key.remoteJid, { text: 'No proporcionaste ningún código para guardar.' }, { quoted: msg });
    }

    try {
      fs.writeFileSync(pluginPath, codeToSave, 'utf-8');
      await sock.sendMessage(msg.key.remoteJid, { text: `El plugin '${fileName}' ha sido guardado/actualizado correctamente. Usa .reload para aplicar los cambios.` }, { quoted: msg });
    } catch (error) {
      console.error('Error en el comando saveplugin:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error al guardar el plugin: ${error.message}` }, { quoted: msg });
    }
  }
};

export default savePluginCommand;
