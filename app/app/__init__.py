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
    config.add_static_view('static',    'static', cache_max_age=3600)
    config.add_route('build_graph',     '/graph/{code}')
    #config.add_route('site_dendrogram', '/dendrogram/{code}')
    config.add_route('entity_graph',    '/entity/{code}/{id}')

    config.add_route('status',          '/status/{code}')
    config.scan()
    return config.make_wsgi_app()
