import React from 'react';
import classNames from 'classnames';
import { Button } from 'react-bootstrap';
import { ChevronDown, ChevronLeft, ChevronUp } from 'react-feather';
import { connect } from 'react-redux';
import { Link } from '/src/utils/router-compat.jsx';
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
import { toggleTopNav } from '../../../redux/action/Theme';

const Header = ({ topNavCollapsed, toggleTopNav, toggleSidebar, show }) => {
    return (
        <header className="invoice-header">
            <div className="d-flex align-items-center">
                <Button as={Link} to="create-invoice" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                    <span className="icon">
                        <span className="feather-icon">
                            <ChevronLeft />
                        </span>
                    </span>
                </Button>
                <div className="v-separator d-sm-inline-block d-none" />
                <Link to="#" className="invoiceapp-title link-dark ms-1 ms-sm-0">
                    <h1>Template Preview</h1>
                </Link>
            </div>
            <div className="invoice-options-wrap">
                <Button variant="soft-primary" as={Link} to="create-invoice" className="flex-shrink-0 d-md-inline-block d-none">Start with Template</Button>
                <div className="v-separator d-md-inline-block d-none" />
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
