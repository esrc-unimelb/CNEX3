'use strict';

describe('Controller: GraphctrlCtrl', function () {

  // load the controller's module
  beforeEach(module('interfaceApp'));

  var GraphctrlCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    GraphctrlCtrl = $controller('GraphctrlCtrl', {
      $scope: scope
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(scope.awesomeThings.length).toBe(3);
  });
});
