function getAdminMenu() {
  return {
    inline_keyboard: [
      [{ text: "👥 Nutzer", callback_data: "admin:users" }],
      [{ text: "📄 Transaktionen", callback_data: "admin:translist" }],
      [{ text: "🎁 Geschenke", callback_data: "admin:gifts" }],
      [{ text: "📤 Gift senden", callback_data: "admin:sendgift" }],
      [{ text: "🔙 Hauptmenü", callback_data: "menu:main" }]
    ]
  };
}

function buildUserList(users) {
  const kb = { inline_keyboard: [] };
  users.forEach(u => {
    kb.inline_keyboard.push([{ text: `👤 ${u.first_name} ${u.last_name} (${u.id})`, callback_data: `admin:user:${u.id}` }]);
  });
  kb.inline_keyboard.push([{ text: "🔙 Admin-Menü", callback_data: "menu:admin" }]);
  return kb;
}

function buildUserTransactions(trans, userId) {
  const list = trans.filter(t => t.user_id == userId);
  if (!list.length) return "<i>Keine Transaktionen</i>";
  let txt = "";
  list.forEach(t => txt += `• Charge: ${t.telegram_payment_charge_id} → ${t.amount} ${t.currency}\n`);
  return txt;
}

module.exports = { getAdminMenu, buildUserList, buildUserTransactions };
