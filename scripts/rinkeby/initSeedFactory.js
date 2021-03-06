require('dotenv').config();
const SeedFactory = artifacts.require("SeedFactory");
const contracts = require('../../contractAddresses.json');
const fs = require("fs");

module.exports = async function(callback) {

    try {

        console.log('***   initializing SeedFactory');

        let seedFactory = await SeedFactory.at(contracts.rinkeby.SeedFactory);
        await seedFactory.setMasterCopy(
            contracts.rinkeby.Seed
        );
        await console.log("***   Success");

    } catch(error){

        await console.log(error);

    }
    callback();
};
