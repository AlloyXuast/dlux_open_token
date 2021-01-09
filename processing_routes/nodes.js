const { store, config } = require('./../index')
const { getPathObj } = require('./../getPathObj')
const { deleteObjs } = require('./../deleteObjs')
const { isEmpty } = require('./../lil_ops')

exports.node_add = function(json, from, active, pc) {
    if (json.domain && typeof json.domain === 'string') {
        var escrow = true
        if (json.escrow == 'false') {
            escrow = false
        }
        var mirror = false
        if (json.mirror == 'true') {
            mirror = true
        }
        var bid = parseInt(json.bidRate) || 0
        if (bid < 1) {
            bid = 1000
        }
        if (bid > 2000) {
            bid = 2000
        }
        var daoRate = parseInt(json.marketingRate) || 0
        if (daoRate < 1) {
            daoRate = 0
        }
        if (daoRate > 2000) {
            daoRate = 2000
        }
        store.get(['markets', 'node', from], function(e, a) {
            if (!e) {
                if (isEmpty(a)) {
                    store.batch([{
                        type: 'put',
                        path: ['markets', 'node', from],
                        data: {
                            domain: json.domain,
                            self: from,
                            bidRate: bid,
                            marketingRate: daoRate,
                            attempts: 0,
                            yays: 0,
                            wins: 0,
                            strikes: 0,
                            burned: 0,
                            moved: 0,
                            contracts: 0,
                            escrows: 0,
                            lastGood: 0,
                            report: {},
                            escrow
                        }
                    }], pc)
                } else {
                    var b = a;
                    b.domain = json.domain
                    b.bidRate = bid
                    b.escrow = escrow
                    b.marketingRate = daoRate
                    b.mirror = mirror
                    store.batch([{ type: 'put', path: ['markets', 'node', from], data: b }], pc)
                }
            } else {
                console.log(e)
            }
        })
        store.batch([{ type: 'put', path: ['feed', `${json.block_num}:${json.transaction_id}`], data: `@${from}| has bid the hive-state node ${json.domain} at ${json.bidRate}` }], pc)
    } else {
        store.batch([{ type: 'put', path: ['feed', `${json.block_num}:${json.transaction_id}`], data: `@${from}| sent and invalid hive-state node operation` }], pc)
    }
}

exports.node_delete = function(json, from, active, pc) {
    if (active) {
        var ops = []
        var Pqueue = getPathObj(['queue']),
            Pnode = getPathObj(['markets', 'node', from])
        Promise.all([Pqueue, Pnode, Prunners]).then(function(v) {
            deleteObjs([
                    ['queue']
                ])
                .then(empty => {
                    var q = v[0],
                        n = v[1]
                    if (typeof n.bidRate == 'number') {
                        for (var i = 0; i < q.length; i++) {
                            if (q[i] == from) {
                                found = i
                                break;
                            }
                        }
                        if (found >= 0) {
                            q.splice(found, 1)
                            ops.push({ type: 'put', path: ['queue'], data: q })
                        }
                        delete b.domain
                        delete b.bidRate
                        delete b.escrow
                        delete b.marketingRate
                        ops.push({ type: 'del', path: ['runners', from] })
                        ops.push({ type: 'put', path: ['markets', 'node', from], data: b })
                        ops.push({ type: 'put', path: ['feed', `${json.block_num}:${json.transaction_id}`], data: `@${from}| has signed off their ${config.TOKEN} node` })
                        store.batch(ops, pc)
                    } else {
                        pc[0](pc[2])
                    }
                })
                .catch(e => { console.log(e) })
        }).catch(function(e) { console.log(e) })
    } else {
        pc[0](pc[2])
    }
}