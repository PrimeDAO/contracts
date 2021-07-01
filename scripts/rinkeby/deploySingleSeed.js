/*global web3, artifacts*/
require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const Seed = artifacts.require("Seed");
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');
const seedDetails = require('../../seedDetails.json');
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

        let admin            = "0x8625F29e4d06D0a3998Ed8C9E45F4b04C7b28D00";
        let fundingToken     = [ 
            contracts.rinkeby.WETH
        ];
        let cap              = [ 
            toWei('1')
        ];
        let successMinimum   = [ 
            toWei('1')
        ];
        let price            = [ 
            toWei('4')
        ];
        let startTime        = [ 1625184000 ];
        let endTime          = [ 1625702400 ];
        let vestingDuration  = [ 2 ]; // 1 year
        let vestingCliff     = [ 0 ]; // 3 months
        let permissionedSeed = [ false ];
        let fee              = [ 2 ];
        let metadata         = [
            'QmZiSnPsnam913Xou2ErCXLks4dsB1ZEUitPz7X4BE5a7g'
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
            seedDetails.rinkeby[`seed${i+16+1}`] = await deploySeeds(i);
        }

        fs.writeFileSync(
            './seedDetails.json',
            JSON.stringify(seedDetails)
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
