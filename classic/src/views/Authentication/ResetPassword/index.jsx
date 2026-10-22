import React from 'react';
import { Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import { Link } from '/src/utils/router-compat.jsx';
import CommanFooter1 from '../CommanFooter1';

//image
import jampackImg from '../../../assets/img/logo-light.svg';
import jampackImgDark from '../../../assets/img/logo-dark.svg';
import { useTheme } from '../../../utils/theme-provider/theme-provider';

const ResetPassword = () => {

    const { theme } = useTheme();

    return (
        <div className="hk-pg-wrapper pt-0 pb-xl-0 pb-5">
            <div className="hk-pg-body pt-0 pb-xl-0">
                <Container>
                    <Row>
                        <Col sm={10} className="position-relative mx-auto">
                            <div className="auth-content py-8">
                                <Form className="w-100">
                                    <Row>
                                        <Col lg={5} md={7} sm={10} className="mx-auto">
                                            <div className="text-center mb-7">
                                                <Link to="/" className="navbar-brand me-0">
                                                    {theme === "light" ? <img src={jampackImg} alt="brand" className="brand-img d-inline-block" /> : <img src={jampackImgDark} alt="brand" className="brand-img d-inline-block" />}
                                                </Link>
                                            </div>
                                            <Card className="card-flush">
                                                <Card.Body className="text-center">
                                                    <h4>Reset your Password</h4>
                                                    <p className="mb-4">No worries we will mail you 6 digit code to your recovery email address to reset your password</p>
                                                    <Row className="gx-3">
                                                        <Col lg={12} as={Form.Group} className="mb-3">
                                                            <div className="form-label-group">
                                                                <Form.Label htmlFor="userName">Email</Form.Label>
                                                                <Link to="#" className="fs-7 fw-medium">Forgot Username ?</Link>
                                                            </div>
                                                            <Form.Control placeholder="Recovery email ID" type="email" />
                                                        </Col>
                                                    </Row>
                                                    <Button variant="primary" className="btn-uppercase btn-block">Send Code</Button>
                                                    <p className="p-xs mt-2 text-center">Did not receive code? <Link to="#"><u>Send again</u></Link></p>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                </Form>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
            {/* Page Footer */}
            <CommanFooter1 />
        </div>

    )
}

export default ResetPassword
