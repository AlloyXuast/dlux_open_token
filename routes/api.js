let config = require('./../config')
const { Base64} = require('./../helpers')
const { store, GetNodeOps, VERSION, status, TXID, exit, processor} = require("./../index");
const fetch = require('node-fetch');
let { getPathNum } = require("./../getPathNum");
let { getPathObj } = require("./../getPathObj");
const decodeURIcomponent = require('decode-uri-component');
const { 
    getPromotedPosts,
    getTrendingPosts,
    getPost,
    getNewPosts,
    getAuthorPosts 
    } = require('./../edb');
//const { reject } = require('async');

var RAM = {
    lastUpdate: 0,
    Hive: ''
}
exports.RAM = RAM 

exports.start = () => {fetchHive()}

exports.root = (req, res, next) => {
    var stats = {};
    res.setHeader('Content-Type', 'application/json');
    store.get(['stats'], function(err, obj) {
        var stats = obj
        hiveVWMA = stats.HiveVWMA
        hbdVWMA = stats.HbdVWMA
        delete stats.HiveVWMA
        delete stats.HbdVWMA
            res.send(JSON.stringify({
                result: stats,
                hiveVWMA,
                hbdVWMA,
                behind: RAM.behind,
                node: config.username,
                VERSION,
                realtime: stats.realtime
            }, null, 3));
    });
}

exports.pairs = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const pairs = [
        {
            ticker_id: `HIVE_${config.TOKEN}`,
            base: "HIVE",
            target: config.TOKEN,
        },
        {
            ticker_id: `HBD_${config.TOKEN}`,
            base: "HBD",
            target: config.TOKEN,
        }
    ]
    res.send(JSON.stringify(pairs, null, 3))
}

exports.tickers = (req, res, next) => {
    var dex = getPathObj(['dex'])
    var stats = getPathObj(['stats'])
    res.setHeader('Content-Type', 'application/json');
    Promise.all([dex, stats])
        .then(function(v) {
            var info = {
                hive:{
                    low: v[0].hive.tick,
                    bv: 0,
                    tv: 0,
                    high: v[0].hive.tick,
                    bid: 0, 
                    ask: 999999999
                },
                hbd:{
                    low: v[0].hbd.tick,
                    high: v[0].hbd.tick,
                    bv: 0,
                    tv: 0,
                    bid: 0, 
                    ask: 999999999
                }
            }
            for (item in v[0].hive.his){
                if (v[0].hive.his[item].block > v[1].lastIBlock - 28800){
                    // if (v[0].hive.his[item].block < hive.open){
                    //     hive.open = v[0].hive.his[item].block
                    //     hive.o = parseFloat(v[0].hive.his[item].rate)
                    //     hive.tv += v[0].hive.his[item].amount
                    //     hive.bv += v[0].hive.his[item].amount v[0].hive.his[item].rate
                    // }
                    if(v[0].hive.his[item].rate < info.hive.low){
                        info.hive.low = v[0].hive.his[item].rate
                    }
                    if(v[0].hive.his[item].rate > info.hive.high){
                        info.hive.high = v[0].hive.his[item].rate
                    }
                    info.hive.tv += parseFloat(v[0].hive.his[item].amount)
                    info.hive.bv += parseFloat(parseFloat(v[0].hive.his[item].amount) * parseFloat(v[0].hive.his[item].rate)).toFixed(3)
                }
            }
            for (item in v[0].hbd.his){
                if (v[0].hbd.his[item].block > v[1].lastIBlock - 28800){
                    if(v[0].hbd.his[item].rate < info.hbd.low){
                        info.hbd.low = v[0].hbd.his[item].rate
                    }
                    if(v[0].hbd.his[item].rate > info.hbd.high){
                        info.hbd.high = v[0].hbd.his[item].rate
                    }
                    info.hbd.tv += parseFloat(v[0].hbd.his[item].amount)
                    info.hbd.bv += parseFloat(parseFloat(v[0].hbd.his[item].amount) * parseFloat(v[0].hbd.his[item].rate)).toFixed(3)
                }
            }
            for (item in v[0].hbd.sellOrders){
                if (parseFloat(v[0].hbd.sellOrders[item].rate) < info.hbd.ask){
                    info.hbd.ask = v[0].hbd.sellOrders[item].rate
                }
            }
            for (item in v[0].hbd.buyOrders){
                if (parseFloat(v[0].hbd.buyOrders[item].rate) > info.hbd.bid){
                    info.hbd.bid = v[0].hbd.buyOrders[item].rate
                }
            }
            for (item in v[0].hive.sellOrders){
                if (parseFloat(v[0].hive.sellOrders[item].rate) < info.hive.ask){
                    info.hive.ask = v[0].hive.sellOrders[item].rate
                }
            }
            for (item in v[0].hive.buyOrders){
                if (parseFloat(v[0].hive.buyOrders[item].rate) > info.hive.bid){
                    info.hive.bid = v[0].hive.buyOrders[item].rate
                }
            }
            var hive = {
                ticker_id: `HIVE_${config.TOKEN}`,
                base_currency: "HIVE",
                target_currency: config.TOKEN,
                last_price: v[0].hive.tick,
                base_volume: parseFloat(parseFloat(info.hive.bv) / 1000).toFixed(3),
                target_volume: parseFloat(parseFloat(info.hive.tv) / 1000).toFixed(3),
                bid: info.hive.bid,
                ask: info.hive.ask,
                high: info.hive.high,
                low: info.hive.low
            },
            hbd = {
                ticker_id: `HBD_${config.TOKEN}`,
                base_currency: "HBD",
                target_currency: config.TOKEN,
                last_price: v[0].hbd.tick,
                base_volume: parseFloat(parseFloat(info.hbd.bv) / 1000).toFixed(3),
                target_volume: parseFloat(parseFloat(info.hbd.tv) / 1000).toFixed(3),
                bid: info.hbd.bid,
                ask: info.hbd.ask,
                high: info.hbd.high,
                low: info.hbd.low
            }
            res.send(JSON.stringify(
                [hive,hbd], null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
}

exports.orderbook = (req, res, next) => {
    var dex = getPathObj(['dex'])
    var stats = getPathObj(['stats'])
    var orderbook = {
        timestamp: Date.now(),
        bids: [],
        asks: []
    }
    var pair = req.params.ticker_id || req.query.ticker_id
    const depth = parseInt(req.query.depth) || 50
    res.setHeader('Content-Type', 'application/json');
    switch (pair) {
        case `HIVE_${config.TOKEN}`:
            orderbook.ticker_id = `HIVE_${config.TOKEN}`
            makeBook(depth, [dex, stats])
            break;
        case `HBD_${config.TOKEN}`:
            orderbook.ticker_id = `HBD_${config.TOKEN}`
            makeBook(depth, [dex, stats])
            break;
        default:
            res.send(JSON.stringify({
                ERROR: `ticker_id must be HIVE_${config.TOKEN} or HBD_${config.TOKEN}`,
                node: config.username,
                VERSION
            }, null, 3))
            break;
    }
    function makeBook(dep, promises){
        var get = dep
        if(!get)get = 50
        const type = orderbook.ticker_id.split('_')[0].toLowerCase()
    Promise.all(promises)
        .then(function(v) {
            var count1 = 0, count2 = 0
            for (item in v[0][type].sellOrders){
                orderbook.asks.push([v[0][type].sellOrders[item].rate,parseFloat(v[0][type].sellOrders[item].amount / 1000).toFixed(3)])
                count1++
                if(count1 == get)break;
            }
            for (item in v[0][type].buyOrders){
                orderbook.bids.push([v[0][type].buyOrders[item].rate,parseFloat(v[0][type].buyOrders[item].amount / 1000).toFixed(3)])
                count2++
                if(count2 == get)break;
            }
            res.send(JSON.stringify({
                asks:orderbook.asks,
                bids:orderbook.bids,
                timestamp: orderbook.timestamp,
                ticker_id: orderbook.ticker_id,
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
    }
}

exports.historical_trades = (req, res, next) => {
    var dex = getPathObj(['dex'])
    var stats = getPathObj(['stats'])
    var orderbook = {
        timestamp: Date.now(),
        buys: [],
        sells: []
    }
    /*
{        
      trade_id:1234567,
      price:"50.1",
      base_volume:"0.1",
      target_volume:"1",
      trade_timestamp:"1700050000",
      type:"buy"
   }

    */
    var pair = req.params.ticker_id || req.query.ticker_id
    const limit = parseInt(req.query.limit) || 50
    var type = req.query.type
    switch (type) {
        case 'buy':
            type = ['buy']
            break;
        case 'ask':
            type = ['sell']
            break;
        default:
            type = ['buy','sell']
            break;
    }
    res.setHeader('Content-Type', 'application/json');
    switch (pair) {
        case `HIVE_${config.TOKEN}`:
            getHistory([dex, stats], 'hive', type, limit)
            break;
        case `HBD_${config.TOKEN}`:
            getHistory([dex, stats], 'hbd', type, limit)
            break;
        default:
            res.send(JSON.stringify({
                error: 'Ticker_ID is not supported',
                node: config.username,
                VERSION
            }, null, 3))
            break;
    }
    function getHistory(promises, pair, typ, lim){
    Promise.all(promises)
        .then(function(v) {
            var buy = [],
                sell = [],
                count = 0
            if(v[0][pair].his)for(var item in v[0][pair].his){
                const record = {        
                    "trade_id":item.split(':')[1],
                    "price":v[0][pair].his[item].rate,
                    "base_volume":parseFloat(v[0][pair].his[item].rate * v[0][pair].his[item].amount / 1000).toFixed(3),
                    "target_volume": parseFloat(parseFloat(v[0][pair].his[item].amount) / 1000).toFixed(3),
                    "trade_timestamp": v[0][pair].his[item].timestamp || Date.now() - ((v[1].lastIBlock - v[0][pair].his[item].block)*3000),
                    "type":v[0][pair].his[item].type || "buy"
                }
                if(record.type == 'buy'){
                    buy.push(record)
                } else {
                    sell.push(record)
                }
            }
            /*
            open, close, top, bottom, dlux pairvolume 
            for(item of v[0][pair].days){
                const record = {        
                    "trade_id":item.split(':')[1],
                    "price":v[0][pair].his[item].rate,
                    "base_volume":parseFloat(v[0][pair].his[item].rate * v[0][pair].his[item].amount).toFixed(3),
                    "target_volume":v[0][pair].his[item].amount,
                    "trade_timestamp":v[0][pair].his[item].timestamp || Date.now() - ((v[1].lastIBlock - v[0][pair].his[item].block)*3000),
                    "type":v[0][pair].his[item].type
                }
                [v[0][pair].his[item].type].push(record)
            }
            
           function makeTrades(day, closeBlock){
               var num = 0
               if(day.o != day.c){
                   num++
                   if(day.t > day.c)num++
                   if(day.b < day.c)num++
               } else if (day.t != day.c){

               } else if (day.b != day.c){

               }
               var trades = [{        
                    "trade_id":closeBlock + 'c',
                    "price": day.c,
                    "base_volume":parseFloat(v[0][pair].his[item].rate * v[0][pair].his[item].amount).toFixed(3),
                    "target_volume":v[0][pair].his[item].amount,
                    "trade_timestamp":Date.now() - ((v[1].lastIBlock - closeBlock) * 3000),
                    "type": "buy"
                }]
               
           }
           */
            if (typ.indexOf('buy') < 0){
                buy = []
            }
            if (typ.indexOf('sell') < 0){
                sell = []
            }
            
            res.send(JSON.stringify({
                sell,
                buy,
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
    }
}

exports.dex = (req, res, next) => {
    var dex = getPathObj(['dex'])
    var queue = getPathObj(['queue'])
    res.setHeader('Content-Type', 'application/json');
    Promise.all([dex, queue])
        .then(function(v) {
            var markets = v[0]
            markets.hive.sells = []
            markets.hive.buys = []
            markets.hbd.sells = []
            markets.hbd.buys = []
            for(item in v[0].hive.sellOrders){
                markets.hive.sellOrders[item].key = item
                var order = {}
                for (let key in markets.hive.sellOrders[item]) {
                    order[key] = markets.hive.sellOrders[item][key];
                }
                order.hivenai = {
                    amount: order.hive,
                    precision: 3,
                    token: 'HIVE'
                }
                order.hbdnai = {
                    amount: order.hbd,
                    precision: 3,
                    token: 'HBD'
                }
                order.amountnai = {
                    amount: order.amount,
                    precision: config.precision,
                    token: config.TOKEN
                }
                order.feenai = {
                    amount: order.fee,
                    precision: config.precision,
                    token: config.TOKEN
                }
                markets.hive.sells.push(order)
            }
            for(item in v[0].hive.buyOrders){
                markets.hive.buyOrders[item].key = item
                var order = {}
                for (let key in markets.hive.buyOrders[item]) {
                    order[key] = markets.hive.buyOrders[item][key];
                }
                order.hivenai = {
                    amount: order.hive,
                    precision: 3,
                    token: 'HIVE'
                }
                order.hbdnai = {
                    amount: order.hbd,
                    precision: 3,
                    token: 'HBD'
                }
                order.amountnai = {
                    amount: order.amount,
                    precision: config.precision,
                    token: config.TOKEN
                }
                order.feenai = {
                    amount: order.fee,
                    precision: config.precision,
                    token: config.TOKEN
                }
                markets.hive.buys.push(order)
            }
            for(item in v[0].hbd.sellOrders){
                markets.hbd.sellOrders[item].key = item
                var order = {}
                for (let key in markets.hbd.sellOrders[item]) {
                    order[key] = markets.hbd.sellOrders[item][key];
                }
                order.hivenai = {
                    amount: order.hive,
                    precision: 3,
                    token: 'HIVE'
                }
                order.hbdnai = {
                    amount: order.hbd,
                    precision: 3,
                    token: 'HBD'
                }
                order.amountnai = {
                    amount: order.amount,
                    precision: config.precision,
                    token: config.TOKEN
                }
                order.feenai = {
                    amount: order.fee,
                    precision: config.precision,
                    token: config.TOKEN
                }
                markets.hbd.sells.push(order)
            }
            for(item in v[0].hbd.buyOrders){
                markets.hbd.buyOrders[item].key = item
                var order = {}
                for (let key in markets.hbd.buyOrders[item]) {
                    order[key] = markets.hbd.buyOrders[item][key];
                }
                order.hivenai = {
                    amount: order.hive,
                    precision: 3,
                    token: 'HIVE'
                }
                order.hbdnai = {
                    amount: order.hbd,
                    precision: 3,
                    token: 'HBD'
                }
                order.amountnai = {
                    amount: order.amount,
                    precision: config.precision,
                    token: config.TOKEN
                }
                order.feenai = {
                    amount: order.fee,
                    precision: config.precision,
                    token: config.TOKEN
                }
                markets.hbd.buys.push(order)
            }
            res.send(JSON.stringify({
                markets,
                queue: v[1],
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
}

// fetch hive details

function fetchHive(){
    return new Promise((resolve, reject)=>{
        if (RAM.lastUpdate < Date.now() - 59000){
            fetch(config.clientURL, {
                body: `{"jsonrpc":"2.0", "method":"database_api.get_dynamic_global_properties", "id":1}`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                method: "POST"
                })
                .then(r => r.json())
                .then(res => {
                    RAM.lastUpdate = Date.now()
                    RAM.hiveDyn = res.result
                    RAM.head = res.result.head_block_number
                    RAM.behind = res.result.head_block_number - (TXID.getBlockNum() || 0)
                    //console.log({behind: RAM.behind, isStreaming: TXID.streaming})
                    if (RAM.behind > 100 && TXID.streaming){exit()}
                    setTimeout(function(){
                        fetchHive();
                    }, 60000);
                    resolve('OK')
                })
                .catch(e=>reject(e))
        } else {
            resolve('OK')        
        }
    })
}

exports.detail = (req, res, next) => {
    var stats = getPathObj(['stats']),
        hiveStats = fetchHive()
    res.setHeader('Content-Type', 'application/json');
    Promise.all([stats, hiveStats])
        .then(function(v) {
            console.log(RAM.hiveDyn)
            const DLUX = {
                name: 'Decentralized Limitless User eXperiences',
                symbol: 'DLUX',
                icon: 'https://www.dlux.io/img/dlux-hive-logo-alpha.svg',
                supply:'5% Fixed Inflation, No Cap.',
                incirc: parseFloat(v[0].tokenSupply / 1000).toFixed(3),
                wp:`https://docs.google.com/document/d/1_jHIJsX0BRa5ujX0s-CQg3UoQC2CBW4wooP2lSSh3n0/edit?usp=sharing`,
                ws:`https://www.dlux.io`,
                be:`https://hiveblockexplorer.com/`,
                text: `DLUX is a Web3.0 technology that is focused on providing distribution of eXtended (Virtual and Augmented) Reality. It supports any browser based applications that can be statically delivered through IPFS. The DLUX Token Architecture is Proof of Stake as a layer 2 technology on the HIVE blockchain to take advantage of free transactions. With the first WYSIWYG VR Builder of any blockchain environment and the first Decentralized Exchange on the Hive Blockchain, DLUX is committed to breaking any boundaries for adoption of world changing technologies.`
            },
                HIVE ={
                name: 'HIVE',
                symbol: 'HIVE',
                icon: 'https://www.dlux.io/img/hextacular.svg',
                supply: RAM.hiveDyn.virtual_supply,
                incirc: RAM.hiveDyn.current_supply,
                wp:`https://hive.io/whitepaper.pdf`,
                ws:`https://hive.io`,
                be:`https://hiveblockexplorer.com/`,
                text: `HIVE is a DPoS blockchain with free transactions and a method to post and rate content.`
            }, 
                HBD = {
                name: 'Hive Backed Dollars',
                symbol: 'HBD',
                icon: 'https://www.dlux.io/img/hbd_green.svg',
                supply: 'Dynamic, up to 10% of HIVE Cap',
                incirc: RAM.hiveDyn.current_hbd_supply,
                wp:`https://hive.io/whitepaper.pdf`,
                ws:`https://hive.io`,
                be:`https://hiveblockexplorer.com/`,
                text: `Hive-backed dollars (HBD) are a unique type of trustless stablecoin that is backed by the underlying value of the Hive blockchain itself instead of external collateral or a centralized entity. HBD are pegged to value of USD. Staking HBD pays a variable APR, currently ${parseFloat(RAM.hiveDyn.hbd_interest_rate / 100).toFixed(2)}%.`
            }

            res.send(JSON.stringify({
                coins: [DLUX,HIVE,HBD],
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
}

exports.markets = (req, res, next) => {
    let markets = getPathObj(['markets']),
        stats = getPathObj(['stats'])
    res.setHeader('Content-Type', 'application/json');
    Promise.all([markets, stats])
        .then(function(v) {
            res.send(JSON.stringify({
                markets: v[0],
                stats: v[1],
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
}

exports.mirrors = (req, res, next) => {
    var nodes = getPathObj(['markets', 'node'])
    var queue = getPathObj(['queue'])
    res.setHeader('Content-Type', 'application/json');
    Promise.all([nodes, queue])
        .then(function(v) {
            var apis = []
            for (node in v[1]){
                apis.push({api_url:v[0][node].domain, node})
            }
            res.send(JSON.stringify({
                apis,
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
}

exports.runners = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    store.get(['runners'], function(err, obj) {
        var runners = obj
        res.send(JSON.stringify({
            runners,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    });
}

exports.queue = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    store.get(['queue'], function(err, obj) {
        var queue = obj
        res.send(JSON.stringify({
            queue,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    });
}

exports.feed = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    store.get(['feed'], function(err, obj) {
        var feed = obj
        res.send(JSON.stringify({
            feed,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    });
}

exports.posts = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    store.get(['posts'], function(err, obj) {
        var feed = obj
        res.send(JSON.stringify({
            feed,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    });
}


exports.PostAuthorPermlink = (req, res, next) => {
    try {
        let author = req.params.author,
            permlink = req.params.permlink
        res.setHeader('Content-Type', 'application/json')
            //archp = getPathObj(['posts', `s/${author}/${permlink}`]) //one of these will be empty
        nowp = getPathObj(['posts', `${author}/${permlink}`]) //now are still eligible for votes
        Promise.all([nowp])
            .then(a => {
                var arch = a[1],
                    now = a[0]
                res.send(JSON.stringify({
                    now,
                    arch,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
            })
            .catch(e => { console.log(e) })
    } catch (e) { res.send('Something went wrong') }
}

exports.protocol = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json')
    store.get(['queue'], function(err, obj) {
        var feed = obj
        res.send(JSON.stringify({
            consensus: obj,
            prefix: config.prefix,
            node: config.username,
            behind: RAM.behind,
            info: '/markets will return node information and published APIs for the consensus nodes, you may check these other APIs to ensure that the information in the API is in consensus.\nThe prefix is used to address this tokens architecture built on Hive.',
            VERSION
        }, null, 3))
    });
}

exports.status = (req, res, next) => {
    let txid = req.params.txid
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({
            txid,
            status: status[txid] || `This TransactionID either has not yet been processed, or was missed by the system due to formatting errors. Wait 70 seconds and try again. This API only keeps these records for a maximum of ${(config.history * 3)} seconds`,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
}

exports.nfts = (req, res, next) => {
    let user = req.params.user,
        userItems = getPathObj(['nfts', user]),
        sets = getPathObj(['sets']),
        mintItems = getPathObj(['rnfts'])
    Promise.all([userItems, sets, mintItems])
    .then(mem => {
        var result = []
        for (item in mem[0]){
            const set = item.split(':')[0]
            result.push({
                uid: item.split(':')[1],
                set,
                script: mem[1][set].s,
                type: mem[1][set].t,
                encoding: mem[1][set].e
            })
        }
        var mint_tokens = []
        for (item in mem[2]){
            if(mem[2][item][user]){
                const set = item
                console.log({item})
                mint_tokens.push({
                    qty: mem[2][item][user],
                    set, 
                    script: mem[1][set].s,
                    type: mem[1][set].t,
                    encoding: mem[1][set].e
                })
            }
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({
                    result,
                    mint_tokens,
                    user,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.sets = (req, res, next) => {
    let sets = getPathObj(['sets'])
    Promise.all([sets])
    .then(mem => {
        let result = []
        for (set in mem[0]){
            result.push({
                set,
                link: `${mem[0][set].a}/${mem[0][set].p}`,
                fee: {
                    amount:mem[0][set].f,
                    precision: config.precision,
                    token: config.TOKEN
                },
                bond: {
                    amount:mem[0][set].b,
                    precision: config.precision,
                    token: config.TOKEN
                },
                permlink: mem[0][set].p,
                author: mem[0][set].a,
                script: mem[0][set].s,
                encoding: mem[0][set].e,
                type: mem[0][set].t,
                royalty: mem[0][set].r,
                name: mem[0][set].n,
                minted: mem[0][set].i,
                max: Base64.toNumber(mem[0][set].m) - Base64.toNumber(mem[0][set].o)
            })
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({
                    result,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.auctions = (req, res, next) => {
    let ahp = getPathObj(['ah']),
        setp = getPathObj(['sets'])
    Promise.all([ahp, setp])
    .then(mem => {
        let result = []
        for(item in mem[0]){
            let auctionTimer = {},
            now = new Date()
            auctionTimer.expiryIn = now.setSeconds(now.getSeconds() + ((mem[0][item].e - TXID.getBlockNum())*3));
            auctionTimer.expiryUTC = new Date(auctionTimer.expiryIn);
            auctionTimer.expiryString = auctionTimer.expiryUTC.toISOString();
            result.push({
                        uid: item.split(':')[1],
                        set: item.split(':')[0],
                        price: {
                            amount: mem[0][item].b || mem[0][item].p,
                            precision: config.precision,
                            token: config.TOKEN
                        }, //starting price
                        initial_price: {
                            amount: mem[0][item].p,
                            precision: config.precision,
                            token: config.TOKEN
                        },
                        time: auctionTimer.expiryString,
                        by:mem[0][item].o,
                        bids: mem[0][item].c || 0,
                        bidder: mem[0][item].f || '',
                        script: mem[1][item.split(':')[0]].s,
                        days: mem[0][item].t,
                        buy: mem[0][item].n || ''
                    })
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({
                    result,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}


exports.official = (req, res, next) => {
    let user = req.params.user,
        offp = getPathObj(['pfps', user]),
        userItemsp = getPathObj(['nfts', user]),
        setsp = getPathObj(['sets'])
    Promise.all([offp, userItemsp, setsp])
    .then(mem => {
        const nft = mem[1][mem[0]]
        var pfp = mem[0]
        if(!nft.s){pfp = ':'}
        result = [
            {
                pfp,
                nft,
                set:mem[2][mem[0].split(':')[0]] || ''
            }
        ]
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({
                    result,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({
                    result: 'No Profile Picture Set or Owned',
                    error: e,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
  })
}

exports.limbo = (req, res, next) => {
    let user = req.params.user,
        kind = req.params.kind
    if(kind != 'nfts'){kind = 'fts'}
    let tradesp = getPathObj([kind, 't']),
        setsp = getPathObj(['sets'])
    Promise.all([tradesp, setsp])
    .then(mem => {
        let trades = mem[0],
            result = []
        for(item in trades){
            const str = trades[item].t.split('_')
            if (str[0] == user || str[1] == user){
                result.push({
                    from: str[0],
                    to: str[1],
                    price: parseInt(str[2]),
                    item,
                    kind,
                    set:item.split(':')[0],
                    uid:item.split(':')[1],
                    script: mem[1][item.split(':')[0]].s
                })
            }
        }
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({
                    result,
                    kind,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.mint_auctions = (req, res, next) => {
    let ahp = getPathObj(['am']),
        setp = getPathObj(['sets'])
    Promise.all([ahp, setp])
    .then(mem => {
        let result = []
        for(item in mem[0]){
            let auctionTimer = {},
            now = new Date()
            auctionTimer.expiryIn = now.setSeconds(now.getSeconds() + ((mem[0][item].e - TXID.getBlockNum())*3));
            auctionTimer.expiryUTC = new Date(auctionTimer.expiryIn);
            auctionTimer.expiryString = auctionTimer.expiryUTC.toISOString();
            result.push({
                        uid: item.split(':')[1],
                        set: item.split(':')[0],
                        price: {
                            amount: mem[0][item].b || mem[0][item].p,
                            precision: config.precision,
                            token: config.TOKEN
                        }, //starting price
                        initial_price: {
                            amount: mem[0][item].p,
                            precision: config.precision,
                            token: config.TOKEN
                        },
                        time: auctionTimer.expiryString,
                        by:mem[0][item].o,
                        bids: mem[0][item].c || 0,
                        bidder: mem[0][item].f || '',
                        script: mem[1][item.split(':')[0]].s,
                        days: mem[0][item].t,
                        buy: mem[0][item].n || ''
                    })
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({
                    result,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.mint_supply = (req, res, next) => {
    let ahp = getPathObj(['am']),
        setp = getPathObj(['sets']),
        lsp = getPathObj(['lt'])
    Promise.all([ahp, setp, lsp])
    .then(mem => {
        let result = []
        let sets = {
            /*
                BZ : {
                    set: 'BZ',
                    script: 'QmcdvCEd4UUvEKXmxeQXhPBwyrppCJyEuWztLJbhgYHADj',
                    auctions: [{
                        uid: 'fake',
                        set: 'BZ',
                        price: 100000000000,
                        pricenai: {
                            amount: 100000000000,
                            precision: config.precision,
                            token: config.TOKEN
                        }, //starting price
                        initial_price: {
                            amount: 100000000000,
                            precision: config.precision,
                            token: config.TOKEN
                        },
                        time: '2021-10-31T21:18:57.955Z',
                        by: 'disregardfiat',
                        bids: 0,
                        bidder: '',
                        script: 'QmcdvCEd4UUvEKXmxeQXhPBwyrppCJyEuWztLJbhgYHADj',
                        days: 10,
                        buy: ''
                    }],
                    sales: [{
                uid: 'FAKE',
                set: 'BZ',
                price: 100000000000,
                pricenai: {
                    amount: 100000000000,
                    precision: config.precision,
                    token: config.TOKEN
                },
                by: 'null',
                script: 'QmcdvCEd4UUvEKXmxeQXhPBwyrppCJyEuWztLJbhgYHADj'
            }],
                    qty_sales: 1,
                    qty_auctions: 1,
                    qty: 2
                } //QmcdvCEd4UUvEKXmxeQXhPBwyrppCJyEuWztLJbhgYHADj
                */
            }
        for(item in mem[0]){
            if(sets[item.split(':')[0]] == undefined){
                sets[item.split(':')[0]] = {
                    set: item.split(':')[0],
                    script: mem[1][item.split(':')[0]].s,
                    auctions: [],
                    sales: [],
                    qty_sales: 0,
                    qty_auctions: 0,
                    qty: 0
                }
            }
            let auctionTimer = {},
            now = new Date()
            auctionTimer.expiryIn = now.setSeconds(now.getSeconds() + ((mem[0][item].e - TXID.getBlockNum())*3));
            auctionTimer.expiryUTC = new Date(auctionTimer.expiryIn);
            auctionTimer.expiryString = auctionTimer.expiryUTC.toISOString();
            sets[item.split(':')[0]].qty_auctions += (mem[0][item].a || 1)
            sets[item.split(':')[0]].qty += (mem[0][item].a || 1)
            sets[item.split(':')[0]].auctions.push({
                        uid: item.split(':')[1],
                        set: item.split(':')[0],
                        price: mem[0][item].b || mem[0][item].p,
                        pricenai: {
                            amount: mem[0][item].b || mem[0][item].p,
                            precision: config.precision,
                            token: config.TOKEN
                        }, //starting price
                        initial_price: {
                            amount: mem[0][item].p,
                            precision: config.precision,
                            token: config.TOKEN
                        },
                        time: auctionTimer.expiryString,
                        by:mem[0][item].o,
                        bids: mem[0][item].c || 0,
                        bidder: mem[0][item].f || '',
                        script: mem[1][item.split(':')[0]].s,
                        days: mem[0][item].t,
                        buy: mem[0][item].n || ''
                    })
        }
        for (item in mem[2]){
            if(sets[item.split(':')[0]] == undefined){
                sets[item.split(':')[0]] = {
                    set: item.split(':')[0],
                    script: mem[1][item.split(':')[0]].s,
                    auctions: [],
                    sales: [],
                    qty_sales: 0,
                    qty_auctions: 0,
                    qty: 0
                }
            }
            const listing = {
                uid: item.split(':')[1],
                set: item.split(':')[0],
                price: mem[2][item].p,
                pricenai: {
                    amount: mem[2][item].p,
                    precision: config.precision,
                    token: config.TOKEN
                },
                by:mem[2][item].o,
                script: mem[1][item.split(':')[0]].s
            }
            sets[item.split(':')[0]].qty += (mem[2][item].a || 1)
            sets[item.split(':')[0]].qty_sales += (mem[2][item].a || 1)
            sets[item.split(':')[0]].sales.push(listing)
        }
        for (item in sets){
            result.push(sets[item])
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({
                    result,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send(console.log(e) + 'Something went wrong') })
}

exports.sales = (req, res, next) => {
    let lsp = getPathObj(['ls']),
        mlsp = getPathObj(['mls']),
        setp = getPathObj(['sets'])
    Promise.all([lsp, mlsp, setp])
    .then(mem => {
        let result = [],
            mint = [],
            sets = {}
        for (item in mem[0]){
            const listing = {
                uid: item.split(':')[1],
                set: item.split(':')[0],
                price: {
                    amount: mem[0][item].p,
                    precision: config.precision,
                    token: config.TOKEN
                },
                by:mem[0][item].o,
                script: mem[2][item.split(':')[0]].s
            }
            result.push(listing)
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({
                    result,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.mint_sales = (req, res, next) => {
    let lsp = getPathObj(['lt']),
        setp = getPathObj(['sets'])
    Promise.all([lsp, setp])
    .then(mem => {
        let result = [],
            mint = [],
            sets = {}
        for (item in mem[0]){
            const listing = {
                uid: item.split(':')[1],
                set: item.split(':')[0],
                price: {
                    amount: mem[0][item].p,
                    precision: config.precision,
                    token: config.TOKEN
                },
                by:mem[0][item].o,
                script: mem[1][item.split(':')[0]].s
            }
            result.push(listing)
        }
        res.setHeader('Content-Type', 'application/json')
        res.send(JSON.stringify({
                    result,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.set = (req, res, next) => {
    let setname = req.params.set,
        setp = getPathObj(['sets', setname])
    Promise.all([setp])
    .then(mem => {
        res.setHeader('Content-Type', 'application/json')
        var result = [], set = {
                set: setname,
                link: `${mem[0].a}/${mem[0].p}`,
                fee: {
                    amount:mem[0].f,
                    precision: config.precision,
                    token: config.TOKEN
                },
                bond: {
                    amount:mem[0].b,
                    precision: config.precision,
                    token: config.TOKEN
                },
                permlink: mem[0].p,
                author: mem[0].a,
                script: mem[0].s,
                encoding: mem[0].e,
                type: mem[0].t,
                royalty: mem[0].r,
                name: mem[0].n,
                minted: Base64.toNumber(mem[0].i),
                max: Base64.toNumber(mem[0].m) - Base64.toNumber(mem[0].o) + 1
            },
            uids = []
            if (mem[0].u)uids = mem[0].u.split(',')
        for (var i = 0; i < uids.length; i++){
            var owner = uids[i].split('_')
            for (var j = 0; j < owner.length -1; j++){
                result.push({
                    uid: owner[j],
                    set: setname,
                    script: mem[0].s,
                    owner: owner[owner.length - 1]
                })
            }
        }
        res.send(JSON.stringify({
                    result,
                    set,
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.item = (req, res, next) => {
    let itemname = req.params.item || ':',
        setname = req.params.set || ':'
        setp = getPathObj(['sets', setname])
    Promise.all([setp])
    .then(mem => {
        const location = mem[0].u.indexOf(`${itemname}_`)
        var owner = ''
        if(location >= 0){
            const loc = mem[0].u.slice(location)
            const own = loc.split(',')[0]
            const items = own.split('_')
            owner = items[items.length - 1]
        }
        store.get(['nfts', owner, `${setname}:${itemname}`], function(err, obj) {
            if (obj.s){
                res.setHeader('Content-Type', 'application/json')
                res.send(JSON.stringify({
                    item: {
                        uid: itemname,
                        set: setname,
                        last_modified: Base64.toNumber(obj.s.split(',')[0]),
                        string: obj.s || '',
                        owner,
                        lien: obj.l || 'No Lien',
                    },
                    set: {
                        set: setname,
                        link: `${mem[0].a}/${mem[0].p}`,
                        fee: {
                            amount:mem[0].f,
                            precision: config.precision,
                            token: config.TOKEN
                        },
                        bond: {
                            amount:mem[0].b,
                            precision: config.precision,
                            token: config.TOKEN
                        },
                        permlink: mem[0].p,
                        author: mem[0].a,
                        script: mem[0].s,
                        encoding: mem[0].e,
                        type: mem[0].t,
                        royalty: mem[0].r,
                        name: mem[0].n,
                        minted: mem[0].i,
                        max: Base64.toNumber(mem[0].m) - Base64.toNumber(mem[0].o)
                    },
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
            } else {
                res.setHeader('Content-Type', 'application/json')
                res.send(JSON.stringify({
                    item: 'Not Found',
                    node: config.username,
                    behind: RAM.behind,
                    VERSION
                }, null, 3))
            }
        });
    }) 
    .catch (e => { res.send('Something went wrong') })
}

exports.report = (req, res, next) => {
    let un = req.params.un
    res.setHeader('Content-Type', 'application/json')
    store.get(['markets', 'node', un, 'report'], function(err, obj) {
        var report = obj
        res.send(JSON.stringify({
            [un]: report,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    });
}

exports.getPromotedPosts = (req, res, next) => {
    let amt = parseInt(req.query.a),
        off = parseInt(req.query.o)
    if(amt < 1){
        amt = 50
    } else if (amt > 100){
        amt = 100
    }
    if(off < 0){
        off = 0
    }
    res.setHeader('Content-Type', 'application/json')
    getPromotedPosts(amt, off)
        .then(r =>{
            res.send(JSON.stringify({
                        result: r,
                        node: config.username,
                        behind: RAM.behind,
                        VERSION
                    }, null, 3))
        })
        .catch(e=>{
            console.log(e)

        })
}

exports.getTrendingPosts = (req, res, next) => {
    let amt = parseInt(req.query.a),
        off = parseInt(req.query.o)
    if(amt < 1){
        amt = 50
    } else if (amt > 100){
        amt = 100
    }
    if(off < 0){
        off = 0
    }
    res.setHeader('Content-Type', 'application/json')
    getTrendingPosts(amt, off)
        .then(r =>{
            res.send(JSON.stringify({
                result: r,
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(e=>{
            console.log(e)

        })
}

exports.getNewPosts = (req, res, next) => {
    let amt = parseInt(req.query.a),
        off = parseInt(req.query.o)
    if(amt < 1){
        amt = 50
    } else if (amt > 100){
        amt = 100
    }
    if(off < 0){
        off = 0
    }
    res.setHeader('Content-Type', 'application/json')
    getNewPosts(amt, off)
        .then(r =>{
            res.send(JSON.stringify({
                result: r,
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(e=>{
            console.log(e)

        })
}

exports.getAuthorPosts = (req, res, next) => {
    let amt = parseInt(req.query.a),
        off = parseInt(req.query.o),
        author = req.params.author
    if(amt < 1){
        amt = 50
    } else if (amt > 100){
        amt = 100
    }
    if(off < 0){
        off = 0
    }
    res.setHeader('Content-Type', 'application/json')
    getAuthorPosts(author, amt, off)
        .then(r =>{
            res.send(JSON.stringify({
                result: r,
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(e=>{
            console.log(e)

        })
}

exports.getPost = (req, res, next) => {
    let permlink= req.params.permlink,
        author = req.params.author
    res.setHeader('Content-Type', 'application/json')
    getPost(author, permlink)
        .then(r =>{
            res.send(JSON.stringify({
                result: r,
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(e=>{
            console.log(e)

        })
}

exports.coincheck = (state) => {
        supply = 0
        lbal = 0
        for (bal in state.balances) {
            supply += state.balances[bal]
            lbal += state.balances[bal]
        }
        var gov = 0,
            govt = 0
        var con = 0
        for (user in state.contracts) {
            for (contract in state.contracts[user]) {
                if (state.contracts[user][contract].amount && !state.contracts[user][contract].buyer && (state.contracts[user][contract].type == 'ss' || state.contracts[user][contract].type == 'ds')) {
                    supply += state.contracts[user][contract].amount
                    con += state.contracts[user][contract].amount
                }
            }
        }
        let coll = 0
        for (user in state.col) {
            supply += state.col[user]
            coll += state.col[user]
        }
        try { govt = state.gov.t - coll } catch (e) {}
        for (bal in state.gov) {
            if (bal != 't') {
                supply += state.gov[bal]
                gov += state.gov[bal]
            }
        }
        var pow = 0,
            powt = state.pow.t
        for (bal in state.pow) {
            if (bal != 't') {
                supply += state.pow[bal]
                pow += state.pow[bal]
            }
        }
        var ah = 0
        for (item in state.ah){
            ah += state.ah[item].b || 0
            supply += state.ah[item].b || 0
        }
        var am = 0
        for (item in state.am){
            am += state.am[item].b || 0
            supply += state.am[item].b || 0
        }
        var bond = 0
        for (item in state.sets){
            const it = (state.sets[item].b * (Base64.toNumber(state.sets[item].m) - Base64.toNumber(state.sets[item].o) - (state.sets[item].d || 0) + 1))
            bond += it
            supply += it
        }

        let info = {}
        let check = `supply check:state:${state.stats.tokenSupply} vs check: ${supply}: ${state.stats.tokenSupply - supply}`
        if (state.stats.tokenSupply != supply) {
            info = { lbal, gov, govt, pow, powt, con, ah, am, bond }
        }
        return {check, info, supply}
}

exports.coin = (req, res, next) => {
    var state = {}
    res.setHeader('Content-Type', 'application/json')
    store.get([], function(err, obj) {
        let info = exports.coincheck(obj)
        res.send(JSON.stringify({
            check: info.check,
            info: info.info,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    });
}

exports.user = (req, res, next) => {
    let un = req.params.un,
        bal = getPathNum(['balances', un]),
        pb = getPathNum(['pow', un]),
        lp = getPathNum(['granted', un, 't']),
        lg = getPathNum(['granting', un, 't']),
        contracts = getPathObj(['contracts', un]),
        incol = getPathNum(['col', un]), //collateral
        gp = getPathNum(['gov', un]),
        pup = getPathObj(['up', un]),
        pdown = getPathObj(['down', un])
    res.setHeader('Content-Type', 'application/json');
    Promise.all([bal, pb, lp, contracts, incol, gp, pup, pdown, lg])
        .then(function(v) {
            console.log(bal, pb, lp, contracts)
            res.send(JSON.stringify({
                balance: v[0],
                poweredUp: v[1],
                granted: v[2],
                granting: v[8],
                heldCollateral: v[4],
                contracts: v[3],
                up: v[6],
                down: v[7],
                gov: v[5],
                node: config.username,
                behind: RAM.behind,
                VERSION
            }, null, 3))
        })
        .catch(function(err) {
            console.log(err)
        })
}

exports.blog = (req, res, next) => {
    let un = req.params.un
    res.setHeader('Content-Type', 'application/json')
    let unn = alphabeticShift(un)

    function alphabeticShift(inputString) {
        var newString = []
        for (var i = 0; i < inputString.length; i++) {
            if (i == inputString.length - 1) newString.push(String.fromCharCode(inputString.charCodeAt(i) + 1))
            else newString.push(String.fromCharCode(inputString.charCodeAt(i)))
        }
        return newString.join("")
    }
    store.someChildren(['posts'], {
        gte: un,
        lte: unn
    }, function(e, a) {
        let obj = {}
        for (p in a) {
            obj[a] = p[a]
        }
        res.send(JSON.stringify({
            blog: arr,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    })
}

exports.state = (req, res, next) => {
    var state = {}
    res.setHeader('Content-Type', 'application/json')
    store.get([], function(err, obj) {
        state = obj,
        res.send(JSON.stringify({
            state,
            node: config.username,
            behind: RAM.behind,
            VERSION
        }, null, 3))
    });
}

exports.pending = (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(GetNodeOps(), null, 3))
}

//heroku force https

exports.https_redirect = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        if (req.headers['x-forwarded-proto'] != 'https') {
            return res.redirect('https://' + req.headers.host + req.url);
        } else {
            return next();
        }
    } else {
        return next();
    }
};

//hive API helper functions

exports.hive_api = (req, res, next) => {
    let method = `${req.params.api_type}.${req.params.api_call}` || 'condenser_api.get_discussions_by_blog';
    let params = {};
    let array = false;
    for (param in req.query) {
        if (param == "0") {
            array = true;
            break;
        }
        params[param] = req.query[param];
    }
    if (array) {
        params = [];
        for (param in req.query) {
            params.push(req.query[param]);
        }
        params = [params];
    }
    switch (req.params.api_call) {
        case 'get_content':
            params = [params.author, params.permlink];
            break;
        case 'get_content_replies':
            params = [params.author, params.permlink];
            break;
        default:
    }
    res.setHeader('Content-Type', 'application/json');
    let body = {
        jsonrpc: "2.0",
        method,
        params,
        id: 1
    };
    fetch(config.clientURL, {
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST"
        })
        .then(j => j.json())
        .then(r => {
            res.send(JSON.stringify(r, null, 3));
        });
}

exports.getwrap = (req, res, next) => {
    let method = req.query.method || 'condenser_api.get_discussions_by_blog';
    method.replace('%27', '');
    let iparams = JSON.parse(decodeURIcomponent((req.query.params.replace("%27", '')).replace('%2522', '%22')));
    switch (method) {
        case 'tags_api.get_discussions_by_blog':
        default:
            iparams = {
                tag: iparams[0]
            };
    }
    let params = iparams || { "tag": "robotolux" };
    res.setHeader('Content-Type', 'application/json');
    let body = {
        jsonrpc: "2.0",
        method,
        params,
        id: 1
    };
    fetch(config.clientURL, {
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST"
        })
        .then(j => j.json())
        .then(r => {
            res.send(JSON.stringify(r, null, 3));
        });
}

exports.getpic = (req, res, next) => {
    let un = req.params.un || '';
    let body = {
        jsonrpc: "2.0",
        method: 'condenser_api.get_accounts',
        params: [
            [un]
        ],
        id: 1
    };
    fetch(config.clientURL, {
            body: JSON.stringify(body),
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST"
        })
        .then(j => j.json())
        .then(r => {
            let image, i = 0;
            try {
                image = JSON.parse(r.result[0].json_metadata).profile.profile_image;
            } catch (e) {
                try {
                    i = 1;
                    image = JSON.parse(r.result[0].posting_json_metadata).profile.profile_image;
                } catch (e) {
                    i = 2;
                    image = 'https://a.ipfs.dlux.io/images/user-icon.svg';
                }
            }
            if (image) {
                fetch(image)
                    .then(response => {
                        response.body.pipe(res);
                    })
                    .catch(e => {
                        if (i == 0) {
                            try {
                                i = 1;
                                image = JSON.parse(r.result[0].posting_json_metadata).profile.profile_image;
                            } catch (e) {
                                i = 2;
                                image = 'https://a.ipfs.dlux.io/images/user-icon.svg';
                            }
                        } else {
                            i = 2;
                            image = 'https://a.ipfs.dlux.io/images/user-icon.svg';
                        }
                        fetch(image)
                            .then(response => {
                                response.body.pipe(res);
                            })
                            .catch(e => {
                                if (i == 1) {
                                    image = 'https://a.ipfs.dlux.io/images/user-icon.svg';
                                    fetch(image)
                                        .then(response => {
                                            response.body.pipe(res);
                                        })
                                        .catch(e => {
                                            res.status(404);
                                            res.send(e);

                                        });
                                } else {
                                    res.status(404);
                                    res.send(e);
                                }
                            });
                    });
            } else {
                res.status(404);
                res.send('Image not found');
            }
        });
}

exports.getblog = (req, res, next) => {
    let un = req.params.un;
    let start = req.query.s || 0;
    res.setHeader('Content-Type', 'application/json');
    fetch(config.clientURL, {
            body: `{\"jsonrpc\":\"2.0\", \"method\":\"follow_api.get_blog_entries\", \"params\":{\"account\":\"${un}\",\"start_entry_id\":${start},\"limit\":10}, \"id\":1}`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST"
        })
        .then(j => j.json())
        .then(r => {
            var out = { items: [] };
            for (i in r.result) {
                r.result[i].media = { m: "https://a.ipfs.dlux.io/images/400X200.gif" };
            }
            out.id = r.id;
            out.jsonrpc = r.jsonrpc;
            out.items = r.result;
            res.send(JSON.stringify(out, null, 3));
        });
}