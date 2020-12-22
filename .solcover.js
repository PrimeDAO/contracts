const shell = require('shelljs');


module.exports = {
  skipFiles: ['utils/test/Import.sol', 'utils/test/ERC20Mock', 'interfaces/IBPool.sol', 'IConfiguarableRightsPool.sol'],
  providerOptions: {
    allowUnlimitedContractSize: true,
    default_balance_ether: 0x1fffffffffffff,
  },
  onCompileComplete: async function(config, deployer) {
    await shell.cp('./build/contracts/BalancerSafeMath.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/BalancerSafeMathMock.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/BFactory.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/BPool.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/ConfigurableRightsPool.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/CRPFactory.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/RightsManager.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/SmartPoolManager.json' , './.coverage_artifacts/contracts')
    await shell.cp('./build/contracts/WETH.json' , './.coverage_artifacts/contracts')
    console.log('---------------------------------------------------------------------')
    console.log('ABIs manually copied to ./.coverage_artifacts/contracts')
    console.log('---------------------------------------------------------------------')
  }
};