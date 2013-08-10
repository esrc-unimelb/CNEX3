
import ConfigParser
import os

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
        site_config_file = settings['app.config']

        # read the site config
        self._ingest(site_config_file)

    def _ingest(self, config_file):
        config = ConfigParser.RawConfigParser()
        config.read(config_file)

        for section in config.sections():
            data = config.items(section)
            for param, value in data:
                setattr(self, param, value)
