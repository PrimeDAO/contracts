require("dotenv").config();

const DAOstackMigration = require("@daostack/migration");
const specs = require("./primeDAO.json");
const contracts = require("../../contractAddresses.json");
const fs = require('fs');

const migrateDAO = async () => {
    try {
        specs.CustomSchemes[0].params[5] = contracts.rinkeby.PriceOracle;
        specs.CustomSchemes[0].params[6] = "0x0000000000000000000000000000000000000000";

        const options = {
            arcVersion: "0.0.1-rc.44",
            network: process.env.NETWORK,
            provider: process.env.PROVIDER,
            privateKey: "0x" + process.env.KEY,
            customAbisLocation: "./build/contracts",
            gasPrice: 10,
            quiet: false,
            force: true,
            restart: true,
            params: {
                rinkeby: specs,
            },
        };

        const result = await DAOstackMigration.migrateDAO(options);
        contracts.rinkeby.Avatar = result.dao["0.0.1-rc.44"].Avatar;
        console.log("+ Deployed DAO at " + contracts.rinkeby.Avatar);
        // overwrite contranctAddresses.json
        fs.writeFile('./contractAddresses.json', JSON.stringify(contracts), (err) => {
            if (err) throw err;
        });
    } catch (e) {
        console.log(e);
    }
};

migrateDAO();
