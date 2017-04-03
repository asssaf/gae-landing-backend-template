const {Modal, Button, Image, FormGroup, FormControl, Navbar, Nav, NavItem} = ReactBootstrap;

class Header extends React.Component {
  render() {
    return (
      <Navbar inverse>
        <Navbar.Header>
          <Navbar.Brand>
            <a href="#">Home</a>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>
        <Navbar.Collapse>
          <Nav>
            <NavItem href="http://blog.CUSTOMIZE/">Blog</NavItem>
          </Nav>
          <Nav pullRight>
            <NavItem target="_blank" href="mailto:info@CUSTOMIZE">Contact us</NavItem>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

class ConfirmationDialog extends React.Component {
  render() {
    return (
      <Modal show={this.props.show}>
        <Modal.Body>
          Thank you for signing up.
          We will let you know when CUSTOMIZE is ready to go.
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={this.props.onClose} bsStyle="info">Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }
}

class Application extends React.Component {

  constructor(props) {
    super(props);
		this.state = {email: '', showDialog: false};
    this.onEmailChange = this.onEmailChange.bind(this);
    this.onCloseDialog = this.onCloseDialog.bind(this);
    this.postEmail = this.postEmail.bind(this);
  }

    componentDidMount() {
        this.serverRequest = $.get('/version', function(resp) {
            if (resp != null) {
                this.setState({version: resp.version}, function() {
                    this.track("PageView")
                })
            }
        }.bind(this))
    }

    componentWillUnmount() {
        this.serverRequest.abort();
    }

    track(event) {
        if (!this.state.version || this.state.version.startsWith('dev')) {
            // TODO separate pixel for dev?
            console.log("Ignoring event: " + event)
            return
        }

        // CUSTOMIZE if using analytics
        //fbq('track', event + "_" + this.state.version)
    }

  postEmail() {
    this.track("Lead")
    const request = new XMLHttpRequest();
    const url = '/lead';
    const params = JSON.stringify({
      email: this.state.email,
      comment: "",
    });
    request.open("POST", url, true);
    request.onreadystatechange = () =>
      this.setState({showDialog: request.status === 200});
    request.send(params);
  }

  onEmailChange(event) {
    this.setState({email: event.target.value});
  }

  onCloseDialog(event) {
    this.setState({showDialog: false});
  }

  getValidationState() {
    const {email} = this.state;
    if (
      email.indexOf('@') === -1 ||
      email.indexOf('.') === -1 ||
      email.indexOf(' ') !== -1
    ) {
      return 'error';
    }
    return 'success';
  }

  render() {
    return (

    <div className="main">
        <Header />
        <div className="overlay">
            <div className="content">
    				<div className="title">CUSTOMIZE</div>
            </div>

        <div className="content">
    				<div className="description">
    					CUSTOMIZE
    				</div>

                <Image className="arrow" src="/static/resources/arrow.gif" />
    			</div>
        </div>

				<div className="signup">
					<div className="h1">
						Stay connected!
					</div>
					<FormGroup
						validationState={this.getValidationState()}
						controlId="formBasicText">
						<FormControl
							value={this.state.value}
							type="text"
							placeholder="Email"
              onChange={this.onEmailChange}
						/>
            <Button
							className="submit"
              bsStyle="success"
              disabled={this.getValidationState() !== 'success'}
              onClick={this.postEmail}>
              NOTIFY ME
            </Button>
					</FormGroup>
				</div>

        <div className="contact">
            © Copyright 2016 by CUSTOMIZE
            <div className="social">
                <a href="https://twitter.com/CUSTOMIZE"><img src="static/resources/twitter.png" /></a>
                <a href="https://facebook.com/CUSTOMIZE"><img src="static/resources/facebook.png" /></a>
            </div>
        </div>

        <ConfirmationDialog
          show={this.state.showDialog}
          onClose={this.onCloseDialog}
        />
      </div>
    );
  }
}

ReactDOM.render(
    <Application />,
    document.getElementById('container')
);
