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
        self.site = request.matchdict.get('code')
        self.eid = request.matchdict.get('id')
        claims, site = verify_access(request, site=self.site)

        self.eac_path = site['eac']
        self.source_map = site['map']
        self.name = site['name']
        self.url = site['url']
        log.debug("Processing site: %s, data path: %s" % (self.site, self.eac_path))

    def build(self) :
        # is the data available? return now; nothing to do
        doc = self.db.entity.find_one({ 'site': self.site, 'id': self.eid  })
        if doc is not None:
            log.debug('Graph already built. No need to build it again')
            return 
        
        j = multiprocessing.Process(target=self.build_graph)
        j.start()

    def build_graph(self): 
        log.debug('Building the graph.')
        t1 = time.time()

        self.graph = nx.Graph()
        count = 0
        save_counter = 0
        nodes = {}
        fname = os.path.join(self.eac_path, "%s.xml" % self.eid)

        try:
            tree = etree.parse(fname)
        except (TypeError, etree.XMLSyntaxError):
            log.error("Invalid XML file: %s. %s." % (fname, sys.exc_info()[1]))

        ndegrees = 0
        self.entities_as_nodes(tree, ndegrees)

        # count the number of connections
        for n in self.graph:
            self.graph.node[n]['connections'] = len(self.graph.neighbors(n))

        # save the graph
        self.db.entity.insert({
            'site': self.site,
            'id': self.eid,
            'graph_data': json_graph.node_link_data(self.graph),
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

    def entities_as_nodes(self, tree, ndegrees):
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

        try:
            self.graph.node[node_id]['type'] = ntype
            self.graph.node[node_id]['coreType'] = core_type
            self.graph.node[node_id]['name'] = name
            self.graph.node[node_id]['url'] = url 
            self.graph.node[node_id]['df'] = df
            self.graph.node[node_id]['dt'] = dt

        except:
            self.graph.add_node(node_id, { 'type': ntype, 'coreType': core_type, 'name': name, 'url': url, 'df': df, 'dt': dt })

        related_resources = get(tree, '/e:eac-cpf/e:cpfDescription/e:relations/e:resourceRelation[@resourceRelationType="other"]', element=True, aslist=True)
        for node in related_resources:
            # for each node - get the id, type, name and href
            #  add a node to describe it
            #  add an edge between this node (context node) and the resource node
            rurl = node.attrib['{http://www.w3.org/1999/xlink}href']
            core_type = get(node, 'e:relationEntry', attrib='localType')
            rname = get(node, 'e:relationEntry')
            rid = rurl.split('/')[-1:][0].split('.htm')[0]

            if core_type == 'published':
                rtype = rname.split(':')[0]
                rname = rname.split(':', 1)[1:][0].strip()
            else:
                rtype = core_type
            self.graph.add_node(rid, { 'type': rtype, 'coreType': core_type, 'name': rname, 'url': rurl })
            self.graph.add_edge(rid, node_id, source_id=rid, target_id=node_id)

        if ndegrees == 1:
            return

        ndegrees += 1
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
                        neighbour_tree = etree.parse(xml_datafile_local)
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
                neighbour_id = get(neighbour_tree, '/e:eac-cpf/e:control/e:recordId')
                if len(neighbour_id) == 0:
                    # we've probably read an eac file - try the eac xpath
                    neighbour_id = get(neighbour_tree, '/eac/control/id')

                # add node, add edge, call this method on this node
                self.graph.add_node(neighbour_id)
                self.graph.add_edge(node_id, neighbour_id, source_id=node_id, target_id=neighbour_id)
                self.entities_as_nodes(neighbour_tree, ndegrees)
            except KeyError:
                pass

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

    def data(self):
        # get the data file url
        if self.request.GET.get('q') is not None:
            datafile = self.request.GET.get('q').replace(self.source_map['source'], self.source_map['localpath'])
        else:
            return '' 

        # if there's an EAC ref - use it
        xml = get_xml(datafile)
        if xml is not None:
            tree = etree.parse(xml.replace(self.source_map['source'], self.source_map['localpath']))

            summnote = get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:biogHist/e:abstract', element=True)
            if summnote:
                summnote = etree.tostring(get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:biogHist/e:abstract', element=True), method='html')
            else:
                summnote = ''

            full_note = get(tree, '/e:eac-cpf/e:cpfDescription/e:description/e:biogHist', element=True)
            fn = ''
            if full_note:
                fn = []
                for c in full_note.getchildren():
                    if c.tag == '{urn:isbn:1-931666-33-4}abstract':
                        c.getparent().remove(c)

                full_note = [ etree.tostring(f, method='html') for f in full_note ]
                for c in full_note:
                    c = c.replace('<list',  '<ul' )
                    c = c.replace('</list', '</ul')
                    c = c.replace('<item',  '<li' )
                    c = c.replace('</item', '</li')
                    fn.append(c)
                fn = ' '.join(fn)

            return summnote, fn

        else:
            # no EAC datafile
            tree = html.parse(datafile)
            data = tree.xpath('//dl[@class="content-summary"]')
            return None, etree.tostring(data[0])

