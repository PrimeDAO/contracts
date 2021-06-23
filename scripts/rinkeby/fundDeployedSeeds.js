require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const Seed = artifacts.require("Seed");
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');

const fundSeed = async (seedAddress, seedToken) => {
    const seed = await Seed.at(seedAddress);
    const requiredSeed = await seed.seedAmountRequired();
    const requiredFee = await seed.feeAmountRequired();
    const required = requiredSeed.add(requiredFee);
    const seedBalance = await seedToken.balanceOf(seedAddress);
    console.log(`available balance ${await seedToken.balanceOf('0x67BE2C36e75B7439ffc2DCb99dBdF4fbB2455930')}`);
    console.log(`funding seed at ${seedAddress} with ${required}`);
    console.log(required.toString(), seedBalance.toString());
    if((required.sub(seedBalance)).toString() > 0){
        console.log("Not yet funded");
        await seedToken.transfer(seedAddress, required.sub(seedBalance));
    }
};

module.exports = async () => {

    const seedFactory = await SeedFactory.at(contracts.rinkeby.SeedFactory);
    let seedToken = await PrimeToken.at(contracts.rinkeby.PrimeToken);
    const events = await seedFactory.getPastEvents('SeedCreated',{fromBlock: 0, toBlock: 'latest'});
    events.forEach(element => {
        fundSeed(element.returnValues.newSeed, seedToken);
    });

};