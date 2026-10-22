import React, { useState } from 'react';
import { Badge, Button, Card, Dropdown, Form, Spinner } from 'react-bootstrap';
import {
    ArrowRight,
    CornerUpLeft,
    Edit,
    Mail,
    MoreVertical,
    Paperclip,
    Printer,
    Star,
    Trash2,
    Inbox,
} from 'react-feather';
import SimpleBar from 'simplebar-react';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';
import { useEmail } from './EmailContext';

//Redux
import { connect } from 'react-redux';
import { Compose } from '../../redux/action/Email';

const EmailBody = ({ Compose, composeEmail }) => {
    const { selectedMessage, loadingDetail, activeAccount } = useEmail();
    const [starred, setStarred] = useState(false);

    if (!selectedMessage) {
        return (
            <div className="email-body d-flex align-items-center justify-content-center p-5 text-center text-muted">
                <div>
                    <div className="avatar avatar-xxl avatar-soft-primary avatar-rounded mb-3 mx-auto">
                        <span className="initial-wrap">
                            <Mail size={40} />
                        </span>
                    </div>
                    <h5>No Message Selected</h5>
                    <p className="text-muted fs-7 mb-0">
                        Choose an email from your {activeAccount?.incomingProtocol || 'mail'} inbox to read its contents.
                    </p>
                </div>
            </div>
        );
    }

    const senderDisplay = selectedMessage.fromName || selectedMessage.from || 'Unknown Sender';
    const initial = senderDisplay.replace(/[^a-zA-Z]/g, '')[0] || 'M';
    const formattedDate = selectedMessage.date
        ? new Date(selectedMessage.date).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : '';

    const handlePrint = () => {
        window.print();
    };

    const handleReply = () => {
        Compose(!composeEmail);
    };

    return (
        <div className="email-body">
            <SimpleBar className="nicescroll-bar">
                <div className="single-email-subject">
                    <div>
                        <h4 className="fw-light">{selectedMessage.subject || '(No Subject)'}</h4>
                        {activeAccount && (
                            <Badge bg="primary" pill className="badge-sm flex-shrink-0 ms-3">
                                {activeAccount.incomingProtocol}
                            </Badge>
                        )}
                    </div>
                    <div className="email-options-wrap">
                        <Button
                            variant="flush-dark"
                            className="btn-icon btn-rounded flush-soft-hover"
                            onClick={handlePrint}
                            title="Print"
                        >
                            <HkTooltip id="tooltip1" placement="top" title="Print">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Printer />
                                    </span>
                                </span>
                            </HkTooltip>
                        </Button>
                        <Button
                            variant="flush-dark"
                            className="btn-icon btn-rounded flush-soft-hover"
                            onClick={handleReply}
                            title="Reply"
                        >
                            <HkTooltip id="tooltip2" placement="top" title="Reply">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <CornerUpLeft />
                                    </span>
                                </span>
                            </HkTooltip>
                        </Button>
                        <Button
                            variant="flush-dark"
                            className="btn-icon btn-rounded flush-soft-hover"
                            onClick={handleReply}
                            title="Forward"
                        >
                            <HkTooltip id="tooltip3" placement="top" title="Forward">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <ArrowRight />
                                    </span>
                                </span>
                            </HkTooltip>
                        </Button>
                    </div>
                </div>

                <div className="accordion accordion-simple single-email-thread">
                    <div className="accordion-item">
                        <div className="accordion-header p-3 border-bottom">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="media align-items-center">
                                    <div className="media-head me-3">
                                        <div className="avatar avatar-md avatar-soft-primary avatar-rounded">
                                            <span className="initial-wrap">{initial.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <div className="fw-bold text-dark">{senderDisplay}</div>
                                        <div className="fs-8 text-muted">
                                            <span>From: </span>
                                            <span className="text-dark me-2">{selectedMessage.from}</span>
                                            {selectedMessage.to && (
                                                <>
                                                    <span>To: </span>
                                                    <span className="text-dark">{selectedMessage.to}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="email-head-action d-flex align-items-center">
                                    <div className="email-time text-muted fs-8 me-3">{formattedDate}</div>
                                    <Button
                                        variant="flush-dark"
                                        size="sm"
                                        className="btn-icon btn-rounded flush-soft-hover me-1"
                                        onClick={() => setStarred(!starred)}
                                    >
                                        <span className={`feather-icon ${starred ? 'text-warning' : ''}`}>
                                            <Star fill={starred ? 'currentColor' : 'none'} size={16} />
                                        </span>
                                    </Button>
                                    <Dropdown>
                                        <Dropdown.Toggle
                                            as="button"
                                            className="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover no-caret"
                                        >
                                            <span className="feather-icon">
                                                <MoreVertical size={16} />
                                            </span>
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu align="end">
                                            <Dropdown.Item onClick={handleReply}>Reply</Dropdown.Item>
                                            <Dropdown.Item onClick={handleReply}>Forward</Dropdown.Item>
                                            <Dropdown.Divider />
                                            <Dropdown.Item onClick={handlePrint}>Print</Dropdown.Item>
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                            </div>
                        </div>

                        <div className="accordion-body p-4">
                            {loadingDetail ? (
                                <div className="p-4 text-center text-muted">
                                    <Spinner animation="border" size="sm" className="me-2" />
                                    Loading message body...
                                </div>
                            ) : selectedMessage.bodyHtml ? (
                                <div
                                    className="email-html-content"
                                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                                />
                            ) : (
                                <div
                                    className="email-text-content"
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'inherit',
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {selectedMessage.bodyText || selectedMessage.snippet || '(No message content)'}
                                </div>
                            )}

                            {/* Attachments if any */}
                            {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                <div className="mt-4 pt-3 border-top">
                                    <h6 className="fs-7 text-uppercase text-muted mb-2">
                                        <Paperclip size={14} className="me-1" />
                                        Attachments ({selectedMessage.attachments.length})
                                    </h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {selectedMessage.attachments.map((att, idx) => (
                                            <div key={idx} className="p-2 border rounded bg-light d-flex align-items-center">
                                                <Paperclip size={14} className="me-2 text-primary" />
                                                <span className="fs-8 fw-medium me-2">{att.filename || `Attachment ${idx + 1}`}</span>
                                                <span className="fs-9 text-muted">({att.size ? `${Math.round(att.size / 1024)} KB` : ''})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SimpleBar>
        </div>
    );
};

const mapStateToProps = ({ emailReducer }) => {
    const { composeEmail } = emailReducer;
    return { composeEmail };
};

export default connect(mapStateToProps, { Compose })(EmailBody);
