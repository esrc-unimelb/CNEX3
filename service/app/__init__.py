from pyramid.config import Configurator
from pyramid.renderers import JSONP
from sqlalchemy import engine_from_config

from .models import (
    DBSession,
    Base,
    )


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    engine = engine_from_config(settings, 'sqlalchemy.')
    DBSession.configure(bind=engine)
    Base.metadata.bind = engine
    config = Configurator(settings=settings)
    config.add_renderer('jsonp', JSONP(param_name='callback'))
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.add_route('home',           '/')
    config.add_route('health-check',   '/health-check')
    config.add_route('network-stats',  '/stats/{code}/{explore}')
    config.add_route('network-build',  '/network/{code}/{explore}')
    config.add_route('network-status', '/network/{code}/{explore}/status')
    config.add_route('entity_graph',   '/entity/{code}/{id}')

    config.scan()
    return config.make_wsgi_app()
