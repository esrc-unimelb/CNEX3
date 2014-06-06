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

class Graph:

    def __init__(self, request):
        """For a given site - assemble the entity graph
        
        @params:
        request.matchdict: code, the site of interest
        """
        self.dbs = DBSession()

        self.site = request.matchdict['code']
        self.session_id = request.matchdict['session_id']

        # read the site config and bork if bad site requested
        conf = Config(request)
        eac_path = conf.sites[self.site]['eac']
        self.source_map = conf.sites[self.site]['map']
        log.debug("Processing site: %s, data path: %s" % (self.site, eac_path))

        # ensure we start with a clean slate
        cleanup(self.site, self.session_id, graph=True)

        # generate the list of datafiles
        #  store a trace that indicates we're counting
        p = Progress(
            processed = -1, 
            total = 0,
            site = self.site, 
            session_id = self.session_id
        )
        self.dbs.add(p)
        transaction.commit()
        log.debug(eac_path)
        for (dirpath, dirnames, filenames) in os.walk(eac_path):
            if dirpath == eac_path:
                self.datafiles = dict((fname, "%s/%s" % (dirpath, fname)) for fname in filenames)

        self.total = len(self.datafiles.items())
        log.debug("Total number of entities in dataset: %s" % self.total)


    def build(self, graph_type):
        t1 = time.time()

        graph = nx.Graph()
        count = 0
        nodes = {}
        for fpath, fname in self.datafiles.items():
            log.debug("Processing: %s" % os.path.join(fpath,fname))
            count += 1

            p = self.dbs.query(Progress) \
                .filter(Progress.site == self.site) \
                .filter(Progress.session_id == self.session_id) \
                .one()
            p.processed = count
            p.total = self.total
            transaction.commit()

            try:
                tree = etree.parse(fname)
            except (TypeError, etree.XMLSyntaxError):
                log.error("Invalid XML file: %s. %s." % (fname, sys.exc_info()[1]))
                continue

            if graph_type == 'byEntity':
                self.entities_as_nodes(graph, tree);
            elif graph_type == 'byFunction':
                self.functions_as_nodes(graph, tree)
 
        for n in graph:
            graph.node[n]['connections'] = len(graph.neighbors(n))

        site_name = get(tree, '/e:eac-cpf/e:control/e:maintenanceAgency/e:agencyName')

        # cleanup progress counters and graphs
        cleanup(self.site, self.session_id)

        # save the graph
        #g = Graph(site = site, graph = json_graph.dumps(graph), site_name = site_name)
        #dbs.add(g)

        # get the site name out of the last file
        t2 = time.time()
        log.debug("Time taken to prepare data '/site': %s" % (t2 - t1))
        return (site_name, graph)
    
    def functions_as_nodes(self, graph, tree):
            node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
            source = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:entityId')
            ntype = get(tree, "/e:eac-cpf/e:control/e:localControl[@localType='typeOfEntity']/e:term")
            name = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:nameEntry/e:part')
            graph.add_node(node_id, { 'source': source, 'type': ntype, 'name': name, 'from': '', 'to': ''})

            if tree.xpath('/e:eac-cpf/e:cpfDescription/e:description/e:functions/e:function/e:term', namespaces={ 'e': 'urn:isbn:1-931666-33-4' } ):
                for function in get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:functions/e:function/e:term', element=True):
                    graph.add_node(function.text, { 'source': '', 'type': 'function', 'name': function.text, 'from': '', 'to': '' })
                    graph.add_edge(node_id, function.text)

            else:
                for function in get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:occupations/e:occupation/e:term', element=True):
                    graph.add_node(function.text, { 'source': '', 'type': 'function', 'name': function.text, 'from': '', 'to': '' })
                    graph.add_edge(node_id, function.text)
        
    def entities_as_nodes(self, graph, tree):
            node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
            if type(node_id) == str:
                source = get(tree, '/e:eac-cpf/e:cpfDescription/e:identity/e:entityId')
                ntype = get(tree, "/e:eac-cpf/e:control/e:localControl[@localType='typeOfEntity']/e:term")
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
                        neighbour_ref = node.attrib['{http://www.w3.org/1999/xlink}href']
                        neighbour_ref_local = neighbour_ref.replace(self.source_map[0], self.source_map[1])
                        try:
                            xml_datafile = get_xml(href=neighbour_ref_local)
                            if xml_datafile is not None:
                                xml_datafile_local = xml_datafile.replace(self.source_map[0], self.source_map[1])
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
                        graph.add_edge(node_id, neighbour_id)
                    except KeyError:
                        pass
                #print node_id, node_source, node_type

