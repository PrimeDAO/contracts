const SeedFactory = artifacts.require("SeedFactory");
const contracts = require('../../contractAddresses.json');
const fs = require("fs");

module.exports = async function(callback) {

    try {

        console.log('***   initializing SeedFactory');

        let seedFactory = await SeedFactory.at(contracts.kovan.SeedFactory);
        await seedFactory.initialize(
            contracts.kovan.Avatar,
            contracts.kovan.Seed
        );
        await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
}
