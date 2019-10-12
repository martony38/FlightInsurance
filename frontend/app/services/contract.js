import Service from "@ember/service";
import Web3 from "web3";
import ENV from "frontend/config/environment";
import { tracked } from "@glimmer/tracking";

export default class ContractService extends Service {
  @tracked ready = false;
  @tracked owner = null;
  airlines = [];
  passengers = [];

  constructor() {
    super(...arguments);

    const { network, appContract, dataContract } = ENV.APP;
    // Use websocket to be able to subscribe to events
    // https://stackoverflow.com/questions/48173304/web3-eth-subscribe-not-implemented-for-web3-version-1-0-0-beta-27
    this.web3 = new Web3(
      new Web3.providers.WebsocketProvider(network.url.replace("http", "ws"))
    );
    //this.web3 = new Web3(new Web3.providers.HttpProvider(network.url));
    this.appContract = new this.web3.eth.Contract(
      appContract.abi,
      network.appAddress
    );
    this.dataContract = new this.web3.eth.Contract(
      dataContract.abi,
      network.dataAddress
    );
    this.initialize();
  }

  async initialize() {
    const accounts = await this.web3.eth.getAccounts();
    const {
      network: { oraclesNumber, airlinesNumber }
    } = ENV.APP;

    this.owner = accounts[0];
    this.airlines = accounts.slice(
      oraclesNumber + 1,
      oraclesNumber + 1 + airlinesNumber
    );
    this.passengers = accounts.slice(oraclesNumber + 1 + airlinesNumber);
    this.ready = true;
  }

  getFlightKey(flight) {
    const {
      airline: { address },
      number,
      timestamp
    } = flight;
    const key = this.web3.utils.hexToBytes(
      this.web3.utils.soliditySha3(address, number, timestamp)
    );

    return key;
  }

  async sendTx(method, params, opts) {
    // Estimate gas cost of transaction then set the gas limit to 1.1 that
    // amount.
    const estimatedGas = await method(...params).estimateGas(opts);
    return await method(...params).send({ ...opts, gas: estimatedGas });
  }

  async isPaused() {
    return await this.appContract.methods.paused().call({ from: this.owner });
  }

  async fetchFlightStatus(flight) {
    const {
      airline: { address },
      number,
      timestamp
    } = flight;

    return await this.appContract.methods
      .fetchFlightStatus(address, number, timestamp)
      .send({ from: this.owner });
  }

  async purchaseInsurance(flight, passenger, amount) {
    const { purchaseInsurance } = this.appContract.methods;

    const key = this.getFlightKey(flight);

    return await this.sendTx(purchaseInsurance, [key], {
      from: passenger,
      value: this.web3.utils.toWei(amount.toString())
    });
  }

  async addAirline(from, newAirline) {
    const { addAirline } = this.appContract.methods;
    return await this.sendTx(addAirline, [newAirline], { from });
  }

  async registerFlight(flight) {
    const {
      airline: { address },
      number,
      timestamp
    } = flight;
    const { registerFlight } = this.appContract.methods;

    return await this.sendTx(registerFlight, [number, timestamp], {
      from: address
    });
  }

  async fund(from, amount) {
    const { fund } = this.appContract.methods;
    return await this.sendTx(fund, [], {
      from,
      value: this.web3.utils.toWei(amount.toString())
    });
  }

  async pauseAppContract(from) {
    const { pause } = this.appContract.methods;
    return await this.sendTx(pause, [], { from });
  }
  async unpauseAppContract(from) {
    const { unpause } = this.appContract.methods;
    return await this.sendTx(unpause, [], { from });
  }
  async pauseDataContract(from) {
    const { pause } = this.dataContract.methods;
    return await this.sendTx(pause, [], { from });
  }
  async unpauseDataContract(from) {
    const { unpause } = this.dataContract.methods;
    return await this.sendTx(unpause, [], { from });
  }

  async addDataAdmin(newPauser) {
    const { addPauser } = this.dataContract.methods;
    return await this.sendTx(addPauser, [newPauser], { from: this.owner });
  }
  async addAppAdmin(newPauser) {
    const { addPauser } = this.appContract.methods;
    return await this.sendTx(addPauser, [newPauser], { from: this.owner });
  }

  async claim(flight, from) {
    const { claim } = this.appContract.methods;

    const key = this.getFlightKey(flight);

    return await this.sendTx(claim, [key], { from });
  }

  async withdraw(from) {
    const { withdraw } = this.appContract.methods;

    return await this.sendTx(withdraw, [], { from });
  }

  async checkBalance(from) {
    return await this.appContract.methods.checkBalance().call({ from });
  }

  async getStatus(flight) {
    const key = this.getFlightKey(flight);

    return await this.appContract.methods
      .getStatus(key)
      .call({ from: this.owner });
  }
}
