'use strict';

angular.module('interfaceApp')
  .constant('configuration', {
      'development': 'http://dev01:3000/app',
      'testing':    'https://cnex.esrc.info/app',
      'production': '',
      'service': 'testing',
      'solr': 'https://solr.esrc.info/ESRC/select',

      'fill': {
          'contextNode': 'green',
          'contextNeighbourDefault': 'orange',
          'contextNeighbourHighlight': 'red',
          'default': '#C8C8C8'
      },

      'opacity': {
          'default': '1',
          'unselected': '0.7'
      },

      'stroke': {
          'link': {
              'selected': 'orange',
              'unselected': '#C8C8C8'
          },
          'date': {
              'selected': 'black',
              'unselected': '#C8C8C8'
          }
      },

      'height': {
          'selected': '10',
          'default': '3'
      },

      'radius': {
          'node': {
              'selected': '30',
              'unselected': '10'
          },
          'date': {
              'selected': '6',
              'default': '3'
          }
      }

  });
