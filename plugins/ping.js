import os from 'os';
import { performance } from 'perf_hooks';
import { commandUsage } from '../index.js';

// Helper function to format uptime in seconds to a readable string
function formatUptime(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const secs = Math.floor(seconds % 60);

    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

const pingCommand = {
    name: 'ping',
    category: 'info',
    description: 'Muestra información detallada sobre el estado del bot y del servidor.',
    aliases: ['p', 'estado', 'speed'],

    async execute({ sock, msg, commands }) {
        const start = performance.now();

        // --- Datos del Bot ---
        const uptime = formatUptime(process.uptime());
        const totalCommands = commands.size;
        const totalExecutions = Array.from(commandUsage.values()).reduce((a, b) => a + b, 0);

        // --- Datos del Servidor ---
        const platform = os.platform();
        const arch = os.arch();
        const cpuModel = os.cpus()[0].model;
        const memoryUsage = process.memoryUsage();
        const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
        const usedMem = (memoryUsage.rss / 1024 / 1024).toFixed(2);
        const nodeVersion = process.version;

        const end = performance.now();
        const latency = (end - start).toFixed(2);

        const responseText = `
*╭─── 「 🤖 BOT STATUS 」 ───*
*│*  ≡◦ *Latencia:* ${latency} ms
*│*  ≡◦ *Tiempo Activo:* ${uptime}
*│*  ≡◦ *Comandos Cargados:* ${totalCommands}
*│*  ≡◦ *Comandos Ejecutados:* ${totalExecutions}
*╰──────────────────*

*╭─── 「 💻 SERVER INFO 」 ───*
*│*  ≡◦ *Plataforma:* ${platform}
*│*  ≡◦ *Arquitectura:* ${arch}
*│*  ≡◦ *CPU:* ${cpuModel}
*│*  ≡◦ *Memoria RAM:* ${usedMem} MB / ${totalMem} MB
*│*  ≡◦ *Versión de Node.js:* ${nodeVersion}
*╰──────────────────*
`;

        await sock.sendMessage(msg.key.remoteJid, { text: responseText.trim() }, { quoted: msg });
    }
};

export default pingCommand;
