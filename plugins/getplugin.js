import fs from 'fs';
import path from 'path';

const getPluginCommand = {
  name: 'getplugin',
  category: 'propietario',
  description: 'Obtiene el código fuente de un plugin.',
  aliases: ['gp'],

  async execute({ sock, msg, args }) {
    if (args.length === 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: 'Por favor, proporciona el nombre del archivo del plugin.' }, { quoted: msg });
    }

    const pluginName = args[0].endsWith('.js') ? args[0] : `${args[0]}.js`;
    const pluginPath = path.join(process.cwd(), 'plugins', pluginName);

    try {
      if (fs.existsSync(pluginPath)) {
        const fileContent = fs.readFileSync(pluginPath, 'utf-8');
        await sock.sendMessage(msg.key.remoteJid, { text: fileContent }, { quoted: msg });
      } else {
        await sock.sendMessage(msg.key.remoteJid, { text: `El plugin '${pluginName}' no fue encontrado.` }, { quoted: msg });
      }
    } catch (error) {
      console.error('Error en el comando getplugin:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error al leer el plugin: ${error.message}` }, { quoted: msg });
    }
  }
};

export default getPluginCommand;
