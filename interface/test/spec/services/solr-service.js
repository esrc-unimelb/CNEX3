'use strict';

describe('Service: solrService', function () {

  // load the service's module
  beforeEach(module('interfaceApp'));

  // instantiate service
  var solrService;
  beforeEach(inject(function (_solrService_) {
    solrService = _solrService_;
  }));

  it('should do something', function () {
    expect(!!solrService).toBe(true);
  });

});
