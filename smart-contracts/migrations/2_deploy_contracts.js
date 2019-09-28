const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require("fs");

module.exports = function(deployer) {
  deployer.deploy(FlightSuretyData, 3).then(() => {
    return deployer
      .deploy(FlightSuretyApp, FlightSuretyData.address, 3)
      .then(() => {
        let config = {
          localhost: {
            url: "http://localhost:8545",
            dataAddress: FlightSuretyData.address,
            appAddress: FlightSuretyApp.address
          }
        };
        fs.writeFileSync(
          __dirname + "/../../frontend/config.json",
          JSON.stringify(config, null, "\t"),
          "utf-8"
        );
        fs.writeFileSync(
          __dirname + "/../../server/config.json",
          JSON.stringify(config, null, "\t"),
          "utf-8"
        );
      });
  });
};
