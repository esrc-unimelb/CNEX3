import os
import sys
import time
from lxml import etree, html
from config import SiteConfig
import ast
import json
import traceback
from connectors import MongoDBConnection as mdb
import logging

log = logging.getLogger(__name__)

from pyramid.httpexceptions import (
    HTTPForbidden,
    HTTPUnauthorized
)

import requests

def get(tree, path, attrib=None, element=None, aslist=None):
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
        if len(result) == 1 and aslist != True:
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
            log.error(path)
            log.error(tree.xpath(path, namespaces={ 'e': 'urn:isbn:1-931666-33-4' }))

def get_xml(href):
    """Given a href, find the corresponding XML data file.

    @params:
    href: a URL to a resource.o

    @returns:
    a URL to the XML file for that resource
    """
    try:
        tree = html.parse(href)
        try:
            resource = tree.xpath('//meta[@name="EAC"]')[0].attrib['content']
            return resource
        except IndexError:
            return None
    except IOError:
        return None

def get_site_data(request, authenticated=False, claims=None):
    site_configs = os.path.join(os.path.dirname(request.registry.settings['app.config']), request.registry.app_config['general']['sites'])
    sites = {}
    for f in os.listdir(site_configs):
        c = SiteConfig(os.path.join(site_configs, f))
        d = c.load(f)
        sites[f] = d

    if authenticated:
        # if the user has been authenticated - return all public sites AND private 
        # ones they're allowed to see
        if claims is not None:
            groups = claims['user']['groups'] 

            # return only the public sites and the allowed private ones
            allowed_sites = {}
            for s in sites:
                # push all the public sites in
                if sites[s]['public']: 
                    allowed_sites[s] = sites[s];
                else:
                    # check group allows
                    s1 = set(sites[s]['allow_groups'])
                    s2 = set(groups)
                    r = s1.intersection(s2)
                    if r:
                        log.info("%s: access granted to: %s (%s)" % (s,claims['user']['name'], claims['user']['email']))
                        allowed_sites[s] = sites[s];
                        continue

                    # check user allows
                    if claims['user']['email'] in sites[s]['allow_users']:
                        log.info("%s: access granted to: %s (%s)" % (s,claims['user']['name'], claims['user']['email']))
                        allowed_sites[s] = sites[s];
                        continue

                    log.info("%s: access denied to: %s (%s)" % (s,claims['user']['name'], claims['user']['email']))
            return allowed_sites
        else:
            log.error('Something is very wrong. No claims passed when there should have been')
            raise HTTPForbidden

    else:
        # return only the public data
        public_sites = {}
        for s in sites:
            if sites[s]['public']: 
                public_sites[s] = sites[s]
        return public_sites

def verify_access(request, site=None):
    if 'Authorization' in request.headers:
        resp = requests.get(request.registry.app_config['general']['token'], headers={ 'Authorization': request.headers['Authorization'] })
        
        if resp.status_code == 200:
            claims = json.loads(resp.text)['claims']
            sites = get_site_data(request, authenticated=True, claims=claims)

            if site is not None:
                site_data = sites.pop(site, None)
                if site_data == None:
                    log.info("%s: Access to: %s denied. %s (%s)" % (request.client_addr, site, claims['user']['name'], claims['user']['email']))
                    raise HTTPForbidden

                log.info("%s: Access granted to: %s, %s (%s)" % (request.client_addr, site, claims['user']['name'], claims['user']['email']))
                return claims, site_data
            else:
                log.info("%s: Access granted to: %s (%s)" % (request.client_addr, claims['user']['name'], claims['user']['email']))
                return claims, sites
    else:
        log.info("%s: No Authorisation header in request. Stripping private sites." % request.client_addr)
        sites = get_site_data(request, authenticated=False)
        if site is not None:
            site_data = sites.pop(site, None)
            if site_data == None:
                log.info ("xxxx")
                log.info("%s: Access denied." % request.client_addr)
                raise HTTPForbidden
                return None, site_data
            else:
                return None, sites

