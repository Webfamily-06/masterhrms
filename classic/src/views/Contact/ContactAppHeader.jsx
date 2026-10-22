import React from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import classNames from 'classnames';
import { Archive, ChevronDown, ChevronUp, Edit, ExternalLink, Grid, List, MoreVertical, RefreshCw, Server, Settings, Slash, Star, Trash2, User } from 'react-feather';
import { connect } from 'react-redux';
import { NavLink, useRouteMatch } from '/src/utils/router-compat.jsx';
import { toggleTopNav } from '../../redux/action/Theme';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';

const ContactAppHeader = ({ topNavCollapsed, toggleTopNav, toggleSidebar, show }) => {

    const contactListRoute = useRouteMatch("/apps/contacts/contact-list");

    return (
        <header className="contact-header">
            <div className="d-flex align-items-center">
                <Dropdown>
                    <Dropdown.Toggle as="a" className="contactapp-title link-dark" href="#" >
                        <h1>Contacts</h1>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <User />
                            </span>
                            <span>All Contacts</span>
                        </Dropdown.Item>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Star />
                            </span>
                            <span>Important</span>
                        </Dropdown.Item>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Archive />
                            </span>
                            <span>Archive</span>
                        </Dropdown.Item>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Edit />
                            </span>
                            <span>Pending</span>
                        </Dropdown.Item>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Trash2 />
                            </span>
                            <span>Deleted</span>
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <Dropdown className="ms-3">
                    <Dropdown.Toggle size="sm" variant="outline-secondary" className="flex-shrink-0 d-lg-inline-block d-none">Create New</Dropdown.Toggle>
                    <Dropdown.Menu>
                        <Dropdown.Item>Add New Contact</Dropdown.Item>
                        <Dropdown.Item>Add New Department</Dropdown.Item>
                        <Dropdown.Item>Add Category</Dropdown.Item>
                        <Dropdown.Item>Add New Tag</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>
            <div className="contact-options-wrap">
                <Dropdown className="inline-block" >
                    <Dropdown.Toggle as="a" href="#" className="btn btn-icon btn-flush-dark flush-soft-hover no-caret active">
                        <span className="icon">
                            <span className="feather-icon">
                                {contactListRoute ? <List /> : <Grid />}
                            </span>
                        </span>
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end">
                        <Dropdown.Item as={NavLink} to="contact-list" activeClassName="active" ><span className="feather-icon dropdown-icon">
                            <List />
                        </span>
                            <span>List View</span>
                        </Dropdown.Item>
                        <Dropdown.Item as={NavLink} to="contact-cards" activeClassName="active">
                            <span className="feather-icon dropdown-icon">
                                <Grid />
                            </span>
                            <span>Grid View</span>
                        </Dropdown.Item>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Server />
                            </span>
                            <span>Compact View</span>
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover no-caret d-sm-inline-block d-none" href="#">
                    <HkTooltip title="Refresh" placement="top" >
                        <span className="icon">
                            <span className="feather-icon">
                                <RefreshCw />
                            </span>
                        </span>
                    </HkTooltip>
                </Button>
                <div className="v-separator d-lg-block d-none" />
                <Dropdown className="inline-block" >
                    <Dropdown.Toggle as="a" href="#" className="btn btn-flush-dark btn-icon btn-rounded flush-soft-hover no-caret d-lg-inline-block d-none ms-sm-0">
                        <HkTooltip placement="top" title="Manage Contact">
                            <span className="icon">
                                <span className="feather-icon">
                                    <Settings />
                                </span>
                            </span>
                        </HkTooltip>
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end">
                        <Dropdown.Item>Manage Contact</Dropdown.Item>
                        <Dropdown.Item>Import</Dropdown.Item>
                        <Dropdown.Item>Export</Dropdown.Item>
                        <div className="dropdown-divider" />
                        <Dropdown.Item>Send Messages</Dropdown.Item>
                        <Dropdown.Item>Delegate Access</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <Dropdown className="inline-block ms-1">
                    <Dropdown.Toggle as="a" href="#" className="btn btn-flush-dark btn-icon btn-rounded btn-flush-dark flush-soft-hover no-caret d-lg-inline-block d-none">
                        <HkTooltip placement="top" title="More">
                            <span className="icon">
                                <span className="feather-icon">
                                    <MoreVertical />
                                </span>
                            </span>
                        </HkTooltip>
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end">
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Star />
                            </span>
                            <span>Stared Contacts</span>
                        </Dropdown.Item>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Archive />
                            </span>
                            <span>Archive Contacts</span>
                        </Dropdown.Item>
                        <div className="dropdown-divider" />
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <Slash />
                            </span>
                            <span>Block Content</span>
                        </Dropdown.Item>
                        <Dropdown.Item>
                            <span className="feather-icon dropdown-icon">
                                <ExternalLink />
                            </span>
                            <span>Feedback</span>
                        </Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <Button as="a" href="#" className="btn-icon btn-flush-dark btn-rounded flush-soft-hover hk-navbar-togglable d-sm-inline-block d-none" onClick={() => toggleTopNav(!topNavCollapsed)} >
                    <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="Collapse" >
                        <span className="icon">
                            <span className="feather-icon">
                                {
                                    topNavCollapsed ? <ChevronDown /> : <ChevronUp />
                                }
                            </span>
                        </span>
                    </HkTooltip>
                </Button>
            </div>
            <div className={classNames("hk-sidebar-togglable", { "active": show })} onClick={toggleSidebar} />
        </header>
    )
}

const mapStateToProps = ({ theme }) => {
    const { topNavCollapsed } = theme;
    return { topNavCollapsed }
};

export default connect(mapStateToProps, { toggleTopNav })(ContactAppHeader);