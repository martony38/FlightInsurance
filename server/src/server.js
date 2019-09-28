import Web3 from "web3";
import express from "express";
import FlightSuretyApp from "../../smart-contracts/build/contracts/FlightSuretyApp.json";
import Config from "../config.json";
import Oracle from "./oracle";

const config = Config["localhost"];
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
const flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

// Accounts 1 to 20 are reserved for oracles
const NUMBER_OF_ORACLES = 20;

// Log all OracleRequest events
flightSuretyApp.events.OracleRequest({ fromBlock: 0 }, function(error, event) {
  if (error) console.log(error);
  console.log(event);
});

const instantiateOracles = async () => {
  const accounts = await web3.eth.getAccounts();
  const oracles = Array.from(Array(NUMBER_OF_ORACLES)).map(
    (value, index) => new Oracle(accounts[1 + index], flightSuretyApp)
  );
  for (const oracle of oracles) {
    try {
      await oracle.register();
      console.log(
        `Oracle ${oracle.address} registered. Indexes: ${oracle.indexes}`
      );
    } catch (error) {
      console.log(`Failed to register oracle ${oracle.address}`);
    }
  }
};

instantiateOracles();

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!"
  });
});

export default app;
