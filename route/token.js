module.exports = function  token(msg){
    var bot = globalThis.bot;
    const text = msg.text
    var function_list = [];
    //命令限制为64byte，所以指令不能超过5个字符
    const function_dic = {
        "一键梭哈":"swap",
        "一键清仓":"clear",
        "狙击开盘":"snip",
        "删除狙击计划":"del"
    }
    for(var key in function_dic){
        function_list = function_list.concat(key);
    }
    const dic = {
        reply_markup: {
          inline_keyboard: function_list.map((item, index) => [
            {
              text: `${index + 1}. ${item}`,
              callback_data: JSON.stringify({c:function_dic[item],t:text})
            },
          ]),
        },
      }
    bot.sendMessage(msg.chat.id, '请选择:', dic);
}