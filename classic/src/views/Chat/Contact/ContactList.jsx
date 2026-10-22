import React, { useState, useEffect } from 'react'
import { Button, Dropdown, Form, ListGroup } from 'react-bootstrap'
import SimpleBar from 'simplebar-react';
import * as Icons from 'react-feather';
import InvitePeopleModal from '../InvitePeopleModal';
import { useWindowWidth } from '@react-hook/window-size';

//Redux
import { connect } from 'react-redux';
import { StartConversation } from '../../../redux/action/Chat';
import { toggleTopNav } from '../../../redux/action/Theme';

//Images
import avatar1 from '../../../assets/img/avatar1.jpg';
import avatar2 from '../../../assets/img/avatar2.jpg';
import avatar3 from '../../../assets/img/avatar3.jpg';
import avatar4 from '../../../assets/img/avatar4.jpg';
import avatar7 from '../../../assets/img/avatar7.jpg';
import avatar8 from '../../../assets/img/avatar8.jpg';
import avatar9 from '../../../assets/img/avatar9.jpg';
import avatar11 from '../../../assets/img/avatar11.jpg';
import avatar15 from '../../../assets/img/avatar15.jpg';


import { api } from '../../../utils/api';
import { setUser } from '../../../redux/action/Chat';

const ContactList = ({ StartConversation, startChating, toggleTopNav, topNavCollapsed, setUser }) => {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        let isMounted = true;
        api.get('/api/employees')
            .then(res => {
                const emps = Array.isArray(res) ? res : res?.data || res?.employees;
                if (isMounted && Array.isArray(emps) && emps.length > 0) {
                    setEmployees(emps);
                }
            })
            .catch(err => console.warn('Could not load chat contact directory:', err.message));
        return () => { isMounted = false; };
    }, []);

    const width = useWindowWidth();
    const Conversation = (emp) => {
        if (emp && setUser) {
            const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.email;
            setUser(emp.id || emp.userId, { variant: 'primary', title: name[0].toUpperCase() }, name);
        }
        if (width <= 991) {
            StartConversation(!startChating);
            toggleTopNav(!topNavCollapsed);
        }
    }

    const filteredEmployees = employees.filter(emp => {
        if (!search.trim()) return true;
        const name = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.email || ''}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    return (
        <>
            <InvitePeopleModal show={showInviteModal} onClose={() => setShowInviteModal(!showInviteModal)} />
            <div className="chatapp-aside">
                <header className="aside-header">
                    <Dropdown>
                        <Dropdown.Toggle as="a" href="#" className="chatapp-title link-dark" >
                            <h1>Contact</h1>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item href="chats.html">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.MessageSquare />
                                </span>
                                <span>Chats</span>
                            </Dropdown.Item>
                            <Dropdown.Item href="chats-contact.html">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.Book />
                                </span>
                                <span>Contacts</span>
                            </Dropdown.Item>
                            <Dropdown.Item href="chats-group.html">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.User />
                                </span>
                                <span>Groups</span>
                            </Dropdown.Item>
                            <Dropdown.Item href="#some">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.Archive />
                                </span>
                                <span>Archived</span>
                            </Dropdown.Item>
                            <Dropdown.Item href="#some">
                                <span className="feather-icon dropdown-icon">
                                    <Icons.Star />
                                </span>
                                <span>Favorites</span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <div className="d-flex">
                        <Dropdown>
                            <Dropdown.Toggle as="a" href="#" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover no-caret me-1">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Icons.Settings />
                                    </span>
                                </span>
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end" >
                                <Dropdown.Item href="#some">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.UserCheck />
                                    </span>
                                    <span>Active Contacts</span>
                                </Dropdown.Item>
                                <Dropdown.Item href="#some">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.MessageSquare />
                                    </span>
                                    <span>Chat Requests</span>
                                </Dropdown.Item>
                                <Dropdown.Item href="#some">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.Archive />
                                    </span>
                                    <span>Archived Chats</span>
                                </Dropdown.Item>
                                <Dropdown.Item href="#some">
                                    <span className="feather-icon dropdown-icon">
                                        <Icons.ToggleRight />
                                    </span>
                                    <span>Unread Chats</span>
                                </Dropdown.Item>
                                <Dropdown.Divider as="div" />
                                <Dropdown.Item href="#some">Settings</Dropdown.Item>
                                <Dropdown.Item href="#some">Help</Dropdown.Item>
                                <Dropdown.Item href="#some">Report a problem	</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                        <Button variant="primary" className="btn-icon btn-rounded" onClick={() => setShowInviteModal(!showInviteModal)} >
                            <span className="icon">
                                <span className="feather-icon">
                                    <Icons.Plus />
                                </span>
                            </span>
                        </Button>
                    </div>
                </header>
                <SimpleBar className="aside-body">
                    <Form className="aside-search" role="search">
                        <input type="text" className="form-control" placeholder="Search Contacts" />
                    </Form>
                    <ListGroup as="ul" variant="flush" className="chat-contacts-list">
                        <li>
                            <div className="title title-wth-divider text-primary my-3"><span>A</span></div>
                        </li>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media read-chat active-user">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar2} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Alan Rickman</div>
                                        <div className="user-status">Today I don't feel like doing anything</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar8} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Ashley Jude</div>
                                        <div className="user-status">Ma life ma rules😍</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar11} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Adam Sandler</div>
                                        <div className="user-status">Hi There, I am using Jampack</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <li>
                            <div className="title title-wth-divider text-primary my-3"><span>B</span></div>
                        </li>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar4} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Billy Zen</div>
                                        <div className="user-status">👿Take me to the places!!</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar1} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Bradley Cooper</div>
                                        <div className="user-status">Always Busy</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar15} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Brad Pitt</div>
                                        <div className="user-status">No calls, telepathy only</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-soft-danger avatar-rounded position-relative">
                                        <span className="initial-wrap">B</span>
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Ben Afflex</div>
                                        <div className="user-status">¬¬¬ on vacation</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar3} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Barbara Harshey</div>
                                        <div className="user-status">Dead like a python</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <li>
                            <div className="title title-wth-divider text-primary my-3"><span>C</span></div>
                        </li>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded position-relative">
                                        <img src={avatar7} alt="user" className="avatar-img" />
                                        <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Colin Hanks</div>
                                        <div className="user-status">No calls. Always Busy</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-rounded">
                                        <img src={avatar9} alt="user" className="avatar-img" />
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Chuck Norris</div>
                                        <div className="user-status">Hi There, I am using Jampack</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                        <ListGroup.Item as="li" onClick={Conversation} >
                            <div className="media">
                                <div className="media-head">
                                    <div className="avatar avatar-sm avatar-soft-info avatar-rounded">
                                        <span className="initial-wrap">C</span>
                                    </div>
                                </div>
                                <div className="media-body">
                                    <div>
                                        <div className="user-name">Christian Bale</div>
                                        <div className="user-status">No status to show</div>
                                    </div>
                                    <div>
                                        <div className="dropdown action-drp">
                                            <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                            <div className="dropdown-menu dropdown-menu-end">
                                                <a className="dropdown-item" href="#some">Delete Chat</a>
                                                <a className="dropdown-item link-danger" href="#some">Block</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ListGroup.Item>
                    </ListGroup>
                </SimpleBar>
            </div>
        </>
    )
}

const mapStateToProps = ({ chatReducer, theme }) => {
    const { startChating } = chatReducer;
    const { topNavCollapsed } = theme;
    return { startChating, topNavCollapsed }
};

export default connect(mapStateToProps, { StartConversation, toggleTopNav })(ContactList);
