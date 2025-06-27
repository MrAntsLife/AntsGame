const TelegramBot = require("node-telegram-bot-api");
const path = require("path");
const cfg = require("./config.json");
const { ensureDataFiles, loadAll, saveAll } = require("./modules/data");
const { callTelegramApi } = require("./modules/utils");
const { log } = require("./modules/logger");
const { createInvoiceLink } = require("./modules/payments");
const { updateGifts, sendGift } = require("./modules/gifts");
const { getAdminMenu, buildUserList, buildUserTransactions } = require("./modules/admin");

ensureDataFiles();
let { transactions, users, giftData, contestData } = loadAll();

const bot = new TelegramBot(cfg.token, { polling: true });
const emptyKb = { inline_keyboard: [] };

function saveAllData() {
  saveAll({ transactions, users, giftData, contestData });
}

bot.on("polling_error", err => log("errors", `<b>Polling Error</b>\n<pre>${err.message}</pre>`));
process.on("uncaughtException", err => log("errors", `<b>Exception</b>\n<pre>${err.stack}</pre>`));
process.on("unhandledRejection", r => log("errors", `<b>Rejection</b>\n<pre>${r}</pre>`));

// Ping jede volle Minute
setTimeout(function ping() {
  log("ping", "🤖 Bot online");
  setTimeout(ping, 60000 - (new Date().getSeconds() * 1000));
}, 0);

bot.onText(/\/start/, msg => {
  const chatId = msg.chat.id;
  let kb = [
    [{ text: "💳 Zahlung", callback_data: "menu:pay" }],
    [{ text: "🎟 Meine Teilnahme", callback_data: "menu:myentry" }],
    [{ text: "ℹ️ Info", callback_data: "menu:contest" }]
  ];
  if (msg.from.id === cfg.masterAdmin) {
    kb.push([{ text: "🔧 Admin Panel", callback_data: "menu:admin" }]);
  }
  bot.sendMessage(chatId,
    "<b>Willkommen beim Gewinnspiel Bot 🎉</b>\n\nSichere dir Gewinnchancen & exklusive Geschenke – jede Zahlung zählt! 💎",
    { parse_mode: "HTML", reply_markup: { inline_keyboard: kb } }
  );
});

bot.onText(/\/pay/, msg => {
  bot.sendMessage(msg.chat.id, "<b>Nutze /start für das Menü.</b>", { parse_mode: "HTML", reply_markup: emptyKb });
});

// Refund über Text (Admin)
bot.onText(/\/refund (\d+)\s+(\S+)/, (msg, m) => {
  if (msg.from.id !== cfg.masterAdmin) {
    return bot.sendMessage(msg.chat.id, "🚫 Unauthorized");
  }
  const userId = m[1], chargeId = m[2];
  callTelegramApi("refundStarPayment", { user_id: userId, telegram_payment_charge_id: chargeId })
    .then(_ => {
      bot.sendMessage(msg.chat.id, `<b>Refund ✅</b>\nCharge: ${chargeId}`, { parse_mode: "HTML" });
      const amt = transactions.find(t => t.telegram_payment_charge_id === chargeId)?.amount || 1;
      contestData.entries[userId] = Math.max((contestData.entries[userId]||0) - amt, 0);
      transactions = transactions.filter(t => t.telegram_payment_charge_id !== chargeId);
      saveAllData();
      bot.sendMessage(userId, "💸 Du wurdest rückerstattet!", { parse_mode: "HTML" });
      log("refunds", `<b>Refund</b>\nUser: ${userId}\nCharge: ${chargeId}`);
    })
    .catch(err => {
      bot.sendMessage(msg.chat.id, `<b>Error:</b> ${err.message}`, { parse_mode: "HTML" });
      log("errors", `<b>Refund Error</b>\n<pre>${err.message}</pre>`);
    });
});

// /list (Admin)
bot.onText(/\/list/, msg => {
  if (msg.from.id !== cfg.masterAdmin) {
    return bot.sendMessage(msg.chat.id, "🚫 Unauthorized");
  }
  if (!transactions.length) {
    return bot.sendMessage(msg.chat.id, "Keine Transaktionen.");
  }
  let txt = "<b>Transaktionen:</b>\n";
  transactions.forEach(t => {
    txt += `• ${t.telegram_payment_charge_id}: ${t.amount} ${t.currency} (${t.name})\n`;
  });
  bot.sendMessage(msg.chat.id, txt, { parse_mode: "HTML" });
});

bot.on("callback_query", async cq => {
  const d = cq.data, msg = cq.message, c = msg.chat.id, f = cq.from.id;
  await bot.answerCallbackQuery(cq.id);

  if (d === "menu:main") {
    let kb = [
      [{ text: "💳 Zahlung", callback_data: "menu:pay" }],
      [{ text: "🎟 Meine Teilnahme", callback_data: "menu:myentry" }],
      [{ text: "ℹ️ Info", callback_data: "menu:contest" }]
    ];
    if (f === cfg.masterAdmin) kb.push([{ text: "🔧 Admin Panel", callback_data: "menu:admin" }]);
    return bot.editMessageText("<b>Hauptmenü</b>", { chat_id: c, message_id: msg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: kb } });
  }

  if (d === "menu:pay") {
    try {
      const one = await Promise.all([1,10,100].map(a => createInvoiceLink("one", a)));
      const sub = await Promise.all([1,10,100].map(a => createInvoiceLink("sub", a)));
      const kb = {
        inline_keyboard: [
          [{ text: "Einmalig 💵", callback_data: "dummy" }],
          one.map((u,i)=>({ text: `${[1,10,100][i]} ⭐`, url:u })),
          [{ text: "Abo 🔄", callback_data: "dummy" }],
          sub.map((u,i)=>({ text: `${[1,10,100][i]} 🎁`, url:u })),
          [{ text: "🔙 Zurück", callback_data: "menu:main" }]
        ]
      };
      return bot.editMessageText("<b>Zahlungsoptionen:</b>", { chat_id: c, message_id: msg.message_id, parse_mode: "HTML", reply_markup: kb });
    } catch(e) {
      log("errors", `<b>Invoice Error</b>\n<pre>${e.message}</pre>`);
      return bot.editMessageText(`<b>Fehler:</b> ${e.message}`, { chat_id: c, message_id: msg.message_id, parse_mode: "HTML" });
    }
  }

  if (d === "menu:myentry") {
    const e = contestData.entries[f] || 0;
    return bot.editMessageText(`<b>Meine Teilnahme</b>\nChancen: <b>${e}</b>`, { chat_id: c, message_id: msg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard:[[ { text:"🔙 Hauptmenü",callback_data:"menu:main"} ]] } });
  }

  if (d === "menu:contest") {
    const total = Object.values(contestData.entries).reduce((a,v)=>a+v,0);
    const count = Object.keys(contestData.entries).length;
    return bot.editMessageText(`<b>Info</b>\nChancen: <b>${total}</b>\nTeilnehmer: <b>${count}</b>`, { chat_id: c, message_id: msg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard:[[ { text:"🔙 Hauptmenü",callback_data:"menu:main"} ]] } });
  }

  if (d === "menu:admin") {
    return bot.editMessageText("<b>Admin Panel</b>", { chat_id: c, message_id: msg.message_id, parse_mode: "HTML", reply_markup: getAdminMenu() });
  }

  if (d === "admin:users") {
    return bot.editMessageText("<b>Nutzerübersicht</b>", { chat_id: c, message_id: msg.message_id, parse_mode: "HTML", reply_markup: buildUserList(users) });
  }

  if (d.startsWith("admin:user:")) {
    const uid = d.split(":")[2];
    const txt = `<b>Nutzer ${uid}</b>\n\n` + buildUserTransactions(transactions, uid);
    return bot.editMessageText(txt, { chat_id: c, message_id: msg.message_id, parse_mode: "HTML", reply_markup: { inline_keyboard: [[ { text:"🔙 Zurück", callback_data:"admin:users" } ]] } });
  }

  if (d.startsWith("admin:refund:")) {
    const [_,uid,charge] = d.split(":");
    callTelegramApi("refundStarPayment", { user_id:uid,telegram_payment_charge_id:charge })
      .then(_=>{
        bot.editMessageText(`<b>Refund ✅</b>\nCharge: ${charge}`, { chat_id:c, message_id:msg.message_id, parse_mode:"HTML" });
        const amt = transactions.find(t=>t.telegram_payment_charge_id===charge)?.amount||1;
        contestData.entries[uid] = Math.max((contestData.entries[uid]||0)-amt,0);
        transactions = transactions.filter(t=>t.telegram_payment_charge_id!==charge);
        saveAllData({transactions,users,giftData,contestData});
        bot.sendMessage(uid, "💸 Du wurdest rückerstattet!",{parse_mode:"HTML"});
        log("refunds", `<b>Refund</b>\nUser: ${uid}\nCharge: ${charge}`);
      })
      .catch(e=>bot.editMessageText(`<b>Error:</b> ${e.message}`,{chat_id:c,message_id:msg.message_id,parse_mode:"HTML"}));
    return bot.answerCallbackQuery(cq.id);
  }

  if (d.startsWith("gifts:update")) {
    updateGifts(cfg.token)
      .then(g=>{ giftData = g; saveAllData({transactions,users,giftData,contestData}); log("entries","Gifts updated"); })
      .catch(e=>log("errors", `<b>Gifts Error</b>\n<pre>${e.message}</pre>`));
    return bot.answerCallbackQuery(cq.id);
  }

  if (d.startsWith("chooseGift:")) {
    const [ ,t,g ] = d.split(":");
    return bot.editMessageText(`<b>Geschenk an ${t}?</b>`,{chat_id:c,message_id:msg.message_id,parse_mode:"HTML",reply_markup:{inline_keyboard:[
      [{text:"Ja 👍",callback_data:`sendGift:${t}:${g}`}],
      [{text:"❌ Abbrechen",callback_data:"close"}]
    ]}});
  }

  if (d.startsWith("sendGift:")) {
    const [ ,t,g ] = d.split(":");
    sendGift(cfg.token,t,g)
      .then(_=>bot.editMessageText("<b>Geschenk gesendet 🎁</b>",{chat_id:c,message_id:msg.message_id,parse_mode:"HTML"}))
      .catch(e=>bot.editMessageText(`<b>Error:</b> ${e.message}`,{chat_id:c,message_id:msg.message_id,parse_mode:"HTML"}));
    return bot.answerCallbackQuery(cq.id);
  }
});

bot.on("message", msg => {
  if (msg.successful_payment) {
    const p = msg.successful_payment, a=p.total_amount, cur=p.currency, pl=p.invoice_payload, ch=p.telegram_payment_charge_id;
    const nm = msg.from.first_name + (msg.from.last_name?" "+msg.from.last_name:"");
    transactions.push({telegram_payment_charge_id:ch,user_id:msg.from.id,name:nm,amount:a,currency:cur,product:pl});
    if (!users.find(u=>u.id===msg.from.id)) {
      users.push({id:msg.from.id,first_name:msg.from.first_name,last_name:msg.from.last_name||""});
      log("entries", `<b>Neuer Nutzer</b>\nID: ${msg.from.id}\nName: ${nm}`);
    }
    contestData.entries[msg.from.id] = (contestData.entries[msg.from.id]||0) + a;
    saveAllData({transactions,users,giftData,contestData});
    bot.sendMessage(msg.chat.id, `<b>Danke! 🎉</b>\nDu erhältst ${a} Chance(n)!`,{parse_mode:"HTML"});
    log("oneTime", `<b>Einmalzahlung</b>\nUser: ${msg.from.id} (${nm})\nBetrag: ${a} ${cur}\nCharge: ${ch}`,{inline_keyboard:[[{text:"Refund 💸",callback_data:`logrefund:${msg.from.id}:${ch}`}]]});
    log("entries", `<b>Chancen</b>\nUser: ${msg.from.id}\nAktuell: ${contestData.entries[msg.from.id]}`);
  }
});

bot.on("pre_checkout_query", q => {
  callTelegramApi("answerPreCheckoutQuery",{ pre_checkout_query_id: q.id, ok: true })
    .catch(e=>log("errors", `<b>PreCheckout</b>\n<pre>${e.message}</pre>`));
});

console.log("Bot ist am Laufen…");
