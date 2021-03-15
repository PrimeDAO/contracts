/*global web3, artifacts, contract, before, it, context*/
/*eslint no-undef: "error"*/

const { expect } = require('chai');
const { constants, expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
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
    setup.seedFactory = await helpers.setup.seedFactory(setup);
    // deploy primeDAO
    setup.primeDAO = await helpers.setup.primeDAO(setup);

    return setup;
};

contract('SeedFactory', (accounts) => {

    context('» do nothing', () => {
        context('» avatar parameter is not valid', () => {
            it('it is ok', async () => {
                await expect(true).to.equal(true);
            });
        });
    });


});

