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

import sys
import time
from lxml import etree, html
import networkx as nx
from networkx.readwrite import json_graph
import StringIO
import os
import os.path
import datetime

from config import Config

from Helpers import *
from Network import Network
from Entity import Entity

from config import Config

@view_config(route_name='health-check', request_method='GET', renderer='string')
def health_check(request):
    """
    Show the health check view.
    """
    log.info("GET {0} - {1} - {2}".format(request.path, request.remote_addr, request.user_agent))

    # is mongo ok?
    try:
        db = mdb(request)
        doc =  db.health_check.find_one()
        return 'OK'
    except:
        raise HTTPInternalServerError

@view_config(route_name='home', request_method='GET', renderer='json')
def home_page(request):
    claims, sites = verify_access(request)
    return { 'sites': sites }

@view_config(route_name='network-build', request_method='GET', renderer='json')
def network_build(request):
    """For a given site - assemble the entity graph
    
    @params:
    request.matchdict: code, the site of interest
    """
    site = request.matchdict['code']
    claims, site = verify_access(request, site=site)

    n = Network(request)
    n.build()

    return { 'started': True, 'name': site['name'], 'url': site['url'] }

@view_config(route_name='network-build-status', request_method='GET', renderer='ujson')
def network_build_status(request):
    db = mdb(request)
    site = request.matchdict['code']
    graph_type = request.matchdict['explore']
    claims, site_data = verify_access(request, site=site)

    doc = db.network.find_one({ 'site': site, 'graph_type': graph_type })
    if doc is not None:
        graph_data = doc['graph_data']
        doc = db.network_progress.remove({ 'site': site })

#        G = json_graph.node_link_graph(graph_data, directed=False, multigraph=False)
#        if not nx.is_connected(G):
#            components = nx.connected_component_subgraphs(G)
#            (index, G) = max(enumerate(components), key = lambda tup: len(tup[1]))
#        return { 'total': None, 'processed': None, 'graph': graph_data, 'center': nx.center(G) }
        return { 'total': None, 'processed': None, 'graph': graph_data }
    else:
        doc = db.network_progress.find_one({ 'site': site })
        return { 'total': doc['total'], 'processed': doc['processed'] }

@view_config(route_name='entity-build-status', request_method='GET', renderer='ujson')
def entity_build_status(request):
    db = mdb(request)
    site = request.matchdict['code']
    eid = request.matchdict['id']
    claims, site_data = verify_access(request, site=site)

    doc = db.entity.find_one({ 'site': site, 'id': eid })
    if doc is not None:
        graph_data = doc['graph_data']
        return { 'status': 'complete', 'graph': graph_data }
    else:
        return { 'status': 'working' }

@view_config(route_name='entity-build', request_method='GET', renderer='json')
def entity_build(request):
    """ """
    site = request.matchdict['code']
    eid = request.matchdict['id']
    claims, site = verify_access(request, site=site)
    e = Entity(request)
    e.build()

    return { 'started': True, 'name': site['name'], 'entity': eid }

@view_config(route_name='entity-data', request_method='GET', renderer='json')
def entity_data(request):
    """ """
    site = request.matchdict['code']
    claims, site = verify_access(request, site=site)
    e = Entity(request)
    summnote, fullnote = e.data()
    return { 'summnote': summnote, 'fullnote': fullnote }


@view_config(route_name="network-stats", request_method='GET', renderer='json')
def network_stats(request):
    site = request.matchdict['code']
    claims, site = verify_access(request, site=site)

    n = Network(request)
    degree = n.calculate_average_degree()
    d = [ d[1] * 100 for d in degree.items() ]

    return {
        'name': n.name,
        'url': n.url,
        'degree': sum(d) / len(d)
    }

@view_config(route_name="convert-graph", request_method='POST', renderer='json')
def convert_graph(request):
    code = request.matchdict['code']

    # clear out graphs older than 6 hours
    for root, dirs, files in os.walk(request.registry.app_config['general']['share_path']):
        for f in files:
            dt = datetime.datetime.now () - datetime.datetime.fromtimestamp(os.path.getmtime(os.path.join(root, f)))
            if dt > datetime.timedelta(hours=1):
                os.remove(os.path.join(root, f))

    G = nx.readwrite.json_graph.node_link_graph(request.json['graph'])
    output = StringIO.StringIO()
    nx.readwrite.write_gml(G, output)
    output = output.getvalue().replace("None", '""')

    fname = "%s-%s-network.gml" % (code, datetime.datetime.strftime(datetime.datetime.now(), "%Y-%m-%d_%H-%M"))
    with open(os.path.join(os.path.join(request.registry.app_config['general']['share_path'], fname)), 'w') as f:
        f.write(output)
    fname = os.path.join(request.registry.app_config['general']['share_url'], fname)
    return { 'file': fname }


def bare_tag(tag):
    return tag.rsplit("}", 1)[-1]


