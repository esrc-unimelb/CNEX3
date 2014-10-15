'use strict';

angular.module('interfaceApp')
  .constant('configuration', {
      'development': 'https://service.esrc.info',
      'testing':    'https://cnex.esrc.info/app',
      'production': '',
      'service': 'development',
      'solr': 'https://solr.esrc.unimelb.edu.au/ESRC/select',

      'fill': {
          'contextNode': 'green',
          'contextNeighbourDefault': 'orange',
          'contextNeighbourHighlight': 'red',
          'default': '#C8C8C8'
      },

      'opacity': {
          'default': '1',
          'unselected': '0.5'
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
