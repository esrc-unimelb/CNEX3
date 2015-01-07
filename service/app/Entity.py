from pyramid.response import Response
from pyramid.view import view_config

import os
import sys
import time
import json
from datetime import datetime, timedelta
from lxml import etree, html

from config import Config

import logging
log = logging.getLogger(__name__)

import networkx as nx
from networkx.readwrite import json_graph

from Helpers import *

import multiprocessing

from pymongo.errors import (
    OperationFailure
    )
import pymongo

class Entity:
    def __init__(self, request):
        """For a given site - assemble the entity graph
        
        @params:
        request.matchdict: code, the site of interest
        request.matchdict: explore, the type of graph being requested
        """

        self.request = request
        self.db = mdb(request)
        self.site = request.matchdict['code']
        self.eid = request.matchdict['id']
        claims, site = verify_access(request, site=self.site)

        self.eac_path = site['eac']
        self.source_map = site['map']
        self.name = site['name']
        self.url = site['url']
        log.debug("Processing site: %s, data path: %s" % (self.site, self.eac_path))

    def build(self) :
        # is the data available? return now; nothing to do
        doc = self.db.entity.find_one({ 'site': self.site })
        if doc is not None:
            log.debug('Graph already built. No need to build it again')
            return 
        
        #  store a trace that indicates we're counting
#        total = len(datafiles.items())
#        log.debug("Total number of entities in dataset: %s" % total)

        # remove any previous progress traces that might exist
#        doc = self.db.progress.remove({ 'site': self.site })
#        self.db.progress.insert({
#            'processed': 0,
#            'total': total,
#            'site': self.site,
#            'createdAt': datetime.utcnow()
#        })
#        data_age = self.request.registry.app_config['general']['data_age']
#        try:
#            self.db.progress.ensure_index('createdAt', expireAfterSeconds = int(data_age))
#        except OperationFailure:
#            self.db.progress.drop_index('createdAt_1')
#            self.db.progress.ensure_index('createdAt', expireAfterSeconds = int(data_age))

        j = multiprocessing.Process(target=self.build_graph)
        j.start()

    def build_graph(self): 
        log.debug('Building the graph.')
        t1 = time.time()

        graph = nx.Graph()
        count = 0
        save_counter = 0
        nodes = {}
        fname = os.path.join(self.eac_path, "%s.xml" % self.eid)

        try:
            tree = etree.parse(fname)
        except (TypeError, etree.XMLSyntaxError):
            log.error("Invalid XML file: %s. %s." % (fname, sys.exc_info()[1]))
        self.entities_as_nodes(graph, tree)

        # save the graph
        self.db.entity.insert({
            'site': self.site,
            'id': self.eid,
            'graph_data': json_graph.node_link_data(graph),
            'createdAt': datetime.utcnow()
        })
        data_age = self.request.registry.app_config['general']['data_age']
        try:
            self.db.entity.ensure_index('createdAt', expireAfterSeconds = int(data_age))
        except OperationFailure:
            self.db.entity.drop_index('createdAt_1')
            self.db.entity.ensure_index('createdAt', expireAfterSeconds = int(data_age))
   
        # all done
        t2 = time.time()
        log.debug("Time taken to prepare data '/entity': %s" % (t2 - t1))
        return

    def entities_as_nodes(self, graph, tree):
        node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
        ntype = get(tree, "/e:eac-cpf/e:control/e:localControl[@localType='typeOfEntity']/e:term")
        url = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:entityId")
        df = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:fromDate", attrib="standardDate")
        dt = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:toDate", attrib="standardDate")
        name = self.get_entity_name(tree, ntype)
        if len(df) == 0:
            df = None
        if len(dt) == 0:
            dt = None

        try:
            graph.add_node(node_id, { 'type': ntype, 'name': name, 'url': url, 'df': df, 'dt': dt })
        except:
            return

        related_entities = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:cpfRelation', element=True)
        for node in related_entities:
            try:
                neighbour_ref = node.attrib['{http://www.w3.org/1999/xlink}href']
                if neighbour_ref.startswith('http'):
                    neighbour_ref_local = neighbour_ref.replace(self.source_map['source'], self.source_map['localpath'])
                else:
                    # assume it's relative
                    neighbour_ref_local = "%s/%s" % (self.source_map['localpath'], neighbour_ref)
                try:
                    xml_datafile = get_xml(href=neighbour_ref_local)
                    if xml_datafile is not None:
                        if xml_datafile.startswith('http'):
                            xml_datafile_local = xml_datafile.replace(self.source_map['source'], self.source_map['localpath'])
                        else:
                            # assume it's relative
                            xml_datafile_local = "%s/%s" % (self.source_map['localpath'], xml_datafile)
                        tree = etree.parse(xml_datafile_local)
                    else:
                        raise IOError
                except IOError:
                    log.error("No EAC reference to XML source in: %s" % neighbour_ref_local)
                    continue
                except etree.XMLSyntaxError:
                    log.error("Invalid XML file: %s" % xml_datafile)
                    continue
                except TypeError:
                    log.error("Some kind of error with: %s" % xml_datafile)
                    continue
                neighbour_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
                if len(neighbour_id) == 0:
                    # we've probably read an eac file - try the eac xpath
                    neighbour_id = get(tree, '/eac/control/id')

                # add node, add edge, call this method on this node
                graph.add_node(neighbour_id)
                graph.add_edge(node_id, neighbour_id, source_id=node_id, target_id=neighbour_id)
            except KeyError:
                pass

        related_resources = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:resourceRelation[@resourceRelationType="other"]', element=True)
        for node in related_resources:
            # for each node - get the id, type, name and href
            #  add a node to describe it
            #  add an edge between this node (context node) and the resource node
            rurl = node.attrib['{http://www.w3.org/1999/xlink}href']
            rtype = get(node, 'e:relationEntry', attrib='localType')
            rname = get(node, 'e:relationEntry')
            rid = rurl.split('/')[-1:][0].split('.htm')[0]

            if rtype == 'published':
                rtype = rname.split(':')[0]
                rname = rname.split(':', 1)[1:][0].strip()
            graph.add_node(rid, { 'type': rtype, 'name': rname, 'url': rurl })
            graph.add_edge(rid, node_id, source_id=rid, target_id=node_id)

    def get_entity_name(self, tree, ntype):
        if ntype == 'Person':
            if get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part[@localType='familyname']"):

                ln = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part[@localType='familyname']")
                gn = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part[@localType='givenname']")
                return "%s, %s" % (ln, gn)
            else:
                fn = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry[position() = 1]/e:part")
                if type(fn) == list:
                    return ', '.join(fn)
                return fn
        else:
            fn = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry[position() = 1]/e:part")
            if type(fn) == list:
                return ', '.join(fn)
            return fn

