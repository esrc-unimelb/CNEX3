from pyramid.response import Response
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPNotFound

from sqlalchemy.exc import DBAPIError
import transaction


import logging
log = logging.getLogger('app')

import os
import uuid
import time
from lxml import etree
import sqlalchemy as sq

import networkx as nx
from networkx.readwrite import json_graph

from config import Config

from .models import (
    DBSession,
    Progress
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

@view_config(route_name='site_graph', request_method='GET', renderer='jsonp')
def site_graph(request):
    """For a given site - assemble the entity graph
    
    @params:
    request.matchdict: code, the site of interest
    """
    t1 = time.time()
    dbs = DBSession()

    # get the session key used for status updates
    try:
        uniqueid = request.session['uuid']
    except KeyError:
        request.session['uuid'] = uuid.uuid4()
        uniqueid = request.session['uuid']

    # wipe any existing status
    try:
        p = dbs.query(Progress).filter(Progress.uuid == str(uniqueid)).delete()
        transaction.commit()
        dbs.flush()
    except sq.orm.exc.NoResultFound:
        pass


    # read the site config and bork if bad site requested
    conf = Config(request)
    site = request.matchdict['code']
    try:
        eac_path = getattr(conf, site.lower())
    except AttributeError:
        raise HTTPNotFound

    for (dirpath, dirnames, filenames) in os.walk(eac_path):
        datafiles = dict((fname, "%s/%s" % (dirpath, fname)) for fname in filenames)


    graph = nx.DiGraph()
    count = 0
    total = len(datafiles.items())

    # create the first entry with 0 of 'total' processed
    p = Progress(total = total, processed = count, uuid = str(uniqueid))
    dbs.add(p)
    transaction.commit()

    log.debug("Total entities in dataset: %s" % total)
    for fpath, fname in datafiles.items():
        count += 1

        p = dbs.query(Progress).filter(Progress.uuid == str(uniqueid)).one()
        p.processed = count
        transaction.commit()

        try:
            tree = etree.parse(fname)
        except (TypeError, etree.XMLSyntaxError):
            log.error("Invalid XML file: %s. Likely not well formed." % fname)
            continue

        node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
        if type(node_id) == str:
            node_source = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:entityId')
            node_type = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:entityType')
            node_name = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry[0]/e:part')

            graph.add_node(node_id, { 'source': node_source, 'name': node_name, 'type': node_type })

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

    # get the site name out of the last file
    t2 = time.time()
    log.debug("Time taken to prepare data '/site': %s" % (t2 - t1))
    return { 'graph': json_graph.dumps(graph), 'site_name': get(tree, '/e:eac-cpf/e:control/e:maintenanceAgency/e:agencyName') }

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
    eac_path = getattr(conf, site.lower())

    datafile = "%s/%s.xml" % (eac_path, entity_id)
    try:
        tree = etree.parse(datafile)
    except (TypeError, etree.XMLSyntaxError):
        log.error("Invalid XML file: %s. Likely not well formed." % datafile)

    graph = nx.DiGraph()
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
    try:
        uniqueid = request.session['uuid']
    except KeyError:
        return { 'total': '', 'processed': '' }
        
    try:
        p = dbs.query(Progress).filter(Progress.uuid == str(uniqueid)).one()
        return { 'total': p.total , 'processed': p.processed }
    except sq.orm.exc.NoResultFound:
        return { 'total': '', 'processed': '' }

@view_config(route_name='node_data', request_method="GET", renderer="jsonp")
def node_data(request):
    """More info - specific entity
    
    @params:
    id: request.params['id']
    site: request.params['site']
    """
    entity_id = request.matchdict['id']
    site = request.matchdict['code']

    # read the site config and bork if bad site requested
    conf = Config(request)
    try:
        eac_path = getattr(conf, site.lower())
    except AttributeError:
        raise HTTPNotFound

    tree = etree.parse("%s/%s.xml" % (eac_path, entity_id))
    name = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part')
    if type(name) == list:
        name = ', '.join(name)

    efrom = get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:fromDate')
    if len(efrom) == 0:
        efrom = ''
    
    eto = get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:toDate')
    if len(eto) == 0:
        eto = ''

    entity_data = {
        'name': name,
        'from': efrom,
        'to': eto
    }

    return { 'data': entity_data }

    
