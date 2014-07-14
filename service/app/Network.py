from pyramid.response import Response
from pyramid.view import view_config

import os
import sys
import time
import json
from datetime import datetime, timedelta
from lxml import etree, html

from config import Config

import sqlalchemy as sq

import transaction
from .models import (
    DBSession,
    Progress,
    NetworkModel
    )

import logging
log = logging.getLogger('app')

import networkx as nx
from networkx.readwrite import json_graph

from Helpers import *

import multiprocessing


class Network:

    def __init__(self, request):
        """For a given site - assemble the entity graph
        
        @params:
        request.matchdict: code, the site of interest
        request.matchdict: explore, the type of graph being requested
        """
        self.dbs = DBSession()

        self.request = request
        self.site = request.matchdict['code']
        self.graph_type = request.matchdict['explore']

        # read the site config and bork if bad site requested
        conf = Config(request)
        self.eac_path = conf.sites[self.site]['eac']
        self.source_map = conf.sites[self.site]['map']
        self.name = conf.sites[self.site]['name']
        self.url = conf.sites[self.site]['url']
        log.debug("Processing site: %s, data path: %s" % (self.site, self.eac_path))

    def build(self) :
        t1 = time.time()

        # is the data available? return now; nothing to do
        try:
            n = self.dbs.query(NetworkModel) \
                    .filter(NetworkModel.site == self.site) \
                    .filter(NetworkModel.graph_type == self.graph_type) \
                    .one()
            log.debug('Graph already built. No need to build it again.')
            return
        except sq.orm.exc.NoResultFound:
            pass
        
        # is a graph generation in progress? return now; nothing to do
        try:
            p = self.dbs.query(Progress).filter(Progress.site == self.site).one()
            log.debug('Graph being built. Not starting another build.')
            return
        except sq.orm.exc.NoResultFound:
            pass

        # OTHERWISE:
        # generate the list of datafiles and build the graph
        for (dirpath, dirnames, filenames) in os.walk(self.eac_path):
            if dirpath == self.eac_path:
                datafiles = dict((fname, "%s/%s" % (dirpath, fname)) for fname in filenames)

        #  store a trace that indicates we're counting
        total = len(datafiles.items())
        log.debug("Total number of entities in dataset: %s" % total)

        p = Progress(
            processed = 0, 
            total = total,
            site = self.site,
            valid_to = datetime.now() + timedelta(hours=float(self.request.registry.settings['data_age']))
        )
        self.dbs.add(p)
        transaction.commit()

        j = multiprocessing.Process(target=self.build_graph, args=(self.graph_type, datafiles, total))
        j.start()

    def build_graph(self, graph_type, datafiles, total): 
        log.debug('Building the graph.')
        t1 = time.time()

        graph = nx.DiGraph()
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
                p = self.dbs.query(Progress) \
                    .filter(Progress.site == self.site) \
                    .one()
                p.processed = count
                transaction.commit()

                # reset the counter
                save_counter = 0
            save_counter +=1 

        # count the number of connections
        for n in graph:
            graph.node[n]['connections'] = len(graph.neighbors(n))

        # save the graph
        n = NetworkModel(
            site = self.site, 
            graph_type = self.graph_type, 
            valid_to = datetime.now() + timedelta(hours=float(self.request.registry.settings['data_age']))
        )
        n.graph_data = json.dumps(json_graph.node_link_data(graph))
        self.dbs.add(n)
        transaction.commit()

        # delete any existing progress counters
        self.dbs.query(Progress) \
            .filter(Progress.site == self.site) \
            .delete()
        transaction.commit()

   
        # all done
        t2 = time.time()
        log.debug("Time taken to prepare data '/site': %s" % (t2 - t1))
        return

    def functions_as_nodes(self, graph, tree):
            node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
            ntype = get(tree, "/e:eac-cpf/e:control/e:localControl[@localType='typeOfEntity']/e:term")
            url = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:entityId")
            df = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:fromDate")
            dt = get(tree, "/e:eac-cpf/e:cpfDescription/e:description/e:existDates/e:dateRange/e:toDate")
            name = self.get_entity_name(tree, ntype)
            graph.add_node(node_id, { 'type': ntype, 'name': name, 'url': url, 'df': df, 'dt': dt })

            if tree.xpath('/e:eac-cpf/e:cpfDescription/e:description/e:functions/e:function/e:term', namespaces={ 'e': 'urn:isbn:1-931666-33-4' } ):
                for function in get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:functions/e:function/e:term', element=True):
                    #graph.add_node(function.text, { 'source': '', 'type': 'function', 'name': function.text, 'from': '', 'to': '' })
                    graph.add_node(function.text, { 'type': function.text })
                    graph.add_edge(node_id, function.text, source_name=node_id, target_name=function.text)

            else:
                for function in get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:occupations/e:occupation/e:term', element=True):
                    #graph.add_node(function.text, { 'source': '', 'type': 'function', 'name': function.text, 'from': '', 'to': '' })
                    graph.add_node(function.text)
                    graph.add_edge(node_id, function.text, source_name=node_id, target_name=function.text)
        
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

            graph.add_node(node_id, { 'type': ntype, 'name': name, 'url': url, 'df': df, 'dt': dt })

            neighbours = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:cpfRelation[@cpfRelationType="associative"]', element=True)
            for node in neighbours:
                try:
                    neighbour_ref = node.attrib['{http://www.w3.org/1999/xlink}href']
                    if neighbour_ref.startswith('http'):
                        neighbour_ref_local = neighbour_ref.replace(self.source_map[0], self.source_map[1])
                    else:
                        # assume it's relative
                        neighbour_ref_local = "%s/%s" % (self.source_map[1], neighbour_ref)
                    try:
                        xml_datafile = get_xml(href=neighbour_ref_local)
                        if xml_datafile is not None:
                            if xml_datafile.startswith('http'):
                                xml_datafile_local = xml_datafile.replace(self.source_map[0], self.source_map[1])
                            else:
                                # assume it's relative
                                xml_datafile_local = "%s/%s" % (self.source_map[1], xml_datafile)
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
                    graph.add_edge(node_id, neighbour_id, source_name=node_id, target_name=neighbour_id)
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
                if type(fn) == list:
                    return ', '.join(fn)
                return fn
        else:
            fn = get(tree, "/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry[position() = 1]/e:part")
            if type(fn) == list:
                return ', '.join(fn)
            return fn

    def calculate_average_degree(self):
        n = self.dbs.query(NetworkModel.graph_data) \
            .filter(NetworkModel.site == self.site) \
            .filter(NetworkModel.graph_type == self.graph_type) \
            .one()

        g = json_graph.node_link_graph(json.loads(n[0]), directed=False, multigraph=False)
        return nx.degree_centrality(g)

