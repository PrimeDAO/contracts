/*global web3, contract, before, it, context, artifacts*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { /*constants,*/ time, expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
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
    let buyer2;
    let seedToken;
    let fundingToken;
    let successMinimum;
    let cap;
    let price;
    let buyAmount;
    let smallBuyAmount;
    let startTime;
    let endTime;
    let vestingDuration;
    let vestingCliff;
    let isWhitelisted;
    let fee;
    let seed;
    let metadata;
    const pct_base = new BN('1000000000000000000'); // 10**18

    context('» creator is avatar', () => {
        before('!! deploy setup', async () => {
            setup = await deploy(accounts);
            admin = accounts[1];
            buyer1 = accounts[2];
            buyer2 = accounts[3];
            seedToken = setup.tokens.primeToken;
            fundingToken = setup.tokens.erc20s[0];
            successMinimum = toWei('10');
            cap = toWei('102');
            price = toWei('0.01');
            buyAmount = toWei('5000');
            smallBuyAmount = toWei('918');
            startTime  = await time.latest();
            endTime = await startTime.add(await time.duration.days(7));
            vestingDuration = 365; // 1 year
            vestingCliff = 90; // 3 months
            isWhitelisted = false;
            fee = 2;
            metadata = `0x`;
        });
        context('» contract is not initialized yet', () => {
            context('» parameters are valid', () => {
                it('it initializes seed', async () => {
                    // emulate creation & initialization via seedfactory & fund with seedTokens
                    await seedToken.transfer(setup.seed.address, (new BN(cap,10)).div(new BN(price,10)).mul(new BN(pct_base,10)), {from:setup.root});

                    await setup.seed.initialize(
                        setup.organization.avatar.address,
                        admin,
                        [seedToken.address, fundingToken.address],
                        [successMinimum,cap],
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
                    expect((await seedToken.balanceOf(setup.seed.address)).toString()).to
                        .equal(((new BN(cap,10)).div(new BN(price,10)).mul(new BN(pct_base,10))).toString());
                });
                it('it reverts on double initialization', async () => {
                    await expectRevert(
                        setup.seed.initialize(
                            setup.organization.avatar.address,
                            admin,
                            [seedToken.address, fundingToken.address],
                            [successMinimum,cap],
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
                before('!! top up buyer1 balance', async () => {
                    await fundingToken.transfer(buyer1, buyAmount, {from:setup.root});
                    await fundingToken.approve(setup.seed.address, buyAmount, {from:buyer1});
                });
                it('it buys tokens ', async () => {
                    let tx = await setup.seed.buy(buyAmount, {from:buyer1});
                    setup.data.tx = tx;
                    await expectEvent.inTransaction(setup.data.tx.tx, setup.seed, 'LockAdded');
                    expect((await fundingToken.balanceOf(setup.seed.address)).toString()).to
                        .equal(((buyAmount*price/pct_base) + (fee * (buyAmount*price/pct_base)/100)).toString());
                });
                it('updates fee mapping for locker', async () => {
                    expect((await setup.seed.getFee(buyer1)).toString()).to.equal(toWei('100'));
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
                    expect((await seedToken.balanceOf(setup.organization.avatar.address)).toString()).to
                        .equal(toWei('100'));
                });
            });
        });
        context('# buyBack', () => {
            context('» generics', () => {
                before('!! deploy new contract + top up buyer balance', async () => {
                    setup.data.seed = await Seed.new();
                    await setup.data.seed.initialize(
                        setup.organization.avatar.address,
                        admin,
                        [seedToken.address, fundingToken.address],
                        [successMinimum,cap],
                        price,
                        startTime,
                        endTime,
                        vestingDuration,
                        vestingCliff,
                        isWhitelisted,
                        fee
                    );

                    await seedToken.transfer(setup.data.seed.address, (new BN(cap,10)).div(new BN(price,10)).mul(new BN(pct_base,10)), {from:setup.root});
                    await fundingToken.transfer(buyer2, (new BN(smallBuyAmount,10)).mul(new BN(price,10)).div(new BN(pct_base,10)), {from:setup.root});
                    await fundingToken.approve(setup.data.seed.address, (new BN(smallBuyAmount,10)).mul(new BN(price,10)).div(new BN(pct_base,10)), {from:buyer2});
                });
                it('returns funding tokens to buyer', async () => {
                    await setup.data.seed.buy(toWei('900'), {from:buyer2});
                    expect((await fundingToken.balanceOf(buyer2)).toString()).to.equal('0');

                    let tx = await setup.data.seed.buyBack({from:buyer2});
                    setup.data.tx = tx;

                    expectEvent.inTransaction(setup.data.tx.tx, setup.data.seed, 'FundingReclaimed');
                    expect((await fundingToken.balanceOf(buyer2)).toString()).to
                        .equal(((new BN(smallBuyAmount,10)).mul(new BN(price,10)).div(new BN(pct_base,10))).toString());
                });
                it('clears `fee` mapping', async () => {
                    expect((await setup.data.seed.getFee(buyer2)).toString()).to.equal('0');
                });
                it('clears `tokenLock.amount`', async () => {
                    expect((await setup.data.seed.getSeedAmount(buyer2)).toString()).to.equal('0');
                });
                it('cannot be called once funding minimum is reached', async () => {
                    await fundingToken.transfer(buyer2, toWei('10.2'), {from:setup.root});
                    await fundingToken.approve(setup.data.seed.address, toWei('10.2'), {from:buyer2});
                    await setup.data.seed.buy(toWei('1000'), {from:buyer2});
                    await expectRevert(
                        setup.data.seed.buyBack({from:buyer2}),
                        "Seed: minimum already met"
                    );
                });
            });
        });
        context('# close', () => {
            context('» generics', () => {
                before('!! deploy new contract + top up buyer balance', async () => {
                    setup.data.seed = await Seed.new();
                    setup.data.seed.initialize(
                        setup.organization.avatar.address,
                        admin,
                        [seedToken.address, fundingToken.address],
                        [successMinimum,cap],
                        price,
                        startTime,
                        endTime,
                        vestingDuration,
                        vestingCliff,
                        isWhitelisted,
                        fee
                    );
                    await fundingToken.transfer(buyer2, smallBuyAmount, {from:setup.root});
                    await fundingToken.approve(setup.data.seed.address, smallBuyAmount, {from:buyer2});
                });
                it('can only be called by admin', async () => {
                    await expectRevert(
                        setup.data.seed.close(),
                        "Seed: caller should be admin"
                    );
                });
                it('transfers all tokens to the admin', async () => {
                    let ftBalance = await fundingToken.balanceOf(setup.data.seed.address);
                    let stBalance = await seedToken.balanceOf(setup.data.seed.address);
                    await setup.data.seed.close({from:admin});
                    expect((await fundingToken.balanceOf(admin)).toString()).to.equal(ftBalance.toString());
                    expect((await seedToken.balanceOf(admin)).toString()).to.equal(stBalance.toString());
                });
            });
        });
        context('# getter functions', () => {
            context('» checkWhitelisted', () => {
                it('returns correct bool', async () => {
                    // default false - contract not whitelist contract
                    expect(await setup.seed.checkWhitelisted(buyer1)).to.equal(false);
                });
            });
            context('» getAmount', () => {
                it('returns correct amount', async () => {
                    expect((await setup.seed.getSeedAmount(buyer1)).toString()).to.equal((buyAmount).toString());
                });
            });
            context('» getDaysClaimed', () => {
                it('returns correct claimed', async () => {
                    expect((await setup.seed.getDaysClaimed(buyer1)).toString()).to.equal('91');
                });
            });
            context('» getTotalClaimed', () => {
                it('returns correct claimed', async () => {
                    expect((await setup.seed.getDaysClaimed(buyer1)).toString()).to.equal('91');
                });
            });
            context('» getFee', () => {
                it('returns correct fee', async () => {
                    let a = new BN(buyAmount);
                    let f = new BN(2);
                    let amountMinusFee = new BN(a.mul(f).div(new BN(100)));
                    expect((await setup.seed.getFee(buyer1)).toString()).to.equal(amountMinusFee.toString());
                });
            });
        });
        context('# admin functions', () => {
            context('» update metadata', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.updateMetadata(metadata), 'Seed: contract should not be initialized or caller should be admin');
                });
                it('updates metadata', async () => {
                    let tx = await setup.seed.updateMetadata(metadata, {from:admin});
                    setup.data.tx = tx;

                    await expectEvent.inTransaction(setup.data.tx.tx, setup.seed, 'MetadataUpdated');
                });
            });
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
                it('reverts: can only be called on whitelisted contract', async () => {
                    await expectRevert(setup.seed.whitelist(buyer1,{from:admin}), 'Seed: module is not whitelisted');
                });
            });
            context('» whitelist', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.whitelist(buyer1), 'Seed: caller should be admin');
                });
                it('reverts: can only be called on whitelisted contract', async () => {
                    await expectRevert(setup.seed.whitelist(buyer1,{from:admin}), 'Seed: module is not whitelisted');
                });
            });
            context('» withdraw', () => {
                before('!! deploy new contract', async () => {
                    setup.data.seed = await Seed.new();
                    setup.data.seed.initialize(
                        setup.organization.avatar.address,
                        admin,
                        [seedToken.address, fundingToken.address],
                        [successMinimum,cap],
                        price,
                        startTime,
                        endTime,
                        vestingDuration,
                        vestingCliff,
                        isWhitelisted,
                        fee
                    );

                    await seedToken.transfer(setup.data.seed.address, (new BN(cap,10)).div(new BN(price,10)).mul(new BN(pct_base,10)), {from:setup.root});
                    await fundingToken.transfer(buyer2, buyAmount, {from:setup.root});
                    await fundingToken.approve(setup.data.seed.address, buyAmount, {from:buyer2});
                });
                it('can only be called after minumum funding amount is met', async () => {
                    await expectRevert(
                        setup.data.seed.withdraw({from:admin}),
                        "Seed: minimum funding amount not met"
                    );
                    await setup.data.seed.buy(buyAmount, {from:buyer2});
                    let ftBalance = await fundingToken.balanceOf(setup.data.seed.address);
                    await setup.data.seed.withdraw({from:admin});
                    expect((await fundingToken.balanceOf(setup.data.seed.address)).toString()).to.equal('0');
                    expect((await fundingToken.balanceOf(admin)).toString()).to.equal(ftBalance.toString());
                });
                it('can only be called by admin', async () => {
                    await expectRevert(setup.seed.withdraw(), 'Seed: caller should be admin');
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
            successMinimum = toWei('10');
            cap = toWei('102');
            price = toWei('0.01');
            buyAmount = toWei('5000');
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
                    seed = await Seed.new();
                });
                it('initializes', async () => {

                    // emulate creation & initialization via seedfactory & fund with seedTokens
                    await seedToken.transfer(seed.address, (new BN(cap,10)).div(new BN(price,10)).mul(new BN(pct_base,10)), {from:setup.root});

                    await seed.initialize(
                        setup.organization.avatar.address,
                        admin,
                        [seedToken.address, fundingToken.address],
                        [successMinimum,cap],
                        price,
                        startTime,
                        endTime,
                        vestingDuration,
                        vestingCliff,
                        isWhitelisted,
                        fee
                    );

                    expect(await seed.initialized()).to.equal(true);
                    expect(await seed.beneficiary()).to.equal(setup.organization.avatar.address);
                    expect(await seed.admin()).to.equal(admin);
                    expect(await seed.seedToken()).to.equal(seedToken.address);
                    expect(await seed.fundingToken()).to.equal(fundingToken.address);
                    expect((await seed.successMinimum()).toString()).to.equal(successMinimum);
                    expect((await seed.price()).toString()).to.equal(price);
                    expect(await seed.isWhitelisted()).to.equal(isWhitelisted);
                    expect((await seed.fee()).toString()).to.equal(fee.toString());
                    expect(await seed.closed()).to.equal(false);
                    expect((await seedToken.balanceOf(seed.address)).toString()).to.equal((new BN(cap,10)).div(new BN(price,10)).mul(new BN(pct_base,10)).toString());

                });
                it('it reverts on double initialization', async () => {
                    await expectRevert(
                        seed.initialize(
                            setup.organization.avatar.address,
                            admin,
                            [seedToken.address, fundingToken.address],
                            [successMinimum,cap],
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
        context('# admin whitelist functions', () => {
            context('» whitelist', () => {
                it('adds a user to the whitelist', async () => {
                    expect(await seed.checkWhitelisted(buyer1)).to.equal(false);
                    await seed.whitelist(buyer1,{from:admin});
                    expect(await seed.checkWhitelisted(buyer1)).to.equal(true);
                });
            });
            context('» unwhitelist', () => {
                it('removes a user from the whitelist', async () => {
                    expect(await seed.checkWhitelisted(buyer1)).to.equal(true);
                    await seed.unwhitelist(buyer1,{from:admin});
                    expect(await seed.checkWhitelisted(buyer1)).to.equal(false);
                });
            });
            context('» whitelistBatch', () => {
                it('can only be called by admin', async () => {
                    await expectRevert(
                        seed.whitelistBatch([buyer1, buyer2]),
                        "Seed: caller should be admin"
                    );
                });
                it('adds users to the whitelist', async () => {
                    expect(await seed.checkWhitelisted(accounts[4])).to.equal(false);
                    expect(await seed.checkWhitelisted(accounts[5])).to.equal(false);
                    await seed.whitelistBatch([accounts[4], accounts[5]],{from:admin});
                    expect(await seed.checkWhitelisted(accounts[4])).to.equal(true);
                    expect(await seed.checkWhitelisted(accounts[5])).to.equal(true);
                });
            });
        });
        context('# cap', () => {
            context('» check cap', () => {
                it('cannot buy more than cap', async () => {
                    await fundingToken.transfer(buyer2, toWei('102'), {from:setup.root});
                    await fundingToken.approve(seed.address, toWei('102'), {from:buyer2});
                    await seed.whitelist(buyer2,{from:admin});
                    await seed.buy(toWei('9900'),{from:buyer2});
                    await expectRevert(
                        seed.buy(toWei('200'),{from:buyer2}),
                        "Seed: amount exceeds contract sale cap"
                    );
                });
            });
        });
    });
});
