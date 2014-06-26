'use strict';

angular.module('interfaceApp')
  .constant('configuration', {
      'development': 'http://dev01:3000/app',
      'testing':    '',
      'production': '',
      'service': 'development',
      'solr': 'https://data.esrc.info/solr/ESRC/select'
  });
