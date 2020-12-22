require('dotenv').config();

const DAOstackMigration = require('@daostack/migration');
const specs = require('./primeDAO.json');
const contracts = require('../../contractAddresses.json');

const migrateDAO = async () => {

  specs.CustomSchemes[0].address = contracts.mainnet.BalancerProxy;
  specs.CustomSchemes[0].params = [contracts.mainnet.ConfigurableRightsPool, contracts.mainnet.BPool];
  specs.CustomSchemes[1].params[2] = contracts.mainnet.BalancerProxy;
  specs.CustomSchemes[2].params[2] = contracts.mainnet.EnsPublicResolver;
  specs.CustomSchemes[3].params[2] = contracts.mainnet.EnsRegistry;

  const options = {
    arcVersion: '0.0.1-rc.44',
    network: process.env.NETWORK,
    provider: process.env.PROVIDER,
    privateKey: '0x'+process.env.KEY,
    customAbisLocation: './build/contracts',
    gasPrice: 25,
    quiet: false,
    force: true,
    restart: true,
    params: {
      mainnet: specs,
    },
  };

  const result = await DAOstackMigration.migrateDAO(options);
  console.log('+ Deployed DAO at ' + result.dao['0.0.1-rc.44'].Avatar);
};

migrateDAO();
