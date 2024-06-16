/*
 * @Author: DonJuaning
 * @Date: 2024-03-22 15:21:18
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-06-16 09:58:03
 * @FilePath: /real_bome_bot/route/find.js
 * @Description: 
 */

const { Keypair, Connection, PublicKey, sendAndConfirmTransaction, Transaction, SystemProgram, clusterApiUrl } = require("@solana/web3.js");
const bs58 = require("bs58");
var mysql = require('mysql');
const { Metadata } = require("@metaplex-foundation/mpl-token-metadata");

var todo_list = []
var finished_list = []
var cex_list = []
const sol_change = "So11111111111111111111111111111111111111112"
module.exports = async function find(msg, match) {
  var bot = globalThis.bot;
  const my_token = match[1];
  const RPC_ENDPOINT_URL = process.env.RPC_ENDPOINT_URL
  // const URL = clusterApiUrl('mainnet-beta');
  // const connection = new Connection(URL)
  const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");

  var sql_connection = mysql.createConnection({
    host: process.env.MYSQL_IP,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_KEY,
    port: '3306',
    database: 'solana'
  });
  await sql_connection.connect();
  var querySql = `SELECT * FROM solana.cex_address;`;
  await sql_connection.query(querySql, async function (error, results) {
    if (error) {
      console.log('[ERROR] - ', error.message);
      bot.sendMessage(msg.chat.id, "数据库错误,重试网络");
    } else {
      if (results.length > 0) {
        for (let item of results) {
          cex_list.push(item["address"]);
        }
      } else {
        bot.sendMessage(msg.chat.id, "数据库错误,没有cex");
      }
    }
  });
  
  
  var table_create_sql = `CREATE TABLE IF NOT EXISTS \`solana\`.\`${my_token}\` (
    signatures VARCHAR(88) NOT NULL,
    block_time INT NOT NULL,
    function VARCHAR(44) NOT NULL,
    sol_change DOUBLE NOT NULL,
    token_change DOUBLE NOT NULL,
    now_address VARCHAR(44) NOT NULL,
    to_address VARCHAR(44) NOT NULL,
    PRIMARY KEY (signatures));`;

  await sql_connection.query(table_create_sql, async function (error, results) {
    if (error) {
      console.log('[ERROR] - ', error.message);
      bot.sendMessage(msg.chat.id, "数据库错误");
    } else {
      console.log('数据库创建成功');
    }
  });
  sql_connection.end();
  let tokenmetaPubkey = await Metadata.getPDA(new PublicKey(my_token));
  const tokenmeta = await Metadata.load(connection, tokenmetaPubkey);
  const authority_address = tokenmeta.data.updateAuthority.toString();
  todo_list.push(authority_address);
  while (todo_list.length > 0) {
    const now_address = todo_list.pop();
    await get_one_address(now_address, my_token, connection);
  }
  

}

async function get_one_address(now_address, my_token, connection) {
  finished_list.push(now_address);
  const signaturesRes = await connection.getSignaturesForAddress(new PublicKey(now_address));
  const signatures = signaturesRes.map(tx => tx.signature)
  // const datas = await connection.getParsedTransactions(signatures, {
  //   maxSupportedTransactionVersion: 0,
  // })
  // for (var data in datas) {
  //   get_one(datas[data], my_token, now_address);
  // }

  for(let signature of signatures){
    data = await connection.getParsedTransaction(signature,{
      maxSupportedTransactionVersion: 0,
    })
    await get_one(data, my_token, now_address);
  }
  
}

async function get_one(transaction_data, my_token, now_address) {
  const preTokenBalances = transaction_data["meta"]["preTokenBalances"];
  const postTokenBalances = transaction_data["meta"]["postTokenBalances"]
  var preToken = {}
  preTokenBalances.forEach((data, i) => {
    if (preToken.hasOwnProperty(data["owner"])) {
      preToken[data["owner"]][data["mint"]] = data["uiTokenAmount"]["uiAmount"];
    } else {
      preToken[data["owner"]] = {};
      preToken[data["owner"]][data["mint"]] = data["uiTokenAmount"]["uiAmount"];
    }
  })
  var transecation = {}

  //分四种情况 sol增加目标币减少(sell)及sol减少目标币增加（buy），sol减少其他币不变及sol增加其他币不变（transfer），sol不变目标币币只减少或只增加（spl-transfer），sol不变其他币有多有少（swap）
  postTokenBalances.forEach((data, i) => {
    if (preToken.hasOwnProperty(data["owner"])) {
      const last_amount = preToken[data["owner"]][data["mint"]]
      const now_amount = data["uiTokenAmount"]["uiAmount"]
      if (transecation.hasOwnProperty(data["owner"])) {
        transecation[data["owner"]][data["mint"]] = now_amount - last_amount;
      } else {
        transecation[data["owner"]] = {};
        transecation[data["owner"]][data["mint"]] = now_amount - last_amount;
      }
    } else {
      const last_amount = 0
      const now_amount = data["uiTokenAmount"]["uiAmount"]
      if (transecation.hasOwnProperty(data["owner"])) {
        transecation[data["owner"]][data["mint"]] = now_amount - last_amount;
      } else {
        transecation[data["owner"]] = {};
        transecation[data["owner"]][data["mint"]] = now_amount - last_amount;
      }
    }

  })
  var addSql = `REPLACE INTO ${my_token}(signatures,block_time,function,sol_change,token_change,now_address,to_address) VALUES(?,?,?,?,?,?,?)`;
  var sql_list = ["", 0, "", 0, 0, "", ""];
  var to_address = ""
  //sol转账交易没有pretoken和post,token，需要修正
  if (transecation.hasOwnProperty(now_address)) {
    if (transecation[now_address][my_token] < 0 && otherNotChanged(transecation, now_address, my_token) && !otherSolNotChanged(transecation, now_address, my_token)) {
      //sell
      to_address = getToAddress(transecation, now_address, my_token);
      sql_list = [transaction_data["transaction"]["signatures"][0], transaction_data["blockTime"], "sell", -transecation[to_address][sol_change] * 10 ** 9, transecation[now_address][my_token], now_address, to_address];
    } else if (transecation[now_address][my_token] > 0 && otherNotChanged(transecation, now_address, my_token) && !otherSolNotChanged(transecation, now_address, my_token)) {
      //buy
      to_address = getToAddress(transecation, now_address, my_token);
      sql_list = [transaction_data["transaction"]["signatures"][0], transaction_data["blockTime"], "buy", -transecation[to_address][sol_change] * 10 ** 9, transecation[now_address][my_token], now_address, to_address];
    } else if (transecation[now_address][my_token] != 0 && transecation[now_address][my_token] != null && otherNotChanged(transecation, now_address, my_token) && otherSolNotChanged(transecation, now_address, my_token)) {
      //spl-transfer
      to_address = getToAddress(transecation, now_address, my_token);
      if (to_address) {
        if (finished_list.indexOf(to_address) == -1 && todo_list.indexOf(to_address) == -1 && cex_list.indexOf(to_address) == -1) {
          todo_list.push(to_address)
        }
      } else {
        to_address = "mint";
      }
      sql_list = [transaction_data["transaction"]["signatures"][0], transaction_data["blockTime"], "spl-transfer", 0, transecation[now_address][my_token], now_address, to_address];

    }


  } else {
    transecation[now_address] = {}
    for (var i = 0; i < transaction_data["transaction"]["message"]["accountKeys"].length; i++) {
      if (transaction_data["transaction"]["message"]["accountKeys"][i]["pubkey"].toString() == now_address) {
        var changed_sol = []
        for (var j = 0; j < transaction_data["meta"]["preBalances"].length; j++) {
          const change_sol = transaction_data["meta"]["postBalances"][j] - transaction_data["meta"]["preBalances"][j];
          changed_sol.push(change_sol);
        }
        transecation[now_address][sol_change] = changed_sol[i];
        if (changed_sol[i] > 10 ** 7) {
          for (var j = 0; j < transaction_data["meta"]["preBalances"].length; j++) {
            if (changed_sol[j] > -(changed_sol[i] + 10 ** 7) && changed_sol[j] < -changed_sol[i]) {
              to_address = transaction_data["transaction"]["message"]["accountKeys"][j]["pubkey"].toString();
              break;
            }
          }
        } else if (changed_sol[i] < -(10 ** 7)) {
          for (var j = 0; j < transaction_data["meta"]["preBalances"].length; j++) {
            if (changed_sol[j] > -(changed_sol[i] + 10 ** 7) && changed_sol[j] < -changed_sol[i]) {
              to_address = transaction_data["transaction"]["message"]["accountKeys"][j]["pubkey"].toString()
              break;
            }
          }
        }
        break;

      }
    }
    if (to_address != "") {
      if (finished_list.indexOf(to_address) == -1 && todo_list.indexOf(to_address) == -1 && cex_list.indexOf(to_address) == -1) {
        todo_list.push(to_address)
      }
      sql_list = [transaction_data["transaction"]["signatures"][0], transaction_data["blockTime"], "transfer", transecation[now_address][sol_change], 0, now_address, to_address]
    }
  }
  var sql_connection = mysql.createConnection({
    host: process.env.MYSQL_IP,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_KEY,
    port: '3306',
    database: 'solana'
  });
  await sql_connection.connect();
  await sql_connection.query(addSql, sql_list, function (err, result) {
    if (err) {
      console.log('[INSERT ERROR] - ', err.message);
      return;
    }
  });
  await sql_connection.end();

}
function getToAddress(transecation, now_address, function_text) {
  const keys = Object.keys(transecation);
  for (var i in keys) {
    if (transecation[keys[i]][function_text] > 0 && transecation[now_address][function_text] < 0) {
      return keys[i];
    } else if (transecation[keys[i]][function_text] < 0 && transecation[now_address][function_text] > 0) {
      return keys[i];
    }
  }
}
function otherNotChanged(transecation, now_address, my_token) {
  const keys = Object.keys(transecation[now_address]);
  for (var i in keys) {
    if (transecation[now_address][keys[i]] != 0 && keys[i] != sol_change && keys[i] != my_token) {
      return false;
    }
  }
  return true;
}

function otherSolNotChanged(transecation, now_address, function_text) {
  const keys = Object.keys(transecation);
  for (var i in keys) {
    if (transecation[keys[i]].hasOwnProperty(function_text)) {
      if (transecation[keys[i]].hasOwnProperty(sol_change)) {
        return false;
      }
    }
  }
  return true;
}

