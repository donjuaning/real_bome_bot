<!--
 * @Author: DonJuaning
 * @Date: 2024-03-30 18:52:38
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-30 19:17:01
 * @FilePath: /real_bome_bot/ReadMe.md
 * @Description: 
-->
bot地址：https://t.me/real_bome_bot
本项目仅适合学习研究使用，因使用造成的财产损失风险请自行承担！

本项目需另外配置mysql和redis进行使用，redis为初始无鉴权仅同一服务器内多程序调用，mysql相关配置写入根目录下.env文件

TELEGRAM_BOT_TOKEN #bot机器人的token，通过与botfather对话获得
WEBHOOK_HOST #部署服务器的公网ip或dns地址，用于telegram的消息分发
MYSQL_IP= #mysql地址
MYSQL_USER= #mysql用户名
MYSQL_KEY= #mysql密码
RPC_ENDPOINT_URL= #个人节点网址，去quicknode申请一个