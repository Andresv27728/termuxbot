import { readUsersDb, writeUsersDb } from '../lib/database.js';
import { initializeRpgUser } from '../lib/utils.js';

// --- Recipe Configuration ---
const craftRecipes = {
  health_potion: {
    name: "Poción de Salud",
    description: "Restaura 25 HP.",
    cost: {
      forage: 10,
      fish: 5
    },
    produces: 1,
  },
  strength_potion: {
    name: "Poción de Fuerza",
    description: "Aumenta tu ataque en 10 durante 5 minutos.",
    cost: {
      forage: 15,
      stone: 10
    },
    produces: 1,
  },
  defense_potion: {
    name: "Poción de Defensa",
    description: "Aumenta tu defensa en 10 durante 5 minutos.",
    cost: {
      forage: 15,
      iron: 5
    },
    produces: 1,
  },
  lucky_elixir: {
    name: "Elixir de la Suerte",
    description: "Aumenta tu suerte para encontrar objetos raros durante 10 minutos.",
    cost: {
      gold: 5,
      diamonds: 1
    },
    produces: 1,
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

function checkResources(inventory, cost) {
  for (const resource in cost) {
    if ((inventory[resource] || 0) < cost[resource]) {
      return false; // Not enough resources
    }
  }
  return true;
}

function subtractResources(inventory, cost) {
  for (const resource in cost) {
    inventory[resource] -= cost[resource];
  }
  return inventory;
}

// --- Command Logic ---
const craftCommand = {
  name: "craft",
  category: "rpg",
  description: "Crea objetos y consumibles a partir de recursos. Usa `.craft list` para ver las recetas.",
  aliases: ["fabricar"],

  async execute({ sock, msg, args }) {
    const senderId = msg.sender;
    const user = getUser(senderId);

    if (!user) {
      return sock.sendMessage(msg.key.remoteJid, { text: "No estás registrado. Usa el comando `reg` para registrarte." }, { quoted: msg });
    }

    initializeRpgUser(user);

    const action = args[0]?.toLowerCase();
    const itemToCraft = args[1]?.toLowerCase();
    const amount = parseInt(args[2]) || 1;

    if (!action) {
        return this.showHelp(sock, msg);
    }

    switch (action) {
        case 'list':
            return this.showRecipes(sock, msg);
        case 'item':
             if (!itemToCraft) {
                return sock.sendMessage(msg.key.remoteJid, { text: "Debes especificar qué objeto quieres fabricar. Ejemplo: `.craft item health_potion`" }, { quoted: msg });
            }
            return this.craftItem(sock, msg, user, itemToCraft, amount);
        default:
            return this.showHelp(sock, msg);
    }
  },

  async craftItem(sock, msg, user, itemType, amount) {
    if (amount <= 0) {
        return sock.sendMessage(msg.key.remoteJid, { text: "La cantidad debe ser un número positivo." }, { quoted: msg });
    }

    const recipe = craftRecipes[itemType];
    if (!recipe) {
        return sock.sendMessage(msg.key.remoteJid, { text: "No existe una receta para ese objeto. Usa `.craft list` para ver las opciones." }, { quoted: msg });
    }

    const totalCost = {};
    for (const resource in recipe.cost) {
        totalCost[resource] = recipe.cost[resource] * amount;
    }

    if (!checkResources(user.inventory, totalCost)) {
        let missing = Object.keys(totalCost).map(k => `*${totalCost[k]}* ${k}`).join(', ');
        return sock.sendMessage(msg.key.remoteJid, { text: `No tienes suficientes recursos para fabricar ${amount} de ${recipe.name}. Necesitas: ${missing}.` }, { quoted: msg });
    }

    user.inventory = subtractResources(user.inventory, totalCost);

    const itemsProduced = recipe.produces * amount;
    user.inventory[itemType] = (user.inventory[itemType] || 0) + itemsProduced;

    saveUser(msg.sender, user);
    await sock.sendMessage(msg.key.remoteJid, { text: `🧪 ¡Has fabricado ${itemsProduced} de ${recipe.name}! Ahora tienes ${user.inventory[itemType]}.` }, { quoted: msg });
  },

  async showRecipes(sock, msg) {
    let list = "*📜 Recetas Disponibles 📜*\n\n";
    for (const key in craftRecipes) {
        const recipe = craftRecipes[key];
        let reqs = Object.entries(recipe.cost).map(([k, v]) => `${v} ${k}`).join(', ');
        list += `*${recipe.name}* (\`${key}\`)\n`;
        list += `_Crea: ${recipe.produces} | Requiere: ${reqs}_\n\n`;
    }
    return sock.sendMessage(msg.key.remoteJid, { text: list }, { quoted: msg });
  },

  async showHelp(sock, msg) {
    const helpMessage = "*Comandos de Fabricación:*\n\n" +
                        "1. `.craft list`\n" +
                        "   - Muestra todos los objetos que puedes fabricar.\n\n" +
                        "2. `.craft item <item> [cantidad]`\n" +
                        "   - Fabrica un objeto de la lista. La cantidad es opcional.\n\n";
    return sock.sendMessage(msg.key.remoteJid, { text: helpMessage }, { quoted: msg });
  }
};

export default craftCommand;
