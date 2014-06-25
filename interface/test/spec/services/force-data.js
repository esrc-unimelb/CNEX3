'use strict';

describe('Service: forceData', function () {

  // load the service's module
  beforeEach(module('interfaceApp'));

  // instantiate service
  var forceData;
  beforeEach(inject(function (_forceData_) {
    forceData = _forceData_;
  }));

  it('should do something', function () {
    expect(!!forceData).toBe(true);
  });

});
