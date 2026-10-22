import classNames from 'classnames';
import React, { useState, useEffect } from 'react';
import { Button, Form, Alert } from 'react-bootstrap';
import { Edit, Maximize2, Minimize2, Minus, Paperclip, Trash2, X, AlertTriangle } from 'react-feather';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';
import HkChips from '../../components/@hk-chips/@hk-chips';
import { useEmail } from './EmailContext';

//Redux
import { connect } from 'react-redux';
import { Maximize, Minimize, Compose } from '../../redux/action/Email';

import api from '../../utils/api';

const ComposeEmail = ({ Maximize, Minimize, maximize, minimize, composeEmail, Compose }) => {
    const { accounts, activeAccountId, activeAccount, setActiveAccountId } = useEmail();
    const [sendingAccountId, setSendingAccountId] = useState(activeAccountId || '');
    const [recipients, setRecipients] = useState([]);
    const [newRecipient, setNewRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);
    const [sendStatus, setSendStatus] = useState(null);

    useEffect(() => {
        if (activeAccountId) {
            setSendingAccountId(activeAccountId);
        } else if (accounts.length > 0) {
            setSendingAccountId(accounts[0].id);
        }
    }, [activeAccountId, accounts]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();

        if (!sendingAccountId) {
            setSendStatus({
                type: 'danger',
                message: 'No personal email account selected. Configure an account in Settings → Email Accounts first.',
            });
            return;
        }

        const allRecipients = [...recipients];
        if (newRecipient.trim() && !allRecipients.includes(newRecipient.trim())) {
            allRecipients.push(newRecipient.trim());
        }

        if (allRecipients.length === 0) {
            setSendStatus({
                type: 'warning',
                message: 'Please specify at least one recipient email address.',
            });
            return;
        }

        setSending(true);
        setSendStatus(null);
        try {
            // Strictly dispatch through the authenticated user's configured SMTP account
            const res = await api.post(`/api/user/email-accounts/${sendingAccountId}/send`, {
                to: allRecipients,
                subject: subject || 'No Subject',
                text: body || '',
                html: body ? `<div style="font-family: sans-serif; line-height: 1.5;">${body.replace(/\n/g, '<br/>')}</div>` : '',
            });

            if (res?.success) {
                setSendStatus({
                    type: 'success',
                    message: `Email sent via ${res.sentVia || 'personal SMTP server'}! (Message ID: ${res.messageId || 'ok'})`,
                });
                setTimeout(() => {
                    handleClose();
                }, 2000);
            } else {
                setSendStatus({
                    type: 'danger',
                    message: res?.error || 'Sending failed on personal SMTP server.',
                });
            }
        } catch (err) {
            const msg = err.data?.error || err.message || 'Outbound email delivery failed on personal SMTP server.';
            setSendStatus({
                type: 'danger',
                message: msg,
            });
        } finally {
            setSending(false);
        }
    };

    const handleMinimize = () => {
        Maximize(false);
        Minimize(!minimize);
    };

    const handleClose = () => {
        Compose(false);
        Maximize(false);
        Minimize(false);
        setSendStatus(null);
    };

    const handleAddRecipient = () => {
        if (newRecipient.trim() && !recipients.includes(newRecipient.trim())) {
            setRecipients([...recipients, newRecipient.trim()]);
            setNewRecipient('');
        }
    };

    const handleRemoveRecipient = (idx) => {
        setRecipients(recipients.filter((_, i) => i !== idx));
    };

    const onEnter = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddRecipient();
        }
    };

    const selectedAcc = accounts.find((a) => a.id === sendingAccountId) || activeAccount;

    return (
        <div
            className={classNames(
                'compose-email-popup',
                { 'd-block': composeEmail },
                { 'minimize-email-popup': minimize },
                { 'maximize-email-popup': maximize }
            )}
        >
            <div className="d-flex flex-column h-100">
                <header className="d-flex align-items-center justify-content-between">
                    <h6 className="text-white mb-0">Compose Email</h6>
                    <div className="d-flex">
                        <Button
                            size="sm"
                            variant="dark"
                            className="btn-icon btn-rounded d-lg-block d-none"
                            onClick={handleMinimize}
                        >
                            <span className="icon">
                                <span className="feather-icon">
                                    <Minus />
                                </span>
                            </span>
                        </Button>
                        <Button
                            size="sm"
                            variant="dark"
                            className="btn-icon btn-rounded d-lg-block d-none"
                            onClick={() => Maximize(!maximize)}
                        >
                            <span className="icon">
                                <span className="feather-icon">{maximize ? <Minimize2 /> : <Maximize2 />}</span>
                            </span>
                        </Button>
                        <Button size="sm" variant="dark" className="btn-icon btn-rounded d-lg-block" onClick={handleClose}>
                            <span className="icon">
                                <span className="feather-icon">
                                    <X />
                                </span>
                            </span>
                        </Button>
                    </div>
                </header>

                {/* Account Unconfigured Warning */}
                {accounts.length === 0 ? (
                    <Alert variant="warning" className="m-3 mb-0 p-3 fs-7">
                        <div className="fw-bold mb-1">
                            <AlertTriangle size={15} className="me-1" />
                            No Outbound Mail Account Configured
                        </div>
                        <p className="mb-2">
                            You must configure your personal email account credentials in Settings before sending email.
                        </p>
                        <Button as="a" href="/settings/email-accounts" size="xs" variant="primary">
                            Configure Email Account
                        </Button>
                    </Alert>
                ) : (
                    /* Account Sender Banner */
                    <div className="px-3 pt-2 pb-1 bg-light border-bottom d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center fs-8 text-muted">
                            <span className="fw-medium me-1 text-dark">From:</span>
                            {accounts.length > 1 ? (
                                <Form.Select
                                    size="sm"
                                    className="py-0 px-2 fs-8 w-auto border-0 bg-transparent text-primary fw-medium"
                                    value={sendingAccountId}
                                    onChange={(e) => setSendingAccountId(e.target.value)}
                                >
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.displayName || acc.fromName || acc.email} &lt;{acc.email}&gt;
                                        </option>
                                    ))}
                                </Form.Select>
                            ) : (
                                <span className="text-dark fw-medium">
                                    {selectedAcc?.displayName || selectedAcc?.email} &lt;{selectedAcc?.email}&gt;
                                </span>
                            )}
                        </div>
                        <span className="badge bg-secondary fs-9">{selectedAcc?.smtpHost}:{selectedAcc?.smtpPort}</span>
                    </div>
                )}

                {sendStatus && (
                    <Alert
                        variant={sendStatus.type}
                        className="m-3 mb-0 p-2 fs-7"
                        dismissible
                        onClose={() => setSendStatus(null)}
                    >
                        {sendStatus.message}
                    </Alert>
                )}

                <Form onSubmit={handleSend} className="p-3">
                    <Form.Group className="mb-3">
                        <div className="d-flex flex-wrap align-items-center">
                            {recipients.map((data, i) => (
                                <HkChips
                                    key={i}
                                    className="mb-2 me-2"
                                    variant="primary"
                                    dismissable
                                    onDismiss={() => handleRemoveRecipient(i)}
                                >
                                    {data}
                                </HkChips>
                            ))}
                            <Form.Control
                                type="email"
                                className="border-0 p-0 shadow-none flex-1 mb-2 me-2"
                                placeholder={recipients.length === 0 ? "Recipient email (press Enter to add)" : "Add more recipients..."}
                                value={newRecipient}
                                onChange={(e) => setNewRecipient(e.target.value)}
                                onKeyDown={onEnter}
                            />
                        </div>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Control
                            placeholder="Subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </Form.Group>
                    <Form.Group>
                        <Form.Control
                            as="textarea"
                            rows={6}
                            placeholder="Type your message here..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </Form.Group>
                </Form>

                <div className="compose-email-footer mt-auto">
                    <div>
                        <Button
                            variant="primary"
                            className="me-2"
                            type="button"
                            onClick={handleSend}
                            disabled={sending || accounts.length === 0}
                        >
                            {sending ? 'Sending via SMTP...' : 'Send'}
                        </Button>
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                            <HkTooltip id="flag" title="Attach file" placement="top">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Paperclip />
                                    </span>
                                </span>
                            </HkTooltip>
                        </Button>
                    </div>
                    <div>
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover" onClick={handleClose}>
                            <HkTooltip id="delete" title="Discard" placement="top">
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
    );
};

const mapStateToProps = ({ emailReducer }) => {
    const { composeEmail, maximize, minimize } = emailReducer;
    return { composeEmail, maximize, minimize };
};

export default connect(mapStateToProps, { Maximize, Minimize, Compose })(ComposeEmail);