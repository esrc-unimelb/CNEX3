from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPNotFound,
    HTTPInternalServerError,
    HTTPForbidden,
    HTTPUnauthorized
)

import logging
log = logging.getLogger(__name__)

import os
import sys
import time
from datetime import datetime
from lxml import etree, html

from config import Config

from Helpers import *
from Network import Network

from config import Config

@view_config(route_name='health-check', request_method='GET', renderer='string')
def health_check(request):
    """
    Show the health check view.
    """
    log.info("GET {0} - {1} - {2}".format(request.path, request.remote_addr, request.user_agent))
    return 'OK'

@view_config(route_name='home', request_method='GET', renderer='json')
def home_page(request):
    claims = verify_access(request)
    sites = get_site_data(request)
    request.response.headers['Access-Control-Allow-Origin'] = '*'
    return { 'sites': sites }

@view_config(route_name='network-build', request_method='GET', renderer='json')
def network_build(request):
    """For a given site - assemble the entity graph
    
    @params:
    request.matchdict: code, the site of interest
    """
    claims = verify_access(request)

    site = request.matchdict['code']

    n = Network(request)
    n.build()

    sites = get_site_data(request)
    site = sites[site]
    name = site.name
    url = site.url

    n = Network(request)
    n.build()

    return { 'started': True, 'name': name, 'url': url }


@view_config(route_name="network-stats", request_method='GET', renderer='json')
def network_stats(request):
    claims = verify_access(request)

    n = Network(request)
    degree = n.calculate_average_degree()
    d = [ d[1] * 100 for d in degree.items() ]

    return {
        'name': n.name,
        'url': n.url,
        'degree': sum(d) / len(d)
    }

@view_config(route_name='build-status', request_method='GET', renderer='json')
def build_status(request):
    claims = verify_access(request)

    db = mdb(request)
    site = request.matchdict['code']
    graph_type = request.matchdict['explore']

    doc = db.network.find_one({ 'site': site, 'graph_type': graph_type })
    if doc is not None:
        graph_data = doc['graph_data']
        doc = db.progress.remove({ 'site': site })
        return { 'total': None, 'processed': None, 'graph': graph_data }
    else:
        doc = db.progress.find_one({ 'site': site })
        return { 'total': doc['total'], 'processed': doc['processed'] }

def bare_tag(tag):
    return tag.rsplit("}", 1)[-1]


