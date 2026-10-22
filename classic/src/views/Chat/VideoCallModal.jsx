import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import * as Icons from 'react-feather';
import { Link } from '/src/utils/router-compat.jsx';
//Redux
import { connect } from 'react-redux';

//Image
import avatar13 from '../../assets/img/avatar13.jpg';


const VideoCallModal = ({ show, hide, avatar, userName }) => {
    const [fullScreen, setFullScreen] = useState(false);

    return (
        <Modal show={show} onHide={hide} fullscreen={fullScreen} size="xl" centered dialogClassName="chatapp-call-window" className="ps-0" >
            <div className="modal-content bg-primary-dark-5">
                <Modal.Header className="header-wth-bg bg-primary-dark-3">
                    <Modal.Title as="h6" className="text-muted">Jampack  Video Call</Modal.Title>
                    <div className="modal-action">
                        <Link to="#" className="btn btn-xs btn-icon btn-rounded btn-link link-secondary modal-fullscreen-togglable" onClick={() => setFullScreen(!fullScreen)}>
                            <span className="icon">
                                <span className="feather-icon">
                                    {fullScreen ? <Icons.Minimize /> : <Icons.Maximize />}
                                </span>
                            </span>
                        </Link>
                        <Link to="#" className="btn btn-xs btn-icon btn-rounded btn-link link-secondary">
                            <span className="icon">
                                <span className="feather-icon">
                                    <Icons.HelpCircle />
                                </span>
                            </span>
                        </Link>
                    </div>
                </Modal.Header>
                <Modal.Body>
                    {typeof avatar === "string" && <div className="avatar avatar-xxl avatar-rounded d-20">
                        <img src={avatar} alt="user" className="avatar-img" />
                    </div>}
                    {typeof avatar === "object" && <div className={`avatar avatar-${avatar.variant} avatar-rounded avatar-xxl d-20`}>
                        <span className="initial-wrap">{avatar.title}</span>
                    </div>}
                    <h3 className="text-white mt-3">{userName}</h3>
                    <p className="text-white">Video Calling<span className="one">.</span><span className="two">.</span><span className="three">.</span></p>
                </Modal.Body>
                <Modal.Footer>
                    <ul className="chatapp-call-action hk-list">
                        <li>
                            <Button variant="dark" className="btn-icon btn-lg btn-rounded">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Icons.Mic />
                                    </span>
                                </span>
                            </Button>
                        </li>
                        <li>
                            <Button variant="dark" className="btn-icon btn-lg btn-rounded">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Icons.Video />
                                    </span>
                                </span>
                            </Button>
                        </li>
                        <li>
                            <Button variant="danger" className="btn-icon btn-lg btn-rounded" onClick={hide} >
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Icons.Phone />
                                    </span>
                                </span>
                            </Button>
                        </li>
                        <li>
                            <Button variant="dark" className="btn-icon btn-lg btn-rounded">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Icons.UserPlus />
                                    </span>
                                </span>
                            </Button>
                        </li>
                        <li>
                            <Button variant="dark" className="btn-icon btn-lg btn-rounded">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Icons.MoreVertical />
                                    </span>
                                </span>
                            </Button>
                        </li>
                    </ul>
                    <div className="avatar avatar-lg avatar-rounded chatapp-caller-img">
                        <img src={avatar13} alt="user" className="avatar-img" />
                    </div>
                </Modal.Footer>
            </div>
        </Modal>
    )
}

const mapStateToProps = ({ chatReducer }) => {
    const { avatar, userName } = chatReducer;
    return { avatar, userName }
};

export default connect(mapStateToProps)(VideoCallModal);

