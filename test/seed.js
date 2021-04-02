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
    // deploy seed
    setup.seed = await helpers.setup.seed();
    // deploy primeDAO
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('Seed', (accounts) => {
    let setup;
    let admin;
    let buyer1;
    let buyerNotWhitelisted;
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

    context('» creator is avatar', () => {
        before('!! deploy setup', async () => {
            setup = await deploy(accounts);
            admin = accounts[1];
            buyer1 = accounts[2];
            buyerNotWhitelisted = accounts[3];
            seedToken = setup.tokens.primeToken;
            fundingToken = setup.tokens.erc20s[0];
            successMinimum = toWei('10');
            price = toWei('0.01');
            buyAmount = toWei('50');
            startTime  = await time.latest();
            endTime = await startTime.add(await time.duration.days(7));
            vestingDuration = 365; // 1 year
            vestingCliff = 90; // 3 months
            isWhitelisted = false;
            fee = 2;
        });
        context('» contract is not initialized yet', () => {
            context('» parameters are valid', () => {
                it('it initializes seed', async () => {
                    // emulate creation & initialization via seedfactory & fund with seedTokens
                    await seedToken.transfer(setup.seed.address, successMinimum, {from:setup.root});

                    await setup.seed.initialize(
                        setup.organization.avatar.address,
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

                    expect(await setup.seed.initialized()).to.equal(true);
                    expect(await setup.seed.beneficiary()).to.equal(setup.organization.avatar.address);
                    expect(await setup.seed.admin()).to.equal(admin);
                    expect(await setup.seed.seedToken()).to.equal(seedToken.address);
                    expect(await setup.seed.fundingToken()).to.equal(fundingToken.address);
                    expect((await setup.seed.successMinimum()).toString()).to.equal(successMinimum);
                    expect((await setup.seed.price()).toString()).to.equal(price);
                    expect(await setup.seed.isWhitelisted()).to.equal(isWhitelisted);
                    expect((await setup.seed.fee()).toString()).to.equal(fee.toString());
                    expect(await setup.seed.closed()).to.equal(false);
                    expect((await seedToken.balanceOf(setup.seed.address)).toString()).to.equal(successMinimum);

                });
                it('it reverts on double initialization', async () => {
                    await expectRevert(
                        setup.seed.initialize(
                            setup.organization.avatar.address,
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
                        ),
                        'Seed: contract already initialized'
                    );
                });
            });
        });
        context('# buy', () => {
            context('» generics', () => {
                before('!! top up buyer1 balance & whitelist buyer', async () => {
                    await fundingToken.transfer(buyer1, buyAmount, {from:setup.root});
                    await fundingToken.approve(setup.seed.address, buyAmount, {from:buyer1});
                    // await setup.seed.whitelist(buyer1,{from:admin});
                });
                it('it buys tokens ', async () => {
                    let tx = await setup.seed.buy(buyAmount, {from:buyer1});
                    setup.data.tx = tx;

                    await expectEvent.inTransaction(setup.data.tx.tx, setup.seed, 'LockAdded');
                    expect((await fundingToken.balanceOf(setup.seed.address)).toString()).to.equal(buyAmount);
                });
                it('updates fee mapping for locker', async () => {
                    expect((await setup.seed.getFee(buyer1)).toString()).to.equal(toWei('1')); // check why this isn't 2
                });
            });
        });
        context('# claimLock', () => {
            context('» generics', () => {
                it('it fails on withdrawing seed tokens if not vested for enough time', async () => {
                    await expectRevert(setup.seed.claimLock(buyer1), 'Seed: amountVested is 0');
                });
                it('it withdraws tokens after time passes', async () => {
                    // increase time
                    await time.increase(time.duration.days(91));
                    // claim lock
                    let tx = await setup.seed.claimLock(buyer1, {from:buyer1});
                    setup.data.tx = tx;

                    await expectEvent.inTransaction(setup.data.tx.tx, setup.seed, 'TokensClaimed', {
                        recipient: buyer1
                    });
                });
                it('funds dao with fee', async () => {
                    expect((await seedToken.balanceOf(setup.organization.avatar.address)).toString()).to.equal(toWei('1')); // check why this isn't 2
                });
            });
        });
        context.skip('# getter functions', () => {
            context('» checkWhitelisted', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getStartTime', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getAmount', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getVestingDuration', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getVestingCliff', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getDaysClaimed', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getTotalClaimed', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getRecipient', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
            context('» getFee', () => {
                it('returns correct bool', async () => {
                    //
                });
            });
        });
        context('# admin functions', () => {
            context('» pause', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.pause(), 'Seed: caller should be admin');
                });
                it('pauses contract', async () => {
                    await setup.seed.pause({from:admin});
                    expect(await setup.seed.paused()).to.equal(true);
                });
            });
            context('» unpause', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.unpause(), 'Seed: caller should be admin');
                });
                it('unpauses contract', async () => {
                    await setup.seed.unpause({from:admin});
                    expect(await setup.seed.paused()).to.equal(false);
                });
            });
            context('» unwhitelist', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.unwhitelist(buyer1), 'Seed: caller should be admin');
                });
                // it('removes a user from the whitelist', async () => {
                //     expect(await setup.seed.checkWhitelisted(buyer1)).to.equal(true);
                //     await setup.seed.unwhitelist(buyer1);
                //     expect(await setup.seed.checkWhitelisted(buyer1)).to.equal(false);
                // });
                // move to non-whitelisted context
                it('reverts: can only be called on whitelisted contract', async () => {
                    await expectRevert(setup.seed.whitelist(buyer1,{from:admin}), 'Seed: module is not whitelisted');
                });
            });
            context('» whitelist', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.whitelist(buyer1), 'Seed: caller should be admin');
                });
                // it.skip('adds a user to the whitelist', async () => {
                //     expect(await setup.seed.checkWhitelisted(buyer1)).to.equal(false);
                //     await setup.seed.whitelist(buyer1);
                //     expect(await setup.seed.checkWhitelisted(buyer1)).to.equal(true);
                // });
                // move to non-whitelisted context
                it('reverts: can only be called on whitelisted contract', async () => {
                    await expectRevert(setup.seed.whitelist(buyer1,{from:admin}), 'Seed: module is not whitelisted');
                });
            });
            context('» withdraw', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.withdraw(), 'Seed: caller should be admin');
                });
                it('withdraws funding tokens from contract', async () => {
                    let ftBalance = await fundingToken.balanceOf(setup.seed.address);
                    await setup.seed.withdraw({from:admin});
                    expect((await fundingToken.balanceOf(setup.seed.address)).toString()).to.equal('0');
                    expect((await fundingToken.balanceOf(admin)).toString()).to.equal(ftBalance.toString());
                });
            });
        });
    });
    context('creator is avatar -- whitelisted contract', () => {
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
            isWhitelisted = true;
            fee = 2;
        });
        context('» contract is not initialized yet', () => {
            context('» parameters are valid', () => {
                before('!! deploy new contract', async () => {
                    //
                });
                it.skip('initializes', async () => {

                    // init()

                    expect(await setup.seed.initialized()).to.equal(true);
                    expect(await setup.seed.dao()).to.equal(setup.organization.avatar.address);
                    expect(await setup.seed.admin()).to.equal(admin);
                    expect(await setup.seed.seedToken()).to.equal(seedToken.address);
                    expect(await setup.seed.fundingToken()).to.equal(fundingToken.address);
                    expect((await setup.seed.successMinimum()).toString()).to.equal(successMinimum);
                    expect((await setup.seed.price()).toString()).to.equal(price);
                    expect(await setup.seed.isWhitelisted()).to.equal(isWhitelisted);
                    expect((await setup.seed.fee()).toString()).to.equal(fee.toString());
                    expect(await setup.seed.closed()).to.equal(false);
                    expect((await seedToken.balanceOf(setup.seed.address)).toString()).to.equal(successMinimum);

                });
                it.skip('it reverts on double initialization', async () => {
                    await expectRevert(
                        setup.seed.initialize(
                            setup.organization.avatar.address,
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
                        ),
                        'Seed: contract already initialized'
                    );
                });
            });
        });
    });
});
