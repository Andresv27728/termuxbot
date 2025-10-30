import { readUsersDb } from '../lib/database.js';
import { initializeRpgUser } from '../lib/utils.js';

const professionMap = {
  blacksmith: { name: "Herrero", emoji: "🛠️" },
  miner: { name: "Minero", emoji: "⛏️" },
  alchemist: { name: "Alquimista", emoji: "⚗️" }
};

const profileCommand = {
  name: "profile",
  category: "rpg",
  description: "Muestra tu perfil de personaje del RPG.",
  aliases: ["perfil", "stats"],

  async execute({ sock, msg }) {
    const senderId = msg.sender;
    const usersDb = readUsersDb();
    const user = usersDb[senderId];

    if (!user || !user.level) {
      return sock.sendMessage(msg.key.remoteJid, { text: "No estás registrado en el RPG. Usa `reg`." }, { quoted: msg });
    }

    // Inicializar datos del usuario para asegurar compatibilidad
    initializeRpgUser(user);

    const getBar = (current, max) => {
        const percentage = (current / max) * 100;
        const filledCount = Math.round((percentage / 100) * 10);
        const emptyCount = 10 - filledCount;
        return '█'.repeat(filledCount) + '░'.repeat(emptyCount);
    };

    let profileMessage = `*👤 Perfil de ${msg.pushName} 👤*\n\n`;

    // --- Level and XP ---
    const xpForNextLevel = 5 * (user.level ** 2) + 50 * user.level + 100;
    profileMessage += `*Nivel:* ${user.level}\n`;
    profileMessage += `*XP:* ${user.xp} / ${xpForNextLevel}\n`;
    profileMessage += `[${getBar(user.xp, xpForNextLevel)}]\n\n`;

    // --- Profession ---
    if (user.profession && professionMap[user.profession]) {
        const prof = professionMap[user.profession];
        profileMessage += `*Profesión:* ${prof.emoji} ${prof.name}\n\n`;
    } else {
        profileMessage += `*Profesión:* Ninguna (Usa \`.profession\`).\n\n`;
    }

    // --- Core Stats ---
    profileMessage += "❤️ *Salud:* " + `${user.hp}/${user.maxHp}\n`;
    profileMessage += "💰 *Monedas:* " + `${user.coins || 0}\n\n`;

    profileMessage += "⚔️ *Estadísticas de Combate*\n";
    profileMessage += `*Fuerza:* ${user.strength}\n`;
    profileMessage += `*Defensa:* ${user.defense}\n`;
    profileMessage += `*Velocidad:* ${user.speed}\n\n`;

    // --- Buffs ---
    if (user.buffs && Object.keys(user.buffs).length > 0) {
        profileMessage += "✨ *Efectos Activos*\n";
        const now = Date.now();
        for (const buff in user.buffs) {
            if (user.buffs[buff].expires > now) {
                const timeLeft = Math.ceil((user.buffs[buff].expires - now) / 60000);
                profileMessage += `*${buff.charAt(0).toUpperCase() + buff.slice(1)}:* +${user.buffs[buff].bonus} (${timeLeft} min restantes)\n`;
            }
        }
        profileMessage += "\n";
    }

    // --- Favorite Waifu ---
    if (user.favoriteWaifuId) {
        const favoriteWaifu = user.harem.find(w => w.id === user.favoriteWaifuId);
        if (favoriteWaifu) {
            profileMessage += `*❤️ Waifu Favorita:* ${favoriteWaifu.name}\n`;
        }
    }

    await sock.sendMessage(msg.key.remoteJid, { text: profileMessage.trim() }, { quoted: msg });
  }
};

export default profileCommand;