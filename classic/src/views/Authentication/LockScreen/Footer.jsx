import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Link } from '/src/utils/router-compat.jsx';

const Footer = () => {

    return (
        <div className="hk-footer border-0 bg-transparent">
            <Container as="footer" className="footer">
                <Row>
                    <Col xl={8} className="text-center">
                        <p className="footer-text pb-0">
                            <span className="copy-text text-white opacity-55">Jampack © {new Date().getFullYear()} All rights reserved.</span><Link to="#" className="text-white opacity-55">Privacy Policy</Link><span className="footer-link-sep text-white opacity-55">|</span><Link to="#" className="text-white opacity-55">T&amp;C</Link><span className="footer-link-sep text-white opacity-55">|</span><Link to="#" className="text-white opacity-55">System Status</Link>
                        </p>
                    </Col>
                </Row>
            </Container>
        </div>
    )
}

export default Footer
