const { callTelegramApi } = require("./utils");

function updateGifts() {
  return callTelegramApi("getAvailableGifts", {});
}

function sendGift(target, gift_id, text) {
  const params = { gift_id, pay_for_upgrade: false };
  if (isNaN(target)) params.chat_id = target;
  else params.user_id = parseInt(target,10);
  if (text) params.text = text;
  return callTelegramApi("sendGift", params);
}

module.exports = { updateGifts, sendGift };
