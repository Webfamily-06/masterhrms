import React, { useState } from 'react';
import { Button, Card, Nav } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';
import { toggleCollapsedNav } from '../../redux/action/Theme';
import { useRouterState } from '@tanstack/react-router';
import { NavLink, isRouteActive } from '/src/utils/router-compat.jsx';
import SidebarHeader from './SidebarHeader';
import { SidebarMenu } from './SidebarMenu';
import classNames from 'classnames';
import { useWindowWidth } from '@react-hook/window-size';

const Sidebar = ({ navCollapsed, toggleCollapsedNav }) => {

    const [activeMenu, setActiveMenu] = useState();
    const [activeSubMenu, setActiveSubMenu] = useState();

    const windowWidth = useWindowWidth();
    const pathname = useRouterState({ select: (state) => state.location.pathname });

    const handleClick = (menuName) => {
        setActiveMenu(menuName);
        if (windowWidth <= 1199) {
            toggleCollapsedNav(false);
        }
        // if (activeMenu !== 'Dashboard' && windowWidth >= 1200) {
        //     toggleCollapsedNav(true);
        // }
        // else if (windowWidth <= 1199) {
        //     toggleCollapsedNav(false);
        // }

        // if (menuName === 'Dashboard') {
        //     toggleCollapsedNav(false);
        // }
    }

    const backDropToggle = () => {
        toggleCollapsedNav(!navCollapsed);
    }

    return (
        <>
            <div className="hk-menu">
                {/* Brand */}
                <SidebarHeader />
                {/* Main Menu */}
                <SimpleBar className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        {SidebarMenu.map((routes, index) => (
                            <React.Fragment key={index}>
                                <div className="menu-group" >
                                    {routes.group && <div className="nav-header" >
                                        <span>{routes.group}</span>
                                    </div>}
                                    {routes.contents.map((menus, idx) => (
                                        <Nav bsPrefix="navbar-nav" className="flex-column" key={idx}>
                                            <Nav.Item className={classNames({ "active": isRouteActive(pathname, menus.path) })}  >
                                                {
                                                    menus.childrens
                                                        ?
                                                        <>
                                                            <Nav.Link data-bs-toggle="collapse" data-bs-target={`#${menus.id}`} aria-expanded={activeMenu === menus.name ? "true" : "false"} onClick={() => setActiveMenu(menus.name)} >
                                                                <span className={classNames("nav-icon-wrap", { "position-relative": menus.iconBadge })}>
                                                                    {menus.iconBadge && menus.iconBadge}
                                                                    <span className="svg-icon">
                                                                        {menus.icon}
                                                                    </span>
                                                                </span>
                                                                <span className={classNames("nav-link-text", { "position-relative": menus.badgeIndicator })} >
                                                                    {menus.name}
                                                                    {menus.badgeIndicator && menus.badgeIndicator}
                                                                </span>
                                                                {menus.badge && menus.badge}
                                                            </Nav.Link>

                                                            {/* <Collapse in={open}> */}
                                                            <ul id={menus.id} className={classNames("nav flex-column nav-children", { "collapse": activeMenu !== menus.name })}>
                                                                <li className="nav-item">
                                                                    <ul className="nav flex-column">
                                                                        {menus.childrens.map((subMenu, indx) => (
                                                                            subMenu.childrens
                                                                                ?
                                                                                <li className="nav-item" key={indx} >
                                                                                    <Nav.Link as={NavLink} to={subMenu.path} className="nav-link" data-bs-toggle="collapse" data-bs-target={`#${subMenu.id}`} aria-expanded={activeSubMenu === subMenu.name ? "true" : "false"} onClick={() => setActiveSubMenu(subMenu.name)}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Nav.Link>

                                                                                    {subMenu.childrens.map((childrenPath, i) => (
                                                                                        <ul id={subMenu.id} className={classNames("nav flex-column nav-children", { "collapse": activeSubMenu !== subMenu.name })} key={i}>
                                                                                            <li className="nav-item">
                                                                                                <ul className="nav flex-column">
                                                                                                    <li className="nav-item">
                                                                                                        <Nav.Link as={NavLink} to={childrenPath.path} onClick={handleClick}>
                                                                                                            <span className="nav-link-text">
                                                                                                                {childrenPath.name}
                                                                                                            </span>
                                                                                                        </Nav.Link>
                                                                                                    </li>
                                                                                                </ul>
                                                                                            </li>
                                                                                        </ul>
                                                                                    ))}

                                                                                </li>
                                                                                :
                                                                                <li className="nav-item" key={indx}>
                                                                                    <Nav.Link as={NavLink} to={subMenu.path} onClick={handleClick}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Nav.Link>
                                                                                </li>
                                                                        ))}
                                                                    </ul>
                                                                </li>
                                                            </ul>
                                                            {/* </Collapse> */}

                                                        </>
                                                        :
                                                        <>
                                                            {
                                                                (routes.group === "Documentation")
                                                                    ?
                                                                    <a className="nav-link" href={menus.path}  >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </a>
                                                                    :
                                                                    <Nav.Link as={NavLink} exact={true} activeClassName="active" to={menus.path} onClick={() => handleClick(menus.name)} >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </Nav.Link>
                                                            }
                                                        </>
                                                }
                                            </Nav.Item>
                                        </Nav>
                                    ))}
                                </div>
                                <div className="menu-gap" />
                            </React.Fragment>
                        ))}

                        <Card bg="orange-light-5" className="callout card-flush  text-center w-220p mx-auto">
                            <Card.Body>
                                <h5 className="h5">Quickly Build Applications</h5>
                                <Card.Text className="p-sm">Exclusively for webapps Based on Bootstrap</Card.Text>
                                <Button variant="primary" href="https://jampack.hencework.com/documentation/introduction" target="_blank" rel="noreferrer" className="btn-block">Go Jampack Doc</Button>
                            </Card.Body>
                        </Card>
                    </div>
                </SimpleBar>
                {/* /Main Menu */}
            </div >
            <div onClick={backDropToggle} className="hk-menu-backdrop" />
        </>
    )
}

const mapStateToProps = ({ theme }) => {
    const { navCollapsed } = theme;
    return { navCollapsed }
};

export default connect(mapStateToProps, { toggleCollapsedNav })(Sidebar);
