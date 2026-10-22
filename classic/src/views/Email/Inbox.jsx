import React, { useState } from 'react';
import { Badge, Button, Dropdown, Form, ListGroup, Spinner, Alert } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import classNames from 'classnames';
import { useWindowWidth } from '@react-hook/window-size';
import {
    Archive,
    Calendar,
    Check,
    Edit,
    Inbox,
    Layout,
    Mail,
    RefreshCw,
    Send,
    Settings,
    Star,
    Trash2,
    Plus,
    AlertCircle,
    User,
} from 'react-feather';
import ComposeEmail from './ComposeEmail';
import { useEmail } from './EmailContext';

//Redux
import { connect } from 'react-redux';
import { StartConversation } from '../../redux/action/Chat';
import { toggleTopNav } from '../../redux/action/Theme';
import { Compose } from '../../redux/action/Email';

const InboxList = ({
    toggleSidebar,
    show,
    StartConversation,
    startChating,
    toggleTopNav,
    topNavCollapsed,
    Compose,
    composeEmail,
}) => {
    const [showComposePopup, setShowComposePopup] = useState(false);
    const {
        accounts,
        loadingAccounts,
        activeAccount,
        activeFolder,
        setActiveFolder,
        messages,
        loadingMessages,
        messagesError,
        selectedMessageId,
        selectMessage,
        searchQuery,
        setSearchQuery,
        refreshMessages,
    } = useEmail();

    const width = useWindowWidth();
    const handleSelectEmail = (msg) => {
        selectMessage(msg);
        if (width <= 991) {
            StartConversation(!startChating);
            toggleTopNav(!topNavCollapsed);
        }
    };

    // Filter messages based on search query
    const filteredMessages = messages.filter((m) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const subject = (m.subject || '').toLowerCase();
        const from = (m.from || '').toLowerCase();
        const snippet = (m.snippet || m.bodyText || '').toLowerCase();
        return subject.includes(q) || from.includes(q) || snippet.includes(q);
    });

    const folderTitle =
        activeFolder === 'INBOX'
            ? 'Inbox'
            : activeFolder === 'SENT'
            ? 'Sent'
            : activeFolder === 'ARCHIVE'
            ? 'Archive'
            : activeFolder === 'DRAFTS'
            ? 'Drafts'
            : activeFolder === 'TRASH'
            ? 'Trash'
            : activeFolder === 'IMPORTANT'
            ? 'Important'
            : activeFolder;

    return (
        <>
            <div className="emailapp-aside">
                <header className="aside-header">
                    <Dropdown>
                        <Dropdown.Toggle as="a" className="emailapp-title link-dark" href="#">
                            <h1>{folderTitle}</h1>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => setActiveFolder('INBOX')}>
                                <span className="feather-icon dropdown-icon">
                                    <Inbox />
                                </span>
                                <span>Inbox</span>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setActiveFolder('SENT')}>
                                <span className="feather-icon dropdown-icon">
                                    <Send />
                                </span>
                                <span>Sent</span>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setActiveFolder('ARCHIVE')}>
                                <span className="feather-icon dropdown-icon">
                                    <Archive />
                                </span>
                                <span>Archive</span>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setActiveFolder('DRAFTS')}>
                                <span className="feather-icon dropdown-icon">
                                    <Edit />
                                </span>
                                <span>Draft</span>
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setActiveFolder('TRASH')}>
                                <span className="feather-icon dropdown-icon">
                                    <Trash2 />
                                </span>
                                <span>Trash</span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <div className="d-flex">
                        <Button
                            as="button"
                            type="button"
                            className="btn-icon btn-flush-dark btn-rounded flush-soft-hover me-0"
                            onClick={() => refreshMessages()}
                            disabled={loadingMessages || !activeAccount}
                            title="Refresh Mailbox"
                        >
                            <span className="icon">
                                <span className={classNames('feather-icon', { 'fa-spin': loadingMessages })}>
                                    <RefreshCw className={loadingMessages ? 'spinner-border spinner-border-sm' : ''} />
                                </span>
                            </span>
                        </Button>
                        <Dropdown>
                            <Dropdown.Toggle
                                as="a"
                                href="#"
                                className="btn btn-icon btn-rounded flush-soft-hover btn-flush-dark dropdown-toggle no-caret me-1"
                            >
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Settings />
                                    </span>
                                </span>
                            </Dropdown.Toggle>
                            <Dropdown.Menu align="end">
                                <Dropdown.Item as="a" href="/settings/email-accounts">
                                    <Settings size={14} className="me-2" />
                                    Email Account Settings
                                </Dropdown.Item>
                                <div className="dropdown-divider" />
                                <Dropdown.Item onClick={() => refreshMessages()}>
                                    <RefreshCw size={14} className="me-2" />
                                    Check New Mail
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                        <Button
                            as="button"
                            type="button"
                            className="btn-icon btn-rounded show-compose-popup"
                            onClick={() => Compose(!composeEmail)}
                            title="Compose Email"
                        >
                            <span className="icon">
                                <span className="feather-icon">
                                    <Edit />
                                </span>
                            </span>
                        </Button>
                    </div>
                    <div className={classNames('hk-sidebar-togglable', { active: !show })} onClick={toggleSidebar} />
                </header>

                <SimpleBar className="aside-body">
                    {/* Search bar */}
                    <Form className="aside-search" role="search" onSubmit={(e) => e.preventDefault()}>
                        <Form.Control
                            type="text"
                            placeholder="Search mailbox messages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </Form>

                    {/* Unconfigured Setup State */}
                    {!loadingAccounts && accounts.length === 0 && (
                        <div className="p-4 text-center">
                            <div className="avatar avatar-lg avatar-soft-primary avatar-rounded mb-3 mx-auto">
                                <span className="initial-wrap">
                                    <Mail size={24} />
                                </span>
                            </div>
                            <h5 className="mb-2">No Email Account Configured</h5>
                            <p className="text-muted fs-7 mb-4">
                                Connect your own external email account (Gmail, Outlook, Yahoo, or custom SMTP/IMAP/POP3)
                                to read, compose, and synchronize personal emails securely.
                            </p>
                            <div className="alert alert-light border text-start fs-8 mb-4">
                                <div className="fw-bold mb-1 text-dark">
                                    <AlertCircle size={14} className="me-1 text-primary" />
                                    System Mail Separation
                                </div>
                                <span className="text-muted">
                                    <code>mail.masterhrms.com</code> is strictly reserved for Super Admin transactional
                                    notifications (passwords, OTPs). Personal employee email accounts are isolated per user.
                                </span>
                            </div>
                            <Button as="a" href="/settings/email-accounts" variant="primary" className="btn-rounded">
                                <Plus size={16} className="me-1" /> Configure Personal Account
                            </Button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loadingMessages && (
                        <div className="p-4 text-center text-muted">
                            <Spinner animation="border" size="sm" variant="primary" className="me-2" />
                            <span className="fs-7">
                                Fetching messages from {activeAccount?.incomingHost || 'mail server'} ({activeAccount?.incomingProtocol || 'IMAP'})...
                            </span>
                        </div>
                    )}

                    {/* Error State */}
                    {!loadingMessages && messagesError && (
                        <div className="p-3">
                            <Alert variant="danger" className="fs-7 mb-3">
                                <div className="fw-bold mb-1">
                                    <AlertCircle size={14} className="me-1" />
                                    Mailbox Connection Error
                                </div>
                                <div>{messagesError}</div>
                            </Alert>
                            <Button
                                as="a"
                                href="/settings/email-accounts"
                                variant="outline-primary"
                                size="sm"
                                className="w-100"
                            >
                                <Settings size={14} className="me-1" /> Check Credentials & Server Settings
                            </Button>
                        </div>
                    )}

                    {/* Empty Mailbox State */}
                    {!loadingMessages && !messagesError && activeAccount && filteredMessages.length === 0 && (
                        <div className="p-4 text-center text-muted">
                            <Inbox size={32} className="text-muted mb-2 opacity-50" />
                            <div className="fw-medium">No messages found</div>
                            <div className="fs-8 text-muted mt-1">
                                {searchQuery ? 'Try adjusting your search criteria' : `Folder ${folderTitle} is empty`}
                            </div>
                        </div>
                    )}

                    {/* Messages List */}
                    {!loadingMessages && filteredMessages.length > 0 && (
                        <ListGroup as="ul" variant="flush" className="email-list">
                            {filteredMessages.map((msg) => {
                                const msgId = msg.id || msg.uid;
                                const isSelected = msgId === selectedMessageId;
                                const senderDisplay = msg.fromName || msg.from || 'Unknown Sender';
                                const initial = senderDisplay.replace(/[^a-zA-Z]/g, '')[0] || 'M';

                                return (
                                    <ListGroup.Item
                                        as="li"
                                        key={msgId}
                                        onClick={() => handleSelectEmail(msg)}
                                        className={classNames({
                                            'read-email': msg.read !== false,
                                            'active-user': isSelected,
                                        })}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="media">
                                            <div className="media-head">
                                                <div className="avatar avatar-sm avatar-soft-primary avatar-rounded">
                                                    <span className="initial-wrap">{initial.toUpperCase()}</span>
                                                </div>
                                                {msg.unread && (
                                                    <Badge bg="primary" className="badge-indicator badge-indicator-nobdr" />
                                                )}
                                            </div>
                                            <div className="media-body">
                                                <div>
                                                    <div>
                                                        <div className="email-head text-truncate">{senderDisplay}</div>
                                                        <div>
                                                            {msg.starred && (
                                                                <span className="email-star marked">
                                                                    <span className="feather-icon">
                                                                        <Star />
                                                                    </span>
                                                                </span>
                                                            )}
                                                            <div className="email-time">
                                                                {msg.date ? new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="email-subject text-truncate">
                                                        {msg.subject || '(No Subject)'}
                                                    </div>
                                                    <div className="email-text text-truncate">
                                                        <p className="mb-0 text-truncate">
                                                            {msg.snippet || msg.bodyText || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                );
                            })}
                        </ListGroup>
                    )}
                </SimpleBar>
            </div>

            {/* Compose email modal/popup */}
            <ComposeEmail show={showComposePopup} onClose={() => setShowComposePopup(!showComposePopup)} />
        </>
    );
};

const mapStateToProps = ({ chatReducer, theme, emailReducer }) => {
    const { startChating } = chatReducer;
    const { composeEmail } = emailReducer;
    const { topNavCollapsed } = theme;
    return { startChating, composeEmail, topNavCollapsed };
};

export default connect(mapStateToProps, { StartConversation, toggleTopNav, Compose })(InboxList);
