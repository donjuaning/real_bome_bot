/*
 * @Author: DonJuaning
 * @Date: 2024-03-21 10:34:43
 * @LastEditors: DonJuaning
 * @LastEditTime: 2024-03-30 18:53:13
 * @FilePath: /tele_bot/channel_script.js
 * @Description: 
 */
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { createClient } = require('redis');
const { Keypair, Connection, PublicKey, VersionedTransaction,Transaction } = require("@solana/web3.js");
const bs58 = require("bs58");
const axios = require('axios');
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const schedule = require('node-schedule');
const {
    TokenAccount,
    SPL_ACCOUNT_LAYOUT,
    Liquidity, LiquiditySwapInstructionParams,
    LiquidityPoolKeysV4,
    array,
    TxVersion,
    TokenAmount,
    Token,
    Percent,
} = require("@raydium-io/raydium-sdk");
dotenv.config();
const RPC_ENDPOINT_URL = process.env.RPC_ENDPOINT_URL
const connection = new Connection(RPC_ENDPOINT_URL, "confirmed");
const client = createClient();
const sol = "So11111111111111111111111111111111111111112"

async function snip_pool() {
    const task_list = await client.sMembers("tasks");
    if(task_list.length>0){
        const { data: liquidityData } = await axios.get("https://api.raydium.io/v2/sdk/liquidity/mainnet.json");
        for(var i in liquidityData.unOfficial){
            const data = liquidityData.unOfficial[i];
            if (data["baseMint"] == sol) {
                token = data["quoteMint"];
                if(task_list.indexOf(token)>=0){
                    do_swap(token, data);
                }
            } else if (data["quoteMint"] == sol) {
                token = data["baseMint"];
                if(task_list.indexOf(token)>=0){
                    do_swap(token, data);
                }
            }
        }
    }
}
async function do_swap(token, data) {
    // const is_task = await client.sendCommand(['SISMEMBER', 'tasks', token]);
    // if (is_task) {

        var chatId_list = await client.keys("*:"+token);
        for (var i in chatId_list) {
            await everyChatId(token,chatId_list[i],data);
        }
    // }
}

async function everyChatId(token,chatIdkey,data){
    const task_redis = await client.get(chatIdkey);
    
    var task = JSON.parse(task_redis);
    if(task["type"]==0){
        task["type"] = 1;
        await client.set(chatIdkey,JSON.stringify(task));
        const keypair = Keypair.fromSecretKey(bs58.decode(task["privrite_key"]))
        const tokenAccounts = await getTokenAccounts(connection, keypair.publicKey);
        const pool_keys = {
            id: new PublicKey(data.id),
            baseMint: new PublicKey(data.baseMint),
            quoteMint: new PublicKey(data.quoteMint),
            lpMint: new PublicKey(data.lpMint),
            baseDecimals: data.baseDecimals,
            quoteDecimals: data.quoteDecimals,
            lpDecimals: data.lpDecimals,
            version: 4,
            programId: new PublicKey(data.programId),
            authority: new PublicKey(data.authority),
            openOrders: new PublicKey(data.openOrders),
            targetOrders: new PublicKey(data.targetOrders),
            baseVault: new PublicKey(data.baseVault),
            quoteVault: new PublicKey(data.quoteVault),
            withdrawQueue: new PublicKey(data.withdrawQueue),
            lpVault: new PublicKey(data.lpVault),
            marketVersion: 3,
            marketProgramId: new PublicKey(data.marketProgramId),
            marketId: new PublicKey(data.marketId),
            marketAuthority: new PublicKey(data.marketAuthority),
            marketBaseVault: new PublicKey(data.marketBaseVault),
            marketQuoteVault: new PublicKey(data.marketQuoteVault),
            marketBids: new PublicKey(data.marketBids),
            marketAsks: new PublicKey(data.marketAsks),
            marketEventQueue: new PublicKey(data.marketEventQueue),
            lookupTableAccount: new PublicKey(data.lookupTableAccount),
        };
        const computation = await compute(
            connection, pool_keys,
            new PublicKey(sol), new PublicKey(token),
            task["amount"]/10**9, 1
        )
    
        const amountOut = computation[0];
    
        const minAmountOut = computation[1];
    
        const currentPrice = computation[2];
    
        const executionPrice = computation[3];
    
        const priceImpact = computation[4];
    
        const fee = computation[5];
    
        const amountIn = computation[6];
        const ray_instructions = await swap_inst(connection, pool_keys, keypair, tokenAccounts, amountIn, minAmountOut);
    
        const tx = new Transaction()
        const signers = [keypair]
    
        ray_instructions.innerTransactions[0].instructions.forEach(e => {
            tx.add(e);
        })
    
        ray_instructions.innerTransactions[0].signers.forEach(e => {
            const newKeyPair = Keypair.fromSecretKey(e.secretKey);
            signers.push(newKeyPair);
        })
        const res = await sendTx(connection, tx, signers);
        if (res) {
            task["type"] = 0;
            await client.set(chatIdkey,JSON.stringify(task));
        } else {
            await client.del(chatIdkey);
            var task_list =  await client.keys("*:" + token);
            if(task_list.length==0){
                await client.sRem('tasks', token);
            }
        }
    }

}
//sending a transaction
async function sendTx(connection, transaction, signers) {

    const hash_info = (await connection.getLatestBlockhashAndContext()).value;

    transaction.recentBlockhash = hash_info.blockhash
    transaction.lastValidBlockHeight = hash_info.lastValidBlockHeight
    transaction.feePayer = signers[0].publicKey


    transaction.sign(...signers);
    const rawTransaction = transaction.serialize();


    var txid;
    try {
        txid = await connection.sendRawTransaction(rawTransaction, { skipPreflight: true, })
    }
    catch (e) {
        return 1
    }

    while (true) {
        const ret = await connection.getSignatureStatus(txid, { searchTransactionHistory: true })
        try {
            //@ts-ignore
            if (ret) {
                if (ret.value && ret.value.err == null) {
                    return 0
                } else if (ret.value && ret.value.err != null) {
                    return 1
                } else {
                    continue
                }
            }
        } catch (e) {
            return 1
        }

    }

}
async function compute(
    connection, poolKeys,
    curr_in, curr_out,
    amount_in, slip
) {
    try {

        const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys })

        //setting up decimals
        var in_decimal;
        var out_decimal;

        if (curr_in.toBase58() === poolKeys.baseMint.toBase58()) {
            in_decimal = poolInfo.baseDecimals
            out_decimal = poolInfo.quoteDecimals
        } else {
            out_decimal = poolInfo.baseDecimals;
            in_decimal = poolInfo.quoteDecimals;
        }


        //priming and computing
        const amountIn = new TokenAmount(new Token(TOKEN_PROGRAM_ID, curr_in, in_decimal), amount_in, false);

        const currencyOut = new Token(TOKEN_PROGRAM_ID, curr_out, out_decimal);

        const slippage = new Percent(slip, 100)

        const {
            amountOut,
            minAmountOut,
            currentPrice,
            executionPrice,
            priceImpact,
            fee,
        } = Liquidity.computeAmountOut({ poolKeys, poolInfo, amountIn, currencyOut, slippage })

        return [
            amountOut,
            minAmountOut,
            currentPrice,
            executionPrice,
            priceImpact,
            fee,
            amountIn,
        ]

    } catch (e) {
        console.log(e);
        return 1
    }
}
async function swap_inst(connection, poolKeys, ownerKeypair, tokenAccounts,amountIn,minAmountOut){
    const owner = ownerKeypair.publicKey
    
    const inst = await Liquidity.makeSwapInstructionSimple({
      connection:connection,
      poolKeys:poolKeys,
      userKeys:{
          tokenAccounts,
          owner,
      },
      amountIn:amountIn,
      amountOut:minAmountOut,
      fixedSide:'in',
      config:{},
      makeTxVersion:TxVersion.V0
    })
    return inst;
  }
async function getTokenAccounts(connection, owner) {
    const tokenResp = await connection.getTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
    });

    const accounts = [];
    for (const { pubkey, account } of tokenResp.value) {
        accounts.push({
            programId: TOKEN_PROGRAM_ID,
            pubkey: pubkey,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
        });
    }

    return accounts;
}

async function _main(){
    await client.connect();
    // let arr = []
    // for (let i = 0; i < 60; i++) {
    //   arr.push(i)
    // }
    // 定义规则
    let arr = [0]
    let rule = new schedule.RecurrenceRule();
    rule.second = arr; // 每隔 10 秒执行一次 可使用 0/10 * * * * *
    
    // 启动任务
    let job = schedule.scheduleJob(rule, async () => {
        await snip_pool();
    });
}
_main();