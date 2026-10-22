import React, { useEffect } from 'react';
import { Button, Card, Col, Container, Dropdown, Form, InputGroup, Nav, Row, Tab } from 'react-bootstrap';
import { Link } from '/src/utils/router-compat.jsx';
import { Edit2, Edit3, Minimize, Plus, Trash2 } from 'react-feather';
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
import HkBadge from '../../../components/@hk-badge/@hk-badge';
// Redux
import { connect } from 'react-redux';
import { toggleCollapsedNav } from '../../../redux/action/Theme';
//Images
import interest1 from '../../../assets/img/interests/interest-1.png';
import interest2 from '../../../assets/img/interests/interest-2.png';
import interest3 from '../../../assets/img/interests/interest-3.png';
import interest4 from '../../../assets/img/interests/interest-4.png';
import interest5 from '../../../assets/img/interests/interest-5.png';
import interest6 from '../../../assets/img/interests/interest-6.png';
import interest7 from '../../../assets/img/interests/interest-7.png';
import interest8 from '../../../assets/img/interests/interest-8.png';
import interest9 from '../../../assets/img/interests/interest-9.png';
import interest10 from '../../../assets/img/interests/interest-10.png';
import interest11 from '../../../assets/img/interests/interest-11.png';
import interest12 from '../../../assets/img/interests/interest-12.png';
import symbolAvatar5 from '../../../assets/img/symbol-avatar-5.png';
import symbolAvatar6 from '../../../assets/img/symbol-avatar-6.png';
import symbolAvatar14 from '../../../assets/img/symbol-avatar-14.png';
import symbolAvatar16 from '../../../assets/img/symbol-avatar-16.png';
import symbolAvatar17 from '../../../assets/img/symbol-avatar-17.png';
import symbolAvatar18 from '../../../assets/img/symbol-avatar-18.png';
import symbolAvatar19 from '../../../assets/img/symbol-avatar-19.png';
import visaCard from '../../../assets/img/card-visa.png';
import masterCard from '../../../assets/img/mastercard.png';

const Account = ({ toggleCollapsedNav }) => {
    useEffect(() => {
        toggleCollapsedNav(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <Container>
            <Tab.Container defaultActiveKey="tabBlock1" >
                {/* Page Header */}
                <div className="hk-pg-header pg-header-wth-tab pt-7">
                    <div className="d-flex">
                        <div className="flex-1">
                            <h1 className="pg-title">Account Settings</h1>
                            <p className="p-lg col-lg-8">Manage your account settings and options. You can customize interests, add social media links, edit integrations for beter inapp experience.</p>
                        </div>
                    </div>
                    <Nav variant="tabs" className="nav-line nav-light">
                        <Nav.Item>
                            <Nav.Link eventKey="tabBlock1">
                                <span className="nav-link-text">Customize Interests</span>
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="tabBlock2">
                                <span className="nav-link-text">Social Profiles</span>
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="tabBlock3">
                                <span className="nav-link-text">Integrations</span>
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item as={Dropdown} >
                            <Dropdown.Toggle as={Nav.Link} >Billing Info</Dropdown.Toggle>
                            <Dropdown.Menu>
                                <Dropdown.Item eventKey="tabBlock4">Saved Cards</Dropdown.Item>
                                <Dropdown.Item eventKey="tabBlock5">My Addresses</Dropdown.Item>
                            </Dropdown.Menu>
                        </Nav.Item>
                    </Nav>
                </div>
                {/* /Page Header */}
                {/* Page Body */}
                <div className="hk-pg-body">
                    <Tab.Content>
                        <Tab.Pane eventKey="tabBlock1">
                            <Row>
                                <Col xl={8}>
                                    <div className="title-lg fs-5"><span>Customize Interests</span></div>
                                    <p className="mb-4">Customizing interests will help you get the personalised experience.</p>
                                    <Row className="gx-2 filter-block-wrap mt-5">
                                        <Col xs={6} sm={3}>
                                            <Card className="text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" />
                                                <img src={interest1} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Infrastructure</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" defaultChecked />
                                                <img src={interest2} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Science</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" />
                                                <img src={interest3} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">World Politics</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" />
                                                <img src={interest4} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Technology</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" />
                                                <img src={interest5} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Travel</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" defaultChecked />
                                                <img src={interest6} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Literature</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" defaultChecked />
                                                <img src={interest7} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Healthcare</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" />
                                                <img src={interest8} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Marketing</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" />
                                                <img src={interest9} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Music</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" defaultChecked />
                                                <img src={interest10} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Spirituality</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" defaultChecked />
                                                <img src={interest11} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Lifestyle</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                        <Col xs={6} sm={3}>
                                            <Card className="card text-white filter-block h-120p mb-2">
                                                <Form.Check.Input type="checkbox" />
                                                <img src={interest12} className="card-img h-100 img-fluid" alt="img-desc" />
                                                <div className="card-img-overlay bg-opacity-75 d-flex align-items-center justify-content-center">
                                                    <h5 className="card-title text-white">Adventure</h5>
                                                </div>
                                            </Card>
                                        </Col>
                                    </Row>
                                    <div className="text-end mt-5">
                                        <button className="btn btn-primary btn-rounded">
                                            Save changes
                                        </button>
                                    </div>
                                </Col>
                            </Row>
                        </Tab.Pane>
                        <Tab.Pane eventKey="tabBlock2">
                            <Row>
                                <Col md={8}>
                                    <div className="title-lg fs-5">
                                        <span>Social profile links</span>
                                    </div>
                                    <p className="mb-4">Connect your social media accounts for one-click sharing.</p>
                                    <Form>
                                        <Form.Group className="mb-3" >
                                            <Form.Label>Facebook</Form.Label>
                                            <InputGroup>
                                                <span className="input-affix-wrapper">
                                                    <span className="input-prefix">
                                                        <span className="avatar avatar-logo avatar-xs">
                                                            <span className="initial-wrap">
                                                                <img src={symbolAvatar17} alt="logo" />
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <Form.Control type="text" size="lg" className="ps-8" placeholder="Username" defaultValue="Hencework" />
                                                    <Link to="#" className="input-suffix text-muted">
                                                        <span className="feather-icon">
                                                            <Edit3 />
                                                        </span>
                                                    </Link>
                                                </span>
                                            </InputGroup>
                                            <Form.Text muted>
                                                One-click sign in
                                            </Form.Text>
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Twitter</Form.Label>
                                            <InputGroup>
                                                <span className="input-affix-wrapper">
                                                    <span className="input-prefix">
                                                        <span className="avatar avatar-logo avatar-xs">
                                                            <span className="initial-wrap">
                                                                <img src={symbolAvatar18} alt="logo" />
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <Form.Control size="lg" type="text" className="ps-8" placeholder="Username" />
                                                    <Link to="#" className="input-suffix text-muted">
                                                        <span className="feather-icon">
                                                            <Edit3 />
                                                        </span>
                                                    </Link>
                                                </span>
                                            </InputGroup>
                                            <Form.Text muted>
                                                One-click sign in
                                            </Form.Text>
                                        </Form.Group>
                                        <Form.Group className="mb-5">
                                            <Form.Label>Linkedin</Form.Label>
                                            <InputGroup>
                                                <span className="input-affix-wrapper">
                                                    <span className="input-prefix">
                                                        <span className="avatar avatar-logo avatar-xs">
                                                            <span className="initial-wrap">
                                                                <img src={symbolAvatar19} alt="logo" />
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <Form.Control type="text" className="form-control-lg ps-8" placeholder="Username" />
                                                    <Link to="#" className="input-suffix text-muted">
                                                        <span className="feather-icon">
                                                            <Edit3 />
                                                        </span>
                                                    </Link>
                                                </span>
                                            </InputGroup>
                                            <Form.Check type="checkbox" label="This is a company account" id="customCheck1" className="form-check-sm mt-2" />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Connect</Form.Label>
                                            <InputGroup className="mb-3">
                                                <span className="input-affix-wrapper">
                                                    <span className="input-prefix">
                                                        <span className="avatar avatar-logo avatar-xs">
                                                            <span className="initial-wrap">
                                                                <img src={symbolAvatar6} alt="logo" />
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <Form.Control size="lg" type="text" className="ps-8 pe-15" placeholder="Behance" />
                                                    <span className="input-suffix">
                                                        <Button variant="outline-primary" size="sm">
                                                            connect
                                                        </Button>
                                                    </span>
                                                </span>
                                            </InputGroup>
                                            <div className="input-group">
                                                <span className="input-affix-wrapper">
                                                    <span className="input-prefix">
                                                        <span className="avatar avatar-logo avatar-xs">
                                                            <span className="initial-wrap">
                                                                <img src={symbolAvatar5} alt="logo" />
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <Form.Control size="lg" type="text" className="ps-8 pe-15" placeholder="Dribbble" />
                                                    <span className="input-suffix">
                                                        <Button variant="outline-primary" size="sm">
                                                            connect
                                                        </Button>
                                                    </span>
                                                </span>
                                            </div>
                                        </Form.Group>
                                    </Form>
                                    <div className="text-end mt-6">
                                        <Button variant="primary" className="btn-rounded">
                                            Save changes
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </Tab.Pane>
                        <Tab.Pane eventKey="tabBlock3">
                            <Row>
                                <Col md={8}>
                                    <div className="title-lg fs-5">
                                        <span>App Integrations</span>
                                    </div>
                                    <p className="mb-4">
                                        Connect suitable apps with your app and get notifications wherever you go
                                    </p>
                                    <ul className="advance-list">
                                        <li className="advance-list-item transform-none shadow-none">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="media align-items-center">
                                                    <div className="media-head me-3">
                                                        <div className="avatar">
                                                            <img src={symbolAvatar6} alt="user" className="avatar-img" />
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="text-dark fw-medium">Behance</div>
                                                        <div className="fs-7">Design Platform</div>
                                                    </div>
                                                </div>
                                                <Button variant="outline-primary" className="mnw-125p">
                                                    Connect
                                                </Button>
                                            </div>
                                        </li>
                                        <li className="advance-list-item transform-none shadow-none">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="media align-items-center">
                                                    <div className="media-head me-3">
                                                        <div className="avatar">
                                                            <img src={symbolAvatar5} alt="user" className="avatar-img" />
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="text-dark fw-medium">Dribble</div>
                                                        <div className="fs-7">Portfolio</div>
                                                    </div>
                                                </div>
                                                <Button variant="outline-danger" className="mnw-125p">
                                                    Disconnect
                                                </Button>
                                            </div>
                                        </li>
                                        <li className="advance-list-item transform-none shadow-none">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="media align-items-center">
                                                    <div className="media-head me-3">
                                                        <div className="avatar">
                                                            <img src={symbolAvatar14} alt="user" className="avatar-img" />
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="text-dark fw-medium">Intercom</div>
                                                        <div className="fs-7">Chat Integrations</div>
                                                    </div>
                                                </div>
                                                <Button variant="outline-primary" className="mnw-125p">
                                                    Connect
                                                </Button>
                                            </div>
                                        </li>
                                        <li className="advance-list-item transform-none shadow-none">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="media align-items-center">
                                                    <div className="media-head me-3">
                                                        <div className="avatar">
                                                            <img src={symbolAvatar16} alt="user" className="avatar-img" />
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="text-dark fw-medium">Gitlab</div>
                                                        <div className="fs-7">Developer Platform</div>
                                                    </div>
                                                </div>
                                                <Button variant="outline-primary" className="mnw-125p">
                                                    Connect
                                                </Button>
                                            </div>
                                        </li>
                                    </ul>
                                    <div className="text-end mt-6">
                                        <Button variant="primary" className="btn-rounded">
                                            Save changes
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </Tab.Pane>
                        <Tab.Pane eventKey="tabBlock4">
                            <Row>
                                <Col lg={8}>
                                    <div className="title-lg fs-5 justify-content-between mb-5">
                                        <span>Saved Cards</span>
                                        <Button variant="outline-light">
                                            + Add new card
                                        </Button>
                                    </div>
                                    <ul className="advance-list">
                                        <li className="advance-list-item transform-none shadow-none py-3">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="media align-items-center">
                                                    <div className="media-head me-5">
                                                        <img src={visaCard} alt="user" className="img-fluid" />
                                                    </div>
                                                    <div className="media-body">
                                                        <div>
                                                            <span className="text-dark fw-medium">****4213</span>
                                                            <HkBadge bg="primary" soft className="rounded-0 ms-3">Primary</HkBadge>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-lg-inline d-none">
                                                    <span className="fs-7 text-muted me-5 d-xl-inline d-none">Last updated 12/03/2022</span>
                                                    <Button variant="outline-danger" className="mnw-100p me-2">
                                                        Delete
                                                    </Button>
                                                    <Button variant="light" className="mnw-100p">
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        </li>
                                        <li className="advance-list-item transform-none shadow-none py-3">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="media align-items-center">
                                                    <div className="media-head me-5">
                                                        <img src={masterCard} alt="user" className="img-fluid" />
                                                    </div>
                                                    <div className="media-body">
                                                        <div>
                                                            <span className="text-dark fw-medium">****1214</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-lg-inline d-none">
                                                    <span className="fs-7 text-muted me-5 d-xl-inline d-none">Last updated 25/04/2022</span>
                                                    <Button variant="outline-danger" className="mnw-100p me-2">
                                                        Delete
                                                    </Button>
                                                    <Button variant="light" className="mnw-100p">
                                                        Edit
                                                    </Button>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                    <div className="text-end mt-6">
                                        <Button variant="primary" className="btn-rounded">
                                            Save changes
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </Tab.Pane>
                        <Tab.Pane eventKey="tabBlock5">
                            <Row>
                                <Col lg={8}>
                                    <div className="title-lg fs-5"><span>My Addresses</span></div>
                                    <Row className="gx-3">
                                        <Col md={4} >
                                            <Card className="card-border mnh-250p">
                                                <Card.Body>
                                                    <div className="card-action-wrap">
                                                        <Button size="sm" variant="flush-danger" className="btn-icon btn-rounded flush-soft-hover card-close" value={true} >
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span className="feather-icon d-none">
                                                                    <Minimize />
                                                                </span>
                                                            </span>
                                                        </Button>
                                                        <Button variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <Edit2 />
                                                                </span>
                                                            </span>
                                                        </Button>
                                                    </div>
                                                    <i className="bi bi-house-door-fill fs-3 d-block mb-1 text-primary" />
                                                    <h5>Home</h5>
                                                    <Card.Text>3421 Central Ave NE, Albuquerque, New York - 87106
                                                    </Card.Text>
                                                    <HkBadge bg="primary" soft>Primary</HkBadge>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={4}>
                                            <Card className="card-border mnh-250p">
                                                <Card.Body>
                                                    <div className="card-action-wrap">
                                                        <Button variant="flush-danger" size="sm" className="btn-icon btn-rounded flush-soft-hover card-close">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span className="feather-icon d-none">
                                                                    <Minimize />
                                                                </span>
                                                            </span>
                                                        </Button>
                                                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <Edit2 />
                                                                </span>
                                                            </span>
                                                        </Button>
                                                    </div>
                                                    <i className="bi bi-shield-fill-check fs-3 d-block mb-1 text-primary" />
                                                    <h5>Office</h5>
                                                    <Card.Text>2035 7th St, Clanton, Alaska, 35045</Card.Text>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                        <Col md={4}>
                                            <Card className="card-border border-dashed mnh-250p">
                                                <Card.Body className="d-flex align-items-center justify-content-center">
                                                    <Button variant="outline-light" className="btn-block" data-bs-toggle="modal" data-bs-target="#add_new_board">
                                                        <HkTooltip title="Add New Address" placement="top" id="addresstlt1" >
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <Plus />
                                                                </span>
                                                            </span>
                                                        </HkTooltip>
                                                    </Button>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                    <div className="text-end mt-6">
                                        <Button variant="primary" className="btn-rounded">
                                            Save changes
                                        </Button>
                                    </div>
                                </Col>
                            </Row>
                        </Tab.Pane>
                    </Tab.Content>
                </div>
                {/* /Page Body */}
            </Tab.Container>
        </Container>

    )
}

const mapStateToProps = ({ theme }) => {
    const { navCollapsed } = theme;
    return { navCollapsed }
};

export default connect(mapStateToProps, { toggleCollapsedNav })(Account);
