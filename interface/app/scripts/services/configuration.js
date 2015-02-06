'use strict';

angular.module('interfaceApp')
  .constant('configuration', {
      'development': 'https://service.esrc.info',
      'production': 'https://cnex.esrc.unimelb.edu.au',
      'service': 'development',
      'solr': 'https://solr.esrc.unimelb.edu.au/ESRC/select',

      'fill': {
          'contextNode': 'orange',
          'contextNeighbourDefault': 'orange',
          'contextNeighbourHighlight': 'red',
          'default': '#c8c8c8'
      },

      'opacity': {
          'default': '1',
          'unselected': '0.5'
      },

      'stroke': {
          'link': {
              'selected': 'orange',
              'unselected': '#c8c8c8'
          },
          'date': {
              'selected': 'black',
              'unselected': '#c8c8c8'
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
