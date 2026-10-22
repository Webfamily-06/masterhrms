import React, { useState } from 'react';
import { Badge, Button, Col, Form, Modal, Nav, Row, Dropdown } from 'react-bootstrap';
import { Archive, Book, Edit, Inbox, Plus, Send, Settings, Star, Trash2 } from 'react-feather';
import SimpleBar from 'simplebar-react';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';
import ComposeEmail from './ComposeEmail';
import { useEmail } from './EmailContext';

//Redux
import { connect } from 'react-redux';
import { Compose } from '../../redux/action/Email';

const EmailSidebar = ({ Compose, composeEmail }) => {
    const [addCategory, setAddCategory] = useState(false);
    const {
        accounts,
        loadingAccounts,
        activeAccountId,
        setActiveAccountId,
        activeAccount,
        activeFolder,
        setActiveFolder,
    } = useEmail();

    return (
        <>
            <Nav className="emailapp-sidebar">
                <SimpleBar className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        {/* Personal Mail Account Selector */}
                        <div className="mb-3 px-1">
                            <label className="fs-8 text-uppercase fw-bold text-muted mb-1 d-block">Personal Account</label>
                            {loadingAccounts ? (
                                <div className="text-muted fs-8">Loading accounts...</div>
                            ) : accounts.length === 0 ? (
                                <div className="p-2 border rounded bg-light text-center">
                                    <div className="fs-8 text-danger fw-semibold mb-1">No Account Configured</div>
                                    <Button as="a" href="/settings/email-accounts" size="xs" variant="primary" className="btn-block">
                                        <Plus size={12} className="me-1" /> Connect Account
                                    </Button>
                                </div>
                            ) : (
                                <Dropdown className="w-100">
                                    <Dropdown.Toggle variant="light" size="sm" className="w-100 text-start d-flex align-items-center justify-content-between text-truncate">
                                        <div className="text-truncate me-1">
                                            <div className="fw-medium text-truncate">{activeAccount?.displayName || activeAccount?.email}</div>
                                            <div className="text-muted fs-8 text-truncate">
                                                {activeAccount?.incomingProtocol} • {activeAccount?.email}
                                            </div>
                                        </div>
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className="w-100 shadow-sm">
                                        <Dropdown.Header className="fs-8 text-uppercase">Configured Accounts</Dropdown.Header>
                                        {accounts.map(acc => (
                                            <Dropdown.Item
                                                key={acc.id}
                                                active={acc.id === activeAccountId}
                                                onClick={() => setActiveAccountId(acc.id)}
                                                className="d-flex align-items-center justify-content-between"
                                            >
                                                <div className="text-truncate me-2">
                                                    <div className="fw-medium text-truncate">{acc.displayName || acc.email}</div>
                                                    <div className="fs-8 text-muted">{acc.incomingProtocol} • {acc.email}</div>
                                                </div>
                                                {acc.isDefault && <Badge bg="primary" pill className="fs-9">Default</Badge>}
                                            </Dropdown.Item>
                                        ))}
                                        <Dropdown.Divider />
                                        <Dropdown.Item as="a" href="/settings/email-accounts" className="text-primary fw-medium">
                                            <Settings size={14} className="me-2" /> Manage Email Accounts
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            )}
                        </div>

                        <Button
                            variant="primary"
                            className="btn-rounded btn-block mb-4 show-compose-popup"
                            onClick={() => Compose(!composeEmail)}
                        >
                            Compose email
                        </Button>
                        <div className="menu-group">
                            <Nav className="nav-light navbar-nav flex-column" activeKey={activeFolder}>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="INBOX"
                                        active={activeFolder === 'INBOX'}
                                        onClick={() => setActiveFolder('INBOX')}
                                    >
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Inbox />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Inbox</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="IMPORTANT"
                                        active={activeFolder === 'IMPORTANT'}
                                        onClick={() => setActiveFolder('IMPORTANT')}
                                    >
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Star />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Important</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="SENT"
                                        active={activeFolder === 'SENT'}
                                        onClick={() => setActiveFolder('SENT')}
                                    >
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Send />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Sent</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="ARCHIVE"
                                        active={activeFolder === 'ARCHIVE'}
                                        onClick={() => setActiveFolder('ARCHIVE')}
                                    >
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Archive />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Archive</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="DRAFTS"
                                        active={activeFolder === 'DRAFTS'}
                                        onClick={() => setActiveFolder('DRAFTS')}
                                    >
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Edit />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Draft</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link
                                        eventKey="TRASH"
                                        active={activeFolder === 'TRASH'}
                                        onClick={() => setActiveFolder('TRASH')}
                                    >
                                        <span className="nav-icon-wrap">
                                            <span className="feather-icon">
                                                <Trash2 />
                                            </span>
                                        </span>
                                        <span className="nav-link-text">Trash</span>
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </div>
                        <div className="separator separator-light" />
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="title-sm text-primary mb-0">Categories</div>
                            <Button size="xs" variant="light" className="btn-icon btn-rounded" onClick={() => setAddCategory(!addCategory)} >
                                <HkTooltip id="tooltip1" placement="top" title="Add Category" >
                                    <span className="feather-icon">
                                        <Plus />
                                    </span>
                                </HkTooltip>
                            </Button>
                        </div>
                        <div className="menu-group">
                            <Nav as="ul" className="nav-light navbar-nav flex-column">
                                <Nav.Item as="li">
                                    <Nav.Link>
                                        <Badge bg="primary" className="badge-indicator badge-indicator-lg me-2" />
                                        <span className="nav-link-text">Team</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item as="li">
                                    <Nav.Link>
                                        <Badge bg="success" className="badge-indicator badge-indicator-lg me-2" />
                                        <span className="nav-link-text">Support</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item as="li">
                                    <Nav.Link>
                                        <Badge bg="orange" className="badge-indicator badge-indicator-lg me-2" />
                                        <span className="nav-link-text">Updates</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item as="li">
                                    <Nav.Link>
                                        <Badge bg="pink" className="badge-indicator badge-indicator-lg me-2" />
                                        <span className="nav-link-text">Primary</span>
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>
                        </div>
                    </div>
                </SimpleBar>
                {/*Sidebar Fixnav*/}
                <div className="emailapp-fixednav">
                    <div className="hk-toolbar">
                        <Nav className="nav-light">
                            <Nav.Item className="nav-link">
                                <Button as="a" href="/settings/email-accounts" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                    <HkTooltip id="tooltip2" placement="top" title="Email Accounts Settings" >
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <Settings />
                                            </span>
                                        </span>
                                    </HkTooltip>
                                </Button>
                            </Nav.Item>
                            <Nav.Item className="nav-link">
                                <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                    <HkTooltip id="tooltip3" placement="top" title="Archive" >
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <Archive />
                                            </span>
                                        </span>
                                    </HkTooltip>
                                </Button>
                            </Nav.Item>
                            <Nav.Item className="nav-link">
                                <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                    <HkTooltip id="tooltip2" placement="top" title="Help" >
                                        <span className="icon">
                                            <span className="feather-icon">
                                                <Book />
                                            </span>
                                        </span>
                                    </HkTooltip>
                                </Button>
                            </Nav.Item>
                        </Nav>
                    </div>
                </div>
                {/*/ Sidebar Fixnav*/}
            </Nav>

            {/* Add Category Modal*/}
            <Modal show={addCategory} onHide={() => setAddCategory(!addCategory)} centered size="sm" >
                <div className="modal-content">
                    <Modal.Body>
                        <Button bsPrefix="btn-close" onClick={() => setAddCategory(!addCategory)}>
                            <span aria-hidden="true">×</span>
                        </Button>
                        <h6 className="text-uppercase fw-bold mb-3">Add Category</h6>
                        <Form>
                            <Row className="gx-3">
                                <Col sm={12}>
                                    <Form.Group className="mb-3" >
                                        <Form.Control type="text" placeholder="Category Name" />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Button variant="primary" className="float-end" onClick={() => setAddCategory(!addCategory)} >Add</Button>
                        </Form>
                    </Modal.Body>
                </div>
            </Modal>

            {/* Compose email */}
            <ComposeEmail show={composeEmail} onClose={() => Compose(false)} />
        </>
    );
};

const mapStateToProps = ({ emailReducer }) => {
    const { composeEmail } = emailReducer;
    return { composeEmail };
};

export default connect(mapStateToProps, { Compose })(EmailSidebar);