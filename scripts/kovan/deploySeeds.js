/*global web3, artifacts*/
require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const Seed = artifacts.require("Seed");
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');
const { toWei } = web3.utils;

module.exports = async function(callback) {

    try {

        // make sure you deploy with a load of test funds!
        // console.log('***   deploying 5 Seeds');

        let seedFactory = await SeedFactory.at(contracts.kovan.SeedFactory);
        let seedToken = await PrimeToken.at(contracts.kovan.PrimeToken);

        let now = 1618225542; //Mon Apr 12 2021 11:05:42 GMT+0000
        let oneDay = 86400;
        let twoDays = 172800;
        let fourDays = 345600;
        let sevenDays = 604800;
        let nineDays = 777600;

        let admin           = process.env.ACCOUNT;
        let fundingToken    = [ contracts.kovan.WETH, contracts.kovan.DAI, contracts.kovan.WETH, contracts.kovan.DAI, contracts.kovan.WETH ];
        let cap             = [ toWei('100'), toWei('100'), toWei('150'), toWei('300'), toWei('200') ];
        let price           = [ toWei('0.01'), toWei('0.04'), toWei('0.02'), toWei('0.03'), toWei('0.01') ];
        let successMinimum  = [ toWei('20'), toWei('20'), toWei('70'), toWei('200'), toWei('50') ];
        let startTime       = [ now + oneDay, now + twoDays, now + fourDays,  now + sevenDays, now + nineDays ];
        let endTime         = [ startTime[0] + sevenDays,  startTime[1] + sevenDays, startTime[2] + sevenDays, startTime[3] + nineDays, startTime[4] + twoDays ];
        let vestingDuration = [ 365, 400, 365, 185, 365 ]; // 1 year
        let vestingCliff    = [ 90, 95, 80, 60, 120 ]; // 3 months
        let isWhitelisted   = [ false, false, true, true, false ];
        let fee             = [ 2, 2, 1, 5, 2 ];

        await seedToken.approve(seedFactory.address, cap[0]);
        let seedAddress1 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[0],
            [successMinimum[0],cap[0]],
            price[0],
            startTime[0],
            endTime[0],
            vestingDuration[0],
            vestingCliff[0],
            isWhitelisted[0],
            fee[0]
        );
        console.log("deployed seed at " + seedAddress1.logs[0].args.newSeed);
        // check dates properly deployed 
        // let seed = await Seed.at((seedAddress1.logs[0].args.newSeed).toString());
        // let seedStart = await seed.startTime();
        // let seedEnd = await seed.endTime();
        // let start = new Date((seedStart.toNumber())*1000).toLocaleDateString("en-GB"); // *1000 because of how JS deals with unix timestamps
        // let end = new Date((seedEnd.toNumber())*1000).toLocaleDateString("en-GB");
        // console.log("seed starttime: " + start + ". seed endTime: " + end);

        await seedToken.approve(seedFactory.address, cap[1]);
        let seedAddress2 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[1],
            [successMinimum[1],cap[1]],
            price[1],
            startTime[1],
            endTime[1],
            vestingDuration[1],
            vestingCliff[1],
            isWhitelisted[1],
            fee[1]
        );
        console.log("deployed seed at " + seedAddress2.logs[0].args.newSeed);
        let seed2 = await Seed.at((seedAddress2.logs[0].args.newSeed).toString());
        let seedStart2 = await seedEnd2.startTime();
        let seedEnd2 = await seed2.endTime();
        let start2 = new Date((seedStart2.toNumber())*1000).toLocaleDateString("en-GB");
        let end2 = new Date((seedEnd2.toNumber())*1000).toLocaleDateString("en-GB");
        console.log("seed starttime: " + start2 + ". seed endTime: " + end2);

        await seedToken.approve(seedFactory.address, cap[2]);
        let seedAddress3 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[2],
            [successMinimum[2],cap[2]],
            price[2],
            startTime[2],
            endTime[2],
            vestingDuration[2],
            vestingCliff[2],
            isWhitelisted[2],
            fee[2]
        );
        console.log("deployed seed at " + seedAddress3.logs[0].args.newSeed);

        await seedToken.approve(seedFactory.address, cap[3]);
        let seedAddress4 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[3],
            [successMinimum[3],cap[3]],
            price[3],
            startTime[3],
            endTime[3],
            vestingDuration[3],
            vestingCliff[3],
            isWhitelisted[3],
            fee[3]
        );
        console.log("deployed seed at " + seedAddress4.logs[0].args.newSeed);

        await seedToken.approve(seedFactory.address, cap[4]);
        let seedAddress5 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[4],
            [successMinimum[4],cap[4]],
            price[4],
            startTime[4],
            endTime[4],
            vestingDuration[4],
            vestingCliff[4],
            isWhitelisted[4],
            fee[4]
        );
        console.log("deployed seed at " + seedAddress5.logs[0].args.newSeed);

        await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
}
