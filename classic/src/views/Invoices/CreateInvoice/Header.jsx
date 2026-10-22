import classNames from 'classnames';
import React from 'react'
import { Button, Dropdown } from 'react-bootstrap';
import { ChevronDown, ChevronUp, Sliders } from 'react-feather';
import { connect } from 'react-redux';
import { Link } from '/src/utils/router-compat.jsx';
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
import { toggleTopNav } from '../../../redux/action/Theme';

const Header = ({ topNavCollapsed, toggleTopNav, toggleSidebar, show, handleSettings }) => {
    return (
        <header className="invoice-header">
            <div className="d-flex align-items-center">
                <Dropdown>
                    <Dropdown.Toggle as={Link} to="#" className="invoiceapp-title link-dark">
                        <h1>Standard Template</h1>
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="start">
                        <Dropdown.Item>Simplicity Template</Dropdown.Item>
                        <Dropdown.Item>Essential Template</Dropdown.Item>
                        <Dropdown.Item>Classic Template</Dropdown.Item>
                        <Dropdown.Item>Pro Forma Template</Dropdown.Item>
                        <Dropdown.Item>Trade Template</Dropdown.Item>
                        <Dropdown.Item>Interim Template</Dropdown.Item>
                        <Dropdown.Item>Primary Template</Dropdown.Item>
                        <Dropdown.Item>Matt Opel Template</Dropdown.Item>
                        <Dropdown.Item>Freelancer Template</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
            </div>
            <div className="invoice-options-wrap">
                <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover invoiceapp-setting-toggle active me-2" onClick={handleSettings} >
                    <span className="icon">
                        <span className="feather-icon">
                            <Sliders />
                        </span>
                    </span>
                </Button>
                <Button as={Link} to="invoice-preview" variant="outline-secondary" className="flex-shrink-0 d-md-inline-block d-none">Preview</Button>
                <Button as="a" variant="primary" href="#some" className="mx-2 d-sm-inline-block d-none">save</Button>
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
