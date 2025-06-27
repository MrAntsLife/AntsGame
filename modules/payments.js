const { callTelegramApi } = require("./utils");

function createInvoiceLink(payType, amount) {
  const params = {
    title: "Gewinnspiel Teilnahme",
    description: payType === "sub"
      ? "Abo: Geschenke & extra Gewinnchancen 🎁"
      : "Einmalig: Direkt Gewinnchance ⭐",
    payload: `Gewinnspiel–${payType}–${amount}`,
    provider_token: "",
    currency: "XTR",
    prices: JSON.stringify([{ label: "Preis", amount }]),
    photo_url: "https://telegram.org/file/400780400211/3/uHYl1Xl7S5c.232636/a0c192b76e2ebea3ea"
  };
  if (payType === "sub") params.subscription_period = 60*60*24*30;
  return callTelegramApi("createInvoiceLink", params);
}

module.exports = { createInvoiceLink };
