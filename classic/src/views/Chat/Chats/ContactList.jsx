import React, { useState } from 'react';
import SimpleBar from 'simplebar-react';
import { Link } from '/src/utils/router-compat.jsx';
import classNames from 'classnames';
import * as Icons from 'react-feather';
import { Dropdown, Form, ListGroup } from 'react-bootstrap';
import { useWindowWidth } from '@react-hook/window-size';
import { contacts } from './contact-list';
//Redux
import { connect } from 'react-redux';
import { StartConversation } from '../../../redux/action/Chat';
import { toggleTopNav } from '../../../redux/action/Theme';
import { setUser } from '../../../redux/action/Chat';
//Images
import avatar1 from '../../../assets/img/avatar1.jpg';
import avatar8 from '../../../assets/img/avatar8.jpg';
import avatar15 from '../../../assets/img/avatar15.jpg';


import { api } from '../../../utils/api';

const ContactList = ({ invitePeople, StartConversation, startChating, toggleTopNav, topNavCollapsed, setUser, userId, avatar, userName }) => {

    const [allContacts, setAllContacts] = useState(contacts);
    const [list, setList] = useState(contacts);
    const [searchValue, setSearchValue] = useState("");

    useEffect(() => {
        let isMounted = true;
        api.get('/api/employees')
            .then(res => {
                const emps = Array.isArray(res) ? res : res?.data || res?.employees;
                if (isMounted && Array.isArray(emps) && emps.length > 0) {
                    const mapped = emps.map(emp => ({
                        id: emp.id || emp.userId,
                        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || emp.email || 'Employee',
                        role: emp.designation?.title || emp.designation || emp.role || 'Team Member',
                        status: 'active',
                        time: 'Now',
                        initAvatar: {
                            variant: 'primary',
                            title: (emp.firstName || emp.name || emp.email || 'U')[0].toUpperCase()
                        }
                    }));
                    setAllContacts(mapped);
                    setList(mapped);
                    if (mapped[0]) {
                        setUser(mapped[0].id, mapped[0].initAvatar, mapped[0].name);
                    }
                }
            })
            .catch(err => {
                console.warn('Could not fetch employees for chat:', err.message);
            });
        return () => { isMounted = false; };
    }, []);

    const width = useWindowWidth();
    const Conversation = (index) => {
        (list[index].avatar) ? setUser(list[index].id, list[index].avatar, list[index].name) : setUser(list[index].id, list[index].initAvatar, list[index].name);
        if (width <= 991) {
            StartConversation(!startChating);
            toggleTopNav(!topNavCollapsed);
        }
    }

    const searchOnChange = (event) => {
        const val = event.target.value;
        setSearchValue(val);
        var updatedList = [...allContacts];
        if (val.trim()) {
            updatedList = updatedList.filter((item) => {
                return item.name.toLowerCase().indexOf(val.toLowerCase()) !== -1;
            });
        }
        setList(updatedList);
    }

    return (
        <>
            <div className="chatapp-aside">
                <header className="aside-header">
                    <Dropdown>
                        <Dropdown.Toggle as="a" className="chatapp-title link-dark" href="#" >
                            <h1>Chat</h1>
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
                            <Dropdown.Toggle as="a" href="#" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret me-1">
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
                        <Link to="#" className="btn btn-icon btn-rounded btn-primary" onClick={invitePeople} >
                            <span className="icon">
                                <span className="feather-icon">
                                    <Icons.Plus />
                                </span>
                            </span>
                        </Link>
                    </div>
                </header>
                <SimpleBar style={{ height: "100%" }} className="aside-body" >
                    <Form className="aside-search" role="search">
                        <Form.Control type="text" placeholder="Search Chats" value={searchValue} onChange={searchOnChange} />
                    </Form>
                    <div className="frequent-contact">
                        <div className="title-sm text-primary"><span>Frequent contact</span></div>
                        <ul className="hk-list">
                            <li>
                                <div className="avatar avatar-sm avatar-primary position-relative avatar-rounded">
                                    <span className="initial-wrap">H</span>
                                    <div className="badge-icon badge-circle badge-icon-xxs text-white position-bottom-end-overflow-1">
                                        <div className="badge-icon-wrap">
                                            <i className="ri-group-fill text-light" />
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127 127">
                                            <g data-name="Ellipse 302" transform="translate(8 8)" strokeWidth={3}>
                                                <circle cx="55.5" cy="55.5" r="55.5" stroke="currentColor" />
                                                <circle cx="55.5" cy="55.5" r="59.5" fill="currentColor" />
                                            </g>
                                        </svg>
                                    </div>
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-primary position-relative avatar-rounded">
                                    <img src={avatar1} alt="user" className="avatar-img" />
                                    <div className="badge-icon badge-circle badge-icon-xxs text-white position-bottom-end-overflow-1">
                                        <div className="badge-icon-wrap">
                                            <i className="ri-group-fill text-light" />
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127 127">
                                            <g data-name="Ellipse 302" transform="translate(8 8)" strokeWidth={3}>
                                                <circle cx="55.5" cy="55.5" r="55.5" stroke="currentColor" />
                                                <circle cx="55.5" cy="55.5" r="59.5" fill="currentColor" />
                                            </g>
                                        </svg>
                                    </div>
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-soft-danger avatar-rounded position-relative">
                                    <span className="initial-wrap">W</span>
                                    <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-rounded position-relative">
                                    <img src={avatar8} alt="user" className="avatar-img" />
                                    <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />
                                </div>
                            </li>
                            <li>
                                <div className="avatar avatar-sm avatar-rounded">
                                    <img src={avatar15} alt="user" className="avatar-img" />
                                </div>
                            </li>
                        </ul>
                    </div>
                    <ListGroup variant="flush" className="chat-contacts-list">
                        {
                            list.map((elem, index) => (
                                <ListGroup.Item onClick={() => Conversation(index)} key={index} >
                                    <div className={classNames("media", { "active-user": elem.id === userId }, { "read-chat": !elem.unread })}>
                                        <div className="media-head">
                                            {elem.avatar && <div className="avatar avatar-sm avatar-rounded position-relative">
                                                <img src={elem.avatar} alt="user" className="avatar-img" />
                                                {elem.status === "active" && <span className="badge badge-success badge-indicator badge-indicator-lg position-bottom-end-overflow-1" />}
                                            </div>}
                                            {elem.initAvatar && <div className={`avatar avatar-sm avatar-${elem.initAvatar.variant} avatar-rounded`}>
                                                <span className="initial-wrap">{elem.initAvatar.title}</span>
                                            </div>}
                                        </div>
                                        <div className="media-body">
                                            <div>
                                                <div className="user-name">{elem.name}</div>
                                                <div className="user-last-chat">{elem.lastChat}</div>
                                            </div>
                                            <div>
                                                <div className="last-chat-time">{elem.time}</div>
                                                {elem.unread > 0 && <div className="badge badge-primary badge-sm badge-pill">{elem.unread}</div>}
                                                <div className="dropdown action-drp">
                                                    <a href="#some" className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover dropdown-toggle no-caret" data-bs-toggle="dropdown"><span className="icon"><span className="feather-icon"><i data-feather="more-horizontal" /></span></span></a>
                                                    <div className="dropdown-menu dropdown-menu-end">
                                                        <a className="dropdown-item" href="#some">Mute Chat</a>
                                                        <a className="dropdown-item" href="#some">Archive Chat</a>
                                                        <a className="dropdown-item" href="#some">Delete Chat</a>
                                                        <a className="dropdown-item link-danger" href="#some">Block</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))
                        }
                    </ListGroup>
                </SimpleBar>
            </div>
        </>
    )
}

const mapStateToProps = ({ chatReducer, theme }) => {
    const { startChating, userId, avatar, userName } = chatReducer;
    const { topNavCollapsed } = theme;
    return { startChating, topNavCollapsed, userId, avatar, userName }
};

export default connect(mapStateToProps, { StartConversation, toggleTopNav, setUser })(ContactList);
