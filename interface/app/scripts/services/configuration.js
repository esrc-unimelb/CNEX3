'use strict';

angular.module('interfaceApp')
  .constant('configuration', {
      'development': 'https://service.esrc.info',
      'production': 'https://cnex.esrc.unimelb.edu.au',
      'service': 'production',
      'solr': 'https://solr.esrc.unimelb.edu.au/ESRC/select',

      'searchFields': {
          '0': { 'fieldName': 'name',          'displayName': 'Name',           'weight': '1' },
          '1': { 'fieldName': 'altname',       'displayName': 'Alternate Name', 'weight': '1' },
          '2': { 'fieldName': 'binomial_name', 'displayName': 'Binomial Name',  'weight': '1' },
          '3': { 'fieldName': 'text',          'displayName': 'Content',        'weight': '1' },
      },
      'searchWhat': [ '0', '1', '2', '3' ],

      'defaultColors': {
          'person': '#FF6961',
          'corporatebody': '#779ECB',
          'event': '#03C03C',
          'concept': '#FF9900',
          'place': '#966FD6',
          'culturalartefact': '#FFB347',
          'published': '#77DD77',
          'archival': '#779ECB',
          'digitalobject': '#C23B22'

      },

      types: {},

      'mapForward': {
          'person': 'Person',
          'corporatebody': 'Corporate Body',
          'event': 'Event',
          'concept': 'Concept',
          'place': 'Place',
          'culturalartefact': 'Cultural Artefact',
          'published': 'Published Resource',
          'archival': 'Archival Resource',
          'digitalobject': 'Digital Object',
      },

      'mapReverse': function() {
          var map = {};
          angular.forEach(this.mapForward, function(v, k) {
              map[v] = k;
          })
          return map;
      },

      'pallette': [ '#C23B22', '#FF6961', '#03C03C', '#77DD77', '#779ECB', '#AEC6CF', '#FFDF00', '#966FD6', '#B19CD9', '#FF9900', '#FFB347', ],

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
