/*
 * @Author: DonJuaning
 * @Date: 2024-03-21 15:31:09
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-21 15:32:23
 * @FilePath: /tele_bot/route/help.js
 * @Description: 
 */
module.exports = function  help(msg){
    var bot = globalThis.bot;
    help_context = `
    直接输入solana代币地址
    可以触发按钮功能菜单
    
    /help
    查看所有可用命令
    /check_balance 
    查看您的钱包地址和余额
    /check_task
    查看您的狙击开盘任务
    /transfer 地址
    转出除手续费外全部余额至目标地址
    `
    
    
    bot.sendMessage(msg.chat.id,help_context);
}