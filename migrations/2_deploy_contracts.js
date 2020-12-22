const RightsManager = artifacts.require('RightsManager');
const SmartPoolManager = artifacts.require('SmartPoolManager');
const CRPFactory = artifacts.require('CRPFactory');
const BFactory = artifacts.require('BFactory');
const BalancerSafeMath = artifacts.require('BalancerSafeMath');
const BalancerSafeMathMock = artifacts.require('BalancerSafeMathMock');
const BalancerProxy = artifacts.require('BalancerProxy');
const PrimeToken = artifacts.require('PrimeToken');
const PriceOracle = artifacts.require('PriceOracle');
const VestingFactory = artifacts.require('VestingFactory');

const StakingRewards = artifacts.require('StakingRewards');

const contracts = require('../contractAddresses.json');
const fs = require("fs");

module.exports = async function (deployer, network) {
    const { toWei } = web3.utils;

    if (network === 'mainnet') {

        await deployer.deploy(StakingRewards);
        await deployer.deploy(PriceOracle);
        await deployer.deploy(BalancerProxy);
        await deployer.deploy(VestingFactory);

        contracts.mainnet.StakingRewards = StakingRewards.address;
        contracts.mainnet.PriceOracle = PriceOracle.address;
        contracts.mainnet.BalancerProxy = BalancerProxy.address;
        contracts.mainnet.VestingFactory = VestingFactory.address;

        // overwrite contranctAddresses.json
        fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
           if (err) throw err;
         });

    } else if (network === 'kovan') {

        await deployer.deploy(PrimeToken, primeSupply, primeSupply, deployer.networks.kovan.from);
        await deployer.deploy(StakingRewards);
        await deployer.deploy(PriceOracle);
        await deployer.deploy(BalancerProxy);
        await deployer.deploy(VestingFactory);

        contracts.kovan.PrimeToken = PrimeToken.address;
        contracts.kovan.StakingRewards = StakingRewards.address;
        contracts.kovan.PriceOracle = PriceOracle.address;
        contracts.kovan.BalancerProxy = BalancerProxy.address;
        contracts.kovan.VestingFactory = VestingFactory.address;

        // overwrite contranctAddresses.json
        fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
           if (err) throw err;
         });
    }
};
