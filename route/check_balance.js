const { Keypair,Connection,PublicKey } = require("@solana/web3.js");
const bs58 = require("bs58");
var mysql  = require('mysql');  
module.exports = async function check_balance(msg){
    var bot = globalThis.bot;
    const RPC_ENDPOINT_URL = process.env.RPC_ENDPOINT_URL
    const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");
    
    var sql_connection = mysql.createConnection({     
        host     : process.env.MYSQL_IP,       
        user     : process.env.MYSQL_USER,              
        password : process.env.MYSQL_KEY,       
        port: '3306',                   
        database: 'solana'
      }); 
      sql_connection.connect();
       
    var querySql = `select * from tele_bot where chatid=${msg.chat.id} order by time desc`;
    sql_connection.query(querySql,async function (error, results) {
            if(error){
               console.log('[ERROR] - ',error.message);
               bot.sendMessage(msg.chat.id, "数据库错误,如果您没有生成过钱包,可以使用/make_new生成");
            }else{
              console.log(results);
              if(results.length>0){
                const lamports = await connection.getBalance(new PublicKey(results[0]["address"]));
                bot.sendMessage(msg.chat.id, `您的地址是:\n${results[0]["address"]}\n余额为:\n${lamports/10**9}sol`);
              }else{
                bot.sendMessage(msg.chat.id, "数据库错误,如果您没有生成过钱包,可以使用/make_new生成,如果已经生成过请联系开发者找回");
              }
            }
      });
    sql_connection.end();
    
}


 
