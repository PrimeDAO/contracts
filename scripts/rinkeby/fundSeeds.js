require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const Seed = artifacts.require("Seed");
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');
const { toWei, toHex, BN } = web3.utils;
const fs = require('fs');

const pct_base = new BN("1000000000000000000"); // 10**18

const calculateRequiredSeed = (cap, fee, price) => {
    console.log(cap,fee, price);
    const requiredSeed = new BN(cap).mul(pct_base).div(new BN(price));
    const requiredFee = requiredSeed.mul(new BN(fee)).div(new BN(100));
    return requiredSeed.add(requiredFee);
};

const fund = (cap, fee, price, seedToken) => async (address, index) => {
    const amount = calculateRequiredSeed(cap[index], fee[index], price[index]);
    const seedBalance = await seedToken.balanceOf(address);
    console.log(`available balance ${await seedToken.balanceOf('0x67BE2C36e75B7439ffc2DCb99dBdF4fbB2455930')}`);
    console.log(`funding seed at ${address} with ${amount}`);
    console.log(amount.toString(), seedBalance.toString());
    if((amount.sub(seedBalance)).toString() > 0){
        console.log("Not yet funded");
        await seedToken.transfer(address, amount.sub(seedBalance));
    }
};

const checkBalance = (token) => async (address) => {
    console.log(`Balance of ${address} is ${await token.balanceOf(address)}`);
};

module.exports = async function(callback) {
    try {

        // make sure you deploy with a load of test funds!
        // console.log('***   deploying 5 Seeds');
        let seedToken = await PrimeToken.at(contracts.rinkeby.PrimeToken);

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
        let price = [ 
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
        let fee = [ 2, 2, 1, 5, 2, 2, 2, 2, 2, 2  ];
        
        const fundSeed = fund(cap, fee, price, seedToken);
        const logBalance = checkBalance(seedToken);

        await logBalance('0x67be2c36e75b7439ffc2dcb99dbdf4fbb2455930'); 

        await fundSeed(contracts.rinkeby.seed1, 0);
        await fundSeed(contracts.rinkeby.seed2, 1);
        await fundSeed(contracts.rinkeby.seed3, 2);
        await fundSeed(contracts.rinkeby.seed4, 3);
        await fundSeed(contracts.rinkeby.seed5, 4);
        await fundSeed(contracts.rinkeby.seed6, 5);
        await fundSeed(contracts.rinkeby.seed7, 6);
        await fundSeed(contracts.rinkeby.seed8, 7);
        await fundSeed(contracts.rinkeby.seed9, 8);
        await fundSeed(contracts.rinkeby.seed10, 9);

        await logBalance(contracts.rinkeby.seed1);
        await logBalance(contracts.rinkeby.seed2);
        await logBalance(contracts.rinkeby.seed3);
        await logBalance(contracts.rinkeby.seed4);
        await logBalance(contracts.rinkeby.seed5);
        await logBalance(contracts.rinkeby.seed6);
        await logBalance(contracts.rinkeby.seed7);
        await logBalance(contracts.rinkeby.seed8);
        await logBalance(contracts.rinkeby.seed9);
        await logBalance(contracts.rinkeby.seed10);

        await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
};