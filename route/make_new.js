/*
 * @Author: DonJuaning
 * @Date: 2024-03-19 15:46:58
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-19 15:55:28
 * @FilePath: /tele_bot/route/make_new.js
 * @Description: 
 */
const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
var mysql  = require('mysql');  
module.exports = function make_new(msg){
    var bot = globalThis.bot;
    const key = Keypair.generate();
    const secretKey = bs58.encode(key.secretKey);
    var sql_connection = mysql.createConnection({     
        host     : process.env.MYSQL_IP,       
        user     : process.env.MYSQL_USER,              
        password : process.env.MYSQL_KEY,       
        port: '3306',                   
        database: 'solana'
      }); 
      sql_connection.connect();
       
    var  addSql = 'INSERT INTO tele_bot(address,password,chatid,time) VALUES(?,?,?,?)';
    var  addSqlParams = [key.publicKey.toString(), secretKey,msg.chat.id, Date.now()];
      //增
      sql_connection.query(addSql,addSqlParams,function (err, result) {
              if(err){
               console.log('[INSERT ERROR] - ',err.message);
               return;
              }        
       
             console.log('--------------------------INSERT----------------------------');
             //console.log('INSERT ID:',result.insertId);        
             console.log('INSERT ID:',result);        
             console.log('-----------------------------------------------------------------\n\n');  
      });
       
    sql_connection.end();
    bot.sendMessage(msg.chat.id, `生成地址${key.publicKey.toString()}`);

}


 
