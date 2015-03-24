'use strict';

describe('Directive: typeFilter', function () {

  // load the directive's module
  beforeEach(module('interfaceApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<type-filter></type-filter>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the typeFilter directive');
  }));
});
