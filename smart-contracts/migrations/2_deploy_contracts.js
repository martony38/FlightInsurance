const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

module.exports = function(deployer) {
  deployer.deploy(FlightSuretyData, 3).then(() => {
    return deployer
      .deploy(FlightSuretyApp, FlightSuretyData.address, 3)
      .then(() => {
        let networkConfig = {
          development: {
            url: "http://localhost:8545",
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address,
            oraclesNumber: 20,
            airlinesNumber: 5,
            adminsNumber: 3
          },
          test: {
            url: "http://localhost:8545",
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address,
            oraclesNumber: 20,
            airlinesNumber: 5,
            adminsNumber: 3
          }
        };
        fs.writeFileSync(
          __dirname + "/../../frontend/config/ethereum-networks.json",
          JSON.stringify(networkConfig, null, "\t"),
          "utf-8"
        );
        fs.writeFileSync(
          __dirname + "/../../server/config.json",
          JSON.stringify(networkConfig, null, "\t"),
          "utf-8"
        );
      });
  });
};
