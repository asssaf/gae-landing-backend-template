import json
import logging
import sendgrid
import webapp2

from google.appengine.ext import ndb
from sendgrid.helpers.mail import Email, Content, Substitution, Mail, Personalization
from urllib2 import HTTPError

SENDGRID_SENDER = Email('noreply@CUSTOMIZE', 'CUSTOMIZE Admin')

DEFAULT_NAMESPACE = 'default'
CONFIG_APIKEY = 'sendgrid.key'
CONFIG_ADMIN = 'admin'
CONFIG_NOTIFY_LEADS_ENABLED = 'notify.leads.enabled'

CONFIG_ITEM_EDITABLE_PROPS = [ "name", "value" ]


class Config(ndb.Model):
    id = ndb.ComputedProperty(lambda self: self.key.urlsafe())
    name = ndb.StringProperty(indexed=True)
    value = ndb.StringProperty(indexed=False)

    @classmethod
    def query_all(cls, ancestor_key):
        return cls.query(ancestor=ancestor_key).order(-cls.key)

def config_key(namespace=DEFAULT_NAMESPACE):
    return ndb.Key('Config', namespace)


def is_notify_leads_enabled():
    results = Config.query(Config.name == CONFIG_NOTIFY_LEADS_ENABLED).fetch(1)
    if not results:
        # create placeholder in config table
        config = Config(parent=config_key())
        config.name = CONFIG_NOTIFY_LEADS_ENABLED
        config.value = "0"
        config.put()
        return False

    if results[0].value == "1" or results[0].value == "2":
        return True

    return False


def is_notify_leads_failure_enabled():
    results = Config.query(Config.name == CONFIG_NOTIFY_LEADS_ENABLED).fetch(1)
    if not results:
        # create placeholder in config table
        config = Config(parent=config_key())
        config.name = CONFIG_NOTIFY_LEADS_ENABLED
        config.value = "0"
        config.put()
        return False

    if results[0].value == "2":
        return True

    return False


def get_sendgrid_api_key():
    # get sendgrid API key
    apikey_query = Config.query(Config.name == CONFIG_APIKEY)
    apikey_config_results = apikey_query.fetch(1)
    if not apikey_config_results:
        # create placeholder in config table
        apikey_config = Config(parent=config_key())
        apikey_config.name = CONFIG_APIKEY
        apikey_config.value = ''
        apikey_config.put()
        return None

    if len(apikey_config_results) != 1:
        logging.error("Unexpected number of results for query")
        return None

    apikey = apikey_config_results[0].value
    return apikey


def notify_admins(data, template_id=None, subject_template="N/A", body_template="N/A", sender=SENDGRID_SENDER, debug_options=None):
    # get admin emails
    admin_query = Config.query(Config.name == CONFIG_ADMIN)
    admin_results = admin_query.fetch(10)
    if not admin_results:
        # create placeholder in config table
        admin_config = Config(parent=config_key())
        admin_config.name = CONFIG_ADMIN
        admin_config.value = ''
        admin_config.put()
        logging.warn("No admin emails defined in config. Not sending emails")
        return

    if len(admin_results) == 1 and admin_results[0].value == '':
        logging.warn("No admin emails defined in config. Not sending emails")
        return

    admins = [admin.value for admin in admin_results]

    notify(data, admins, template_id, subject_template, body_template, sender, debug_options)


def notify(data, to, template_id=None, subject_template="N/A", body_template="N/A", sender=SENDGRID_SENDER, debug_options=None):
    if isinstance(to, basestring):
        raise Exception("Expected list in 'to'")

    apikey = get_sendgrid_api_key()
    if not apikey:
        logging.warn("%s is not set in config. Not sending emails" % CONFIG_APIKEY)
        return

    sg = sendgrid.SendGridAPIClient(apikey=apikey)

    subject = subject_template.format(**data)
    content = Content('text/html', body_template.format(**data))

    mail = Mail()
    mail.set_from(sender)
    mail.set_subject(subject)
    mail.add_content(content)
    personalization = Personalization()

    for address in to:
        personalization.add_to(Email(address))

    if template_id:
        ## flatten the data dict, adding prefix to nested dicts
        for key, value in data.iteritems():
            if isinstance(value, dict):
                for key2, value2 in value.iteritems():
                    placeholder = "-%s__%s-" % (key, key2)
                    personalization.add_substitution(Substitution(placeholder, value2))

            else:
                placeholder = "-%s-" % key
                personalization.add_substitution(Substitution(placeholder, value))

        mail.set_template_id(template_id)

    mail.add_personalization(personalization)

    no_emails = False
    if debug_options:
        for option in debug_options.split(","):
            if option == "noEmails":
                no_emails = True

    if no_emails:
        logging.info("noEmails debug option set, not sending email: %s" % mail.get())

    else:
        response = sg.client.mail.send.post(request_body=mail.get())

        logging.debug(response.status_code)
        logging.debug(response.body)
        logging.debug(response.headers)


class NotificationHandler(webapp2.RequestHandler):
    def post(self):
        logging.debug("notification request: %s" % self.request.body)
        request = json.loads(self.request.body)
        to = request.get("to")
        subject_template = request.get("subject_template")
        body_template = request.get("body_template")
        template_id = request.get("template_id")
        data = request.get("data")

        errors = []
        if not to:
            errors.append("'to' is required")

        if not template_id:
            if not subject_template:
                errors.append("'subject_template' is required")

            if not body_template:
                errors.append("'body_template' is required")

        else:
            subject_template = "N/A"
            body_template = "N/A"

        if errors:
            logging.error("Errors %s" % ", ".join(errors))
            self.abort(400, explanation=", ".join(errors))
            return

        try:
            if to == "admins":
                notify_admins(data,
                        template_id=template_id,
                        subject_template=subject_template,
                        body_template=body_template)

            else:
                notify(data, to,
                        template_id=template_id,
                        subject_template=subject_template,
                        body_template=body_template)

        except HTTPError, e:
            self.abort(502, explanation=e.read())


class ConfigListHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'application/json'

        config_items = Config.query_all(config_key()).fetch()

        self.response.write(JSONEncoder().encode(config_items))

    def post(self):
        self.response.headers['Content-Type'] = 'application/json'

        namespace = DEFAULT_NAMESPACE
        data = json.loads(self.request.body)
        if "namespace" in data:
            namespace = data["namespace"]

        config_item = Config(parent=config_key(namespace))

        errors = []
        for key, value in data.items():
            if key in CONFIG_ITEM_EDITABLE_PROPS:
                logging.debug(key)
                setattr(config_item, key, value)

            else:
                logging.warn("Ignoring key: %s" % key)

        if errors:
            self.abort(400)
            json.dump({"status": "failure", "errors": errors }, self.response)

        else:
            config_item.put()
            json.dump({"status": "success" }, self.response)


class ConfigHandler(webapp2.RequestHandler):
    def put(self, id):
        self.response.headers['Content-Type'] = 'application/json'

        try:
            key = ndb.Key(urlsafe=id)

        except Exception, e:
            logging.exception(e)
            self.error(400)
            self.response.write('{ "message": "Invalid key: %s" }' % e)
            return

        kind_string = key.kind()
        if not kind_string == "Config":
            self.error(400)
            self.response.write('{ "message": "Invalid key type: %s" }' % kind_string)
            return

        data = json.loads(self.request.body)
        config_item = key.get()
        for key, value in data.items():
            if key in CONFIG_ITEM_EDITABLE_PROPS:
                logging.debug(key)
                setattr(config_item, key, value)

            else:
                logging.warn("Ignoring key: %s" % key)

        config_item.put()

        self.response.write('{ "id": "%s" }' % id)

    def delete(self, id):
        self.response.headers['Content-Type'] = 'application/json'

        try:
            key = ndb.Key(urlsafe=id)

        except Exception, e:
            logging.exception(e)
            self.error(400)
            self.response.write('{ "message": "Invalid key: %s" }' % e)
            return

        kind_string = key.kind()
        if not kind_string == "Config":
            self.error(400)
            self.response.write('{ "message": "Invalid key type: %s" }' % kind_string)
            return

        key.delete()

        self.response.write('{ "id": "%s" }' % id)


class TemplateListHandler(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'application/json'

        apikey = get_sendgrid_api_key()
        if not apikey:
            logging.warn("%s is not set in config. Can't fetch templates." % CONFIG_APIKEY)
            response.write({ "templates": [] })
            return

        sg = sendgrid.SendGridAPIClient(apikey=apikey)

        response = sg.client.templates.get()
        logging.debug(response.status_code)
        logging.debug(response.body)
        logging.debug(response.headers)
        self.response.write(response.body)


class TemplateHandler(webapp2.RequestHandler):
    def get(self, template_id):
        self.response.headers['Content-Type'] = 'application/json'
        apikey = get_sendgrid_api_key()
        if not apikey:
            logging.warn("%s is not set in config. Can't fetch templates." % CONFIG_APIKEY)
            response.write({ })
            return

        sg = sendgrid.SendGridAPIClient(apikey=apikey)
        response = sg.client.templates._(template_id).get()
        self.response.write(response.body)


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
    ('/notification', NotificationHandler),
    ('/config', ConfigListHandler),
    ('/config/([^/]+)', ConfigHandler),
    ('/templates', TemplateListHandler),
    ('/templates/([^/]+)', TemplateHandler),
], debug=True)
