import React, { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Button, Col, Container, Form, InputGroup, Row } from 'react-bootstrap';
import { ExternalLink } from 'react-feather';
import { Link } from '/src/utils/router-compat.jsx';

//Images
import jampackImg from '../../../../assets/img/logo-light.svg';
import jampackImgDark from '../../../../assets/img/logo-dark.svg';
import logoutImg from '../../../../assets/img/macaroni-logged-out.png';
import { useTheme } from '../../../../utils/theme-provider/theme-provider';

const Login = (props) => {
    const [showPassword, setShowPassword] = useState(false);

    const { theme } = useTheme();

    const form = useForm({
        defaultValues: {
            userName: "",
            password: "",
        },
        onSubmit: () => {
            props.history.push("/");
        },
    });

    return (
        <div className="hk-pg-wrapper py-0" >
            <div className="hk-pg-body py-0">
                <Container fluid>
                    <Row className="auth-split">
                        <Col xl={5} lg={6} md={7} className="position-relative mx-auto">
                            <div className="auth-content flex-column pt-8 pb-md-8 pb-13">
                                <div className="text-center mb-7">
                                    <Link to="/" className="navbar-brand me-0">
                                        {theme === "light" ? <img src={jampackImg} alt="brand" className="brand-img d-inline-block" /> : <img src={jampackImgDark} alt="brand" className="brand-img d-inline-block" />}
                                    </Link>
                                </div>
                                <Form className="w-100" onSubmit={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    form.handleSubmit();
                                }} >
                                    <Row>
                                        <Col xl={7} sm={10} className="mx-auto">
                                            <div className="text-center mb-4">
                                                <h4>Sign in to your account</h4>
                                                <p>There are many variations of passages of Lorem Ipsum available, in some form, by injected humour</p>
                                            </div>
                                            <Row className="gx-3">
                                                <Col as={Form.Group} lg={12} className="mb-3" >
                                                    <div className="form-label-group">
                                                        <Form.Label>User Name</Form.Label>
                                                    </div>
                                                    <form.Field
                                                        name="userName"
                                                        children={(field) => (
                                                            <Form.Control
                                                                placeholder="Enter username or email ID"
                                                                type="text"
                                                                value={field.state.value}
                                                                onBlur={field.handleBlur}
                                                                onChange={e => field.handleChange(e.target.value)}
                                                            />
                                                        )}
                                                    />
                                                </Col>
                                                <Col as={Form.Group} lg={12} className="mb-3" >
                                                    <div className="form-label-group">
                                                        <Form.Label>Password</Form.Label>
                                                        <Link to="#" className="fs-7 fw-medium">Forgot Password ?</Link>
                                                    </div>
                                                    <InputGroup className="password-check">
                                                        <span className="input-affix-wrapper affix-wth-text">
                                                            <form.Field
                                                                name="password"
                                                                children={(field) => (
                                                                    <Form.Control
                                                                        placeholder="Enter your password"
                                                                        value={field.state.value}
                                                                        onBlur={field.handleBlur}
                                                                        onChange={e => field.handleChange(e.target.value)}
                                                                        type={showPassword ? "text" : "password"}
                                                                    />
                                                                )}
                                                            />
                                                            <Link to="#" className="input-suffix text-primary text-uppercase fs-8 fw-medium" onClick={() => setShowPassword(!showPassword)} >
                                                                {showPassword
                                                                    ?
                                                                    <span>Hide</span>
                                                                    :
                                                                    <span>Show</span>
                                                                }
                                                            </Link>
                                                        </span>
                                                    </InputGroup>
                                                </Col>
                                            </Row>
                                            <div className="d-flex justify-content-center">
                                                <Form.Check id="logged_in" className="form-check-sm mb-3" >
                                                    <Form.Check.Input type="checkbox" defaultChecked />
                                                    <Form.Check.Label className="text-muted fs-7">Keep me logged in</Form.Check.Label>
                                                </Form.Check>
                                            </div>
                                            <Button variant="primary" type="submit" className="btn-uppercase btn-block">Login</Button>
                                            <p className="p-xs mt-2 text-center">New to Jampack? <Link to="#"><u>Create new account</u></Link></p>
                                            <Link to="#" className="d-block extr-link text-center mt-4">
                                                <span className="feather-icon">
                                                    <ExternalLink />
                                                </span>
                                                <u className="text-muted">Send feedback to our help forum</u>
                                            </Link>
                                        </Col>
                                    </Row>
                                </Form>
                            </div>
                            {/* Page Footer */}
                            <div className="hk-footer border-0">
                                <Container fluid as="footer" className="footer">
                                    <Row>
                                        <div className="col-xl-8 text-center">
                                            <p className="footer-text pb-0"><span className="copy-text">Jampack © {new Date().getFullYear()} All rights reserved.</span> <a href="#some" target="_blank">Privacy Policy</a><span className="footer-link-sep">|</span><a href="#some" target="_blank">T&amp;C</a><span className="footer-link-sep">|</span><a href="#some" target="_blank">System Status</a></p>
                                        </div>
                                    </Row>
                                </Container>
                            </div>
                        </Col>
                        <Col xl={7} lg={6} md={5} sm={10} className="d-md-block d-none position-relative bg-primary-light-5">
                            <div className="auth-content flex-column text-center py-8">
                                <Row>
                                    <Col xxl={7} xl={8} lg={11} className="mx-auto">
                                        <h2 className="mb-4">Meet all new Pro Jampack 2.0</h2>
                                        <p>There are many variations of passages of Lorem Ipsum available, passages of Lorem Ipsum available, in some form, by injected.</p>
                                        <Button variant="flush-primary" className="btn-uppercase mt-2">Take Tour</Button>
                                    </Col>
                                </Row>
                                <img src={logoutImg} className="img-fluid w-sm-50 mt-7" alt="login" />
                            </div>
                            <p className="p-xs credit-text opacity-55">All illustration are powered by <Link to="#" href="https://icons8.com/ouch/" target="_blank" rel="noreferrer" className="text-light"><u>Icons8</u></Link></p>
                        </Col>
                    </Row>
                </Container>
            </div>
        </div>
    )
}

export default Login
