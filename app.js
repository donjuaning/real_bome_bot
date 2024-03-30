/*
 * @Author: DonJuaning
 * @Date: 2024-03-18 11:46:13
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-22 15:38:15
 * @FilePath: /tele_bot/app.js
 * @Description: 
 */
/*
 * @Author: DonJuaning
 * @Date: 2024-03-18 11:46:13
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-19 14:56:27
 * @FilePath: /tele_bot/app.js
 * @Description: 
 */
const TelegramBot = require("node-telegram-bot-api");
const dotenv = require("dotenv")

const start = require("./route/start")
const make_new = require("./route/make_new")
const check_balance = require("./route/check_balance")
const help = require("./route/help")
const token = require("./route/token")
const swap = require("./func/swap")
const clear = require("./func/clear")
const snip = require("./func/snip")
const delete_task = require("./func/delete_task")
const check_task = require("./route/check_task")
const transfer = require("./route/transfer")

dotenv.config();

const bot_token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(bot_token, {
  polling: true,
//   request: requestOptions,
});

bot.setWebHook(`${process.env.WEBHOOK_HOST}/bot${bot_token}`);

globalThis.bot = bot;

bot.onText(/\/start/,start);

bot.onText(/\/make_new/,make_new);

bot.onText(/\/check_balance/,check_balance);

bot.onText(/\/help/,help);

bot.onText(/(^[0-9A-Za-z]{44})/,token);

bot.onText(/\/check_task/,check_task);

bot.onText(/\/transfer ([0-9A-Za-z]{44})/,transfer);


// 监听用户点击
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const data = JSON.parse(callbackQuery.data);
  const chatId = message.chat.id;

  if (data.c === 'swap') {
    swap(chatId,data);
  }
  if (data.c === 'clear') {
    clear(chatId,data);
  }
  if (data.c === 'snip') {
    snip(chatId,data);
  }
  if (data.c === 'del') {
    delete_task(chatId,data);
  }

});
  