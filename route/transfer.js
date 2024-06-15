/*
 * @Author: DonJuaning
 * @Date: 2024-03-22 15:21:18
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-06-15 20:17:19
 * @FilePath: /real_bome_bot/route/transfer.js
 * @Description: 
 */
const { Keypair, Connection, PublicKey, sendAndConfirmTransaction, Transaction, SystemProgram } = require("@solana/web3.js");
const bs58 = require("bs58");
var mysql = require('mysql');
const { createClient } = require('redis');
module.exports = async function transfer(msg, match) {
  var bot = globalThis.bot;
  const address = match[1];
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

  var querySql = `select * from tele_bot where chatid=${msg.chat.id} order by time desc`;
  sql_connection.query(querySql, async function (error, results) {
    if (error) {
      console.log('[ERROR] - ', error.message);
      bot.sendMessage(msg.chat.id, "数据库错误,如果您没有生成过钱包,可以使用/make_new生成");
    } else {
      if(results.length>0){
        const owner = Keypair.fromSecretKey(bs58.decode(results[0]["password"]))
        const lamports = await connection.getBalance(new PublicKey(results[0]["address"]));
        if (lamports > 10_000_000) {
          const client = createClient();
          client.on('error', err => bot.sendMessage(chatId, err));
          await client.connect();
          var my_task_list = await client.keys(chatId.toString() + ":*");
          if(my_task_list.length > 0){
            bot.sendMessage(chatId, "您有下发的开盘狙击任务,钱包被锁定。通过/check_task确认您的任务,直接输入代币地址可以开启删除任务菜单");
          }
          if (my_task_list.length == 0) {
            (async () => {
              const transaction = new Transaction().add(
                SystemProgram.transfer({
                  fromPubkey: owner.publicKey,
                  toPubkey: new PublicKey(address),
                  lamports: lamports - 10_000_000,
                }),
              );
    
              // Sign transaction, broadcast, and confirm
              const signature = await sendAndConfirmTransaction(
                connection,
                transaction,
                [owner],
              );
              bot.sendMessage(chatId,'转账成功:'+signature);
            })()
          }
          client.disconnect();
          
  
        } else {
          bot.sendMessage(msg.chat.id, `您的余额小于0.01sol`);
        }
      }else{
        bot.sendMessage(msg.chat.id, "数据库错误,如果您没有生成过钱包,可以使用/make_new生成,如果已经生成过请联系开发者找回");
      }
      
    }
  });
  sql_connection.end();

}



