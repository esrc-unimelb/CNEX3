'use strict';

angular.module('interfaceApp')
  .constant('configuration', {
      'development': 'https://service.esrc.info',
      'production': 'https://cnex.esrc.unimelb.edu.au',
      'service': 'development',
      'solr': 'https://solr.esrc.unimelb.edu.au/ESRC/select',

      'colours': {
          'person': '#d62728',
          'corporatebody': '#ffbb78',
          'event': '#1f77b4',
          'concept': '#aec7e8',
          'place': '#ff9896',
          'culturalartefact': '#9467bd',
          'published': '#98df8a',
          'archival': '#2ca02c',
          'digitalObject': '#ff7f0e'

      },

      'fill': {
          'contextNode': 'green',
          'contextNeighbourDefault': 'orange',
          'contextNeighbourHighlight': 'red',
          'default': '#c8c8c8'
      },

      'opacity': {
          'default': '1',
          'unselected': '0.3'
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
