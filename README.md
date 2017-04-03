# Description
This is a template for a Google AppEngine based python backend for a lean landing page, with optional integration with sendgrid for email notifications.

It provides API to collect lead contact info, and send email notification to the configured admins when a new lead signs up.

It also provides, through integration with sendgrid, the ability to send any configured email template to any lead.

## Landing UI
For a frontend UI just drop anything in the frontend subdirectory (e.g. a boostrap theme).

## Admin UI
There is a built in Admin UI on top of the backend APIs.

At `<project-name>.appspot.com/admin`

## Backend API
### Leads
/lead

### Config
/config

### Notification
/notification

### Templates
/templates

## Customization
Sendgrid key
Sendgrid template IDs
Sendgrid sender email

## Deployment using bitbucket pipeline
The deployment process can be automated using the included bitbucket-pipelines.yml

## Debug Options

# Setup

## Create Project
Go to [the google cloud console](https://console.cloud.google.com), select `Create project` and follow the instructions.

## Clone the repository
```
$ git clone url/<repo>.git
```

### Git config
#### Set username and email
```
$ git config user.email "your@email"
$ git config user.name "Your Name"
```

## Deploy Services
In the service directory:

First make sure you have the 3rd party dependencies (you'll need to have pip and python2.7 installed):
```
$ pip2.7 install -U -r requirements.txt -t lib
```
Then deploy using gcloud:
```
$ gcloud --project=<project-name> app deploy --version=dev --no-promote app.yaml
```

### Create Credentials
In the API Manager go to the Credentials tab, click the Create Credentials dropdown and select Service account key.

Choose the the App Engine default service account and JSON as the key type.

If you don't see the App Engine default service account in the list, deploy the services first (see below).

## Update Indices
In the `default` service (where the `index.yaml` file is stored):
```
$ gcloud --project=<project-name> datastore create-indexes index.yaml
```

In the google cloud console, go to the Datastore->Indexes tab and wait for the indexing to complete.

## Update Queues
In the `default` service (where the `queue.yaml` file is stored):
```
$ appcfg.py -A <project-name> update_queues .
```

## Configure
Go to `<project-name>.appspot.com/admin` and create a dummy test user. This will initialize the datastore entity kinds.

In order to have email functionality you must at minimum configure the sendgrid API key, and (optionally) an admin email.

Use the **Config** table in the admin page and configure the following:

### Sengrid
Key Name: `sendgrid.key`

Value: `<api key>` (replace with actual api key)

### Admins
Key Name: `admin`

Value: `your@email`

You may create multiple rows with the `admin` key to create multiple admins.
