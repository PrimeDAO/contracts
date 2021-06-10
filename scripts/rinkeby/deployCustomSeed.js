/*global web3, artifacts*/
require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const Seed = artifacts.require("Seed");
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');
const { toWei, toHex } = web3.utils;
const fs = require('fs');

module.exports = async function(callback) {

    try {

        // make sure you deploy with a load of test funds!
        // console.log('***   deploying 5 Seeds');

        let seedFactory = await SeedFactory.at(contracts.rinkeby.SeedFactory);
        let seedToken = await PrimeToken.at(contracts.rinkeby.PrimeToken);

        let now = Math.floor((Date.now())/1000); //Now
        let oneDay = 86400;
        let twoDays = 172800;
        let fourDays = 345600;
        let sevenDays = 604800;
        let nineDays = 777600;

        let admin            = process.env.ACCOUNT;
        let fundingToken     = [ 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI, 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI, 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI, 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI, 
            contracts.rinkeby.WETH, 
            contracts.rinkeby.DAI 
        ];
        let cap              = [ 
            toWei('4'),
            toWei('900'), 
            toWei('0.00002'), 
            toWei('999999999999999'), 
            toWei('1'), 
            toWei('1'), 
            toWei('99999999999999999999999999999999999'),
            toWei('1'),
            toWei('1'),
            toWei('1.2'),
        ];
        let successMinimum   = [ 
            toWei('2'), 
            toWei('100'), 
            toWei('0.00001'), 
            toWei('9999'), 
            toWei('1'), 
            toWei('1'), 
            toWei('0.0000000000000009'),
            toWei('1'),
            toWei('0.5'),
            toWei('0.2')
        ];
        let price            = [ 
            toWei('1.5'), 
            toWei('100'), 
            toWei('0.001'), 
            toWei('11111'), 
            toWei('1000000000000000000000000000'), 
            toWei('1'), 
            toWei('0.000000000000009'),
            toWei('1'),
            toWei('0.1'),
            toWei('0.05')
        ];
        let startTime        = [ 1622585775, 1628197200, 1622581200,  1622581200, 1622764800, 1622818800, 1625356800, 1623196800, 1623196800, 1623196800 ];
        let endTime          = [ 1622586615,  1646352000, 1625000400, 1627678800, 1622764860, 1625356800, 1628035200, 1625011200, 1623283200, 1623369600 ];
        let vestingDuration  = [ 360, 20, 0.01, 1000, 2, 1000, 20, 0.2, 0.2, 0.2 ]; // 1 year
        let vestingCliff     = [ 22, 1, 0.001, 10, 1, 1, 2, 0.1, 0.1, 0.05 ]; // 3 months
        let permissionedSeed = [ false, false, false, false, false, false, false, false, false, false ];
        let fee              = [ 2, 2, 1, 5, 2, 2, 2, 2, 2, 2  ];
        let metadata         = [
            'QmRCtyCWKnJTtTCy1RTXte8pY8vV58SU8YtAC9oa24C4Qg', 
            'QmVX6kpZR7d1ci7pKQ9RZTqGbcCWjC3NcmKyCqB1XsEyDz', 
            'QmNnJ6UEpDZE7v5CkuQrw5EQYBBF7wetBqbofPqofb3eMs', 
            'Qmcrp5BaafvZUt8ETtwM11Uuv7wxAMcnR5JqiTEnrZF5P5', 
            'QmYsn3FoDgqVHybrFvWe7b1EuVmdAyeBGuHn4tFjSY4ywc',
            'QmbT9nMP1gTLr5NB295sBP5Z6YGhm577Tw3pY7YKVhLkZR',
            'QmbGsQPUGZ2E9ENf73HqJsSnsgXJZwojA1eSDxbqb8WQaH',
            'QmTpihoquASwUsV19TJDtu2YqABzKaQNkevyJYfEbydduM',
            'QmTD6GN5WBUuwTgHipK9iyAvX9QFZxsHJg3PotwNHP3tji',
            'QmRNJRmSK7evutmys2yHythvb97hgCfvFcAk5gLE2DX55J'
        ];

        const deploySeeds = deploy(
            seedFactory, 
            contracts, 
            admin, 
            fundingToken, 
            successMinimum, 
            cap, 
            price, 
            startTime, 
            endTime, 
            vestingDuration, 
            vestingCliff, 
            permissionedSeed, 
            fee, 
            metadata);

        console.log("Deployment Started.......");
        
        for(let i = 0; i<metadata.length;i++){
            // await seedToken.approve(seedFactory.address, cap[i]);
            contracts.rinkeby[`seed${i+1}`] = await deploySeeds(i);
        }

        fs.writeFileSync(
            './contractAddresses.json',
            JSON.stringify(contracts)
        );

        await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
};

const deploy = (seedFactory, 
    contracts, 
    admin, 
    fundingToken, 
    successMinimum, 
    cap, 
    price, 
    startTime, 
    endTime, 
    vestingDuration, 
    vestingCliff, 
    permissionedSeed, 
    fee, 
    metadata) => async (index) => {
    console.log(`Seed ${index+1} to be deployed`);
    let oneDay = 86400;
    let seedAddress = await seedFactory.deploySeed(
        contracts.rinkeby.Avatar,
        admin,
        [contracts.rinkeby.PrimeToken,fundingToken[index]],
        [successMinimum[index],cap[index]],
        price[index],
        startTime[index],
        endTime[index],
        Math.floor(vestingDuration[index]*oneDay),
        Math.floor(vestingCliff[index]*oneDay),
        permissionedSeed[index],
        fee[index],
        toHex(metadata[index])
    );
    console.log("deployed seed at " + seedAddress.logs[0].args.newSeed);
    let seed = await Seed.at((seedAddress.logs[0].args.newSeed).toString());
    let seedStart = await seed.startTime();
    let seedEnd = await seed.endTime();
    let start = new Date((seedStart.toNumber())*1000).toLocaleDateString("en-GB");
    let end = new Date((seedEnd.toNumber())*1000).toLocaleDateString("en-GB");
    console.log("seed starttime: " + start + ". seed endTime: " + end);
    return seedAddress.logs[0].args.newSeed;
};
