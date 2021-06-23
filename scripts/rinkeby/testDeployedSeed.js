const Seed = artifacts.require('Seed');
const details = require('../../seedDetails.json');
const PrimeToken = artifacts.require("PrimeToken");
const contracts = require('../../contractAddresses.json');
const SeedFactory = artifacts.require('SeedFactory');
const fs = require('fs');

const toAscii = (str1) =>
{
    let hex  = str1.toString();
    let str = '';
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
};

const log = async (seed, fromWei, seedToken, foundInEvent) => {
    const seedDetails = {
        "SoftCap": fromWei((await seed.softCap()).toString(), 'ether'),
        "HardCap": fromWei((await seed.hardCap()).toString(), 'ether'),
        "Seed Amount Req": fromWei((await seed.seedAmountRequired()).toString(),'ether'),
        "Feed Amount Req": fromWei((await seed.feeAmountRequired()).toString(), 'ether'),
        "Price": fromWei((await seed.price()).toString(), 'ether'),
        "StartTime": (await seed.startTime()).toString(),
        "EndTime": (await seed.endTime()).toString(),
        "VestingStartTime": (await seed.vestingStartTime()).toString(),
        "isPermissioned": await seed.permissionedSeed(),
        "Vesting duration": (await seed.vestingDuration()).toString(),
        "Vesting cliff": (await seed.vestingCliff()).toString(),
        "seed token": await seed.seedToken(),
        "funding token": await seed.fundingToken(),
        "fee": (await seed.fee()).toString(),
        "metadata": await seed.metadata(),
        "metadata in utf8": toAscii(await seed.metadata()),
        "admin": await seed.admin(),
        "beneficiary": await seed.beneficiary(),
        "closed": await seed.closed(),
        "paused": await seed.paused(),
        "isFunded": await seed.isFunded(),
        "initialized": await seed.initialized(),
        "minimumReached": await seed.minimumReached(),
        "maximumReached": await seed.maximumReached(),
        "vestingStartTime": (await seed.vestingStartTime()).toString(),
        "totalFunderCount": (await seed.totalFunderCount()).toString(),
        "seedRemainder": (await seed.seedRemainder()).toString(),
        "seedClaimed": (await seed.seedClaimed()).toString(),
        "feeRemainder": (await seed.feeRemainder()).toString(),
        "feeClaimed": (await seed.feeClaimed()).toString(),
        "fundingCollected": (await seed.fundingCollected()).toString(),
        "fundingWithdrawn": (await seed.fundingWithdrawn()).toString(),
        "claimAmount": (await seed.calculateClaim('0xD4717ee259f8736af189F968Dadc6939c1568200')).toString(),
        "seedTokenBalance": (await seedToken.balanceOf(seed.address)).toString(),
        "foundInEvents": foundInEvent
    };
    console.log(seedDetails);
    return seedDetails;
};

module.exports = async (callback) => {
    const { fromWei } = web3.utils;
    const factory = new web3.eth.Contract(SeedFactory.abi, contracts.rinkeby.SeedFactory);
    const events = await factory.getPastEvents('SeedCreated',{fromBlock: 0, toBlock: 'latest'});

    let seedToken = await PrimeToken.at(contracts.rinkeby.PrimeToken);

    if(details?.details == undefined){
        details.details = {};
    }

    console.log("Testing Deployed Seed......");

    for(let i = 0; i < Object.keys(details.rinkeby).length; i++){
        let seed = await Seed.at(details.rinkeby[`seed${i+1}`]);
        console.log(`Seed ${i+1}......${details.rinkeby[`seed${i+1}`]}`);
        const foundInEvent = details.rinkeby[`seed${i+1}`] == events[i].returnValues.newSeed;
        details.details[`seed${i+1}`] = await log(seed, fromWei, seedToken, foundInEvent);
    }

    fs.writeFileSync(
        './seedDetails.json',
        JSON.stringify(details)
    );

    callback();
}