import fs from 'fs';
import path from 'path';
import config from '../config.js';

const configPath = path.resolve('./config.js');

const antispamCommand = {
  name: "antispam",
  category: "propietario",
  description: "Activa o desactiva el sistema anti-spam.",
  aliases: ["anti-spam"],

  async execute({ sock, msg, args }) {
    const action = args[0]?.toLowerCase();

    if (!action || (action !== 'on' && action !== 'off')) {
      return sock.sendMessage(msg.key.remoteJid, { text: `Uso: .antispam <on|off>` }, { quoted: msg });
    }

    const newValue = action === 'on';

    try {
      // Leer el contenido del archivo de configuración
      let configContent = fs.readFileSync(configPath, 'utf8');

      // Actualizar el valor de antiSpamEnabled usando una expresión regular
      configContent = configContent.replace(
        /(antiSpamEnabled:\s*)(\w+)/,
        `$1${newValue}`
      );

      // Escribir el contenido actualizado de nuevo en el archivo
      fs.writeFileSync(configPath, configContent, 'utf8');

      // Actualizar la configuración en memoria
      config.antiSpamEnabled = newValue;

      await sock.sendMessage(msg.key.remoteJid, { text: `El sistema anti-spam ha sido ${newValue ? 'activado' : 'desactivado'}.` }, { quoted: msg });
    } catch (error) {
      console.error("Error al actualizar la configuración de anti-spam:", error);
      await sock.sendMessage(msg.key.remoteJid, { text: "Ocurrió un error al intentar actualizar la configuración." }, { quoted: msg });
    }
  }
};

export default antispamCommand;
