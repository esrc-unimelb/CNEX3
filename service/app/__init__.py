from pyramid.config import Configurator
from pyramid.renderers import JSONP
from sqlalchemy import engine_from_config

from pyramid.paster import setup_logging

from config import Config as appConfig
from connectors import MongoBackend


def init_mongodb_connection(conf):
    m = MongoBackend()
    m.connect(conf)
    return m.client

def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    config = Configurator(settings=settings)
    setup_logging(global_config['__file__'])

    config.add_renderer('jsonp', JSONP(param_name='callback'))
    config.add_static_view('static', 'static', cache_max_age=3600)

    # initialise a connection to mongo on startup and store the client
    #  in the registry which will be injected into each request
    conf = appConfig(config.registry.settings.get('app.config'))
    config.registry.app_config = conf.app_config
    config.registry.app_config['mongodb']['client'] = init_mongodb_connection(config.registry.app_config['mongodb'])

    config.add_route('home',                    '/')
    config.add_route('health-check',            '/health-check')
    config.add_route('network-stats',           '/stats/{code}/{explore}')
    config.add_route('network-build',           '/network/{code}/{explore}')
    config.add_route('network-build-status',    '/network/{code}/{explore}/status')
    config.add_route('entity-data',             '/entity/{code}/data')
    config.add_route('entity-build',            '/entity/{code}/{id}')
    config.add_route('entity-build-status',     '/entity/{code}/{id}/status')

    config.scan()
    return config.make_wsgi_app()
