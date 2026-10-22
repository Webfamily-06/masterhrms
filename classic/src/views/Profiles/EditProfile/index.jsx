import React, { useEffect } from 'react';
import { Button, Col, Container, Form, Nav, Row, Tab } from 'react-bootstrap';
import { Link } from '/src/utils/router-compat.jsx';
// Redux
import { connect } from 'react-redux';
import { toggleCollapsedNav } from '../../../redux/action/Theme';

//Image
import avatar3 from '../../../assets/img/avatar3.jpg';

const EditProfile = ({ toggleCollapsedNav }) => {

    useEffect(() => {
        toggleCollapsedNav(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <Container>
            <div className="hk-pg-header pt-7 pb-4">
                <h1 className="pg-title">Edit Profile</h1>
                <p>The Avatar component is used to represent a user, and displays the profile picture, initials or fallback icon.</p>
            </div>
            {/* Page Body */}
            <div className="hk-pg-body">
                <Tab.Container defaultActiveKey="tabBlock1">
                    <Row className="edit-profile-wrap">
                        <Col xs={4} sm={3} lg={2}>
                            <div className="nav-profile mt-4">
                                <div className="nav-header">
                                    <span>Account</span>
                                </div>
                                <Nav as="ul" variant="tabs" className="nav-light nav-vertical">
                                    <Nav.Item as="li">
                                        <Nav.Link eventKey="tabBlock1">
                                            <span className="nav-link-text">Public Profile</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item as="li">
                                        <Nav.Link eventKey="tabBlock2">
                                            <span className="nav-link-text">Account Settings</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item as="li">
                                        <Nav.Link eventKey="tabBlock3">
                                            <span className="nav-link-text">Privacy Settings</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item as="li">
                                        <Nav.Link eventKey="tabBlock4">
                                            <span className="nav-link-text">Login &amp; Security</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item as="li">
                                        <Nav.Link>
                                            <span className="nav-link-text">Notifications</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item as="li">
                                        <Nav.Link>
                                            <span className="nav-link-text">Connections</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item as="li">
                                        <Nav.Link>
                                            <span className="nav-link-text">Billing Info</span>
                                        </Nav.Link>
                                    </Nav.Item>
                                </Nav>
                            </div>
                        </Col>
                        <Col lg={10} sm={9} xs={8}>
                            <Tab.Content>
                                <Tab.Pane eventKey="tabBlock1">
                                    <Form>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group>
                                                    <div className="media align-items-center">
                                                        <div className="media-head me-5">
                                                            <div className="avatar avatar-rounded avatar-xxl">
                                                                <img src={avatar3} alt="user" className="avatar-img" />
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <Button variant="soft-primary" className="btn-file mb-1">
                                                                Upload Photo
                                                                <Form.Control type="file" className="upload" />
                                                            </Button>
                                                            <Form.Text as="div" className="form-text text-muted">
                                                                For better preview recommended size is 450px x 450px. Max size 5mb.
                                                            </Form.Text>
                                                        </div>
                                                    </div>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <div className="title title-xs title-wth-divider text-primary text-uppercase my-4"><span>Personal Info</span></div>
                                        <Row className="gx-3">
                                            <Col sm={6}>
                                                <Form.Group className="mb-3" >
                                                    <Form.Label>First Name</Form.Label>
                                                    <Form.Control type="text" defaultValue="Kate" />
                                                </Form.Group>
                                            </Col>
                                            <Col sm={6}>
                                                <Form.Group className="mb-3" >
                                                    <Form.Label>Last Name</Form.Label>
                                                    <Form.Control type="text" defaultValue="Jones" />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Location</Form.Label>
                                                    <Form.Control type="text" defaultValue="Lane no 1, Newyork" />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <div className="form-label-group">
                                                        <Form.Label>Bio</Form.Label>
                                                        <small className="text-muted">1200</small>
                                                    </div>
                                                    <Form.Control as="textarea" rows={8} placeholder="Write an internal note" />
                                                    <Form.Text muted>
                                                        Brief bio about yourself. This will be displayed on your profile page.
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <div className="title title-xs title-wth-divider text-primary text-uppercase my-4">
                                            <span>Additional Info</span>
                                        </div>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Personal Website</Form.Label>
                                                    <Form.Control type="text" defaultValue="hencework.com" />
                                                </Form.Group>
                                            </Col>
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Phone</Form.Label>
                                                    <Form.Control type="tel" defaultValue="xxxxxxx987" />
                                                </Form.Group>
                                                <Form.Check
                                                    type='checkbox'
                                                    id="customCheckList4"
                                                    label="Keep my number private"
                                                />
                                            </Col>
                                        </Row>
                                        <Button variant="primary" className="mt-5">Save Changes</Button>
                                    </Form>
                                </Tab.Pane>
                                <Tab.Pane eventKey="tabBlock2">
                                    <div className="title-lg fs-4"><span>Account Settings</span></div>
                                    <p className="mb-4">The Avatar component is used to represent a user, and displays the profile picture, initials or fallback icon.</p>
                                    <Form>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Username</Form.Label>
                                                    <Form.Control type="text" defaultValue="Kate" />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Email</Form.Label>
                                                    <Form.Control type="text" defaultValue="Lane no 1, Newyork" />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>URL</Form.Label>
                                                    <Form.Control type="text" defaultValue="hencework.com" />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <div className="title title-xs title-wth-divider text-primary text-uppercase my-4"><span>Tracking Code</span></div>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Google Analytics tracking code</Form.Label>
                                                    <Form.Control type="text" defaultValue="UA-1387652-1" />
                                                    <Form.Text muted>
                                                        Track shot and profile views in your Google analytics account, eg. UA-0000000-0
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <div className="title title-xs title-wth-divider text-primary text-uppercase my-4"><span>Account Changes</span></div>
                                        <Row className="gx-3">
                                            <Col sm={6}>
                                                <Form.Group className="mb-3">
                                                    <Link to="#" className="h5 d-block mb-0">Delete Account</Link>
                                                    <Form.Text muted>
                                                        Delete account and all your data
                                                    </Form.Text>
                                                </Form.Group>
                                            </Col>
                                            <Col sm={6} className="text-end">
                                                <Form.Group className="mb-3">
                                                    <Button variant="danger">Close account</Button>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Button variant="primary" className="mt-5">Save Changes</Button>
                                    </Form>
                                </Tab.Pane>
                                <Tab.Pane eventKey="tabBlock3">
                                    <div className="title-lg fs-4 mb-4">
                                        <span>Privacy Settings</span>
                                    </div>
                                    <Form>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Check className="form-check-lg">
                                                    <Form.Check.Input id="customChecks1" />
                                                    <Form.Check.Label htmlFor="customChecks1">let others find me by email address</Form.Check.Label>
                                                    <Form.Text muted className="d-block">People who have your email address will be able to connect you by Jampack</Form.Text>
                                                </Form.Check>
                                                <div className="separator" />
                                                <Form.Check className="form-check-lg">
                                                    <Form.Check.Input id="customChecks2" />
                                                    <Form.Check.Label htmlFor="customChecks2">Keep my phone number private</Form.Check.Label>
                                                    <Form.Text muted className="d-block">No one can find you by your phone number. Your phone number will not be shared with your contact anymore.</Form.Text>
                                                </Form.Check>
                                                <div className="separator" />
                                                <Form.Check className="form-check-lg">
                                                    <Form.Check.Input id="customChecks3" />
                                                    <Form.Check.Label htmlFor="customChecks3">All Keep my location sharing on</Form.Check.Label>
                                                    <Form.Text muted className="d-block">Jmapack webapp shares your location wherever you go</Form.Text>
                                                </Form.Check>
                                                <div className="separator" />
                                                <Form.Check className="form-check-lg">
                                                    <Form.Check.Input id="customChecks4" />
                                                    <Form.Check.Label htmlFor="customChecks4">Share data through select partnerships</Form.Check.Label>
                                                    <Form.Text muted className="d-block">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque condimentum mauris volutpat enim ornare iaculis. Curabitur euismod rutrum lorem id lobortis. Cras ut ex dui. Nulla sed blandit tortor. In quam diam, efficitur sit amet pulvinar eget, consequat placerat arcu.</Form.Text>
                                                </Form.Check>
                                            </Col>
                                        </Row>
                                        <Button variant="primary" className="mt-5">Save Changes</Button>
                                    </Form>
                                </Tab.Pane>
                                <Tab.Pane eventKey="tabBlock4">
                                    <div className="title-lg fs-4"><span>Login &amp; Security</span></div>
                                    <p className="mb-4">The Avatar component is used to represent a user, and displays the profile picture, initials or fallback icon.</p>
                                    <Form>
                                        <div className="title title-xs title-wth-divider text-primary text-uppercase my-4"><span>Password Settings</span></div>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group>
                                                    <Form.Label>Password</Form.Label>
                                                    <Form.Control type="password" defaultValue="Katervewe" />
                                                    <Button variant="primary" className="mt-3">Changes password</Button>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <div className="title title-xs title-wth-divider text-primary text-uppercase my-4"><span>Additional Security</span></div>
                                        <Row className="gx-3">
                                            <Col sm={12}>
                                                <Form.Group>
                                                    <Form.Label>2-Step Verification (2FA)</Form.Label>
                                                    <Form.Text muted className="d-block">
                                                        2-step verification drastically reduces the chances of having the personal information in your Google account stolen by someone else. Why? Because hackers would have to not only get your password and your username, they'd have to get a hold of your phone. A <a href="#some" className="text-primary">6-digit</a> code may be sent to a number you’ve previously provided. Codes can be sent in a text message (SMS) or through a voice call, which depends on the setting you chose. To verify it’s you, enter the code on the sign-in screen.
                                                    </Form.Text>
                                                    <Button variant="primary" className="mt-3">Add Authentication</Button>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                    </Form>
                                </Tab.Pane>
                            </Tab.Content>
                        </Col>
                    </Row>
                </Tab.Container>
            </div>
            {/* /Page Body */}
        </Container>

    )
}

const mapStateToProps = ({ theme }) => {
    const { navCollapsed } = theme;
    return { navCollapsed }
};

export default connect(mapStateToProps, { toggleCollapsedNav })(EditProfile);