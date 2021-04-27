/*global web3, artifacts, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, time, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const helpers = require('./helpers');
const SeedFactory = artifacts.require('SeedFactory');
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
    setup.seed = await helpers.setup.seed(setup);
    // deploy seedFactory
    setup.seedFactory = await helpers.setup.seedFactory(setup);
    // deploy primeDAO
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('SeedFactory', (accounts) => {
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
    let fee;
    let successMinimum;
    let seedFactory;
    let newSeed;
    let metadata;

    context('» creator is avatar', () => {
        before('!! deploy setup', async () => {
            setup = await deploy(accounts);
            admin = accounts[1];
            seedToken = setup.tokens.primeToken;
            fundingToken = setup.tokens.erc20s[0];
            cap = toWei('100');
            price = toWei('0.01');
            successMinimum = toWei('100');
            startTime  = await time.latest();
            endTime = await startTime.add(await time.duration.days(7));
            vestingDuration = 365; // 1 year
            vestingCliff = 90; // 3 months
            isWhitelisted = false;
            fee = 2;
            metadata = `0x`;

            seedFactory = await SeedFactory.new();
            // change to avatar as avatar
            await seedFactory.initialize(setup.organization.avatar.address, setup.seed.address);
        });

        context('» parameters are valid', () => {
            it('it creates new seed contract', async () => {
                // top up admins token balance
                await seedToken.transfer(admin, successMinimum, {from:setup.root});
                await seedToken.approve(seedFactory.address, successMinimum, {from:admin});

                const calldata = helpers.encodeDeploySeed(
                    admin,
                    [seedToken.address, fundingToken.address],
                    [successMinimum,cap],
                    price,
                    startTime.toNumber(),
                    endTime.toNumber(),
                    vestingDuration,
                    vestingCliff,
                    isWhitelisted,
                    fee,
                    metadata
                );

                const _tx = await setup.primeDAO.multicallScheme.proposeCalls([seedFactory.address],[calldata], [0], metadata);
                const proposalId = helpers.getNewProposalId(_tx);
                await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                const tx = await setup.primeDAO.multicallScheme.execute(proposalId);


                // store data
                setup.data.tx = tx;
                await expectEvent.inTransaction(setup.data.tx.tx, seedFactory, 'SeedCreated');
            });
            it('reverts: contract already initialized', async () => {
                await expectRevert(
                    seedFactory.initialize(accounts[0], setup.seed.address),
                    "SeedFactory: contract already initialized"
                );
            });
        });
        context('» changeParent', () => {
            before('!! deploy new seed', async () => {
                newSeed = await Seed.new();
            });
            it('only Avatar can change parent', async () => {
                await expectRevert(
                    seedFactory.changeParent(newSeed.address,{from:accounts[1]}),
                    "SeedFactory: protected operation"
                );
            });
            it('changes parent', async () => {
                let newSeed = await Seed.new();
                const calldata = helpers.encodeChangeParentSeed(newSeed.address);
                const _tx = await setup.primeDAO.multicallScheme.proposeCalls([seedFactory.address],[calldata], [0], metadata);
                const proposalId = helpers.getNewProposalId(_tx);
                await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                await setup.primeDAO.multicallScheme.execute(proposalId);
                expect(await seedFactory.parent()).to.equal(newSeed.address);
            });
        });
        context('» changeAvatar', () => {
            it('only Avatar can change avatar', async () => {
                await expectRevert(
                    seedFactory.changeAvatar(accounts[2],{from:accounts[1]}),
                    "SeedFactory: protected operation"
                );
            });
            it('changes avatar', async () => {
                const calldata = helpers.encodeChangeAvatar(accounts[0]);
                const _tx = await setup.primeDAO.multicallScheme.proposeCalls([seedFactory.address],[calldata], [0], metadata);
                const proposalId = helpers.getNewProposalId(_tx);
                await  setup.primeDAO.multicallScheme.voting.absoluteVote.vote(proposalId, 1, 0, constants.ZERO_ADDRESS);
                await setup.primeDAO.multicallScheme.execute(proposalId);
                expect(await seedFactory.avatar()).to.equal(accounts[0]);
            });
        });
    });
});
