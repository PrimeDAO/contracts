/*global web3, artifacts, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const Seed = artifacts.require('Seed');
const { toWei } = web3.utils;

const deploy = async (accounts) => {
    // initialize test setup
    const setup = await helpers.setup.initialize(accounts[0]);
    // deploy ERC20s
    setup.tokens = await helpers.setup.tokens(setup);
    // deploy DAOStack meta-contracts
    setup.DAOStack = await helpers.setup.DAOStack(setup);
    // deploy organization
    setup.organization = await helpers.setup.organization(setup);
    // deploy balancer infrastructure
    setup.balancer = await helpers.setup.balancer(setup);
    // deploy token4rep
    setup.token4rep = await helpers.setup.token4rep(setup);
    // deploy farmFactory
    setup.farmFactory = await helpers.setup.farmFactory(setup);
    // deploy seedFactory
    setup.seedFactory = await helpers.setup.seedFactory(setup);
    // deploy primeDAO
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('Seed', (accounts) => {
    let setup;
    let admin;
    let seedToken;
    let fundingToken;
    let cap;
    let price;
    let startTime;
    let endTime;
    let vestingDuration;
    let vestingCliff;
    let isWhitelisted;

    context('» creator is not avatar', () => {
        before('!! deploy setup', async () => {
            setup = await deploy(accounts);
            admin = accounts[1];
            seedToken = setup.tokens.primeToken;
            fundingToken = setup.tokens.erc20s[0];
            cap = toWei('100');
            price = toWei('0.01');
            startTime  = await time.latest();
            endTime = await startTime.add(await time.duration.days(7));
            vestingDuration = 365; // 1 year
            vestingCliff = 90; // 3 months
            isWhitelisted = true;
        });

        context('» parameters are valid', () => {
            it('it deploys a new seed contract', async () => {
                // deploy new seed contract
                setup.data.seed = await Seed.new(admin, seedToken.address, fundingToken.address, cap, price, startTime, endTime, vestingDuration, vestingCliff, isWhitelisted);
            });
            it('it initializes a seed contract', async () => {
                // top up admins token balance
                await setup.tokens.primeToken.transfer(admin, cap, {from:setup.root});
                await setup.tokens.primeToken.approve(setup.data.seed.address, cap, {from:admin});

                await setup.data.seed.initialize({from:admin});

               expect(await setup.data.seed.closed()).to.equal(false);
               expect(await setup.data.seed.paused()).to.equal(false);
            });
        });
    });
});

