const fs = require("fs");
const path = require("path");
const cfg = require("../config.json");

function ensureDataFiles() {
  const d = path.resolve(cfg.dataDir);
  if (!fs.existsSync(d)) fs.mkdirSync(d);
  const defaults = {
    "transactions.json": "[]",
    "users.json": "[]",
    "gifts.json": '{"gifts": []}',
    "contest.json": '{"entries": {}}'
  };
  for (let f in defaults) {
    const p = path.join(d, f);
    if (!fs.existsSync(p)) fs.writeFileSync(p, defaults[f], "utf8");
  }
}
function load(file) {
  return JSON.parse(fs.readFileSync(path.join(cfg.dataDir, file), "utf8"));
}
function save(file, obj) {
  fs.writeFileSync(path.join(cfg.dataDir, file), JSON.stringify(obj, null, 2), "utf8");
}
function loadAll() {
  return {
    transactions: load("transactions.json"),
    users: load("users.json"),
    giftData: load("gifts.json"),
    contestData: load("contest.json")
  };
}
function saveAll({ transactions, users, giftData, contestData }) {
  save("transactions.json", transactions);
  save("users.json", users);
  save("gifts.json", giftData);
  save("contest.json", contestData);
}

module.exports = { ensureDataFiles, loadAll, saveAll };
