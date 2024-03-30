/*
 * @Author: DonJuaning
 * @Date: 2024-03-21 08:43:05
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-23 15:21:13
 * @FilePath: /tele_bot/func/clear.js
 * @Description: 
 */
const { Keypair, Connection, PublicKey, VersionedTransaction } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const bs58 = require("bs58");
var mysql = require('mysql');
const axios = require('axios');
const fetch = require("node-fetch");
const {
  TokenAccount,
  SPL_ACCOUNT_LAYOUT,
} = require("@raydium-io/raydium-sdk");
module.exports = function clear(chatId, data) {
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
        const owner = Keypair.fromSecretKey(bs58.decode(results[0]["password"]))
        const tokenResp = await connection.getTokenAccountsByOwner(owner.publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });
        var amount = 0
        for (const { pubkey, account } of tokenResp.value) {
  
          const data = SPL_ACCOUNT_LAYOUT.decode(account.data)
          if (data["mint"].toString() == token) {
            amount = data["amount"]
          }
        }
        if (amount > 0) {
          bot.sendMessage(chatId, `等待交易上链中...`);
          url = `https://quote-api.jup.ag/v6/quote?inputMint=${token}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=300`
          const { data: quoteResponse } = await axios.get(url);
          const swapTransactionAll = await (
            await fetch('https://quote-api.jup.ag/v6/swap', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                // quoteResponse from /quote api
                quoteResponse: quoteResponse,
                // user public key to be used for the swap
                userPublicKey: owner.publicKey.toString(),
                // auto wrap and unwrap SOL. default is true
                wrapAndUnwrapSol: true,
                // feeAccount is optional. Use if you want to charge a fee.  feeBps must have been passed in /quote API.
                // feeAccount: "fee_account_public_key"
                prioritizationFeeLamports: {
                  autoMultiplier: 4,
                },
              })
            })
          ).json();
          // deserialize the transaction
          const swapTransaction = swapTransactionAll["swapTransaction"]
          const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
          var transaction = VersionedTransaction.deserialize(swapTransactionBuf);
          transaction.sign([owner]);
          // Execute the transaction
          const rawTransaction = transaction.serialize()
          const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 3
          });
          try {
            await connection.confirmTransaction(txid);
            bot.sendMessage(chatId, `https://solscan.io/tx/${txid}`);
          }
          catch {
            bot.sendMessage(chatId, "链上拥堵请再次尝试!");
          }
  
        } else {
          bot.sendMessage(chatId, "您没有该代币，请确认相关地址");
        }
      } else {
        bot.sendMessage(msg.chat.id, "数据库错误,如果您没有生成过钱包,可以使用/make_new生成,如果已经生成过请联系开发者找回");
      }


    }
  });
  sql_connection.end();

}
