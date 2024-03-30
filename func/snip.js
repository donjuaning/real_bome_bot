/*
 * @Author: DonJuaning
 * @Date: 2024-03-21 11:40:57
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-23 15:22:42
 * @FilePath: /tele_bot/func/snip.js
 * @Description: 
 */
const { createClient } = require('redis');
const { Keypair, Connection, PublicKey, VersionedTransaction } = require("@solana/web3.js");
const bs58 = require("bs58");
var mysql = require('mysql');
const axios = require('axios');
const fetch = require("node-fetch");

module.exports = function swap(chatId, data) {
  var bot = globalThis.bot;
  const token = data.t;
  const RPC_ENDPOINT_URL = process.env.RPC_ENDPOINT_URL
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  var sql_connection = mysql.createConnection({
    host: process.env.MYSQL_IP,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_KEY,
    port: '3306',
    database: 'solana'
  });
  sql_connection.connect();

  var querySql = `select * from tele_bot where chatid=${chatId} order by time desc`;
  sql_connection.query(querySql, async function (error, results) {
    if (error) {
      console.log('[ERROR] - ', error.message);
      bot.sendMessage(chatId, "数据库错误,如果您没有生成过钱包,可以使用/make_new生成");
    } else {
      if (results.length > 0) {
        bot.sendMessage(chatId, `任务下发中...`);
        const lamports = await connection.getBalance(new PublicKey(results[0]["address"]));
        if (lamports > 10_000_000) {
          const client = createClient();
          client.on('error', err => bot.sendMessage(chatId, err));
          await client.connect();
          var tasks_dic_redis = await client.get(chatId.toString() + ":" + token);
          var tasks_dic = JSON.parse(tasks_dic_redis);
          if (tasks_dic != null) {
            bot.sendMessage(chatId, "您已下发过任务,通过/check_task确认已有任务");
            return;
          }
          tasks_dic = { chatId: chatId, privrite_key: results[0]["password"], token: token, amount: lamports - 10_000_000, type: 0 }
          await client.set(chatId.toString() + ":" + token, JSON.stringify(tasks_dic));
          await client.sAdd('tasks', token);
          bot.sendMessage(chatId, "任务下发完成,通过/check_task确认已有任务");
        } else {
          bot.sendMessage(chatId, "您的余额小于0.01sol,不足以支撑交易");
        }

      } else {
        bot.sendMessage(msg.chat.id, "数据库错误,如果您没有生成过钱包,可以使用/make_new生成,如果已经生成过请联系开发者找回");
      }

    }
  });
  sql_connection.end();

}