import React from 'react';
import { Card, Col, Container, Form, Row } from 'react-bootstrap';
import Footer from './Footer';

//Images
import avatar12 from '../../../assets/img/avatar12.jpg';

const LockScreen = (props) => {

    const unlockScreen = (e) => {
        e.preventDefault();
        props.history.push("/");
    }

    return (
        <div className="hk-pg-wrapper pt-0 pb-xl-0 pb-5">
            <div className="hk-pg-body pt-0 pb-xl-0">
                <Container>
                    <Row>
                        <Col sm={10} className="position-relative mx-auto">
                            <div className="auth-content py-8">
                                <Form className="w-100" onSubmit={e => unlockScreen(e)} >
                                    <Row>
                                        <Col lg={4} md={6} className="mx-auto">
                                            <Card className="card-flush bg-transparent">
                                                <Card.Body className="text-center">
                                                    <div className="avatar avatar-xl avatar-rounded  position-relative mb-3">
                                                        <img src={avatar12} alt="user" className="avatar-img" />
                                                        <div className="badge-icon badge-icon-xxs text-primary position-bottom-end-overflow-1">
                                                            <div className="badge-icon-wrap">
                                                                <i className="ri-lock-fill" />
                                                            </div>
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127 127">
                                                                <g data-name="Ellipse 302" transform="translate(8 8)" strokeWidth={3}>
                                                                    <circle cx="55.5" cy="55.5" r="55.5" stroke="currentColor" />
                                                                    <circle cx="55.5" cy="55.5" r="59.5" fill="currentColor" />
                                                                </g>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <h4 className="text-white">Jim Carry</h4>
                                                    <p className="p-sm mb-4 text-white opacity-55">admistrator@jampack.com</p>
                                                    <Row className="gx-3">
                                                        <Col as={Form.Group} className="mb-3">
                                                            <Form.Control placeholder="Enter Password" type="password" />
                                                        </Col>
                                                    </Row>
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
            <Footer />
        </div>

    )
}

export default LockScreen
