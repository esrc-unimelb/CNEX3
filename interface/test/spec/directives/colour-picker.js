'use strict';

describe('Directive: colourPicker', function () {

  // load the directive's module
  beforeEach(module('interfaceApp'));

  var element,
    scope;

  beforeEach(inject(function ($rootScope) {
    scope = $rootScope.$new();
  }));

  it('should make hidden element visible', inject(function ($compile) {
    element = angular.element('<colour-picker></colour-picker>');
    element = $compile(element)(scope);
    expect(element.text()).toBe('this is the colourPicker directive');
  }));
});
