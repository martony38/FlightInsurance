import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

export default class PauserDashboardComponent extends Component {
  @tracked selectedAdmin = null;
}
