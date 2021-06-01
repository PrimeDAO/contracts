/*global web3, artifacts*/
require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const Seed = artifacts.require("Seed");
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');
const { toWei } = web3.utils;
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

        let admin           = process.env.ACCOUNT;
        let fundingToken    = [ contracts.rinkeby.WETH, contracts.rinkeby.DAI, contracts.rinkeby.WETH, contracts.rinkeby.DAI, contracts.rinkeby.WETH ];
        let cap             = [ toWei('100'), toWei('100'), toWei('150'), toWei('300'), toWei('200') ];
        let price           = [ toWei('0.01'), toWei('0.04'), toWei('0.02'), toWei('0.03'), toWei('0.01') ];
        let successMinimum  = [ toWei('20'), toWei('20'), toWei('70'), toWei('200'), toWei('50') ];
        let startTime       = [ now + oneDay, now + twoDays, now + fourDays,  now + sevenDays, now + nineDays ];
        let endTime         = [ startTime[0] + sevenDays,  startTime[1] + sevenDays, startTime[2] + sevenDays, startTime[3] + nineDays, startTime[4] + twoDays ];
        let vestingDuration = [ 365, 400, 365, 185, 365 ]; // 1 year
        let vestingCliff    = [ 90, 95, 80, 60, 120 ]; // 3 months
        let isWhitelisted   = [ false, false, true, true, false ];
        let fee             = [ 2, 2, 1, 5, 2 ];
        let metadata        = `0x`;
        

        await seedToken.approve(seedFactory.address, cap[0]);
        let seedAddress1 = await seedFactory.deploySeed(
            contracts.rinkeby.Avatar,
            admin,
            [contracts.rinkeby.PrimeToken, fundingToken[0]],
            [successMinimum[0],cap[0]],
            price[0],
            startTime[0],
            endTime[0],
            vestingDuration[0],
            vestingCliff[0],
            isWhitelisted[0],
            fee[0],
            metadata
        );
        console.log("deployed seed at " + seedAddress1.logs[0].args.newSeed);
        contracts.rinkeby.seed1 = seedAddress1.logs[0].args.newSeed;
        let seed1 = await Seed.at((seedAddress1.logs[0].args.newSeed).toString());
        let seedStart1 = await seed1.startTime();
        let seedEnd1 = await seed1.endTime();
        let start1 = new Date((seedStart1.toNumber())*1000).toLocaleDateString("en-GB");
        let end1 = new Date((seedEnd1.toNumber())*1000).toLocaleDateString("en-GB");
        console.log("seed starttime: " + start1 + ". seed endTime: " + end1);

        await seedToken.approve(seedFactory.address, cap[1]);
        let seedAddress2 = await seedFactory.deploySeed(
            contracts.rinkeby.Avatar,
            admin,
            [contracts.rinkeby.PrimeToken,fundingToken[1]],
            [successMinimum[1],cap[1]],
            price[1],
            startTime[1],
            endTime[1],
            vestingDuration[1],
            vestingCliff[1],
            isWhitelisted[1],
            fee[1],
            metadata
        );
        console.log("deployed seed at " + seedAddress2.logs[0].args.newSeed);
        contracts.rinkeby.seed2 = seedAddress2.logs[0].args.newSeed;
        let seed2 = await Seed.at((seedAddress2.logs[0].args.newSeed).toString());
        let seedStart2 = await seed2.startTime();
        let seedEnd2 = await seed2.endTime();
        let start2 = new Date((seedStart2.toNumber())*1000).toLocaleDateString("en-GB");
        let end2 = new Date((seedEnd2.toNumber())*1000).toLocaleDateString("en-GB");
        console.log("seed starttime: " + start2 + ". seed endTime: " + end2);

        await seedToken.approve(seedFactory.address, cap[2]);
        let seedAddress3 = await seedFactory.deploySeed(
            contracts.rinkeby.Avatar,
            admin,
            [contracts.rinkeby.PrimeToken, fundingToken[2]],
            [successMinimum[2],cap[2]],
            price[2],
            startTime[2],
            endTime[2],
            vestingDuration[2],
            vestingCliff[2],
            isWhitelisted[2],
            fee[2],
            metadata
        );
        console.log("deployed seed at " + seedAddress3.logs[0].args.newSeed);
        contracts.rinkeby.seed3 = seedAddress3.logs[0].args.newSeed;
        let seed3 = await Seed.at((seedAddress3.logs[0].args.newSeed).toString());
        let seedStart3 = await seed3.startTime();
        let seedEnd3 = await seed3.endTime();
        let start3 = new Date((seedStart3.toNumber())*1000).toLocaleDateString("en-GB");
        let end3 = new Date((seedEnd3.toNumber())*1000).toLocaleDateString("en-GB");
        console.log("seed starttime: " + start3 + ". seed endTime: " + end3);

        await seedToken.approve(seedFactory.address, cap[3]);
        let seedAddress4 = await seedFactory.deploySeed(
            contracts.rinkeby.Avatar,
            admin,
            [contracts.rinkeby.PrimeToken,fundingToken[3]],
            [successMinimum[3],cap[3]],
            price[3],
            startTime[3],
            endTime[3],
            vestingDuration[3],
            vestingCliff[3],
            isWhitelisted[3],
            fee[3],
            metadata
        );
        console.log("deployed seed at " + seedAddress4.logs[0].args.newSeed);
        contracts.rinkeby.seed4 = seedAddress4.logs[0].args.newSeed;
        let seed4 = await Seed.at((seedAddress4.logs[0].args.newSeed).toString());
        let seedStart4 = await seed4.startTime();
        let seedEnd4 = await seed4.endTime();
        let start4 = new Date((seedStart4.toNumber())*1000).toLocaleDateString("en-GB");
        let end4 = new Date((seedEnd4.toNumber())*1000).toLocaleDateString("en-GB");
        console.log("seed starttime: " + start4 + ". seed endTime: " + end4);

        await seedToken.approve(seedFactory.address, cap[4]);
        let seedAddress5 = await seedFactory.deploySeed(
            contracts.rinkeby.Avatar,
            admin,
            [contracts.rinkeby.PrimeToken,fundingToken[4]],
            [successMinimum[4],cap[4]],
            price[4],
            startTime[4],
            endTime[4],
            vestingDuration[4],
            vestingCliff[4],
            isWhitelisted[4],
            fee[4],
            metadata
        );
        console.log("deployed seed at " + seedAddress5.logs[0].args.newSeed);
        contracts.rinkeby.seed5 = seedAddress5.logs[0].args.newSeed;
        let seed5 = await Seed.at((seedAddress5.logs[0].args.newSeed).toString());
        let seedStart5 = await seed5.startTime();
        let seedEnd5 = await seed5.endTime();
        let start5 = new Date((seedStart5.toNumber())*1000).toLocaleDateString("en-GB");
        let end5 = new Date((seedEnd5.toNumber())*1000).toLocaleDateString("en-GB");
        console.log("seed starttime: " + start5 + ". seed endTime: " + end5);

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
