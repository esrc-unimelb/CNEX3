'use strict';

angular.module('interfaceApp')
  .constant('configuration', {
      'development': 'http://dev01:3000/app',
      'testing':    'https://cnex.esrc.info/app',
      'production': '',
      'service': 'testing',
      'solr': 'https://data.esrc.info/solr/ESRC/select',
      'highlight': {
          'contextNode': 'green',
          'contextNeighbourDefault': 'orange',
          'contextNeighbourHighlight': 'blue',
          'default': 'grey'
      },
      'opacity': {
          'highlight': '1',
          'fade': '0.3'
      }
  });
