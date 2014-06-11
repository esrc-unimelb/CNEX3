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

class Network:

    def __init__(self, request):
        """For a given site - assemble the entity graph
        
        @params:
        request.matchdict: code, the site of interest
        """
        self.dbs = DBSession()

        self.request = request
        self.site = request.matchdict['code']

        # read the site config and bork if bad site requested
        conf = Config(request)
        self.eac_path = conf.sites[self.site]['eac']
        self.source_map = conf.sites[self.site]['map']
        log.debug("Processing site: %s, data path: %s" % (self.site, self.eac_path))

    def build(self, graph_type):
        t1 = time.time()

        try:
            # if we already have the data - return it immediately
            n = self.dbs.query(NetworkModel) \
                    .filter(NetworkModel.site == self.site) \
                    .filter(NetworkModel.graph_type == graph_type) \
                    .one()

            # get the site name out of the last file
            t2 = time.time()
            log.debug("Time taken to prepare data '/site': %s" % (t2 - t1))
            return n.graph_data
        except sq.orm.exc.NoResultFound:
            pass
        
        # OTHERWISE:
        # generate the list of datafiles
        for (dirpath, dirnames, filenames) in os.walk(self.eac_path):
            if dirpath == self.eac_path:
                datafiles = dict((fname, "%s/%s" % (dirpath, fname)) for fname in filenames)

        total = len(datafiles.items())
        log.debug("Total number of entities in dataset: %s" % total)

        # in the case of multiple users requesting the graph at the same time
        #  see if a progress trace exists - if not, start a fresh one
        try:
            p = self.dbs.query(Progress) \
                    .filter(Progress.site == self.site) \
                    .one()
        except sq.orm.exc.NoResultFound:
            #  store a trace that indicates we're counting
            p = Progress(
                processed = -1, 
                total = total,
                site = self.site,
                valid_to = datetime.now() + timedelta(hours=float(self.request.registry.settings['data_age']))
            )
            self.dbs.add(p)
            transaction.commit()

        graph = nx.DiGraph()
        count = 0
        nodes = {}
        for fpath, fname in datafiles.items():
            log.debug("Processing: %s" % os.path.join(fpath,fname))
            count += 1

            p = self.dbs.query(Progress) \
                .filter(Progress.site == self.site) \
                .one()
            p.processed = count
            p.total = total
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
 
            # save the graph
            try:
                # either we get an existing record
                n = self.dbs.query(NetworkModel) \
                        .filter(NetworkModel.site == self.site) \
                        .filter(NetworkModel.graph_type == graph_type) \
                        .one()
                n.graph_data = json.dumps(json_graph.node_link_data(graph))

            except sq.orm.exc.NoResultFound:
                # or we create a new one
                n = NetworkModel(site = self.site, graph_type = graph_type)
                n.graph_data = json.dumps(json_graph.node_link_data(graph))
                self.dbs.add(n)

            self.dbs.flush()
            transaction.commit()

        for n in graph:
            graph.node[n]['connections'] = len(graph.neighbors(n))

        site_name = get(tree, '/e:eac-cpf/e:control/e:maintenanceAgency/e:agencyName')

        # delete any existing progress counters
        self.dbs.query(Progress) \
            .filter(Progress.site == self.site) \
            .delete()
        transaction.commit()

        # get the site name out of the last file
        t2 = time.time()
        log.debug("Time taken to prepare data '/site': %s" % (t2 - t1))
        return json.dumps(json_graph.node_link_data(graph))
    
    def functions_as_nodes(self, graph, tree):
            node_id = get(tree, '/e:eac-cpf/e:control/e:recordId')
            ntype = get(tree, "/e:eac-cpf/e:control/e:localControl[@localType='typeOfEntity']/e:term")
            graph.add_node(node_id, { 'type': ntype })

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
            graph.add_node(node_id, { 'type': ntype })

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
                    graph.add_edge(node_id, neighbour_id, source_name=node_id, target_name=neighbour_id)
                except KeyError:
                    pass
            #print node_id, node_source, node_type

