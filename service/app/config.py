
import os
import os.path
import ConfigParser

from pyramid.httpexceptions import HTTPBadRequest

class Config:

    def __init__(self, request):
        """
        Expects to be called with a pyramid request object.

        The path to the configs will be extracted from the pyramid
        configuration and a config object will be returned.

        The params from the config will be available as instance
        variables.

        @params:
        request: a pyramid request object
        """
        settings = request.registry.settings
        app_config = settings['app.config']

        self.sites = {}
        for s in os.listdir(app_config):
            cfg = ConfigParser.SafeConfigParser()
            cfg.read(os.path.join(app_config, s))

            site_data = {}
            site_data['slug'] = cfg.get('GENERAL', 'slug') if (cfg.has_section('GENERAL') and cfg.has_option('GENERAL', 'slug')) else None
            site_data['eac']  = cfg.get('GENERAL', 'eac') if (cfg.has_section('GENERAL') and cfg.has_option('GENERAL', 'eac')) else None
            site_data['name']  = cfg.get('GENERAL', 'name') if (cfg.has_section('GENERAL') and cfg.has_option('GENERAL', 'name')) else None
            site_data['url']  = cfg.get('GENERAL', 'url') if (cfg.has_section('GENERAL') and cfg.has_option('GENERAL', 'url')) else None
            source_map = cfg.get('GENERAL', 'map') if (cfg.has_section('GENERAL') and cfg.has_option('GENERAL', 'map')) else None
            site_data['map']  = source_map.split(', ')
            self.sites[s] = site_data

