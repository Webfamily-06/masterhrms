import React from 'react';
import { Button, Container, Nav, Navbar } from 'react-bootstrap';
import { HelpCircle } from 'react-feather';
import { Link, useRouteMatch } from '/src/utils/router-compat.jsx';

//Images
import jampackImg from '../../assets/img/logo-light.svg';
import jampackImgDark from '../../assets/img/logo-dark.svg';
import { useTheme } from '../../utils/theme-provider/theme-provider';

const SimpleHeader = () => {
    const loginPath = useRouteMatch("/auth/login-simple");
    const signupPath = useRouteMatch("/auth/signup-simple");

    const { theme } = useTheme();

    return (
        <Navbar expand="xl" className="hk-navbar navbar-light fixed-top">
            <Container>
                {/* Start Nav */}
                <div className="nav-start-wrap">
                    <Navbar.Brand as={Link} to="/" >
                        {theme === "light" ? <img src={jampackImg} alt="brand" className="brand-img d-inline-block" /> : <img src={jampackImgDark} alt="brand" className="brand-img d-inline-block" />}
                    </Navbar.Brand>
                </div>
                
                {/* End Nav */}
                <div className="nav-end-wrap">
                    <Nav as="ul" className="flex-row">
                        {loginPath && <Nav.Item as="li" className="nav-link py-0">
                            <Button size='sm' variant="outline-light" >
                                <span>
                                    <span className="icon">
                                        <span className="feather-icon">
                                            <HelpCircle />
                                        </span>
                                    </span>
                                    <span>Get Help</span>
                                </span>
                            </Button>
                        </Nav.Item>}
                        {signupPath && <>
                            <Nav.Item as="li" className="nav-link py-0">
                                <Button variant="primary" as={Link} to="#">Help</Button>
                            </Nav.Item>
                            <Nav.Item as="li" className="nav-link py-0">
                                <Button variant="outline-light" as={Link} to="login">Sign In</Button>
                            </Nav.Item>
                        </>}
                    </Nav>
                </div>
                {/* /End Nav */}
            </Container>
        </Navbar>
    )
}

export default SimpleHeader
