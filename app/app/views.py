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
from lxml import etree
import sqlalchemy as sq

import networkx as nx
from networkx.readwrite import json_graph

from config import Config

from .models import (
    DBSession,
    Progress,
    Graph
    )

def get(tree, path, attrib=None, element=None):
    """Extract data from an etree tree

    Helper to run an xpath against an etree tree. Can extract
    node (element) text, attribute data or just return an etree
    element for further processing.

    @params:
    tree: an etree tree
    path: an xpath expression to run against the tree
    attrib: if defined, the attribute date to extract from the element found
        via the xpath expression
    element: if set to True, return the etree element rather than the textual
        content of the node. Useful for performing further operations against.

    @returns:
    Either a single value or a list
    """
    result = tree.xpath(path, namespaces={ 'e': 'urn:isbn:1-931666-33-4' })
    if len(result) == 0:
        return []

    # return the etree element reference
    if element is not None:
        if len(result) == 1:
            return result[0]
        else:
            return result

    # return the requested attribute
    elif attrib is not None:
        return result[0].attrib[attrib]
        #return tree.xpath(path, namespaces={ 'e': 'urn:isbn:1-931666-33-4' })[0].attrib[attrib]

    # otherwise - return the text content of the node
    else:
        try:
            #print "**", result, len(result)
            if len(result) == 1:
                return result[0].text
            else:
                return [ e.text for e in result ]
        except IndexError:
            print path
            print tree.xpath(path, namespaces={ 'e': 'urn:isbn:1-931666-33-4' })

def get_xml(href):
    """Given a href, find the corresponding XML data file.

    @params:
    href: a URL to a resource.o

    @returns:
    a URL to the XML file for that resource
    """
    try:
        tree = etree.parse(href, etree.HTMLParser())
        try:
            resource = tree.xpath('//meta[@name="EAC"]')[0].attrib['content']
        except IndexError:
            return ''
        return resource
    except IOError:
        return ""

@view_config(route_name='home', request_method='GET', renderer='json')
def home_page(request):
    conf = Config(request)

    graph = nx.Graph()
    graph.add_node('ESRC', { 'name': 'eScholarship Research Centre' })
    for node_id, name in conf.sites.items():

        if node_id == 'FACP':
            for k, v in name.items():
                graph.add_node(k, { 'name': v })
                graph.add_edge(k, 'FACP')

        else:
            graph.add_node(node_id, { 'name': name  })
            graph.add_edge(node_id, 'ESRC')
            
    graph.add_node('FACP', { 'name': 'Find & Connect' })
    graph.add_edge('FACP', 'ESRC')

    request.response.headers['Access-Control-Allow-Origin'] = '*'
    return { 'graph': json_graph.dumps(graph) }

@view_config(route_name='build_graph', request_method='GET', renderer='jsonp')
def site_graph(request):
    """For a given site - assemble the entity graph
    
    @params:
    request.matchdict: code, the site of interest
    """
    t1 = time.time()
    dbs = DBSession()

    site = request.matchdict['code']

    # read the site config and bork if bad site requested
    conf = Config(request)
    try:
        eac_path = getattr(conf, site)
    except AttributeError:
        raise HTTPNotFound

    # ensure no previous progress stamps exist
    try:
        session_id = request.session['session_id']
    except KeyError:
        session_id = request.session.id
        request.session['session_id'] = session_id

    # ensure we start with a clean slate
    cleanup(site, session_id, graph=True)

    # generate the list of datafiles
    #  store a trace that indicates we're counting
    p = Progress(
        processed = -1, 
        total = 0,
        site = site, 
        session_id = session_id
    )
    dbs.add(p)
    transaction.commit()
    for (dirpath, dirnames, filenames) in os.walk(eac_path):
        datafiles = dict((fname, "%s/%s" % (dirpath, fname)) for fname in filenames)

    graph = nx.Graph()
    count = 0
    total = len(datafiles.items())

    log.debug("Total entities in dataset: %s" % total)
    for fpath, fname in datafiles.items():
        count += 1

        p = dbs.query(Progress) \
            .filter(Progress.site == site) \
            .filter(Progress.session_id == session_id) \
            .one()
        p.processed = count
        p.total = total
        p.msg = "Constructing the graph: %s of %s total entities processed." % (count, total)
        transaction.commit()

        try:
            tree = etree.parse(fname)
        except (TypeError, etree.XMLSyntaxError):
            log.error("Invalid XML file: %s. %s." % (fname, sys.exc_info()[1]))
            continue

        node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
        if type(node_id) == str:
            source = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:entityId')
            ntype = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:entityType')
            name = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part')
            if type(name) == list:
                name = ', '.join([x for x in name if x is not None])
            nfrom = get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:fromDate')
            if len(nfrom) == 0:
                nfrom = ''
            nto = get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:toDate')
            if len(nto) == 0:
                nto = ''

            graph.add_node(node_id, { 'source': source, 'type': ntype, 'name': name, 'from': nfrom, 'to': nto })

            neighbours = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:cpfRelation[@cpfRelationType="associative"]', element=True)
            for node in neighbours:
                try:
                    neighbour_data = node.attrib['{http://www.w3.org/1999/xlink}href']
                    try:
                        tree = etree.parse(get_xml(href=neighbour_data))
                    except (IOError, TypeError, etree.XMLSyntaxError):
                        continue
                    neighbour_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
                    if len(neighbour_id) == 0:
                        # we've probably read an eac file - try the eac xpath
                        neighbour_id = get(tree, '/eac/control/id')
                    graph.add_edge(node_id, neighbour_id)
                except KeyError:
                    pass
            #print node_id, node_source, node_type

    for n in graph:
        graph.node[n]['connections'] = len(graph.neighbors(n))

    site_name = get(tree, '/e:eac-cpf/e:control/e:maintenanceAgency/e:agencyName')

    # cleanup progress counters and graphs
    cleanup(site, session_id)

    # save the graph
    #g = Graph(site = site, graph = json_graph.dumps(graph), site_name = site_name)
    #dbs.add(g)

    # get the site name out of the last file
    t2 = time.time()
    log.debug("Time taken to prepare data '/site': %s" % (t2 - t1))
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
    try:
        session_id = request.session['session_id']
    except:
        return { 'total': 0, 'processed': -1 }

    try:
        p = dbs.query(Progress) \
        .filter(Progress.site == site) \
        .filter(Progress.session_id == session_id) \
        .one()
        return { 'total': p.total , 'processed': p.processed }

    except sq.orm.exc.NoResultFound:
        # the run is complete and the trace has been purged
        pass

def cleanup(site, session_id, graph=None):
    dbs = DBSession()

    if graph is not None:
        # delete any graph we already have stored for this site and session_id
        dbs.query(Graph) \
            .filter(Graph.site == site) \
            .filter(Graph.session_id == session_id) \
            .delete()
        transaction.commit()
        
    # delete any existing progress counters
    dbs.query(Progress) \
        .filter(Progress.site == site) \
        .filter(Progress.session_id == session_id) \
        .delete()
    transaction.commit()

    dbs.flush()
    
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


