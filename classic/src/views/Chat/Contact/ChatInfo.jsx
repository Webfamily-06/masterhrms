import React from 'react';
import { Link } from '/src/utils/router-compat.jsx';
import { Button, Card, Form } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Briefcase, Mail, MapPin, Phone } from 'react-feather';
import { faDropbox, faFacebook, faGithub, faGoogle, faGoogleDrive } from '@fortawesome/free-brands-svg-icons';

//Image
import avatar2 from '../../../assets/img/avatar2.jpg';

const ChatInfo = ({ infoToggle }) => {
    return (
        <div className="chat-info">
            <SimpleBar className="nicescroll-bar">
                <Button bsPrefix=" btn-close" className="info-close" onClick={infoToggle} >
                    <span aria-hidden="true">×</span>
                </Button>
                <div className="text-center">
                    <div className="avatar avatar-xxl avatar-rounded">
                        <img src={avatar2} alt="user" className="avatar-img" />
                    </div>
                    <div className="cp-name text-truncate mt-2">Alan Rickman</div>
                    <p className="text-truncate">Today I don't feel like doing anything.. I just wanna laying in my bed</p>
                </div>
                <div className="mt-4">
                    <Form role="search">
                        <Form.Control type="text" placeholder="Search in conversation" />
                    </Form>
                    <div className="collapse-simple mt-3">
                        <Card>
                            <Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#gn_info" aria-expanded="true">General Info</a>
                            </Card.Header>
                            <div id="gn_info" className="collapse show">
                                <Card.Body>
                                    <ul className="cp-info">
                                        <li>
                                            <Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <Briefcase />
                                                </span></span>
                                                Co-Founder
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <Mail />
                                                </span></span>
                                                <span className="text-primary">contact@hencework.com</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <Phone />
                                                </span></span>
                                                +91-25-4125-2365
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to="#">
                                                <span className="cp-icon-wrap"><span className="feather-icon">
                                                    <MapPin />
                                                </span></span>
                                                Oslo, Canada
                                            </Link>
                                        </li>
                                    </ul>
                                </Card.Body>
                            </div>
                        </Card>
                        <Card>
                            <Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#social_profile" aria-expanded="true">Social Profile </a>
                            </Card.Header>
                            <div id="social_profile" className="collapse show">
                                <Card.Body>
                                    <ul className="hk-list hk-list-sm">
                                        <li>
                                            <Button variant="primary" className="btn-icon btn-rounded"><span className="icon">
                                                <FontAwesomeIcon icon={faFacebook} />
                                            </span></Button>
                                        </li>
                                        <li>
                                            <Button variant="warning" className="btn-icon btn-rounded"><span className="icon">
                                                <FontAwesomeIcon icon={faGoogleDrive} />
                                            </span></Button>
                                        </li>
                                        <li>
                                            <Button variant="info" className="btn-icon btn-rounded"><span className="icon">
                                                <FontAwesomeIcon icon={faDropbox} />
                                            </span></Button>
                                        </li>
                                        <li>
                                            <Button variant="dark" className="btn-icon btn-rounded"><span className="icon">
                                                <FontAwesomeIcon icon={faGithub} />
                                            </span></Button>
                                        </li>
                                        <li>
                                            <Button variant="danger" className="btn-icon btn-rounded"><span className="icon">
                                                <FontAwesomeIcon icon={faGoogle} />
                                            </span></Button>
                                        </li>
                                    </ul>
                                </Card.Body>
                            </div>
                        </Card>
                        <Card>
                            <Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#biography" aria-expanded="true">Biography </a>
                            </Card.Header>
                            <div id="biography" className="collapse show">
                                <Card.Body>
                                    <p>Hello there, Alan Rickman is a brilliant co-founder and a copy writer working for almost a decade for fortune 500 companies. I am well verse with multiple foreign languages and I love to produce good quality stuff. </p>
                                </Card.Body>
                            </div>
                        </Card>
                        <Card>
                            <Card.Header>
                                <a role="button" data-bs-toggle="collapse" href="#settings" aria-expanded="true">Settings </a>
                            </Card.Header>
                            <div id="settings" className="collapse show">
                                <Card.Body>
                                    <ul className="cp-action">
                                        <li>
                                            <Link to="#">
                                                Clear Chat
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to="#">
                                                <span className="text-danger">Block Contact</span>
                                            </Link>
                                        </li>
                                        <li>
                                            <Link to="#">
                                                Somthing's Wrong
                                            </Link>
                                        </li>
                                    </ul>
                                    <Link to="#" className="d-block text-dark fs-7 mb-10">Give feedback and report conversation</Link>
                                </Card.Body>
                            </div>
                        </Card>
                    </div>
                </div>
            </SimpleBar>
        </div>
    )
}

export default ChatInfo
