import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default class AddAirlineDashboardComponent extends Component {
  @tracked selectedAirline = null;

  @service contract;
  @service notify;

  get isAddAirlineBtnDisabled() {
    const { selectedAirline } = this;
    const { airline } = this.args;
    return selectedAirline && airline ? false : true;
  }

  @action
  selectAirline(designator) {
    this.selectedAirline = designator;
  }

  @action
  async addAirline() {
    const {
      selectedAirline,
      contract,
      args: { airline, airlines }
    } = this;

    const voter = airline;
    const newAirline = airlines.find(el => el.designator === selectedAirline);

    this.notify.info("Adding your vote for new airline... Please wait.");

    contract.dataContract.once(
      "VoteReceived",
      { filter: { voter } },
      (error, event) => {
        if (error) {
          this.notify.error(error.message);
          console.log(error);
          return;
        }
        this.notify.info("Vote has been received");
      }
    );

    try {
      await contract.addAirline(voter, newAirline.address);
    } catch (error) {
      console.log(error);
      this.notify.error(`Transaction could not complete: ${error.message}`);
    }
  }
}
