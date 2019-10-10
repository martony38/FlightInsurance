import Controller from "@ember/controller";
import { inject as service } from "@ember/service";

export default class AirlineController extends Controller {
  @service contract;
}
