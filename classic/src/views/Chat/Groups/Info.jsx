import React from 'react'
import { Button, Card, Dropdown, Form, Nav, Tab } from 'react-bootstrap'
import SimpleBar from 'simplebar-react';
import { Link } from '/src/utils/router-compat.jsx';
import { Briefcase, MoreVertical, Plus } from 'react-feather';
//Own custom components
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
//Images
import avatar1 from '../../../assets/img/avatar1.jpg';
import avatar2 from '../../../assets/img/avatar2.jpg';
import avatar7 from '../../../assets/img/avatar7.jpg';
import avatar9 from '../../../assets/img/avatar9.jpg';
import avatar10 from '../../../assets/img/avatar10.jpg';
import avatar13 from '../../../assets/img/avatar13.jpg';
import avatar15 from '../../../assets/img/avatar15.jpg';
import thumbImg from '../../../assets/img/img-thumb1.jpg';
import HkBadge from '../../../components/@hk-badge/@hk-badge';

const Info = ({ toggleInfo, invitePeople }) => {
    return (
        <div className="chat-info">
            <SimpleBar className="nicescroll-bar">
                <Button bsPrefix="btn-close" className="info-close" onClick={toggleInfo} >
                    <span aria-hidden="true">×</span>
                </Button>
                <div className="text-center">
                    <div className="avatar avatar-xxl avatar-rounded">
                        <img src={avatar1} alt="user" className="avatar-img" />
                    </div>
                    <div className="cp-name text-truncate mt-2">Developers Stage</div>
                    <p className="text-truncate">Code builders &amp; reviewers stage</p>
                </div>
                <Tab.Container defaultActiveKey="info">
                    <Nav justify className="nav-light nav-tabs nav-segmented-tabs active-theme mt-4">
                        <Nav.Item>
                            <Nav.Link eventKey="info" >
                                <span className="nav-link-text">Info</span>
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="files" >
                                <span className="nav-link-text">Files</span>
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                    <Tab.Content className="mt-4">
                        <Tab.Pane eventKey="info">
                            <Form role="search">
                                <Form.Control type="text" placeholder="Search in conversation" />
                            </Form>
                            <div className="collapse-simple mt-3">
                                <Card>
                                    <Card.Header>
                                        <Link role="button" data-bs-toggle="collapse" to="#members" aria-expanded="true">Members</Link>
                                    </Card.Header>
                                    <div id="members" className="collapse show">
                                        <Card.Body>
                                            <ul className="hk-list">
                                                <li>
                                                    <div className="avatar avatar-sm avatar-primary avatar-rounded">
                                                        <HkTooltip placement="top" title="Hencework">
                                                            <span className="initial-wrap">H</span>
                                                        </HkTooltip>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="avatar avatar-sm avatar-rounded">
                                                        <HkTooltip placement="top" title="Morgan">
                                                            <img src={avatar2} alt="user" className="avatar-img" />
                                                        </HkTooltip>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="avatar avatar-sm avatar-rounded">
                                                        <HkTooltip placement="top" title="Charlie">
                                                            <img src={avatar13} alt="user" className="avatar-img" />
                                                        </HkTooltip>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                                        <HkTooltip placement="top" title="Morgan">
                                                            <img src={avatar7} alt="user" className="avatar-img" />
                                                        </HkTooltip>
                                                        <HkBadge bg="success" indicator className="badge-indicator-lg position-bottom-end-overflow-1" />
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="avatar avatar-sm avatar-rounded">
                                                        <HkTooltip placement="top" title="Katherine">
                                                            <img src={avatar9} alt="user" className="avatar-img" />
                                                        </HkTooltip>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                                        <HkTooltip placement="top" title="Danial">
                                                            <img src={avatar10} alt="user" className="avatar-img" />
                                                        </HkTooltip>
                                                        <HkBadge bg="success" indicator className="badge-indicator-lg position-bottom-end-overflow-1" />
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                                        <HkTooltip placement="top" title="Boss">
                                                            <img src={avatar15} alt="user" className="avatar-img" />
                                                        </HkTooltip>
                                                        <HkBadge bg="success" indicator className="badge-indicator-lg position-bottom-end-overflow-1" />
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="avatar avatar-sm avatar-soft-danger avatar-rounded">
                                                        <HkTooltip placement="top" title="Winston">
                                                            <span className="initial-wrap">W</span>
                                                        </HkTooltip>
                                                    </div>
                                                </li>
                                                <li>
                                                    <Link to="#" className="avatar avatar-sm avatar-icon avatar-soft-light avatar-rounded" onClick={invitePeople} >
                                                        <span className="initial-wrap">
                                                            <HkTooltip placement="top" title="Add New">
                                                                <span className="feather-icon">
                                                                    <Plus />
                                                                </span>
                                                            </HkTooltip>
                                                        </span>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </Card.Body>
                                    </div>
                                </Card>
                                <Card>
                                    <Card.Header>
                                        <Link role="button" data-bs-toggle="collapse" to="#general_info" aria-expanded="true">General Info</Link>
                                    </Card.Header>
                                    <div id="general_info" className="collapse show">
                                        <Card.Body>
                                            <ul className="cp-info">
                                                <li>
                                                    <Link to="#">
                                                        <span className="cp-icon-wrap">
                                                            <span className="feather-icon">
                                                                <Briefcase />
                                                            </span>
                                                        </span>
                                                        Managed by Morgan Freeman
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link to="#">
                                                        <span className="cp-icon-wrap">#Developer</span>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </Card.Body>
                                    </div>
                                </Card>
                                <Card>
                                    <Card.Header>
                                        <Link role="button" data-bs-toggle="collapse" to="#settings" aria-expanded="true">Settings </Link>
                                    </Card.Header>
                                    <div id="settings" className="collapse show">
                                        <Card.Body>
                                            <ul className="cp-action">
                                                <li>
                                                    <Link to="#">
                                                        Clear Chat
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link to="#">
                                                        <span className="text-danger">Block Contact</span>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link to="#">
                                                        Somthing's Wrong
                                                    </Link>
                                                </li>
                                            </ul>
                                            <Link to="#" className="d-block text-dark fs-7 mb-10">Give feedback and report conversation</Link>
                                        </Card.Body>
                                    </div>
                                </Card>
                            </div>
                        </Tab.Pane>
                        <Tab.Pane eventKey="files" >
                            <Form role="search">
                                <Form.Control type="text" className="search-files" placeholder="Search files" />
                            </Form>
                            <div className="collapse-simple mt-3">
                                <Card>
                                    <Card.Header>
                                        <Link role="button" data-bs-toggle="collapse" to="#files_collapse" aria-expanded="true">Yesterday</Link>
                                    </Card.Header>
                                    <div id="files_collapse" className="collapse show">
                                        <Card.Body>
                                            <ul className="cp-files">
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-icon avatar-sm avatar-soft-blue">
                                                                <span className="initial-wrap fs-3">
                                                                    <i className="ri-file-excel-2-fill" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">website_content.exl</p>
                                                                <p className="file-size">2,635 KB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-icon avatar-sm avatar-soft-light">
                                                                <span className="initial-wrap fs-3">
                                                                    <i className="ri-file-text-fill" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">jampack.pdf</p>
                                                                <p className="file-size">1.3 GB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-icon avatar-sm avatar-soft-warning">
                                                                <span className="initial-wrap fs-3">
                                                                    <i className="ri-file-zip-fill" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">jampack.zip</p>
                                                                <p className="file-size">2.45 GB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-logo avatar-sm">
                                                                <span className="initial-wrap">
                                                                    <img src={avatar1} alt="user" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">bruce-mars-fiEG-Pk6ZASFPk6ZASF</p>
                                                                <p className="file-size">4,178 KB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-logo avatar-sm">
                                                                <span className="initial-wrap">
                                                                    <img src={avatar2} alt="user" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">jonas-kakaroto-KIPqvvTKIPqvvT</p>
                                                                <p className="file-size">951 KB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                        </Card.Body>
                                    </div>
                                </Card>
                                <Card>
                                    <Card.Header>
                                        <Link role="button" data-bs-toggle="collapse" to="#files_collapse_1" aria-expanded="true">23 April</Link>
                                    </Card.Header>
                                    <div id="files_collapse_1" className="collapse show">
                                        <Card.Body>
                                            <ul className="cp-files">
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-icon avatar-sm avatar-soft-light">
                                                                <span className="initial-wrap fs-3">
                                                                    <i className="ri-keynote-fill" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">presentation.keynote</p>
                                                                <p className="file-size">20 KB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-icon avatar-sm avatar-soft-warning">
                                                                <span className="initial-wrap fs-3">
                                                                    <i className="ri-file-zip-fill" />
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">PACK-TRIAL.zip</p>
                                                                <p className="file-size">2.45 GB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li>
                                                    <div className="media">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-sm">
                                                                <img src={thumbImg} alt="user" className="avatar-img" />
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <div>
                                                                <p className="file-name">joel-mott-LaK153ghdigaghdi</p>
                                                                <p className="file-size">3,028 KB</p>
                                                            </div>
                                                            <div>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover dropdown-toggle no-caret" >
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreVertical />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item>Download</Dropdown.Item>
                                                                        <Dropdown.Item className="link-danger" >Delete</Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                        </Card.Body>
                                    </div>
                                </Card>
                            </div>
                        </Tab.Pane>
                    </Tab.Content>
                </Tab.Container>
            </SimpleBar>
        </div>
    )
}

export default Info
