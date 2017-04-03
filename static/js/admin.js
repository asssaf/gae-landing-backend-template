const {Accordion, Alert, Button, Col, ControlLabel, DropdownButton, Form, FormControl, FormGroup,
       Glyphicon, MenuItem, PageHeader, Panel, Table} = ReactBootstrap;

class Admin extends React.Component {
    render() {
        return (
            <Panel>
                <PageHeader>Admin</PageHeader>
                <Accordion>
                    <Panel header="Leads" bsStyle="primary" eventKey="1"><Leads /></Panel>
                    <Panel header="Config" bsStyle="primary" eventKey="2"><Config /></Panel>
                    <Panel header="Email Templates" bsStyle="primary" eventKey="3"><Templates /></Panel>
                </Accordion>
            </Panel>
        )
    }
}


class Leads extends React.Component {
    constructor(props) {
        super(props);
        this.state = { leads: [], newLead: false }
        this.componentDidMount = this.componentDidMount.bind(this)
        this.componentWillUnmount = this.componentWillUnmount.bind(this)
    }

    componentDidMount() {
        this.serverRequest = $.get("/lead", function (resp) {
            if (resp != null) {
                this.setState({
                    leads: resp,
                    newLead: false
                })
            }
        }.bind(this))
    }

    componentWillUnmount() {
        this.serverRequest.abort();
    }

    render() {
        var newLead = {
            "id": null,
            "first_name": null,
            "last_name": null,
            "email": null,
            "date": "<automatic>",
            "token": "<automatic>",
            "version": "admin"
        }
        return (
            <div>
                <Table striped bordered condensed hover>
                    <thead>
                        <tr>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>email</th>
                            <th>Date</th>
                            <th>Version</th>
                            <th>Token</th>
                            <th/>
                            <th/>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.leads.map(function(lead) {
                            return (
                                <LeadRow key={lead.id} lead={lead} onChange={this.componentDidMount} />
                            )
                        }, this)}

                        <LeadRow lead={newLead} onChange={this.componentDidMount} />
                    </tbody>
                </Table>
            </div>
        )
    }
}


class LeadRow extends React.Component {
    constructor(props) {
        super(props);
		this.state = { edit: false }
        this.handleStartEdit = this.handleStartEdit.bind(this)
        this.handleEditChange = this.handleEditChange.bind(this)
        this.handleFinishEdit = this.handleFinishEdit.bind(this)
        this.handleCancelEdit = this.handleCancelEdit.bind(this)
        this.handleDelete = this.handleDelete.bind(this)
    }

    handleStartEdit(obj) {
        this.setState({ edit: true, editLead: this.props.lead })
    }

    handleEditChange(prop, value) {
        var editLead = this.state.editLead
        editLead[prop] = value
        this.setState({ editLead: editLead })
    }

    handleFinishEdit(obj) {
        var id = this.props.lead.id
        console.log("Update lead: " + id)

        var url
        var method
        if (id == null) {
            url = "/lead"
            method = "POST"

        } else {
            url = "/lead/" +id
            method = "PUT"
        }

        $.ajax(url, {
            dataType: "text",
            data: JSON.stringify(this.state.editLead),
            method: method,
            success: function (resp) {
                console.log("Updated successfully")
                console.log(resp)
                this.props.onChange()
                this.setState({ edit: false})
            }.bind(this),

            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Update failed")
                //console.log(jqXHR.responseJSON.error.message)
                console.log($.parseJSON(jqXHR.responseText))
            }.bind(this)
        })
    }

    handleCancelEdit(obj) {
        this.setState({ edit: false })
        this.props.onChange()
    }

    handleDelete(obj) {
        var id = this.props.lead.id
        console.log("Delete lead: " + id)
        $.ajax("/lead/" + id, {
            dataType: "text",
            method: "DELETE",
            success: function (resp) {
                console.log("Deleted successfully")
                console.log(resp)
                this.props.onChange()
            }.bind(this),

            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Delete failed")
                //console.log(jqXHR.responseJSON.error.message)
                console.log($.parseJSON(jqXHR.responseText))
            }.bind(this)
        });
    }

    render() {
        return (
            <tr key={this.props.lead.id}>
                {["first_name", "last_name", "email", "date", "version", "token"]
                    .map(function(prop) {
                        var currentValue = this.props.lead[prop]

                        if (this.state.edit) {
                            currentValue = <CellEditor key={prop} prop={prop} value={this.state.editLead} onChange={this.handleEditChange} />

                        } else if (this.props.lead.id == null) {
                            currentValue = ""
                        }

                        return (
                            <td key={prop}>
                                {currentValue}
                            </td>
                        )
                    }, this)}

                {!this.state.edit &&
                    <td><Button id={this.props.lead.id} onClick={this.handleStartEdit}><Glyphicon glyph={ this.props.lead.id == null ? "plus" : "pencil"} /></Button></td>
                }
                {!this.state.edit &&
                    <td>
                        {this.props.lead.id &&
                            <Button id={this.props.lead.id} onClick={this.handleDelete}><Glyphicon glyph="trash" /></Button>
                        }
                    </td>
                }

                {this.state.edit &&
                    <td><Button id={this.props.lead.id} onClick={this.handleFinishEdit}><Glyphicon glyph="ok" /></Button></td>
                }
                {this.state.edit &&
                    <td><Button id={this.props.lead.id} onClick={this.handleCancelEdit}><Glyphicon glyph="remove" /></Button></td>
                }

            </tr>
        )
    }
}

class CellEditor extends React.Component {
    constructor(props) {
        super(props);
        this.state = { value: this.props.value[this.props.prop] }
        this.handleChange = this.handleChange.bind(this)
    }

    handleChange(obj) {
        this.setState({ value: obj.target.value })
        this.props.onChange(this.props.prop, obj.target.value)
    }

    getValidationState() {
        var length = 0
        if (this.state.value != null) {
            length = this.state.value.length
        }

        if (length > 1) {
            return null

        } else {
            return 'error'
        }
    }

    render() {
        return (
            <FormGroup validationState={this.getValidationState()}>
                <FormControl type="text" value={this.state.value} onChange={this.handleChange}
                        placeholder={this.props.prop} />
            </FormGroup>
        )
    }
}


class Config extends React.Component {
    constructor(props) {
        super(props);
        this.state = { config: [], newConfig: false }
        this.componentDidMount = this.componentDidMount.bind(this)
        this.componentWillUnmount = this.componentWillUnmount.bind(this)
    }

    componentDidMount() {
        this.serverRequest = $.get("/config", function (resp) {
            if (resp != null) {
                this.setState({
                    config: resp,
                    newConfig: false
                })
            }
        }.bind(this))
    }

    componentWillUnmount() {
        this.serverRequest.abort();
    }


    render() {
        var newConfigItem = {
            "id": null,
            "name": null,
            "value": null,
        }

        return (
            <div>
                <Table striped bordered condensed hover>
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                            <th/>
                            <th/>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.config.map(function(config_item) {
                            return (
                                <ConfigRow key={config_item.key} config_item={config_item} onChange={this.componentDidMount} />
                            )
                        }, this)}

                        <ConfigRow config_item={newConfigItem} onChange={this.componentDidMount} />
                    </tbody>
                </Table>
            </div>
        )
    }
}


class ConfigRow extends React.Component {
    constructor(props) {
        super(props);
        this.state = { edit: false }
        this.handleStartEdit = this.handleStartEdit.bind(this)
        this.handleEditChange = this.handleEditChange.bind(this)
        this.handleFinishEdit = this.handleFinishEdit.bind(this)
        this.handleCancelEdit = this.handleCancelEdit.bind(this)
        this.handleDelete = this.handleDelete.bind(this)
    }

    handleStartEdit(obj) {
        this.setState({ edit: true, editConfigItem: this.props.config_item })
    }

    handleEditChange(prop, value) {
        var editConfigItem = this.state.editConfigItem
        editConfigItem[prop] = value
        this.setState({ editConfigItem: editConfigItem })
    }

    handleFinishEdit(obj) {
        var id = this.props.config_item.id
        console.log("Update config item: " + id)

        var url
        var method
        if (id == null) {
            url = "/config"
            method = "POST"

        } else {
            url = "/config/" +id
            method = "PUT"
        }

        $.ajax(url, {
            dataType: "text",
            data: JSON.stringify(this.state.editConfigItem),
            method: method,
            success: function (resp) {
                console.log("Updated successfully")
                console.log(resp)
                this.props.onChange()
                this.setState({ edit: false})
            }.bind(this),

            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Update failed")
                //console.log(jqXHR.responseJSON.error.message)
                console.log($.parseJSON(jqXHR.responseText))
            }.bind(this)
        })
    }

    handleCancelEdit(obj) {
        this.setState({ edit: false })
        this.props.onChange()
    }

    handleDelete(obj) {
        var id = this.props.config_item.id
        console.log("Delete config item: " + id)
        $.ajax("/config/" + id, {
            dataType: "text",
            method: "DELETE",
            success: function (resp) {
                console.log("Deleted successfully")
                console.log(resp)
                this.props.onChange()
            }.bind(this),

            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Delete failed")
                //console.log(jqXHR.responseJSON.error.message)
                console.log($.parseJSON(jqXHR.responseText))
            }.bind(this)
        });
    }

    render() {
        return (
            <tr key={this.props.config_item.id}>
                {["name", "value"]
                    .map(function(prop) {
                        var currentValue = this.props.config_item[prop]

                        if (this.state.edit) {
                            currentValue = <CellEditor key={prop} prop={prop} value={this.state.editConfigItem} onChange={this.handleEditChange} />

                        } else if (this.props.config_item.id == null) {
                            currentValue = ""
                        }

                        return (
                            <td key={prop}>
                                {currentValue}
                            </td>
                        )
                    }, this)}

                {!this.state.edit &&
                    <td><Button id={this.props.config_item.id} onClick={this.handleStartEdit}><Glyphicon glyph={ this.props.config_item.id == null ? "plus" : "pencil"} /></Button></td>
                }

                {!this.state.edit &&
                    <td>
                        {this.props.config_item.id &&
                            <Button id={this.props.config_item.id} onClick={this.handleDelete}><Glyphicon glyph="trash" /></Button>
                        }
                    </td>
                }

                {this.state.edit &&
                    <td><Button id={this.props.config_item.id} onClick={this.handleFinishEdit}><Glyphicon glyph="ok" /></Button></td>
                }
                {this.state.edit &&
                    <td><Button id={this.props.config_item.id} onClick={this.handleCancelEdit}><Glyphicon glyph="remove" /></Button></td>
                }

            </tr>
        )
    }
}


class Templates extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            "templates": [],
            "selectedTemplate": null
        }
        this.componentDidMount = this.componentDidMount.bind(this)
        this.componentWillUnmount = this.componentWillUnmount.bind(this)
        this.handleTemplateSelected = this.handleTemplateSelected.bind(this)
    }

    componentDidMount() {
        this.serverRequest = $.get("/templates", function (resp) {
            if (resp != null) {
                this.setState({
                    templates: resp.templates,
                })
            }
        }.bind(this))
    }

    componentWillUnmount() {
        this.serverRequest.abort();
    }

    handleTemplateSelected(template) {
	this.setState({ "selectedTemplate": template })
    }

    render() {
        var title = "Select"
        if (this.state.selectedTemplate != null) {
            title = this.state.selectedTemplate.name
        }

        return (
            <div>
                Template:
                <DropdownButton bsStyle="default" title={title} id="template"
                        onSelect={this.handleTemplateSelected}>
                    {this.state.templates.map(function(template) {
                        return (
                            <MenuItem key={template.id} eventKey={template}>{template.name}</MenuItem>
                        )
                    }, this)}
                </DropdownButton>
                <TemplateContent template={this.state.selectedTemplate} />
            </div>
        )
    }
}


class TemplateContent extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            "templateContent": null,
            "email": "",
            "data": {},
            "status": "info",
            "statusMessage": ""
        }
        this.componentWillReceiveProps = this.componentWillReceiveProps.bind(this)
        this.handlePlaceholderChanged = this.handlePlaceholderChanged.bind(this)
        this.handleEmailChanged = this.handleEmailChanged.bind(this)
        this.handleSendClicked = this.handleSendClicked.bind(this)
    }

    componentWillReceiveProps(nextProps) {
	if (nextProps.template == null) {
            this.setState({
                "templateContent": null
            })
            return
        }

        $.get("/templates/" + nextProps.template.id, function (resp) {
            if (resp != null) {
                this.setState({
                    "templateContent": resp
                })
            }
        }.bind(this))
    }

    handlePlaceholderChanged(e) {
        var data = this.state.data
        data[e.target.id] = e.target.value
        this.setState({ "data": data })
    }

    handleEmailChanged(e) {
        this.setState({ "email": e.target.value })
    }

    handleSendClicked() {
        var data = this.state.data
        if (!data["debug"]) {
            data["debug"] = " "
        }
        var payload = {
            "template_id": this.state.templateContent.id,
            "to": [this.state.email],
            "data": data
        }

        var url = "/notification"
        $.ajax(url, {
            dataType: "text",
            data: JSON.stringify(payload),
            method: "POST",
            success: function (resp) {
                console.log("Sent successfully")
                console.log(resp)
                this.setState({
                    email: "",
                    status: "success",
                    statusMessage: "Sent successfully to '" + this.state.email + "'"
                })
            }.bind(this),
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("Send failed")
                //console.log(jqXHR.responseJSON.error.message)
                //console.log($.parseJSON(jqXHR.responseText))
                this.setState({
                    status: "danger",
                    statusMessage: "Send failed to '" + this.state.email + "'"
                })
            }.bind(this)
        })
    }

    render() {
        if (this.state.templateContent == null) {
            return ( <div /> )
        }
        var activeVersion = this.getActiveTemplateVersion(this.state.templateContent)
	if (activeVersion == null) {
            return ( <div /> )
        }

        var placeholders = this.getPlaceholders(activeVersion)

        return (
            <div>
                <Panel header="Template">
                    <Form horizontal>
                        <FormGroup controlId="subject">
                            <Col componentClass={ControlLabel} sm={2}>
                                Subject
                            </Col>
                            <Col sm={10}>
                                <FormControl.Static>{activeVersion.subject}</FormControl.Static>
                            </Col>
                        </FormGroup>
                        <FormGroup controlId="body">
                            <Col componentClass={ControlLabel} sm={2}>
                                Body
                            </Col>
                            <Col sm={10}>
                                <FormControl.Static>
                                    <Panel>
                                        <div dangerouslySetInnerHTML={{__html: activeVersion.html_content}} />
                                    </Panel>
                                </FormControl.Static>
                            </Col>
                        </FormGroup>
                    </Form>
                </Panel>

                <Panel header="Placeholders">
                    <Form horizontal>
                        {placeholders.map(function(placeholder) {
                            if (placeholder == "debug") {
                                return ""
                            }
                            return (
                                <FormGroup key={placeholder} controlId={placeholder}>
                                    <Col componentClass={ControlLabel} sm={2}>
                                        {placeholder}
                                    </Col>
                                    <Col sm={10}>
                                        <FormControl type="text" placeholder="value" onChange={this.handlePlaceholderChanged} />
                                    </Col>
                                </FormGroup>
                            )
                        }, this)}
                    </Form>
                </Panel>

                <form>
                    <FormGroup controlId="email">
                        <ControlLabel>Email address</ControlLabel>
                        <FormControl
                                type="text"
                                value={this.state.email}
                                placeholder="Enter email address"
                                onChange={this.handleEmailChanged} />
                    </FormGroup>

                    <Button onClick={this.handleSendClicked}>Send</Button>
                    <br/>
                    {this.state.status != "info" &&
                        <Alert bsStyle={this.state.status}>{this.state.statusMessage}</Alert>
                    }
                </form>
            </div>
        )
    }

    getActiveTemplateVersion(templateContent) {
        for (var i = 0; i < templateContent.versions.length; ++i) {
            var version = templateContent.versions[i]
            if (version.active == 1) {
                return version
            }
        }
    }

    getPlaceholders(content) {
        var placeHolderRegEx = /-[^-\s]+-/g
        var result = content.html_content.match(placeHolderRegEx)
        if (result == null) {
            result = []
        }

        var subjectResult = content.subject.match(placeHolderRegEx)
        if (subjectResult != null) {
            result.push.apply(result, subjectResult)
        }

        for (var i = 0; i < result.length; ++i ) {
            result[i] = result[i].substring(1, result[i].length - 1)
        }
	return result
    }
}


ReactDOM.render(
    <Admin />,
    document.getElementById('container')
);
