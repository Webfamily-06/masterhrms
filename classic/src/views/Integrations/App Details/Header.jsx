import React from 'react';
import classNames from 'classnames';
import { Breadcrumb, Button, Nav } from 'react-bootstrap'
import { ChevronDown, ChevronLeft, ChevronUp } from 'react-feather';
import { connect } from 'react-redux';
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
import { toggleTopNav } from '../../../redux/action/Theme';

const Header = ({ topNavCollapsed, toggleTopNav, toggleSidebar, show }) => {
    return (
        <header className="integrations-header">
            <div className="d-flex align-items-center flex-1">
                <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0">
                    <span className="btn-icon-wrap">
                        <span className="feather-icon">
                            <ChevronLeft />
                        </span>
                    </span>
                </Button>
                <div className="v-separator d-sm-inline-block d-none" />
                <Nav className="ms-1 ms-sm-0" aria-label="breadcrumb">
                    <Breadcrumb className="mt-3">
                        <Breadcrumb.Item href="#">All Apps</Breadcrumb.Item>
                        <Breadcrumb.Item>Popular</Breadcrumb.Item>
                        <Breadcrumb.Item active >Kickstarter</Breadcrumb.Item>
                    </Breadcrumb>
                </Nav>
            </div>
            <div className="integrations-options-wrap">
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