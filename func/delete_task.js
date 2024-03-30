/*
 * @Author: DonJuaning
 * @Date: 2024-03-21 10:34:43
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-22 16:43:05
 * @FilePath: /tele_bot/func/delete_task.js
 * @Description: 
 */
const  { createClient }= require('redis');
const { Keypair,Connection,PublicKey,VersionedTransaction } = require("@solana/web3.js");
const bs58 = require("bs58");
var mysql  = require('mysql'); 
const axios = require('axios');
const fetch = require("node-fetch");

module.exports = async function delete_task(chatId,data){
    var bot = globalThis.bot;
    const token = data.t;
    const client = createClient();
    client.on('error', err => bot.sendMessage(chatId, err));
    await client.connect();
    var tasks_dic_redis = await client.get(chatId.toString()+":"+token);
    var tasks_dic = JSON.parse(tasks_dic_redis);
    if (tasks_dic==null){
        bot.sendMessage(chatId, "未找到相关任务，请通过/check_task确认已有任务");
    }else if(tasks_dic["chatId"]==chatId&&tasks_dic["type"]==0){
        await client.del(chatId.toString()+":"+token);
        bot.sendMessage(chatId, "删除任务完成");
    }else if(item["chatId"]==chatId&&item["type"]!=0){
        bot.sendMessage(chatId, "任务已在执行中!");
    }
    var task_list =  await client.keys("*:" + token);
    if(task_list.length==0){
        await client.sRem('tasks', token);
    }
}