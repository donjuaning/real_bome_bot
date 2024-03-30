/*
 * @Author: DonJuaning
 * @Date: 2024-03-19 15:46:58
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-21 18:32:47
 * @FilePath: /tele_bot/util/task_type.js
 * @Description: 
 */
module.exports = function task_type(t_p){
    switch(t_p){
        case 0:
            return "等待开盘";
        case 1:
            return "正在交易上链";
        case 2:
            return "交易成功";
        case 3:
            return "交易失败";
        case 4:
            return "历史交易成功";
        case 5:
            return "历史交易失败";
        case 6:
            return "交易手动取消";
    }
}


 
