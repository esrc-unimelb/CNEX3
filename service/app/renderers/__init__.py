import msgpack

class MsgPackRenderer(object):
    def __init__(self, info):
        pass
    def __call__(self, value, system):
        request = system.get('request')
        if request is not None:
            response = request.response
            ct = response.content_type
            if ct == response.default_content_type:
                response.content_type = 'application/x-msgpack'
        return msgpack.packb(value)

import ujson
class UjsonRenderer(object):
    def __init__(self, info):
        pass
    def __call__(self, value, system):
        request = system.get('request')
        if request is not None:
            response = request.response
            ct = response.content_type
            if ct == response.default_content_type:
                response.content_type = 'application/x-msgpack'
        return ujson.dumps(value)

