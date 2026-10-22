import classNames from 'classnames';
import React, { useState } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';
import { Edit, Maximize2, Minimize2, Minus, Paperclip, Trash2, X } from 'react-feather';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';
import HkChips from '../../components/@hk-chips/@hk-chips';
//Redux
import { connect } from 'react-redux';
import { Maximize, Minimize, Compose } from '../../redux/action/Email';

//Images
import avatar11 from '../../assets/img/avatar11.jpg';
import avatar12 from '../../assets/img/avatar12.jpg';
import avatar13 from '../../assets/img/avatar13.jpg';

import api from '../../utils/api';

const ComposeEmail = ({ Maximize, Minimize, maximize, minimize, composeEmail, Compose }) => {
    const [recipients, setRecipients] = useState(["morgan@masterhrms.com"]);
    const [newRecipient, setNewRecipient] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [sending, setSending] = useState(false);
    const [sendStatus, setSendStatus] = useState(null);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        const allRecipients = [...recipients];
        if (newRecipient.trim() && !allRecipients.includes(newRecipient.trim())) {
            allRecipients.push(newRecipient.trim());
        }

        if (allRecipients.length === 0) {
            setSendStatus({
                type: "warning",
                message: "Please specify at least one recipient email address."
            });
            return;
        }

        setSending(true);
        setSendStatus(null);
        try {
            const res = await api.post('/api/email/send', {
                recipients: allRecipients,
                subject: subject || "No Subject",
                body: body || ""
            });

            if (res?.success) {
                setSendStatus({
                    type: "success",
                    message: `Email delivered successfully! (Message ID: ${res.messageId || 'sent'})`
                });
                setTimeout(() => {
                    handleClose();
                }, 2000);
            }
        } catch (err) {
            const msg = err.data?.error || err.message || "Outbound email delivery failed.";
            setSendStatus({
                type: "warning",
                message: msg
            });
        } finally {
            setSending(false);
        }
    };

    const handleMinimize = () => {
        Maximize(false);
        Minimize(!minimize);

    }

    const handleClose = () => {
        Compose(!composeEmail);
        Maximize(false);
        Minimize(false);
        setSendStatus(null);
    }

    const handleRecipients = () => {
        setRecipients(recipients => recipients.concat(newRecipient));
    }

    const onEnter = ({ key }) => {
        if (key === "Enter") {
            handleRecipients();
            setNewRecipient("");
        }
    }

    return (
        <div className={classNames("compose-email-popup", { "d-block": composeEmail }, { "minimize-email-popup": minimize }, { "maximize-email-popup": maximize })}  >
            <div className="d-flex flex-column h-100">
                <header className="d-flex align-items-center justify-content-between">
                    <h6 className="text-white mb-0">Compose Email</h6>
                    <div className="d-flex">
                        <Button size="sm" variant="dark" className="btn-icon btn-rounded d-lg-block d-none" onClick={handleMinimize} >
                            <span className="icon">
                                <span className="feather-icon">
                                    <Minus />
                                </span>
                            </span>
                        </Button>
                        <Button size="sm" variant="dark" className="btn-icon btn-rounded d-lg-block d-none" onClick={() => Maximize(!maximize)}  >
                            <span className="icon">
                                <span className="feather-icon">
                                    {maximize ? <Minimize2 /> : <Maximize2 />}
                                </span>
                            </span>
                        </Button>
                        <Button size="sm" variant="dark" className="btn-icon btn-rounded d-lg-block">
                            <span className="icon" onClick={handleClose} >
                                <span className="feather-icon">
                                    <X />
                                </span>
                            </span>
                        </Button>
                    </div>
                </header>
                {sendStatus && (
                    <Alert variant={sendStatus.type} className="m-3 mb-0 p-2 fs-7" dismissible onClose={() => setSendStatus(null)}>
                        {sendStatus.message}
                    </Alert>
                )}
                <Form onSubmit={handleSend}>
                    <Form.Group className="mb-3">
                        <div className="d-flex flex-wrap">
                            <HkChips className="mb-2 me-2" variant="primary" src={avatar11} dismissable >
                                Morgan
                            </HkChips>

                            <HkChips className="mb-2 me-2" variant="primary" src={avatar12} dismissable >
                                Charlie
                            </HkChips>

                            <HkChips className="mb-2 me-2" variant="primary" src={avatar13} dismissable >
                                Winston
                            </HkChips>
                            {recipients.map((data, i) => (
                                <HkChips key={i} className="mb-2 me-2" variant="primary" dismissable >
                                    {data}
                                </HkChips>
                            ))}
                            <Form.Control type="text" className="border-0 p-0 shadow-none flex-1 mb-2 me-2" placeholder="Add recipients" value={newRecipient} onChange={e => setNewRecipient(e.target.value)} onKeyDown={onEnter} />
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3" >
                        <Form.Control placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
                    </Form.Group>
                    <Form.Group>
                        <Form.Control as="textarea" rows={6} placeholder="Type your message here..." value={body} onChange={e => setBody(e.target.value)} />
                    </Form.Group>
                </Form>
                <div className="compose-email-footer">
                    <div>
                        <Button variant="primary" className="me-2" type="button" onClick={handleSend} disabled={sending}>
                            {sending ? "Sending..." : "Send"}
                        </Button>
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                            <HkTooltip id="flag" title="Add Flag" placement="top" >
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Paperclip />
                                    </span>
                                </span>
                            </HkTooltip>
                        </Button>
                    </div>
                    <div>
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                            <HkTooltip id="draft" title="Save Draft" placement="top" >
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Edit />
                                    </span>
                                </span>
                            </HkTooltip>
                        </Button>
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                            <HkTooltip id="delete" title="Delete" placement="top" >
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Trash2 />
                                    </span>
                                </span>
                            </HkTooltip>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const mapStateToProps = ({ emailReducer }) => {
    const { composeEmail, maximize, minimize } = emailReducer;
    return { composeEmail, maximize, minimize }
};

export default connect(mapStateToProps, { Maximize, Minimize, Compose })(ComposeEmail);