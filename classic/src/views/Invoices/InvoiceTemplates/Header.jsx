import React from 'react';
import classNames from 'classnames';
import { Button } from 'react-bootstrap';
import { ChevronDown, ChevronUp } from 'react-feather';
import { connect } from 'react-redux';
import { Link } from '/src/utils/router-compat.jsx';
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
import { toggleTopNav } from '../../../redux/action/Theme';

const Header = ({ topNavCollapsed, toggleTopNav, toggleSidebar, show }) => {
    return (
        <header className="invoice-header">
            <div className="d-flex align-items-center">
                <Link to="#" className="invoiceapp-title link-dark">
                    <h1>Invoice Templates</h1>
                </Link>
            </div>
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
            <div className={classNames("hk-sidebar-togglable", { "active": !show })} onClick={toggleSidebar} />
        </header>
    )
}
const mapStateToProps = ({ theme }) => {
    const { topNavCollapsed } = theme;
    return { topNavCollapsed }
};
export default connect(mapStateToProps, { toggleTopNav })(Header);