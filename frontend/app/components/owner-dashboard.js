import Component from "@glimmer/component";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";

export default class OwnerDashboardComponent extends Component {
  @tracked selectedAdmin = null;

  @service contract;
  @service notify;

  @action
  async addDataAdmin() {
    const { contract, selectedAdmin } = this;

    this.notify.info("Adding new data contract admin... Please wait.");

    contract.dataContract.once(
      "PauserAdded",
      { filter: { account: selectedAdmin } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("New data contract admin has been added");
      }
    );

    try {
      await contract.addDataAdmin(selectedAdmin);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }

  @action
  async addAppAdmin() {
    const { contract, selectedAdmin } = this;

    this.notify.info("Adding new app contract admin... Please wait.");

    contract.appContract.once(
      "PauserAdded",
      { filter: { account: selectedAdmin } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("New app contract admin has been added");
      }
    );

    try {
      await contract.addAppAdmin(selectedAdmin);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }
}
