import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";

export default class OperationalStatusComponent extends Component {
  @tracked appContractPaused = false;
  @tracked dataContractPaused = false;

  @service contract;
  @service notify;

  constructor() {
    super(...arguments);

    this.contract.appContract.events.Paused(
      { fromBlock: 0 },
      (error, event) => {
        if (error) {
          console.log(error);
          return;
        }
        this.appContractPaused = true;
      }
    );
    this.contract.appContract.events.Unpaused(
      { fromBlock: 0 },
      (error, event) => {
        if (error) {
          console.log(error);
          return;
        }
        this.appContractPaused = false;
      }
    );
    this.contract.dataContract.events.Paused(
      { fromBlock: 0 },
      (error, event) => {
        if (error) {
          console.log(error);
          return;
        }
        this.dataContractPaused = true;
      }
    );
    this.contract.dataContract.events.Unpaused(
      { fromBlock: 0 },
      (error, event) => {
        if (error) {
          console.log(error);
          return;
        }
        this.dataContractPaused = false;
      }
    );
  }

  @action
  async pauseAppContract() {
    const {
      contract,
      args: { admin }
    } = this;

    this.notify.info("Pausing app contract... Please wait.");

    contract.appContract.once(
      "Paused",
      { filter: { account: admin } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("App Contract has been paused");
      }
    );

    try {
      await contract.pauseAppContract(admin);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async unpauseAppContract() {
    const {
      contract,
      args: { admin }
    } = this;

    this.notify.info("Unpausing app contract... Please wait.");

    contract.appContract.once(
      "Unpaused",
      { filter: { account: admin } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("App Contract is operational");
      }
    );

    try {
      await contract.unpauseAppContract(admin);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async pauseDataContract() {
    const {
      contract,
      args: { admin }
    } = this;

    this.notify.info("Pausing data contract... Please wait.");

    contract.dataContract.once(
      "Paused",
      { filter: { account: admin } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Data Contract has been paused");
      }
    );

    try {
      await contract.pauseDataContract(admin);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async unpauseDataContract() {
    const {
      contract,
      args: { admin }
    } = this;

    this.notify.info("Pausing data contract... Please wait.");

    contract.dataContract.once(
      "Unpaused",
      { filter: { account: admin } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Data Contract is operational");
      }
    );

    try {
      await contract.unpauseDataContract(admin);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }
}
