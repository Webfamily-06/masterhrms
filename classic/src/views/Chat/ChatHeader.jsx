import React, { useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { Archive, ChevronDown, ChevronLeft, ChevronUp, ExternalLink, Info, MoreVertical, Phone, Slash, Star, UserPlus, Video } from 'react-feather';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';
import { useRouteMatch } from '/src/utils/router-compat.jsx';
import AudioCallModal from './AudioCallModal';
import { useWindowWidth } from '@react-hook/window-size';
import classNames from 'classnames';
import VideoCallModal from './VideoCallModal';

//Redux
import { connect } from 'react-redux';
import { toggleTopNav } from '../../redux/action/Theme';
import { StartConversation } from '../../redux/action/Chat';

//Images
import avatar1 from '../../assets/img/avatar1.jpg';
import avatar2 from '../../assets/img/avatar2.jpg';
import HkBadge from '../../components/@hk-badge/@hk-badge';


const ChatHeader = ({ topNavCollapsed, toggleTopNav, infoState, infoToggle, invitePeople, StartConversation, startChating, avatar, userName }) => {

    const [audioCall, setAudioCall] = useState(false);
    const [videoCall, setVideoCall] = useState(false);

    const chatsRoute = useRouteMatch("/apps/chat/chats");
    const groupRoutes = useRouteMatch("/apps/chat/chat-groups");
    const contactsRoute = useRouteMatch("/apps/chat/chat-contact");

    const width = useWindowWidth();
    const BackToContactList = () => {
        StartConversation(!startChating);
        toggleTopNav(!topNavCollapsed);
    }

    return (
        <>
            <header className="chat-header">
                <Button as="a" variant="flush-dark" size="sm" className="btn-icon btn-rounded flush-soft-hover back-user-list" onClick={BackToContactList}>
                    <span className="icon">
                        <span className="feather-icon">
                            <ChevronLeft />
                        </span>
                    </span>
                </Button>
                {chatsRoute && <div className="media">
                    <div className="media-head">
                        <div className="avatar avatar-sm avatar-rounded position-relative">
                            {typeof avatar === "string" && <img src={avatar} alt="user" className="avatar-img" />}
                            {typeof avatar === "object" && <div className={`avatar avatar-sm avatar-${avatar.variant} avatar-rounded`}>
                                <span className="initial-wrap">{avatar.title}</span>
                            </div>}
                            <HkBadge bg="success" indicator className="badge-indicator-lg position-bottom-end-overflow-1" />
                        </div>
                    </div>
                    <div className="media-body">
                        <div className="user-name">{userName}</div>
                        <div className="user-status">Typing<span className="one">.</span><span className="two">.</span><span className="three">.</span></div>
                    </div>
                </div>}

                {groupRoutes && <div className="media">
                    <div className="media-head">
                        <div className="avatar avatar-sm avatar-primary position-relative avatar-rounded">
                            <img src={avatar1} alt="user" className="avatar-img" />
                            <div className="badge-icon badge-circle badge-icon-xxs text-white position-bottom-end-overflow-1">
                                <div className="badge-icon-wrap">
                                    <i className="ri-group-fill text-light" />
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 141 141">
                                    <g transform="translate(-79 -975)">
                                        <path d="M70.5,0A70.5,70.5,0,1,1,0,70.5,70.5,70.5,0,0,1,70.5,0Z" transform="translate(79 975)" fill="#fff" />
                                        <path d="M55.5,0A55.5,55.5,0,1,1,0,55.5,55.5,55.5,0,0,1,55.5,0Z" transform="translate(94 990)" fill="#fff" />
                                    </g>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="media-body">
                        <div className="user-name">Developers Stage</div>
                        <div className="user-status">Active 1min ago</div>
                    </div>
                </div>}

                {contactsRoute && <div className="media">
                    <div className="media-head">
                        <div className="avatar avatar-sm avatar-rounded position-relative">
                            <img src={avatar2} alt="user" className="avatar-img" />
                            <HkBadge bg="success" indicator className="badge-indicator-lg position-bottom-end-overflow-1" />
                        </div>
                    </div>
                    <div className="media-body">
                        <div className="user-name">Alan Rickman</div>
                        <div className="user-status">Online</div>
                    </div>
                </div>}

                <div className="chat-options-wrap">
                    <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover d-none d-xl-block" onClick={invitePeople} >
                        <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="Invite people">
                            <span className="feather-icon">
                                <UserPlus />
                            </span>
                        </HkTooltip>
                    </Button>
                    <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover d-none d-xl-block" onClick={() => setAudioCall(!audioCall)} >
                        <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="Audio Call">
                            <span className="icon"  >
                                <span className="feather-icon">
                                    <Phone />
                                </span>
                            </span>
                        </HkTooltip>
                    </Button>
                    <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover d-none d-xl-block" onClick={() => setVideoCall(!videoCall)} >
                        <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="Video Call">
                            <span className="feather-icon">
                                <Video />
                            </span>
                        </HkTooltip>
                    </Button>
                    <Button as="a" variant="flush-dark" className={classNames("btn-icon btn-rounded flush-soft-hover chatapp-info-toggle", { "active": infoState })} onClick={infoToggle} >
                        <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="Info">
                            <span className="icon">
                                <span className="feather-icon">
                                    <Info />
                                </span>
                            </span>
                        </HkTooltip>
                    </Button>
                    <Dropdown className="inline-block ms-1" >
                        <Dropdown.Toggle as="a" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover no-caret" href="#">
                            <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="More">
                                <span className="feather-icon">
                                    <MoreVertical />
                                </span>
                            </HkTooltip>
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="end" >
                            <Dropdown.Item className="d-xl-none" onClick={invitePeople}>
                                <span className="feather-icon dropdown-icon">
                                    <UserPlus />
                                </span>
                                <span>Invite People</span>
                            </Dropdown.Item>
                            <Dropdown.Item className="d-xl-none" onClick={() => setAudioCall(!audioCall)} >
                                <span className="feather-icon dropdown-icon">
                                    <Phone />
                                </span>
                                <span>Audio Call</span>
                            </Dropdown.Item>
                            <Dropdown.Item className="d-xl-none" onClick={() => setVideoCall(!videoCall)} >
                                <span className="feather-icon dropdown-icon">
                                    <Video />
                                </span>
                                <span>Video Call</span>
                            </Dropdown.Item>
                            <Dropdown.Divider className="d-xl-none" />
                            <Dropdown.Item>
                                <span className="feather-icon dropdown-icon">
                                    <Star />
                                </span>
                                <span>Stared Messages</span>
                            </Dropdown.Item>
                            <Dropdown.Item><span className="feather-icon dropdown-icon">
                                <Archive />
                            </span>
                                <span>Archive Messages</span>
                            </Dropdown.Item>
                            <div className="dropdown-divider" />
                            <Dropdown.Item><span className="feather-icon dropdown-icon">
                                <Slash />
                            </span>
                                <span>Block Content</span>
                            </Dropdown.Item>
                            <Dropdown.Item><span className="feather-icon dropdown-icon">
                                <ExternalLink />
                            </span>
                                <span>Feedback</span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    {(width >= 991) && <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover hk-navbar-togglable" onClick={() => toggleTopNav(!topNavCollapsed)} >
                        <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="Collapse" >
                            <span className="icon">
                                <span className="feather-icon">
                                    {
                                        topNavCollapsed ? <ChevronDown /> : <ChevronUp />
                                    }
                                </span>
                            </span>
                        </HkTooltip>
                    </Button>}
                </div>
            </header>

            {/*Audio Call Window */}
            <AudioCallModal show={audioCall} hide={() => setAudioCall(!audioCall)} />
            {/*Video Call Window */}
            <VideoCallModal show={videoCall} hide={() => setVideoCall(!videoCall)} />
        </>
    )
}

const mapStateToProps = ({ chatReducer, theme }) => {
    const { startChating, avatar, userName } = chatReducer;
    const { topNavCollapsed } = theme;
    return { startChating, topNavCollapsed, avatar, userName }
};

export default connect(mapStateToProps, { StartConversation, toggleTopNav })(ChatHeader);