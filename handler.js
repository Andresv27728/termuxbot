// Este es el manejador de mensajes que usarán los sub-bots y el bot principal.
import { commands, aliases, testCache, cooldowns, commandUsage, messageTimestamps, userBlock } from './index.js';
import config from './config.js';
import { readSettingsDb, readMaintenanceDb } from './lib/database.js';
import warnCommand from './plugins/warn.js';
import print from './lib/print.js';
import { getUserFromMessage } from './lib/utils.js';
import { areJidsSameUser } from '@whiskeysockets/baileys';

const COOLDOWN_SECONDS = 5;
const RESPONSE_DELAY_MS = 2000;

export async function handler(m, isSubBot = false) {
  const sock = this;

  try {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    try { await print(msg, sock); } catch (e) { console.error("Print error:", e); }

    const senderId = msg.key.participant || msg.key.remoteJid;
    msg.sender = senderId;

    const from = msg.key.remoteJid;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

    // --- Anti-Spam Logic ---
    const now = Date.now();
    if (userBlock.has(senderId) && (now < userBlock.get(senderId))) {
      return; // User is blocked, ignore message
    }
    userBlock.delete(senderId); // Unblock if time has passed

    const userTimestamps = messageTimestamps.get(senderId) || [];
    userTimestamps.push(now);

    // Fast spam detection (100 messages in 10 seconds)
    const fastSpamWindow = 10000; // 10 seconds
    const fastSpamThreshold = 100;
    const recentFastSpam = userTimestamps.filter(t => now - t < fastSpamWindow);
    if (recentFastSpam.length > fastSpamThreshold) {
        await warnCommand.execute({ sock, msg, args: [] });
        userBlock.set(senderId, now + (10 * 60 * 1000)); // Block for 10 minutes
        messageTimestamps.set(senderId, []); // Reset timestamps
        return;
    }

    // Slow spam detection (e.g., 10 messages in 20 seconds)
    const slowSpamWindow = 20000; // 20 seconds
    const slowSpamThreshold = 10;
    const recentSlowSpam = userTimestamps.filter(t => now - t < slowSpamWindow);
    if (recentSlowSpam.length > slowSpamThreshold) {
        userBlock.set(senderId, now + (10 * 60 * 1000)); // Block for 10 minutes
        await sock.sendMessage(from, { text: "Has sido bloqueado por 10 minutos por spam." }, { quoted: msg });
        messageTimestamps.set(senderId, []); // Reset timestamps
        return;
    }

    messageTimestamps.set(senderId, userTimestamps.filter(t => now - t < slowSpamWindow));

    // --- Ejecutar Auto-Handlers ---
    // Busca comandos que no necesitan prefijo y se ejecutan automáticamente.
    const autoHandlers = Array.from(commands.values()).filter(cmd => cmd.isAutoHandler);
    for (const handler of autoHandlers) {
      try {
        // Pass the body to all auto-handlers so they can process message content
        await handler.execute({ sock, msg, body });
      } catch (error) {
        console.error(`Error en el auto-handler ${handler.name}:`, error);
      }
    }
    // --- Fin de Auto-Handlers ---

    const settings = readSettingsDb();
    const groupPrefix = from.endsWith('@g.us') ? settings[from]?.prefix : null;

    let commandName;
    let args;

    if (groupPrefix) {
      if (!body.startsWith(groupPrefix)) return;
      body = body.slice(groupPrefix.length);
      args = body.trim().split(/ +/).slice(1);
      commandName = body.trim().split(/ +/)[0].toLowerCase();
    } else {
      // Si hay prefijo global o si no hay prefijo de grupo, procesar normal
      const globalPrefix = config.prefix; // Asumiendo que podría haber un prefijo global en config
      if (globalPrefix && !body.startsWith(globalPrefix)) return;
      if (globalPrefix) body = body.slice(globalPrefix.length);

      args = body.trim().split(/ +/).slice(1);
      commandName = body.trim().split(/ +/)[0].toLowerCase();
    }

    let command = commands.get(commandName) || commands.get(aliases.get(commandName));

    if (command) {
      const isGroup = from.endsWith('@g.us');
      const senderNumber = senderId.split('@')[0];
      const isOwner = config.ownerNumbers.includes(senderNumber);

      // --- Verificación Global de Modo Admin ---
      if (isGroup && settings[from]?.adminMode && !isOwner) {
        const groupMetadata = await sock.groupMetadata(from);
        const senderParticipant = groupMetadata.participants.find(p => areJidsSameUser(p.id, senderId));
        const senderIsAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';

        if (!senderIsAdmin) {
          // Si el modo admin está activado y el usuario no es admin, no hacer nada.
          return;
        }
      }
      // --- Fin de la Verificación ---

      // --- Verificación de Modo RPG ---
      if (isGroup && settings[from]?.rpgEnabled === false && command.category === 'rpg' && !isOwner) {
        return sock.sendMessage(from, { text: "Los comandos de RPG están desactivados en este grupo." }, { quoted: msg });
      }
      // --- Fin de la Verificación ---

      // --- Verificaciones de Permisos por Comando ---
      if (command.category === 'propietario' && !isOwner) {
        return sock.sendMessage(from, { text: "Este comando es solo para el propietario del bot." });
      }

      if (command.group && !isGroup) {
        return sock.sendMessage(from, { text: "Este comando solo puede usarse en grupos." });
      }

      if (isGroup && (command.admin || command.botAdmin)) {
        const groupMetadata = await sock.groupMetadata(from);
        const botJid = sock.user.id;

        // Find the participant objects for the bot and the sender using a more robust check
        const botParticipant = groupMetadata.participants.find(p => areJidsSameUser(p.id, botJid));
        const senderParticipant = groupMetadata.participants.find(p => [msg.sender, msg.lid].some(sJid => areJidsSameUser(p.id, sJid)));

        // Check their admin status safely
        const botIsAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
        const senderIsAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';

        if (command.botAdmin && !botIsAdmin) {
          return sock.sendMessage(from, { text: "Necesito ser administrador del grupo para usar este comando." });
        }

        if (command.admin && !senderIsAdmin) {
          return sock.sendMessage(from, { text: "Necesitas ser administrador del grupo para usar este comando." });
        }
      }

      if (command.category === 'subbots' && !isOwner) {
        // En un futuro, aquí se podría comprobar una lista de usuarios autorizados
        return sock.sendMessage(from, { text: "No tienes permiso para gestionar sub-bots." });
      }
      // Los sub-bots no pueden usar comandos de propietario/sub-bots
      if (isSubBot && (command.category === 'propietario' || command.category === 'subbots')) {
        return sock.sendMessage(from, { text: "Un sub-bot no puede usar este comando." });
      }

      // Cooldown
      if (cooldowns.has(senderId)) {
        const timeDiff = (Date.now() - cooldowns.get(senderId)) / 1000;
        if (timeDiff < COOLDOWN_SECONDS) return;
      }

      // Verificación de Mantenimiento
      const maintenanceList = readMaintenanceDb();
      if (maintenanceList.includes(commandName) && !isOwner) {
        return sock.sendMessage(from, { text: "🛠️ Este comando está actualmente en mantenimiento. Por favor, inténtalo más tarde." });
      }

      // Ejecución
      try {
        // Track command usage
        const currentCount = commandUsage.get(command.name) || 0;
        commandUsage.set(command.name, currentCount + 1);

        await new Promise(resolve => setTimeout(resolve, RESPONSE_DELAY_MS));
        // Pasamos 'commandName' para que los comandos puedan saber con qué alias fueron llamados.
        await command.execute({ sock, msg, args, commands, config, testCache, isOwner, commandName });
        cooldowns.set(senderId, Date.now());
      } catch (error) {
        console.error(`Error en comando ${commandName}:`, error);
        await sock.sendMessage(from, { text: 'Ocurrió un error al ejecutar ese comando.' });
      }
    }
  } catch (e) {
    console.error("Error en el manejador de mensajes:", e);
  }
}
