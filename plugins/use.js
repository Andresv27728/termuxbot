import { readUsersDb, writeUsersDb } from '../lib/database.js';
import { initializeRpgUser } from '../lib/utils.js';

// --- Item Effects Configuration ---
const itemEffects = {
  health_potion: {
    name: "Poción de Salud",
    description: "Restaura 25 HP.",
    action: (user) => {
      const healAmount = 25;
      const maxHp = user.max_hp || 100;
      const currentHp = user.hp;

      if (currentHp >= maxHp) {
        return { success: false, message: "Ya tienes la salud al máximo." };
      }

      const newHp = Math.min(maxHp, currentHp + healAmount);
      const healedFor = newHp - currentHp;
      user.hp = newHp;

      return { success: true, message: `Has usado una ${itemEffects.health_potion.name} y has restaurado ${healedFor} HP. Salud actual: ${user.hp}/${maxHp}.` };
    },
  },
  strength_potion: {
    name: "Poción de Fuerza",
    description: "Aumenta tu ataque en 10 durante 5 minutos.",
    action: (user) => {
      const now = Date.now();
      const buffDuration = 5 * 60 * 1000; // 5 minutes
      user.buffs = user.buffs || {};
      user.buffs.strength = {
        bonus: 10,
        expires: now + buffDuration,
      };
      return { success: true, message: `¡Bebiste una ${itemEffects.strength_potion.name}! Tu ataque ha aumentado en 10 durante 5 minutos.` };
    },
  },
  defense_potion: {
    name: "Poción de Defensa",
    description: "Aumenta tu defensa en 10 durante 5 minutos.",
    action: (user) => {
      const now = Date.now();
      const buffDuration = 5 * 60 * 1000; // 5 minutes
      user.buffs = user.buffs || {};
      user.buffs.defense = {
        bonus: 10,
        expires: now + buffDuration,
      };
      return { success: true, message: `¡Bebiste una ${itemEffects.defense_potion.name}! Tu defensa ha aumentado en 10 durante 5 minutos.` };
    },
  },
  lucky_elixir: {
    name: "Elixir de la Suerte",
    description: "Aumenta tu suerte para encontrar objetos raros durante 10 minutos.",
    action: (user) => {
      const now = Date.now();
      const buffDuration = 10 * 60 * 1000; // 10 minutes
      user.buffs = user.buffs || {};
      user.buffs.luck = {
        bonus: 20, // Example luck bonus
        expires: now + buffDuration,
      };
      return { success: true, message: `¡Bebiste un ${itemEffects.lucky_elixir.name}! Tu suerte ha aumentado durante 10 minutos.` };
    },
  },
};


// --- Helper Functions ---
function getUser(senderId) {
  const usersDb = readUsersDb();
  return usersDb[senderId];
}

function saveUser(senderId, userData) {
  const usersDb = readUsersDb();
  usersDb[senderId] = userData;
  writeUsersDb(usersDb);
}


// --- Command Logic ---
const useCommand = {
  name: "use",
  category: "rpg",
  description: "Usa un objeto de tu inventario.",
  aliases: ["usar"],

  async execute({ sock, msg, args }) {
    const senderId = msg.sender;
    const user = getUser(senderId);

    if (!user) {
      return sock.sendMessage(msg.key.remoteJid, { text: "No estás registrado. Usa `reg` para empezar." }, { quoted: msg });
    }

    initializeRpgUser(user);

    const itemToUse = args[0]?.toLowerCase();

    if (!itemToUse) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Debes especificar qué objeto quieres usar. Ejemplo: `.use health_potion`" }, { quoted: msg });
    }

    if (!user.inventory || (user.inventory[itemToUse] || 0) <= 0) {
      return sock.sendMessage(msg.key.remoteJid, { text: `No tienes ${itemToUse} en tu inventario.` }, { quoted: msg });
    }

    const effect = itemEffects[itemToUse];
    if (!effect || !effect.action) {
      return sock.sendMessage(msg.key.remoteJid, { text: "Este objeto no se puede usar." }, { quoted: msg });
    }

    // Ejecutar la acción del objeto
    const result = effect.action(user);

    if (result.success) {
      // Si se usó con éxito, descontar del inventario
      user.inventory[itemToUse]--;
      if (user.inventory[itemToUse] <= 0) {
        delete user.inventory[itemToUse]; // Limpiar si se acaban
      }
      saveUser(senderId, user);
    }

    return sock.sendMessage(msg.key.remoteJid, { text: result.message }, { quoted: msg });
  }
};

export default useCommand;
