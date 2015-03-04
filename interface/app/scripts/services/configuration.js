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

      'opacity': {
          'default': '1',
          'unselected': '0.5'
      },


      'height': {
          'selected': '15',
          'default': '5'
      },

      'radius': {
          'date': {
              'default': '5'
          }
      }
  });
