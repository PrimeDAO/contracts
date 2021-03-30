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
    let buyer1;
    let seedToken;
    let fundingToken;
    let successMinimum;
    let price;
    let buyAmount;
    let startTime;
    let endTime;
    let vestingDuration;
    let vestingCliff;
    let isWhitelisted;
    let fee;
    let tx;

    context('» creator is not avatar', () => {
        before('!! deploy setup', async () => {
            setup = await deploy(accounts);
            admin = accounts[1];
            buyer1 = accounts[2];
            seedToken = setup.tokens.primeToken;
            fundingToken = setup.tokens.erc20s[0];
            successMinimum = toWei('100');
            price = toWei('0.01');
            buyAmount = toWei('50');
            startTime  = await time.latest();
            endTime = await startTime.add(await time.duration.days(7));
            vestingDuration = 365; // 1 year
            vestingCliff = 90; // 3 months
            isWhitelisted = false;
            fee = 2;
        });

        context('» parameters are valid', () => {
            it('it deploys a new seed contract', async () => {
                // deploy new seed contract
                setup.data.seed = await Seed.new();
            });
            it('it initializes a seed contract', async () => {
                // emulate initialization via seedfactory & fund with seedTokens
                await seedToken.transfer(setup.data.seed.address, successMinimum, {from:setup.root});

                setup.data.seed.initialize(
                    admin,
                    seedToken.address,
                    fundingToken.address,
                    successMinimum,
                    price,
                    startTime,
                    endTime,
                    vestingDuration,
                    vestingCliff,
                    isWhitelisted,
                    fee
                );

                expect(await setup.data.seed.closed()).to.equal(false);
                expect(await setup.data.seed.paused()).to.equal(false);
            });
            it('it buys tokens ', async () => {
                // top up buyer1 token balance
                await fundingToken.transfer(buyer1, buyAmount, {from:setup.root});
                await fundingToken.approve(setup.data.seed.address, buyAmount, {from:buyer1});

                tx = await setup.data.seed.buy(buyAmount, {from:buyer1});
                setup.data.tx = tx;

                await expectEvent.inTransaction(setup.data.tx.tx, setup.data.seed, 'LockAdded');
                expect((await fundingToken.balanceOf(setup.data.seed.address)).toString()).to.equal(buyAmount);
            });
            it('it fails on withdrawing seed tokens ', async () => {
                await expectRevert(setup.data.seed.claimLock(buyer1), 'Seed: amountVested is 0');
            });
            it('it withdraws tokens after time passes', async () => {
                // increase time
                await time.increase(time.duration.days(91));
                // claim lock
                tx = await setup.data.seed.claimLock(buyer1, {from:buyer1});
                setup.data.tx = tx;

                await expectEvent.inTransaction(setup.data.tx.tx, setup.data.seed, 'TokensClaimed');
            });
        });
    });
});
