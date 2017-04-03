#!/usr/bin/env python

import hashlib
import json
import logging
import os
import random
import webapp2
from datetime import datetime, date, time
from google.appengine.api import users
from google.appengine.api.modules import modules
from google.appengine.ext import ndb

from notification import notify_admins


DEFAULT_NAMESPACE = 'default'

LEAD_EDITABLE_PROPS = ["email", "first_name", "last_name", "comment"]

EMAIL_SUBJECT_TEMPLATE = "[New Lead] Page: 'CUSTOMIZE'"
EMAIL_TEMPLATE = """
<h3>A new lead has been captured from your landing page</h3>
<table>
    <tr>
        <td>email:</td> <td>{email}</td>
    </tr>

    <tr>
        <td>First:</td> <td>{first_name}</td>
    </tr>

    <tr>
        <td>Last:</td> <td>{last_name}</td>
    </tr>

    <tr>
        <td>Comment:</td> <td>{comment}</td>
    </tr>

    <tr>
        <td>Date:</td> <td>{date}</td>
    </tr>

    <tr>
        <td>Version:</td> <td>{version}</td>
    </tr>
</table>
"""

class Lead(ndb.Model):
    """A main model for representing an individual lead."""
    id = ndb.ComputedProperty(lambda self: self.key.urlsafe())
    email = ndb.StringProperty(indexed=False)
    first_name = ndb.StringProperty(indexed=False)
    last_name = ndb.StringProperty(indexed=False)
    comment = ndb.StringProperty(indexed=False)
    date = ndb.DateTimeProperty(auto_now_add=True)
    version = ndb.StringProperty(indexed=False)
    token = ndb.StringProperty(indexed=True)

    @classmethod
    def query_all(cls, ancestor_key):
        return cls.query(ancestor=ancestor_key).order(-cls.key)

    @classmethod
    def query_by_token(cls, ancestor_key, token):
        return cls.query(ancestor=ancestor_key).filter(Lead.token == token)

    def calc_token(self):
        h = hashlib.new('sha224')
        h.update(str(random.randint(1000, 10000000)))
        h.update(self.key.urlsafe())
        self.token = h.hexdigest()


def lead_key(namespace=DEFAULT_NAMESPACE):
    return ndb.Key('Lead', namespace)


class LeadListHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'application/json'

        user = users.get_current_user()
        if not user or not users.is_current_user_admin():
            self.response.set_status(401)
            return

        token = self.request.get("token")
        if token:
            logging.debug("Filtering by token: %s" % token)
            leads_query = Lead.query_by_token(lead_key(), token)

        else:
            leads_query = Lead.query_all(lead_key())

        leads = leads_query.fetch()

        self.response.write(JSONEncoder().encode(leads))

    def post(self):
        self.response.headers['Content-Type'] = 'application/json'

        namespace = DEFAULT_NAMESPACE
        data = json.loads(self.request.body)
        if "namespace" in data:
            namespace = data["namespace"]

        lead = Lead(parent=lead_key(namespace))

        errors = []
        for key, value in data.items():
            if key in LEAD_EDITABLE_PROPS:
                logging.debug(key)
                setattr(lead, key, value)

            else:
                logging.warn("Ignoring key: %s" % key)

        if errors:
            self.abort(400)
            json.dump({"status": "failure", "errors": errors }, self.response)

        else:
            lead.version = modules.get_current_version_name()
            lead.calc_token()
            lead.put()

            notify_admins(lead.to_dict(), subject_template=EMAIL_SUBJECT_TEMPLATE, body_template=EMAIL_TEMPLATE)

            json.dump({"status": "success" }, self.response)


class LeadHandler(webapp2.RequestHandler):
    def put(self, id):
        self.response.headers['Content-Type'] = 'application/json'

        user = users.get_current_user()
        if not user or not users.is_current_user_admin():
            self.response.set_status(401)
            return

        try:
            key = ndb.Key(urlsafe=id)

        except Exception, e:
            logging.exception(e)
            self.error(400)
            self.response.write('{ "message": "Invalid key: %s" }' % e)
            return

        kind_string = key.kind()
        if not kind_string == "Lead":
            self.error(400)
            self.response.write('{ "message": "Invalid key type: %s" }' % kind_string)
            return

        data = json.loads(self.request.body)
        lead = key.get()
        for key, value in data.items():
            if key in LEAD_EDITABLE_PROPS:
                logging.debug(key)
                setattr(lead, key, value)

            else:
                logging.warn("Ignoring key: %s" % key)

        lead.put()

        self.response.write('{ "id": "%s" }' % id)

    def delete(self, id):
        self.response.headers['Content-Type'] = 'application/json'

        user = users.get_current_user()
        if not user or not users.is_current_user_admin():
            self.response.set_status(401)
            return

        try:
            key = ndb.Key(urlsafe=id)

        except Exception, e:
            logging.exception(e)
            self.error(400)
            self.response.write('{ "message": "Invalid key: %s" }' % e)
            return

        kind_string = key.kind()
        if not kind_string == "Lead":
            self.error(400)
            self.response.write('{ "message": "Invalid key type: %s" }' % kind_string)
            return

        key.delete()

        self.response.write('{ "id": "%s" }' % id)


class VersionHandler(webapp2.RequestHandler):
    def get(self):
        if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'):
            version = modules.get_current_version_name()

        else:
            version = "dev"

        self.response.headers['Content-Type'] = 'application/json'
        json.dump({"version": version }, self.response)


class JSONEncoder(json.JSONEncoder):
    def default(self, o):
        # If this is a key, you might want to grab the actual model.
        if isinstance(o, ndb.Key):
            o = ndb.get(o)

        if isinstance(o, ndb.Model):
            return o.to_dict()
        elif isinstance(o, (datetime, date, time)):
            return str(o)


app = webapp2.WSGIApplication([
    ('/lead', LeadListHandler),
    ('/lead/([^/]+)', LeadHandler),
    ('/version', VersionHandler),
], debug=True)
