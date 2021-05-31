const RightsManager = artifacts.require('RightsManager');
const SmartPoolManager = artifacts.require('SmartPoolManager');
const CRPFactory = artifacts.require('CRPFactory');
const BFactory = artifacts.require('BFactory');
const BalancerSafeMath = artifacts.require('BalancerSafeMath');
const BalancerSafeMathMock = artifacts.require('BalancerSafeMathMock');
const BalancerProxy = artifacts.require('BalancerProxy');
const PrimeToken = artifacts.require('PrimeToken');
const PriceOracle = artifacts.require('PriceOracle');
const StakingRewards = artifacts.require('StakingRewards');
const RepRedeemer = artifacts.require('RepRedeemer');
const SeedFactory = artifacts.require('SeedFactory');
const Seed = artifacts.require('Seed');

const LockingToken4Reputation = artifacts.require('LockingToken4Reputation');

const contracts = require('../contractAddresses.json');
const fs = require("fs");
const primeSupply = 10000000000;

module.exports = async function (deployer, network) {
    const { toWei } = web3.utils;

    console.log(network);

    switch(network) {
    case 'mainnet': 
        await deployToMainnet(deployer);
        break;
    case 'kovan' :
        await deployToKovan(deployer);
        break;
    case 'kovan-fork' :
        await deployToKovan(deployer);
        break;
    case 'rinkeby':
        await deployToRinkeby(deployer);
        break;
    case 'rinkeby-fork':
        await deployToRinkeby(deployer);
        break;
    case 'ganache':
        console.log(network);
        await deployToGanache(deployer);
        break;
    }
};

const deployToMainnet = async (deployer) => {
    await deployer.deploy(StakingRewards);
    await deployer.deploy(PriceOracle);
    await deployer.deploy(LockingToken4Reputation);
    await deployer.deploy(BalancerProxy);
    await deployer.deploy(RepRedeemer);

    contracts.mainnet.StakingRewards = StakingRewards.address;
    contracts.mainnet.PriceOracle = PriceOracle.address;
    contracts.mainnet.LockingToken4Reputation = LockingToken4Reputation.address;
    contracts.mainnet.BalancerProxy = BalancerProxy.address;
    contracts.mainnet.RepRedeemer = RepRedeemer.address;

    // overwrite contranctAddresses.json
    fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
        if (err) throw err;
    });
};

const deployToKovan = async (deployer) => {
    await deployOnTest(deployer, 'kovan');
    saveContractAddress('kovan');

    // overwrite contranctAddresses.json
    fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
        if (err) throw err;
    });
};

const deployToRinkeby = async (deployer) => {
    await deployOnTest(deployer, 'rinkeby');
    saveContractAddress('rinkeby');

    // overwrite contranctAddresses.json
    fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
        if (err) throw err;
    });
};

const deployToGanache = async (deployer) => {
    await deployOnTest(deployer, 'ganache');
    saveContractAddress('ganache');

    // overwrite contranctAddresses.json
    fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
        if (err) throw err;
    });
};

const deployOnTest = async (deployer, network) => {
    await deployer.deploy(PrimeToken, primeSupply, primeSupply, deployer.networks[network].from);
    await deployer.deploy(StakingRewards);
    await deployer.deploy(PriceOracle);
    await deployer.deploy(BalancerProxy);
    await deployer.deploy(RepRedeemer);
    await deployer.deploy(Seed);
    await deployer.deploy(SeedFactory);
    const seedFactory = await SeedFactory.deployed();
    console.log(seedFactory.address);
};

const saveContractAddress = (network) => {
    if(contracts[network] === undefined){
        contracts[network] = {};
    }
    contracts[network].PrimeToken = PrimeToken.address;
    contracts[network].StakingRewards = StakingRewards.address;
    contracts[network].PriceOracle = PriceOracle.address;
    contracts[network].BalancerProxy = BalancerProxy.address;
    contracts[network].RepRedeemer = RepRedeemer.address;
    contracts[network].SeedFactory = SeedFactory.address;
    contracts[network].Seed = Seed.address;
};
