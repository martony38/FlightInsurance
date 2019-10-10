import Web3 from "web3";
import express from "express";
import cors from "cors";
import FlightSuretyApp from "../../smart-contracts/build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../smart-contracts/build/contracts/FlightSuretyData.json";
import Config from "../config.json";
import Oracle from "./oracle";
import generateFlights from "./flights";

const config = Config["development"];

// Use websocket to be able to subscribe to events
// https://stackoverflow.com/questions/48173304/web3-eth-subscribe-not-implemented-for-web3-version-1-0-0-beta-27
const web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);

const {
  oraclesNumber,
  airlinesNumber,
  adminsNumber,
  appAddress,
  dataAddress
} = config;

const flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, appAddress);
const flightSuretyData = new web3.eth.Contract(
  FlightSuretyData.abi,
  dataAddress
);

// Log all OracleRequest events
flightSuretyApp.events.OracleRequest({ fromBlock: 0 }, function(error, event) {
  if (error) console.log(error);
  console.log(event);
});

let accounts, airlines, passengers, admins;
let mockFlights, mockAddress;

const init = async () => {
  accounts = await web3.eth.getAccounts();

  airlines = accounts.slice(
    oraclesNumber + 1,
    oraclesNumber + 1 + airlinesNumber
  );
  admins = accounts.slice(
    oraclesNumber + 1 + airlinesNumber,
    oraclesNumber + 1 + airlinesNumber + adminsNumber
  );
  passengers = accounts.slice(
    oraclesNumber + 1 + airlinesNumber + adminsNumber
  );

  // authorize app contract to send transactions to data contract
  await flightSuretyData.methods
    .authorizeContract(appAddress)
    .send({ from: accounts[0] });

  // instantiateOracles();
  const oracles = Array.from(Array(oraclesNumber)).map(
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

  ({ flights: mockFlights, airlines: mockAddress } = generateFlights(airlines));
};

init();

const app = express();
app.use(cors());
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!"
  });
});
app.get("/api/flights", async (req, res) => {
  res.send(JSON.stringify({ flights: mockFlights, airlines: mockAddress }));
});
app.get("/api/passengers", (req, res) => {
  res.send(JSON.stringify(passengers));
});
app.get("/api/admins", (req, res) => {
  res.send(JSON.stringify(admins));
});

export default app;
