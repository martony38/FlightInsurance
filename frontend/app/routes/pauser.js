import Route from "@ember/routing/route";

export default class PauserRoute extends Route {
  async model() {
    const response = await fetch("http://localhost:3000/api/admins");
    const admins = await response.json();

    return { admins };
  }
}
