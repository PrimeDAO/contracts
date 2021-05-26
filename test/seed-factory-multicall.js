/*global web3, artifacts, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require("chai");
const { constants, time, expectRevert, expectEvent } = require("@openzeppelin/test-helpers");
const helpers = require("./helpers");
const { BN } = require("@openzeppelin/test-helpers/src/setup");
const SeedFactory = artifacts.require("SeedFactory");
const Seed = artifacts.require("Seed");
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

contract("SeedFactory", (accounts) => {
    let setup;
    let dao;
    let admin;
    let seedToken;
    let fundingToken;
    let hardCap;
    let price;
    let startTime;
    let endTime;
    let vestingDuration;
    let vestingCliff;
    let isWhitelisted;
    let fee;
    let softCap;
    let seedFactory;
    let newSeed;
    let metadata;
    let receipt;
    let requiredSeedAmount;
    const pct_base = new BN("1000000000000000000"); // 10**18
    const zero = 0;
    const one = 1;

    context("» creator is avatar", () => {
        before("!! deploy setup", async () => {
            setup = await deploy(accounts);
            dao = accounts[0];
            admin = accounts[1];
            seedToken = setup.tokens.primeToken;
            fundingToken = setup.tokens.erc20s[0];
            hardCap = toWei("100");
            price = toWei("0.01");
            softCap = toWei("100");
            startTime = await time.latest();
            endTime = await startTime.add(await time.duration.days(7));
            vestingDuration = await time.duration.days(365); // 1 year
            vestingCliff = await time.duration.days(90); // 3 months
            isWhitelisted = false;
            fee = 2;
            metadata = `0x`;

            seedFactory = await SeedFactory.new();
            // change to owner as owner
            await seedFactory.initialize(setup.organization.avatar.address, setup.seed.address);
        });

        context("» parameters are valid", () => {
            it("it creates new seed contract", async () => {
                requiredSeedAmount = new BN(hardCap).div(new BN(price)).mul(pct_base);
                // top up admins token balance
                await seedToken.transfer(admin, requiredSeedAmount, { from: setup.root });
                await seedToken.approve(seedFactory.address, requiredSeedAmount, { from: admin });

                const calldata = helpers.encodeDeploySeed(
                    dao,
                    admin,
                    [seedToken.address, fundingToken.address],
                    [softCap, hardCap],
                    price,
                    startTime.toNumber(),
                    endTime.toNumber(),
                    vestingDuration.toNumber(),
                    vestingCliff.toNumber(),
                    isWhitelisted,
                    fee,
                    metadata
                );

                const _tx = await setup.primeDAO.multicallScheme.proposeCalls(
                    [seedFactory.address],
                    [calldata],
                    [0],
                    metadata
                );
                const proposalId = helpers.getNewProposalId(_tx);
                await setup.primeDAO.multicallScheme.voting.absoluteVote.vote(
                    proposalId,
                    one,
                    zero,
                    constants.ZERO_ADDRESS
                );
                const tx = await setup.primeDAO.multicallScheme.execute(proposalId);

                // store data
                setup.data.tx = tx;
                receipt = await expectEvent.inTransaction(setup.data.tx.tx, seedFactory, "SeedCreated");
            });
            it("sets correct seedAmountRequired", async () => {
                newSeed = await Seed.at(await receipt.args[0]);
                expect((await newSeed.seedAmountRequired()).toString()).to.equal(requiredSeedAmount.toString());
            });
            it("reverts: contract already initialized", async () => {
                await expectRevert(
                    seedFactory.initialize(accounts[0], setup.seed.address),
                    "SeedFactory: contract already initialized"
                );
            });
        });
        context("» changeMasterCopy", () => {
            before("!! deploy new seed", async () => {
                newSeed = await Seed.new();
            });
            it("only Owner can change master copy", async () => {
                await expectRevert(
                    seedFactory.changeMasterCopy(newSeed.address, { from: accounts[1] }),
                    "SeedFactory: protected operation"
                );
            });
            it("changes master copy", async () => {
                let newSeed = await Seed.new();
                const calldata = helpers.encodeChangeMasterCopySeed(newSeed.address);
                const _tx = await setup.primeDAO.multicallScheme.proposeCalls(
                    [seedFactory.address],
                    [calldata],
                    [0],
                    metadata
                );
                const proposalId = helpers.getNewProposalId(_tx);
                await setup.primeDAO.multicallScheme.voting.absoluteVote.vote(
                    proposalId,
                    one,
                    zero,
                    constants.ZERO_ADDRESS
                );
                await setup.primeDAO.multicallScheme.execute(proposalId);
                expect(await seedFactory.masterCopy()).to.equal(newSeed.address);
            });
        });
        context("» changeOwner", () => {
            it("only Owner can change owner", async () => {
                await expectRevert(
                    seedFactory.transferOwnership(accounts[2], { from: accounts[1] }),
                    "Ownable: caller is not the owner"
                );
            });
            it("changes owner", async () => {
                const calldata = helpers.encodeTransferOwnership(accounts[0]);
                const _tx = await setup.primeDAO.multicallScheme.proposeCalls(
                    [seedFactory.address],
                    [calldata],
                    [0],
                    metadata
                );
                const proposalId = helpers.getNewProposalId(_tx);
                await setup.primeDAO.multicallScheme.voting.absoluteVote.vote(
                    proposalId,
                    one,
                    zero,
                    constants.ZERO_ADDRESS
                );
                await setup.primeDAO.multicallScheme.execute(proposalId);
                expect(await seedFactory.owner()).to.equal(accounts[0]);
            });
        });
    });
});
