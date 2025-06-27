const axios = require("axios");
const cfg = require("../config.json");

async function callTelegramApi(method, params) {
  const url = `https://api.telegram.org/bot${cfg.token}/${method}`;
  const res = await axios.post(url, params);
  if (!res.data.ok) throw new Error(res.data.description);
  return res.data.result;
}

module.exports = { callTelegramApi };
