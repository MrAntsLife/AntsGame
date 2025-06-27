const cfg = require("../config.json");
const { callTelegramApi } = require("./utils");

function log(topic, text, kb = { inline_keyboard: [] }) {
  return callTelegramApi("sendMessage", {
    chat_id: cfg.groupId,
    message_thread_id: cfg.topics[topic],
    text,
    parse_mode: "HTML",
    reply_markup: kb
  }).catch(e => console.error("Log error:", e));
}

module.exports = { log };
