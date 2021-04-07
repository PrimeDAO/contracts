/*global web3, artifacts*/
require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');
const fs = require("fs");
const { toWei } = web3.utils;
const { time } = require('@openzeppelin/test-helpers');

module.exports = async function(callback) {

    try {

        let admin           = process.env.ACCOUNT;
        let fundingToken    = [ contracts.kovan.WETH, contracts.kovan.DAI, contracts.kovan.WETH, contracts.kovan.DAI, contracts.kovan.WETH ];
        let cap             = [ toWei('100'), toWei('100'), toWei('150'), toWei('300'), toWei('200') ];
        let price           = [ toWei('0.01'), toWei('0.04'), toWei('0.02'), toWei('0.03'), toWei('0.01') ];
        let successMinimum  = [ toWei('20'), toWei('20'), toWei('70'), toWei('200'), toWei('50') ];
        let startTime       = await time.latest();
        let endTime         = [ await startTime.add(await time.duration.days(7)), await startTime.add(await time.duration.days(7)), await startTime.add(await time.duration.days(7)), await startTime.add(await time.duration.days(5)), await startTime.add(await time.duration.days(10)) ];
        let vestingDuration = [ 365, 400, 365, 185, 365 ]; // 1 year
        let vestingCliff    = [ 90, 95, 80, 60, 120 ]; // 3 months
        let isWhitelisted   = [ false, false, true, true, false ];
        let fee             = [ 2, 2, 1, 5, 2 ];

        // make sure you deploy with a load of test funds!!
        console.log('***   deploying 5 Seeds');

        let seedFactory = await SeedFactory.at(contracts.kovan.SeedFactory);
        let seedToken = await PrimeToken.at(contracts.kovan.PrimeToken)

        await seedToken.approve(SeedFactory.address, cap[0]);
        let seedAddress1 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[0],
            [successMinimum[0],cap[0]],
            price[0],
            startTime[0].toNumber(),
            endTime[0].toNumber(),
            vestingDuration[0],
            vestingCliff[0],
            isWhitelisted[0],
            fee[0]
        );
        console.log("deployed seed at " + seedAddress1);

        await seedToken.approve(SeedFactory.address, cap[1]);
        let seedAddress2 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[1],
            [successMinimum[1],cap[1]],
            price[1],
            startTime[1].toNumber(),
            endTime[1].toNumber(),
            vestingDuration[1],
            vestingCliff[1],
            isWhitelisted[1],
            fee[1]
        );
        console.log("deployed seed at " + seedAddress2);

        await seedToken.approve(SeedFactory.address, cap[2]);
        let seedAddress3 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[2],
            [successMinimum[2],cap[2]],
            price[2],
            startTime[2].toNumber(),
            endTime[2].toNumber(),
            vestingDuration[2],
            vestingCliff[2],
            isWhitelisted[2],
            fee[2]
        );
        console.log("deployed seed at " + seedAddress3);

        await seedToken.approve(SeedFactory.address, cap[3]);
        let seedAddress4 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[3],
            [successMinimum[3],cap[3]],
            price[3],
            startTime[3].toNumber(),
            endTime[3].toNumber(),
            vestingDuration[3],
            vestingCliff[3],
            isWhitelisted[3],
            fee[3]
        );
        console.log("deployed seed at " + seedAddress4);

        await seedToken.approve(SeedFactory.address, cap[4]);
        let seedAddress5 = await seedFactory.deploySeed(
            admin,
            contracts.kovan.PrimeToken,
            fundingToken[4],
            [successMinimum[4],cap[4]],
            price[4],
            startTime[4].toNumber(),
            endTime[4].toNumber(),
            vestingDuration[4],
            vestingCliff[4],
            isWhitelisted[4],
            fee[4]
        );
        console.log("deployed seed at " + seedAddress5);

        contracts.kovan.Seed1 = seedAddress1;
        contracts.kovan.Seed2 = seedAddress2;
        contracts.kovan.Seed3 = seedAddress3;
        contracts.kovan.Seed4 = seedAddress4;
        contracts.kovan.Seed5 = seedAddress5;

        fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
            if (err) throw err;
        });

        await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
}
