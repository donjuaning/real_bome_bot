/*
 * @Author: DonJuaning
 * @Date: 2024-03-21 10:34:43
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-22 15:32:45
 * @FilePath: /tele_bot/route/check_task.js
 * @Description: 
 */
const  { createClient }= require('redis');
const task_type = require("../util/task_type");

module.exports = async function check_task(msg){
    var bot = globalThis.bot;
    const chatId = msg.chat.id;
    const client = createClient();
    client.on('error', err => bot.sendMessage(chatId, err));
    await client.connect();
    var my_task_list = await client.keys(chatId.toString()+":*");
    for(var i in my_task_list){
        var tasks_dic_redis = await client.get(my_task_list[i])
        var tasks_dic = JSON.parse(tasks_dic_redis);
        text = `使用${tasks_dic["amount"]/10**9}sol
        市价购买
        ${tasks_dic["token"]}
        状态:${task_type(tasks_dic["type"])}
        `
        bot.sendMessage(chatId, text);
    }
    if(my_task_list.length==0){
        bot.sendMessage(chatId, "未找到狙击任务");
    }
    client.disconnect();
    
}