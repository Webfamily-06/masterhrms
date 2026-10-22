import React from 'react'
import classNames from 'classnames';
import { Button, Form } from 'react-bootstrap'
import { ChevronDown, ChevronUp } from 'react-feather';
import { connect } from 'react-redux'
import { Link } from '/src/utils/router-compat.jsx'
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
import { toggleTopNav } from '../../../redux/action/Theme';

const Header = ({ topNavCollapsed, toggleTopNav, toggleSidebar, show }) => {
    return (
        <header className="integrations-header">
            <div className="d-flex align-items-center flex-1">
                <Link to="#" className="integrationsapp-title link-dark flex-shrink-0">
                    <h1>All Apps</h1>
                </Link>
                <Form className="ms-3 w-xl-30 d-md-block d-none" role="search">
                    <Form.Control type="text" placeholder="Search by categories, name, tag" />
                </Form>
            </div>
            <div className="integrations-options-wrap">
                <Form.Select className="me-2">
                    <option value={0}>Popular</option>
                    <option value={1}>New Apps</option>
                    <option value={2}>Recommended</option>
                    <option value={3}>Developer's Tools</option>
                </Form.Select>
                <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover hk-navbar-togglable d-sm-inline-block d-none" onClick={() => toggleTopNav(!topNavCollapsed)} >
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
            <div className={classNames("hk-sidebar-togglable", { "active": !show })} onClick={toggleSidebar} />
        </header>
    )
}

const mapStateToProps = ({ theme }) => {
    const { topNavCollapsed } = theme;
    return { topNavCollapsed }
};
export default connect(mapStateToProps, { toggleTopNav })(Header);