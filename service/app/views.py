from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import (
    HTTPNotFound,
    HTTPInternalServerError
)

from sqlalchemy.exc import DBAPIError
import transaction

import logging
log = logging.getLogger('app')

import os
import sys
import time
from datetime import datetime
from lxml import etree, html

from config import Config

import sqlalchemy as sq
from sqlalchemy import create_engine
from .models import (
    Base,
    DBSession,
    Progress,
    NetworkModel
    )

from Helpers import *
from Network import Network

import multiprocessing

@view_config(route_name='health-check', request_method='GET', renderer='string')
def health_check(request):
    """
    Show the health check view.
    """
    # find and purge expired tokens
    _expunge_expired_data()
    log.info("GET {0} - {1} - {2}".format(request.path, request.remote_addr, request.user_agent))
    return 'OK'

@view_config(route_name='home', request_method='GET', renderer='jsonp')
def home_page(request):
    conf = Config(request)

    # init the DB if it doesn't already exist
    engine = create_engine(request.registry.settings['sqlalchemy.url'])
    _init_table_if_not_exists(engine)

    # find and purge expired tokens
    _expunge_expired_data()

    sites = {}
    for name, data in conf.sites.items():
        sites[name] = data['slug']
    request.response.headers['Access-Control-Allow-Origin'] = '*'
    return { 'sites': sites }

@view_config(route_name='network-build', request_method='GET', renderer='jsonp')
def network_build(request):
    """For a given site - assemble the entity graph
    
    @params:
    request.matchdict: code, the site of interest
    """
    graph_type = request.matchdict['explore']
    n = Network(request)
    n.build()

    log.debug('job started')
    return { 'started': True }

@view_config(route_name="network-stats", request_method='GET', renderer='jsonp')
def network_stats(request):
    n = Network(request)
    degree = n.calculate_average_degree()
    d = [ d[1] * 100 for d in degree.items() ]

    return {
        'name': n.name,
        'url': n.url,
        'degree': sum(d) / len(d)
    }

@view_config(route_name='build-status', request_method='GET', renderer='jsonp')
def build_status(request):
    dbs = DBSession()
    site = request.matchdict['code']
    graph_type = request.matchdict['explore']

    try:
        n = dbs.query(NetworkModel.graph_data) \
            .filter(NetworkModel.site == site) \
            .filter(NetworkModel.graph_type == graph_type) \
            .one()

    except sq.orm.exc.NoResultFound:
        n = ''

    try:
        p = dbs.query(Progress) \
            .filter(Progress.site == site) \
            .one()

        return { 'total': p.total, 'processed': p.processed, 'graph': n }

    except sq.orm.exc.NoResultFound:
        # the run is complete and the trace has been purged
        return { 'total': None, 'processed': None, 'graph': n }

def _get_db_connection(engine):
    """Return a handle to the database"""
    DBSession.configure(bind=engine)
    return DBSession()

def _init_table_if_not_exists(engine):
    meta = sq.schema.MetaData(bind=engine)
    meta.reflect()

    # create the table if it doesn't already exist
    if not meta.tables:
        Base.metadata.create_all(engine)

def _expunge_expired_data():
    """Look for expired tokens and delete them

    @params:
    - request: the request object; required to get the sqlalchemy url
    """
    dbs = DBSession()
    now = datetime.now()
    progress = dbs.query(Progress).filter(Progress.valid_to < now)
    if progress.count() > 0:
        progress.delete()

    ## comment out the next line
#    dbs.query(Progress).delete()

    nm = dbs.query(NetworkModel).filter(NetworkModel.valid_to < now)
    if nm.count() > 0:
        nm.delete()

    ## comment out the next line
#    dbs.query(NetworkModel).delete()

    dbs.flush()

@view_config(route_name='entity_graph', request_method='GET', renderer='jsonp')
def entity_graph(request):
    """For a given entity - assemble the graph of its XML structure
    
    @params:
    request.matchdict: code, the site of interest
    request.matchdict: id, the entity of interest
    """
    t1 = time.time()
    conf = Config(request)
    site = request.matchdict['code']
    entity_id = request.matchdict['id']
    eac_path = getattr(conf, site)

    datafile = "%s/%s.xml" % (eac_path, entity_id)
    try:
        tree = etree.parse(datafile)
    except (TypeError, etree.XMLSyntaxError):
        log.error("Invalid XML file: %s. Likely not well formed." % datafile)

    graph = nx.Graph()
    start = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations', element=True)

    start_uid = str(tree.getpath(start))
    graph.add_node(start_uid, { 'tag': bare_tag(start.tag), 'data': start.text })

    for c in start.iterdescendants():
        if bare_tag(c.tag) == 'cpfRelation':
            rel_type = 'complex'
        elif bare_tag(c.tag) == 'resourceRelation':
            rel_type = 'simple'
        else:
            rel_type = ''
        parent_uid = str(tree.getpath(c.getparent()))
        child_uid = str(tree.getpath(c))
        node_data = c.attrib
        node_data['tag'] = bare_tag(c.tag)
        node_data['data'] = c.text if c.text is not None else ""
        node_data['type'] = rel_type;
        node_data = { bare_tag(k): v for k,v in node_data.items() }

        graph.add_node(child_uid, node_data)
        graph.add_edge(child_uid, parent_uid)

    t2 = time.time()
    log.debug("Time taken to prepare data '/entity': %s" % (t2 - t1))

    return { 'graph': json_graph.dumps(graph), 'nnodes': graph.number_of_nodes() }

def bare_tag(tag):
    return tag.rsplit("}", 1)[-1]


