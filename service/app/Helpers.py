import os
import sys
import time
from lxml import etree, html
from .models import (
    DBSession,
    Progress,
    NetworkModel
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
        tree = html.parse(href)
        try:
            resource = tree.xpath('//meta[@name="EAC"]')[0].attrib['content']
            return resource
        except IndexError:
            return None
    except IOError:
        return None

def cleanup(site, graph=None):
    dbs = DBSession()

    # delete any existing progress counters
    dbs.query(Progress) \
        .filter(Progress.site == site) \
        .delete()
    transaction.commit()

    dbs.flush()
