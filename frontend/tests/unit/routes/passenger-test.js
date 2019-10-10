import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Route | passenger', function(hooks) {
  setupTest(hooks);

  test('it exists', function(assert) {
    let route = this.owner.lookup('route:passenger');
    assert.ok(route);
  });
});
