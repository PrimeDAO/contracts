const { toWei } = web3.utils;
const contracts = require('../../contractAddresses.json');

module.exports = {
    extreme: {
        "fundingToken"     : [ 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI, 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI
        ],
        "cap"              : [ 
            toWei('4'),
            toWei('900'), 
            toWei('0.00002'), 
            toWei('999999999999999'), 
            toWei('1')
        ],
        "successMinimum"   : [ 
            toWei('2'), 
            toWei('100'), 
            toWei('0.00001'), 
            toWei('9999'), 
            toWei('1')
        ],
        "price"            : [ 
            toWei('1.5'), 
            toWei('100'), 
            toWei('0.001'), 
            toWei('11111')
        ],
        "startTime"        : [ 1622585775, 1628197200, 1622581200,  1622581200],
        "endTime"          : [ 1622586615,  1646352000, 1625000400, 1627678800],
        "vestingDuration"  : [ 360, 20, 0.01, 1000], // 1 year
        "vestingCliff"     : [ 22, 1, 0.001, 10, 1], // 3 months
        "permissionedSeed" : [ false, false, false, false],
        "fee"              : [ 2, 2, 1, 5],
        "metadata"         : [
            'QmRCtyCWKnJTtTCy1RTXte8pY8vV58SU8YtAC9oa24C4Qg', 
            'QmVX6kpZR7d1ci7pKQ9RZTqGbcCWjC3NcmKyCqB1XsEyDz', 
            'QmNnJ6UEpDZE7v5CkuQrw5EQYBBF7wetBqbofPqofb3eMs', 
            'Qmcrp5BaafvZUt8ETtwM11Uuv7wxAMcnR5JqiTEnrZF5P5'
        ],
    },
    valid: {
        "fundingToken"     : [
            contracts.rinkeby.DAI, 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI 
        ],
        "cap"              : [
            toWei('1'),
            toWei('1'),
            toWei('1.2'),
        ],
        "successMinimum"   : [
            toWei('1'),
            toWei('0.5'),
            toWei('0.2')
        ],
        "price"            : [
            toWei('1'),
            toWei('0.1'),
            toWei('0.05')
        ],
        "startTime"        : [ 1623196800, 1623196800, 1623196800 ],
        "endTime"          : [ 1625011200, 1623283200, 1623369600 ],
        "vestingDuration"  : [ 0.2, 0.2, 0.2 ], // 1 year
        "vestingCliff"     : [ 0.1, 0.1, 0.05 ], // 3 months
        "permissionedSeed" : [ false, false, false ],
        "fee"              : [ 2, 2, 2  ],
        "metadata"         : [
            'QmTpihoquASwUsV19TJDtu2YqABzKaQNkevyJYfEbydduM',
            'QmTD6GN5WBUuwTgHipK9iyAvX9QFZxsHJg3PotwNHP3tji',
            'QmRNJRmSK7evutmys2yHythvb97hgCfvFcAk5gLE2DX55J'
        ],
    },
    notFunded: {
        "fundingToken"     : [ 
            contracts.rinkeby.WETH
        ],
        "cap"              : [
            toWei('99999999999999999999999999999999999')
        ],
        "successMinimum"   : [
            toWei('0.0000000000000009')
        ],
        "price"            : [
            toWei('0.000000000000009')
        ],
        "startTime"        : [ 1625356800 ],
        "endTime"          : [ 1628035200 ],
        "vestingDuration"  : [ 20 ], // 1 year
        "vestingCliff"     : [ 2], // 3 months
        "permissionedSeed" : [ false ],
        "fee"              : [ 2 ],
        "metadata"         : [
            'QmbGsQPUGZ2E9ENf73HqJsSnsgXJZwojA1eSDxbqb8WQaH'
        ],
    },
    notInitialised: {
        "fundingToken"     : [
            contracts.rinkeby.DAI
        ],
        "cap"              : [
            toWei('1')
        ],
        "successMinimum"   : [ 
            toWei('1')
        ],
        "price"            : [ 
            toWei('1')
        ],
        "startTime"        : [ 1622818800 ],
        "endTime"          : [ 1625356800 ],
        "vestingDuration"  : [ 1000 ], // 1 year
        "vestingCliff"     : [ 1 ], // 3 months
        "permissionedSeed" : [ false ],
        "fee"              : [ 2 ],
        "metadata"         : [
            'QmbT9nMP1gTLr5NB295sBP5Z6YGhm577Tw3pY7YKVhLkZR'
        ],
    },
    noMetadata: {
        "fundingToken"     : [
            contracts.rinkeby.WETH
        ],
        "cap"              : [
            toWei('1')
        ],
        "successMinimum"   : [ 
            toWei('1')
        ],
        "price"            : [ 
            toWei('1000000000000000000000000000')
        ],
        "startTime"        : [ 1622764800 ],
        "endTime"          : [ 1622764860 ],
        "vestingDuration"  : [ 2 ], // 1 year
        "vestingCliff"     : [ 1 ], // 3 months
        "permissionedSeed" : [ false ],
        "fee"              : [ 2 ],
        "metadata"         : [ 
            'QmYsn3FoDgqVHybrFvWe7b1EuVmdAyeBGuHn4tFjSY4ywc'
        ],
    }
};