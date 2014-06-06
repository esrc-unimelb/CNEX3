from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPNotFound

from sqlalchemy.exc import DBAPIError
import transaction


import logging
log = logging.getLogger('app')

import os
import sys
import time
import datetime
from lxml import etree, html
import sqlalchemy as sq

import networkx as nx
from networkx.readwrite import json_graph

from config import Config

from .models import (
    DBSession,
    Progress,
    Graph
    )

from Helpers import *
from Graph import Graph

@view_config(route_name='home', request_method='GET', renderer='jsonp')
def home_page(request):
    conf = Config(request)

    sites = {}
    for name, data in conf.sites.items():
        sites[name] = data['slug']
    request.response.headers['Access-Control-Allow-Origin'] = '*'
    return { 'sites': sites }

@view_config(route_name='build_graph', request_method='GET', renderer='jsonp')
def site_graph(request):
    """For a given site - assemble the entity graph
    
    @params:
    request.matchdict: code, the site of interest
    """
    graph_type = 'functions-as-nodes'
    g = Graph(request)
    (site_name, graph) = g.build(graph_type)

    return { 'graph': json_graph.dumps(graph), 'site_name': site_name }

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

@view_config(route_name='status', request_method='GET', renderer='jsonp')
def status(request):
    dbs = DBSession()
    site = request.matchdict['code']
    session_id = request.matchdict['session_id']

    try:
        p = dbs.query(Progress) \
        .filter(Progress.site == site) \
        .filter(Progress.session_id == session_id) \
        .one()
        return { 'total': p.total , 'processed': p.processed }

    except sq.orm.exc.NoResultFound:
        # the run is complete and the trace has been purged
        pass

#@view_config(route_name='site_dendrogram', request_method='GET', renderer='jsonp')
#def site_dendrogram(request):
#    t1 = time.time()
#    import json
#    site = request.matchdict['code']
#
#    # read the site config and bork if bad site requested
#    conf = Config(request)
#    try:
#        eac_path = getattr(conf, site.lower())
#    except AttributeError:
#        raise HTTPNotFound
#
#    for (dirpath, dirnames, filenames) in os.walk(eac_path):
#        datafiles = dict((fname, "%s/%s" % (dirpath, fname)) for fname in filenames)
#
#    total = len(datafiles.items())
#
#    dendrogram = {}
#    dendrogram['name'] = site
#    dendrogram['children'] = []
#
#    log.debug("Total entities in dataset: %s" % total)
#    children = {}
#    for fpath, fname in datafiles.items():
#        try:
#            tree = etree.parse(fname)
#        except (TypeError, etree.XMLSyntaxError):
#            log.error("Invalid XML file: %s. Likely not well formed." % fname)
#            continue
#
#        # second level: entity type
#        entity_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
#        entity_type = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:entityType')
#        entity_function = get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:functions/e:function/e:term')
#        #print entity_id, entity_function
#        #if type(entity_name) == list:
#        #    entity_name = (', ').join(entity_name)
#        #print entity_id, entity_name, entity_type
#
#        try:
#            if not entity_type in children:
#                children[entity_type] = []
#            children[entity_type].append({ 'name': entity_id, 'colour': '#efd580'})
#        except:
#            pass
#        
#    for k,v in children.items():
#        dendrogram['children'].append({ 'name': k, 'children': v })
#
#    request.response.headers['Access-Control-Allow-Origin'] = '*'
#    t2 = time.time()
#    log.debug("Time taken to prepare data '/dendrogram': %s" % (t2 - t1))
#    return dendrogram


