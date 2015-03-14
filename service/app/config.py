
import os
import sys
import os.path
import ConfigParser
import collections
import traceback
import ast

from pyramid.httpexceptions import HTTPBadRequest

import logging
log = logging.getLogger(__name__)


class ConfigBase:
    def __init__(self):
        pass

    def get(self, section, param, aslist=False):
        data = self.cfg.get(section, param) if (self.cfg.has_section(section) and self.cfg.has_option(section, param)) else None
        if data == None:
            log.error("Missing parameter %s in section %s" % (param, section))
        if aslist:
            return [ d.strip() for d in data.split(',') ]
        return data

class Config(ConfigBase):

    def __init__(self, conf):
        """
        Expects to be called with a pyramid request object.

        The path to the configs will be extracted from the pyramid
        configuration and a config object will be returned.

        The params from the config will be available as instance
        variables.

        @params:
        request: a pyramid request object
        """
        self.cfg = ConfigParser.SafeConfigParser()
        try:
            self.cfg.read(conf)
        except ConfigParser.ParsingError:
            log.error('Config file parsing errors')
            log.error(sys.exc_info()[1])
            sys.exit()

        self.app_config = {
            'general': {
                'token': self.get('GENERAL', 'token'),
                'data_age': self.get('GENERAL', 'data_age'),
                'sites': self.get('GENERAL', 'sites'),
                'disable_auth': ast.literal_eval(self.get('GENERAL', 'disable_auth')),
                'share_path': self.get('GENERAL', 'share_path'),
                'share_url': self.get('GENERAL', 'share_url'),
            },
            'mongodb': {
                'nodes': self.get('MONGODB', 'nodes', aslist=True),
                'user': self.get('MONGODB', 'user'),
                'pass': self.get('MONGODB', 'pass'),
                'db': self.get('MONGODB', 'db'),
                'replica_set': self.get('MONGODB', 'replica.set'),
                'write_concern': self.get('MONGODB', 'write.concern')
            }
        }

class SiteConfig(ConfigBase):
    def __init__(self, conf):
        self.cfg = ConfigParser.SafeConfigParser()
        try:
            self.cfg.read(conf)
        except ConfigParser.ParsingError:
            log.error('Config file parsing errors')
            log.error(sys.exc_info()[1])
            sys.exit()

    def load(self, site):
        conf = {}
        conf['code'] = self.get('GENERAL', 'code')
        conf['name'] = self.get('GENERAL', 'name')
        conf['url'] = self.get('GENERAL', 'url')
        conf['eac'] = self.get('GENERAL', 'eac')
        datamap = self.get('GENERAL', 'map', aslist=True)
        conf['map'] = {}
        conf['map']['source'] = datamap[0]
        conf['map']['localpath'] = datamap[1]
        conf['public'] = ast.literal_eval(self.get('GENERAL', 'public'))
        conf['allow_groups'] = self.get('GENERAL', 'allow_groups', aslist=True)
        conf['allow_users'] = self.get('GENERAL', 'allow_users', aslist=True)
        return conf

