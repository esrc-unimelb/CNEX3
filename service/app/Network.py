from pyramid.response import Response
from pyramid.view import view_config

import os
import sys
import time
import ujson
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

class Network:

    def __init__(self, request):
        """For a given site - assemble the entity graph
        
        @params:
        request.matchdict: code, the site of interest
        request.matchdict: explore, the type of graph being requested
        """

        self.request = request
        self.db = mdb(request)
        self.site = request.matchdict['code']
        self.graph_type = request.matchdict['explore']
        claims, site = verify_access(request, site=self.site)

        self.eac_path = site['eac']
        self.source_map = site['map']
        self.name = site['name']
        self.url = site['url']
        log.debug("Processing site: %s, data path: %s" % (self.site, self.eac_path))

    def build(self) :
        # is the data available? return now; nothing to do
        doc = self.db.network.find_one({ 'site': self.site })
        if doc is not None:
            log.debug('Graph already built. No need to build it again')
            return 

        # are we in the process of building it? return now; nothing to do
        doc = self.db.network_progress.find_one({ 'site': self.site })
        #print doc
        if doc is not None:
            log.debug('Graph currently being built')
            return
        
        # OTHERWISE:
        # generate the list of datafiles and build the graph
        for (dirpath, dirnames, filenames) in os.walk(self.eac_path):
            if dirpath == self.eac_path:
                datafiles = dict((fname, "%s/%s" % (dirpath, fname)) for fname in filenames)

        #  store a trace that indicates we're counting
        total = len(datafiles.items())
        log.debug("Total number of entities in dataset: %s" % total)

        # remove any previous progress traces that might exist
        self.db.network_progress.insert({
            'processed': 0,
            'total': total,
            'site': self.site,
            'createdAt': datetime.utcnow()
        })
        data_age = self.request.registry.app_config['general']['data_age']
        try:
            self.db.network_progress.ensure_index('createdAt', expireAfterSeconds = int(data_age))
        except OperationFailure:
            self.db.network_progress.drop_index('createdAt_1')
            self.db.network_progress.ensure_index('createdAt', expireAfterSeconds = int(data_age))

        j = multiprocessing.Process(target=self.build_graph, args=(self.graph_type, datafiles, total))
        j.start()

    def build_graph(self, graph_type, datafiles, total): 
        log.debug('Building the graph.')
        t1 = time.time()

        graph = nx.Graph()
        count = 0
        save_counter = 0
        nodes = {}
        for fpath, fname in datafiles.items():
            log.debug("Processing: %s" % os.path.join(fpath,fname))
            count += 1

            try:
                tree = etree.parse(fname)
            except (TypeError, etree.XMLSyntaxError):
                log.error("Invalid XML file: %s. %s." % (fname, sys.exc_info()[1]))
                continue

            if self.graph_type == 'byEntity':
                self.entities_as_nodes(graph, tree);
            elif self.graph_type == 'byFunction':
                self.functions_as_nodes(graph, tree)

            if save_counter == 20:
                # save a progress count
                self.db.network_progress.update(
                    { 'site': self.site },
                    { '$set': { 'processed': count }}
                )
                # reset the counter
                save_counter = 0
            save_counter +=1 

        # count the number of connections
        for n in graph:
            graph.node[n]['connections'] = len(list(graph.neighbors(n)))

        # save the graph
        self.db.network.insert({
            'site': self.site,
            'graph_type': self.graph_type,
            'graph_data': json_graph.node_link_data(graph),
            'createdAt': datetime.utcnow()
        })
        data_age = self.request.registry.app_config['general']['data_age']
        try:
            self.db.network.ensure_index('createdAt', expireAfterSeconds = int(data_age))
        except OperationFailure:
            self.db.network.drop_index('createdAt_1')
            self.db.network.ensure_index('createdAt', expireAfterSeconds = int(data_age))
   
        # all done
        t2 = time.time()
        log.debug("Time taken to prepare data '/site': %s" % (t2 - t1))
        return

    def functions_as_nodes(self, graph, tree):
        node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
        ntype = get(tree, "/e:eac-cpf/e:control/e:localControl[@localType='typeOfEntity']/e:term")
        url = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:entityId[1]")
        df = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:fromDate", attrib="standardDate")
        dt = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:toDate", attrib="standardDate")
        name = self.get_entity_name(tree, ntype)
        if len(df) == 0:
            df = None
        if len(dt) == 0:
            dt = None

        graph.add_node(node_id)
        graph.node[node_id]['type'] = ntype
        graph.node[node_id]['name'] = name
        graph.node[node_id]['url'] = url
        graph.node[node_id]['df'] = df
        graph.node[node_id]['dt'] = dt

        if tree.xpath('/e:eac-cpf/e:cpfDescription/e:description/e:functions/e:function/e:term', namespaces={ 'e': 'urn:isbn:1-931666-33-4' } ):
            for function in get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:functions/e:function/e:term', element=True):
               ## graph.add_node(function.text, { 'type': function.text, 'name': function.text, 'url': None, 'df': None, 'dt': None })
                graph.add_node(function.text)
                graph.node(function.text)['type'] = function.text
                graph.node(function.text)['name'] = function.text
                graph.node(function.text)['url'] = None
                graph.node(function.text)['df'] = None
                graph.node(function.text)['dt'] = None
                graph.add_edge(node_id, function.text, sid=node_id, tid=function.text)

        else:
            for function in get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:occupations/e:occupation/e:term', element=True):
                ##graph.add_node(function.text, { 'type': function.text, 'name': function.text, 'url': None, 'df': None, 'dt': None })
                graph.add_node(function.text)
                graph.node(function.text)['type'] = function.text
                graph.node(function.text)['name'] = function.text
                graph.node(function.text)['url'] = None
                graph.node(function.text)['df'] = None
                graph.node(function.text)['dt'] = None
                graph.add_edge(node_id, function.text, sid=node_id, tid=function.text)
    
    def entities_as_nodes(self, graph, tree):
        """

        :type graph: object
        """
        node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
        ntype = get(tree, "/e:eac-cpf/e:control/e:localControl[@localType='typeOfEntity']/e:term")
        core_type = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:entityType")
        url = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:entityId[1]")
        df = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:fromDate", attrib="standardDate")
        dt = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:toDate", attrib="standardDate")
        name = self.get_entity_name(tree, ntype)
        if len(df) == 0:
            df = None
        if len(dt) == 0:
            dt = None

        # is the node_id an empty list or some other bit of nonsense
        # if it is: skip to the next one
        if not node_id:
            return

        ##if graph.node.has_key(node_id):
        if node_id in graph.node:
            graph.node[node_id]['type'] = ntype
            graph.node[node_id]['coreType'] = core_type
            graph.node[node_id]['name'] = name
            graph.node[node_id]['url'] = url
            graph.node[node_id]['df'] = df
            graph.node[node_id]['dt'] = dt
        else:
            try:
                #graph.add_node(node_id, { 'type': ntype, 'coreType': core_type, 'name': name, 'url': url, 'df': df, 'dt': dt })
                graph.add_node(node_id)
            except:
                return
            graph.node[node_id]['type'] = ntype
            graph.node[node_id]['coreType'] = core_type
            graph.node[node_id]['name'] = name
            graph.node[node_id]['url'] = url
            graph.node[node_id]['df'] = df
            graph.node[node_id]['dt'] = dt

        related_entities = len(get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:cpfRelation', element=True))
        related_resources = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:resourceRelation[@resourceRelationType="other"]', element=True)
        related_publications = 0
        related_dobjects = 0
        for r in related_resources:
            if get(r, 'e:relationEntry', attrib='localType') == "published":
                related_publications += 1
            elif get(r, 'e:relationEntry', attrib='localType') == "digitalObject":
                related_dobjects += 1
        graph.node[node_id]['relatedEntities'] = related_entities
        graph.node[node_id]['relatedPublications'] = related_publications
        graph.node[node_id]['relatedDobjects'] = related_dobjects

        neighbours = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:cpfRelation', element=True)
        for node in neighbours:
            try:
                neighbour_ref = node.attrib['{http://www.w3.org/1999/xlink}href']
                neighbour_id = os.path.basename(neighbour_ref).split('b.htm')[0]
                graph.add_node(neighbour_id)
                graph.add_edge(node_id, neighbour_id, sid=node_id, tid=neighbour_id)
            except KeyError:
                pass
        #print node_id, node_source, node_type

    def get_entity_name(self, tree, ntype):
        if ntype == 'Person':
            if get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part[@localType='familyname']"):

                ln = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part[@localType='familyname']")
                gn = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part[@localType='givenname']")
                return "%s, %s" % (ln, gn)
            else:
                fn = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry[position() = 1]/e:part")
                fn = [e for e in fn if e is not None]
                if type(fn) == list:
                    return ', '.join(fn)
                return fn
        else:
            fn = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry[position() = 1]/e:part")
            if type(fn) == list:
                fn = [e for e in fn if e is not None]
                return ', '.join(fn)
            return fn

    def calculate_average_degree(self):
        n = self.dbs.query(NetworkModel.graph_data) \
            .filter(NetworkModel.site == self.site) \
            .filter(NetworkModel.graph_type == self.graph_type) \
            .one()

        g = json_graph.node_link_graph(json.loads(n[0]), directed=False, multigraph=False)
        return nx.degree_centrality(g)

