const Seed = artifacts.require('Seed');
const contracts = require('../../contractAddresses.json');

const log = async (seed, fromWei, toAscii) => {
    console.log("SoftCap:- ",fromWei((await seed.softCap()).toString()), 'ether');
    console.log("HardCap:- ",fromWei((await seed.hardCap()).toString()), 'ether');
    console.log("Seed Amount Req:- ",fromWei((await seed.seedAmountRequired()).toString(),'ether'));
    console.log("Feed Amount Req:- ",fromWei((await seed.feeAmountRequired()).toString()), 'ether');
    console.log("Price:- ",fromWei((await seed.price()).toString()), 'ether');
    console.log("StartTime:- ",(await seed.startTime()).toString());
    console.log("EndTime:- ",(await seed.endTime()).toString());
    console.log("isPermissioned:- ",await seed.permissionedSeed());
    console.log("Vesting duration:- ",(await seed.vestingDuration()).toString());
    console.log("Vesting cliff:- ",(await seed.vestingCliff()).toString());
    console.log("seed token:- ",await seed.seedToken());
    console.log("funding token:- ",await seed.fundingToken());
    console.log("fee:- ",(await seed.fee()).toString());
    console.log("metadata:- ",await seed.metadata());
    console.log("metadata in utf8:- ",toAscii(await seed.metadata()));
    console.log("admin:- ",await seed.admin());
    console.log("beneficiary:- ",await seed.beneficiary());
    console.log("\n");
};

module.exports = async (callback) => {
    const { fromWei, hexToAscii } = web3.utils;

    console.log("Testing Deployed Seed 1......");
    let seed = await Seed.at(contracts.rinkeby.seed1);
    console.log("Seed 1......");
    await log(seed, fromWei, hexToAscii);
    seed = await Seed.at(contracts.rinkeby.seed2);
    console.log("Seed 2......");
    await log(seed, fromWei, hexToAscii);
    seed = await Seed.at(contracts.rinkeby.seed3);
    console.log("Seed 3......");
    await log(seed, fromWei, hexToAscii);
    seed = await Seed.at(contracts.rinkeby.seed4);
    console.log("Seed 4......");
    await log(seed, fromWei, hexToAscii);
    seed = await Seed.at(contracts.rinkeby.seed5);
    console.log("Seed 5......");
    await log(seed, fromWei, hexToAscii);

    callback();
}