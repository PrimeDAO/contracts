/*global web3, artifacts, contract, before, it, context*/
/*eslint no-undef: "error"*/

// const { expect } = require('chai');
const { /*constants,*/ time, /*expectRevert,*/ expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const SeedFactory = artifacts.require('SeedFactory');
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
    setup.seed = await helpers.setup.seed(setup);
    // deploy seedFactory
    setup.seedFactory = await helpers.setup.seedFactory(setup);
    // deploy primeDAO
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('SeedFactory', (accounts) => {
    let tx;
    let setup;
    let admin;
    let seedToken;
    let fundingToken;
    // let cap;
    let price;
    let startTime;
    let endTime;
    let vestingDuration;
    let vestingCliff;
    let isWhitelisted;
    let fee;
    let successMinimum;
    let seedFactory;

    context('» creator is avatar', () => {
        before('!! deploy setup', async () => {
            setup = await deploy(accounts);
            admin = accounts[1];
            seedToken = setup.tokens.primeToken;
            fundingToken = setup.tokens.erc20s[0];
            // cap = toWei('100');
            price = toWei('0.01');
            successMinimum = toWei('100');
            startTime  = await time.latest();
            endTime = await startTime.add(await time.duration.days(7));
            vestingDuration = 365; // 1 year
            vestingCliff = 90; // 3 months
            isWhitelisted = false;
            fee = 2;

            seedFactory = await SeedFactory.new();
            await seedFactory.initialize(accounts[0], setup.seed.address);
        });

        context('» parameters are valid', () => {
            it('it creates new seed contract', async () => {
                // top up admins token balance
                await seedToken.transfer(admin, successMinimum, {from:setup.root});
                await seedToken.approve(seedFactory.address, successMinimum, {from:admin});

                tx = await seedFactory.deploySeed(
                    admin,
                    seedToken.address,
                    fundingToken.address,
                    successMinimum,
                    price,
                    startTime.toNumber(),
                    endTime.toNumber(),
                    vestingDuration,
                    vestingCliff,
                    isWhitelisted,
                    fee
                );

                // store data
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, seedFactory, 'SeedCreated');
            });
        });
    });
});
