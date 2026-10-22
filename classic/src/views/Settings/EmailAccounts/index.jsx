import React, { useState, useEffect } from 'react';
import {
    Container,
    Row,
    Col,
    Card,
    Button,
    Form,
    Badge,
    Alert,
    Modal,
    Spinner,
    InputGroup,
    Table,
} from 'react-bootstrap';
import {
    Mail,
    Server,
    Shield,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Send,
    Trash2,
    Edit2,
    Star,
    RefreshCw,
    Plus,
    Lock,
    Eye,
    EyeOff,
    HelpCircle,
    ArrowLeft,
} from 'react-feather';
import api from '../../../utils/api';

const DEFAULT_FORM_STATE = {
    id: null,
    email: '',
    displayName: '',
    fromName: '',
    username: '',
    incomingProtocol: 'IMAP',
    incomingHost: '',
    incomingPort: 993,
    incomingSecurity: 'SSL/TLS',
    incomingPassword: '',
    smtpHost: '',
    smtpPort: 465,
    smtpSecurity: 'SSL/TLS',
    smtpUser: '',
    smtpPassword: '',
    isDefault: false,
};

export default function EmailAccountsSettings() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    // Form modal / view state
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
    const [saving, setSaving] = useState(false);
    const [showIncomingPass, setShowIncomingPass] = useState(false);
    const [showSmtpPass, setShowSmtpPass] = useState(false);

    // Testing states
    const [testingIncoming, setTestingIncoming] = useState(false);
    const [incomingTestResult, setIncomingTestResult] = useState(null);
    const [testingSmtp, setTestingSmtp] = useState(false);
    const [smtpTestResult, setSmtpTestResult] = useState(null);

    // Send test email modal state
    const [showSendTestModal, setShowSendTestModal] = useState(false);
    const [selectedAccountForTest, setSelectedAccountForTest] = useState(null);
    const [testRecipientEmail, setTestRecipientEmail] = useState('');
    const [sendingTestMail, setSendingTestMail] = useState(false);
    const [sendTestResult, setSendTestResult] = useState(null);

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/api/user/email-accounts');
            setAccounts(Array.isArray(res) ? res : (res?.data || []));
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to load email accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setFormData(DEFAULT_FORM_STATE);
        setIncomingTestResult(null);
        setSmtpTestResult(null);
        setShowForm(true);
    };

    const handleOpenEdit = (acc) => {
        setFormData({
            id: acc.id,
            email: acc.email,
            displayName: acc.displayName || '',
            fromName: acc.fromName || '',
            username: acc.username || acc.email,
            incomingProtocol: acc.incomingProtocol || 'IMAP',
            incomingHost: acc.incomingHost || '',
            incomingPort: acc.incomingPort || (acc.incomingProtocol === 'POP3' ? 995 : 993),
            incomingSecurity: acc.incomingSecurity || 'SSL/TLS',
            incomingPassword: '', // Kept empty unless user wants to replace
            smtpHost: acc.smtpHost || '',
            smtpPort: acc.smtpPort || 465,
            smtpSecurity: acc.smtpSecurity || 'SSL/TLS',
            smtpUser: acc.smtpUser || acc.email,
            smtpPassword: '', // Kept empty unless user wants to replace
            isDefault: Boolean(acc.isDefault),
        });
        setIncomingTestResult(null);
        setSmtpTestResult(null);
        setShowForm(true);
    };

    // Protocol helper auto-sets ports
    const handleProtocolChange = (protocol) => {
        const isPop3 = protocol === 'POP3';
        setFormData((prev) => ({
            ...prev,
            incomingProtocol: protocol,
            incomingPort: isPop3 ? 995 : 993,
            incomingSecurity: 'SSL/TLS',
        }));
    };

    // Preset providers (Gmail, Outlook, Yahoo)
    const applyProviderPreset = (preset) => {
        if (preset === 'gmail') {
            setFormData((prev) => ({
                ...prev,
                incomingProtocol: 'IMAP',
                incomingHost: 'imap.gmail.com',
                incomingPort: 993,
                incomingSecurity: 'SSL/TLS',
                smtpHost: 'smtp.gmail.com',
                smtpPort: 465,
                smtpSecurity: 'SSL/TLS',
            }));
        } else if (preset === 'outlook') {
            setFormData((prev) => ({
                ...prev,
                incomingProtocol: 'IMAP',
                incomingHost: 'outlook.office365.com',
                incomingPort: 993,
                incomingSecurity: 'SSL/TLS',
                smtpHost: 'smtp.office365.com',
                smtpPort: 587,
                smtpSecurity: 'STARTTLS',
            }));
        } else if (preset === 'yahoo') {
            setFormData((prev) => ({
                ...prev,
                incomingProtocol: 'IMAP',
                incomingHost: 'imap.mail.yahoo.com',
                incomingPort: 993,
                incomingSecurity: 'SSL/TLS',
                smtpHost: 'smtp.mail.yahoo.com',
                smtpPort: 465,
                smtpSecurity: 'SSL/TLS',
            }));
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (formData.id) {
                // Update
                await api.put(`/api/user/email-accounts/${formData.id}`, formData);
                setSuccessMessage(`Account ${formData.email} updated successfully.`);
            } else {
                // Create
                await api.post('/api/user/email-accounts', formData);
                setSuccessMessage(`Account ${formData.email} configured successfully.`);
            }
            setShowForm(false);
            await loadAccounts();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to save email account');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, email) => {
        if (!window.confirm(`Are you sure you want to disconnect and delete ${email}?`)) {
            return;
        }
        try {
            setLoading(true);
            await api.delete(`/api/user/email-accounts/${id}`);
            setSuccessMessage(`Account ${email} disconnected successfully.`);
            await loadAccounts();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to delete email account');
        } finally {
            setLoading(false);
        }
    };

    const handleSetDefault = async (id, email) => {
        try {
            await api.post(`/api/user/email-accounts/${id}/set-default`);
            setSuccessMessage(`Account ${email} is now your default mailbox.`);
            await loadAccounts();
        } catch (err) {
            setError(err.data?.error || err.message || 'Failed to set default account');
        }
    };

    // Test incoming connection
    const handleTestIncoming = async (accountId = null) => {
        const targetId = accountId || formData.id;
        if (!targetId) {
            setIncomingTestResult({
                success: false,
                message: 'Please save the account configuration first before testing server connection.',
            });
            return;
        }

        try {
            setTestingIncoming(true);
            setIncomingTestResult(null);
            const res = await api.post(`/api/user/email-accounts/${targetId}/test-incoming`);
            setIncomingTestResult({
                success: res.success,
                message: res.message + (res.error ? ` (${res.error})` : ''),
            });
            await loadAccounts();
        } catch (err) {
            setIncomingTestResult({
                success: false,
                message: err.data?.error || err.message || 'Incoming connection test failed.',
            });
        } finally {
            setTestingIncoming(false);
        }
    };

    // Test SMTP connection
    const handleTestSmtp = async (accountId = null) => {
        const targetId = accountId || formData.id;
        if (!targetId) {
            setSmtpTestResult({
                success: false,
                message: 'Please save the account configuration first before testing SMTP connection.',
            });
            return;
        }

        try {
            setTestingSmtp(true);
            setSmtpTestResult(null);
            const res = await api.post(`/api/user/email-accounts/${targetId}/test-outgoing`);
            setSmtpTestResult({
                success: res.success,
                message: res.message + (res.error ? ` (${res.error})` : ''),
            });
            await loadAccounts();
        } catch (err) {
            setSmtpTestResult({
                success: false,
                message: err.data?.error || err.message || 'SMTP connection test failed.',
            });
        } finally {
            setTestingSmtp(false);
        }
    };

    // Open Send Test Email dialog
    const handleOpenSendTest = (acc) => {
        setSelectedAccountForTest(acc);
        setTestRecipientEmail(acc.email);
        setSendTestResult(null);
        setShowSendTestModal(true);
    };

    const handleSendTestEmail = async () => {
        if (!selectedAccountForTest || !testRecipientEmail) return;
        try {
            setSendingTestMail(true);
            setSendTestResult(null);
            const res = await api.post(`/api/user/email-accounts/${selectedAccountForTest.id}/send-test`, {
                testRecipient: testRecipientEmail.trim(),
            });
            setSendTestResult({
                success: true,
                message: res.message || `Test email dispatched successfully! (ID: ${res.messageId})`,
            });
        } catch (err) {
            setSendTestResult({
                success: false,
                message: err.data?.error || err.message || 'Failed to deliver test email.',
            });
        } finally {
            setSendingTestMail(false);
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case 'CONNECTED':
                return <Badge bg="success"><CheckCircle size={12} className="me-1" />Connected</Badge>;
            case 'TESTING':
                return <Badge bg="warning"><RefreshCw size={12} className="me-1 spin" />Testing</Badge>;
            case 'AUTHENTICATION_FAILED':
                return <Badge bg="danger"><Lock size={12} className="me-1" />Auth Failed</Badge>;
            case 'CONNECTION_FAILED':
                return <Badge bg="danger"><XCircle size={12} className="me-1" />Connection Failed</Badge>;
            default:
                return <Badge bg="secondary"><HelpCircle size={12} className="me-1" />Not Configured</Badge>;
        }
    };

    return (
        <Container fluid className="px-xxl-5 px-4 pt-4 pb-5">
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="mb-1 text-dark fw-bold d-flex align-items-center">
                        <Mail className="me-2 text-primary" size={26} />
                        Email Accounts
                    </h2>
                    <p className="text-muted mb-0">
                        Configure your personal external email accounts (IMAP / POP3 / SMTP) with role-based workspace isolation.
                    </p>
                </div>
                {!showForm && (
                    <Button variant="primary" onClick={handleOpenAdd} className="d-flex align-items-center">
                        <Plus size={16} className="me-1" />
                        Add Email Account
                    </Button>
                )}
            </div>

            {/* Architecture Boundary Alert */}
            <Alert variant="info" className="d-flex align-items-start mb-4 py-3">
                <Shield size={22} className="me-3 mt-1 flex-shrink-0 text-info" />
                <div className="small">
                    <strong>Architecture Separation Notice:</strong>{' '}
                    Personal mailbox operations and transactional system email are managed through separate delivery pipelines.
                    The system host <code className="text-dark bg-light px-1 rounded">mail.masterhrms.com</code> is strictly reserved for Super Admin-controlled platform transactional emails (OTPs, password resets).
                    Your personal mail accounts connect directly to your own provider (Gmail, Outlook, Yahoo, or custom enterprise servers) using server-side AES-256-GCM encrypted credentials.
                </div>
            </Alert>

            {/* Global Alerts */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="d-flex align-items-center">
                    <AlertTriangle size={18} className="me-2 flex-shrink-0" />
                    <span>{error}</span>
                </Alert>
            )}
            {successMessage && (
                <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="d-flex align-items-center">
                    <CheckCircle size={18} className="me-2 flex-shrink-0" />
                    <span>{successMessage}</span>
                </Alert>
            )}

            {/* Main Form View */}
            {showForm ? (
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                className="me-3 btn-icon"
                                onClick={() => setShowForm(false)}
                            >
                                <ArrowLeft size={16} />
                            </Button>
                            <h5 className="mb-0 fw-bold">
                                {formData.id ? `Edit Account: ${formData.email}` : 'Configure New Email Account'}
                            </h5>
                        </div>
                        {/* Quick Presets */}
                        <div className="d-flex align-items-center gap-2">
                            <span className="small text-muted me-1">Fill Preset:</span>
                            <Button size="sm" variant="outline-danger" onClick={() => applyProviderPreset('gmail')}>Gmail</Button>
                            <Button size="sm" variant="outline-primary" onClick={() => applyProviderPreset('outlook')}>Outlook / O365</Button>
                            <Button size="sm" variant="outline-purple" onClick={() => applyProviderPreset('yahoo')}>Yahoo</Button>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-4">
                        <Form onSubmit={handleSave}>
                            {/* SECTION A: Account Identity */}
                            <div className="mb-4">
                                <h6 className="text-uppercase fw-bold text-primary mb-3 d-flex align-items-center">
                                    <Shield size={16} className="me-2" />
                                    Section A — Account Identity
                                </h6>
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Email Address <span className="text-danger">*</span></Form.Label>
                                            <Form.Control
                                                type="email"
                                                placeholder="e.g. employee@company.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Account Display Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="e.g. Work Mailbox"
                                                value={formData.displayName}
                                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Default Sender Display Name</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="e.g. Jane Doe"
                                                value={formData.fromName}
                                                onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Username (if different from Email)</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Defaults to email address"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>

                            <hr className="my-4 text-muted" />

                            {/* SECTION B: Incoming Mail Configuration */}
                            <div className="mb-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="text-uppercase fw-bold text-primary mb-0 d-flex align-items-center">
                                        <Server size={16} className="me-2" />
                                        Section B — Incoming Mail Configuration
                                    </h6>
                                    {formData.id && (
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={() => handleTestIncoming()}
                                            disabled={testingIncoming}
                                        >
                                            {testingIncoming ? <Spinner size="sm" animation="border" className="me-1" /> : <RefreshCw size={14} className="me-1" />}
                                            Test Incoming Connection
                                        </Button>
                                    )}
                                </div>

                                <Alert variant="light" className="border small py-2 mb-3">
                                    <strong>Protocol Guidance:</strong>{' '}
                                    <span className="text-success fw-bold">IMAP</span> is recommended for multi-device folder synchronization and message status.
                                    <span className="text-secondary fw-bold ms-2">POP3</span> downloads incoming messages into a single spool without folder sync.
                                </Alert>

                                {incomingTestResult && (
                                    <Alert
                                        variant={incomingTestResult.success ? 'success' : 'danger'}
                                        dismissible
                                        onClose={() => setIncomingTestResult(null)}
                                        className="py-2 small"
                                    >
                                        {incomingTestResult.message}
                                    </Alert>
                                )}

                                <Row className="g-3">
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Protocol</Form.Label>
                                            <Form.Select
                                                value={formData.incomingProtocol}
                                                onChange={(e) => handleProtocolChange(e.target.value)}
                                            >
                                                <option value="IMAP">IMAP (Recommended)</option>
                                                <option value="POP3">POP3 (Basic Spool)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Incoming Host <span className="text-danger">*</span></Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder={formData.incomingProtocol === 'POP3' ? 'pop.provider.com' : 'imap.provider.com'}
                                                value={formData.incomingHost}
                                                onChange={(e) => setFormData({ ...formData, incomingHost: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Port</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={formData.incomingPort}
                                                onChange={(e) => setFormData({ ...formData, incomingPort: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Security</Form.Label>
                                            <Form.Select
                                                value={formData.incomingSecurity}
                                                onChange={(e) => setFormData({ ...formData, incomingSecurity: e.target.value })}
                                            >
                                                <option value="SSL/TLS">SSL/TLS (Encrypted)</option>
                                                <option value="STARTTLS">STARTTLS</option>
                                                <option value="NONE">None (Unencrypted)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">
                                                Incoming Password / App Password{' '}
                                                {!formData.id && <span className="text-danger">*</span>}
                                            </Form.Label>
                                            <InputGroup>
                                                <Form.Control
                                                    type={showIncomingPass ? 'text' : 'password'}
                                                    placeholder={formData.id ? '••••••••  (Leave blank to keep existing encrypted password)' : 'Enter mailbox password or app password'}
                                                    value={formData.incomingPassword}
                                                    onChange={(e) => setFormData({ ...formData, incomingPassword: e.target.value })}
                                                    required={!formData.id}
                                                />
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={() => setShowIncomingPass(!showIncomingPass)}
                                                >
                                                    {showIncomingPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </Button>
                                            </InputGroup>
                                            <Form.Text className="text-muted">
                                                Credentials are encrypted with AES-256-GCM. We never store or return plaintext passwords.
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>

                            <hr className="my-4 text-muted" />

                            {/* SECTION C: Outgoing SMTP Configuration */}
                            <div className="mb-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <h6 className="text-uppercase fw-bold text-primary mb-0 d-flex align-items-center">
                                        <Send size={16} className="me-2" />
                                        Section C — Outgoing SMTP Configuration
                                    </h6>
                                    {formData.id && (
                                        <Button
                                            size="sm"
                                            variant="outline-primary"
                                            onClick={() => handleTestSmtp()}
                                            disabled={testingSmtp}
                                        >
                                            {testingSmtp ? <Spinner size="sm" animation="border" className="me-1" /> : <RefreshCw size={14} className="me-1" />}
                                            Test SMTP Connection
                                        </Button>
                                    )}
                                </div>

                                {smtpTestResult && (
                                    <Alert
                                        variant={smtpTestResult.success ? 'success' : 'danger'}
                                        dismissible
                                        onClose={() => setSmtpTestResult(null)}
                                        className="py-2 small"
                                    >
                                        {smtpTestResult.message}
                                    </Alert>
                                )}

                                <Row className="g-3">
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">SMTP Host <span className="text-danger">*</span></Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="smtp.provider.com"
                                                value={formData.smtpHost}
                                                onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Port</Form.Label>
                                            <Form.Control
                                                type="number"
                                                value={formData.smtpPort}
                                                onChange={(e) => setFormData({ ...formData, smtpPort: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">Security</Form.Label>
                                            <Form.Select
                                                value={formData.smtpSecurity}
                                                onChange={(e) => setFormData({ ...formData, smtpSecurity: e.target.value })}
                                            >
                                                <option value="SSL/TLS">SSL/TLS (Port 465)</option>
                                                <option value="STARTTLS">STARTTLS (Port 587)</option>
                                                <option value="NONE">None</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">SMTP Username</Form.Label>
                                            <Form.Control
                                                type="text"
                                                placeholder="Defaults to email address"
                                                value={formData.smtpUser}
                                                onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label className="fw-semibold">
                                                SMTP Password / App Password{' '}
                                                {!formData.id && <span className="text-danger">*</span>}
                                            </Form.Label>
                                            <InputGroup>
                                                <Form.Control
                                                    type={showSmtpPass ? 'text' : 'password'}
                                                    placeholder={formData.id ? '••••••••  (Leave blank to keep existing encrypted password)' : 'Enter SMTP password or app password'}
                                                    value={formData.smtpPassword}
                                                    onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                                                    required={!formData.id}
                                                />
                                                <Button
                                                    variant="outline-secondary"
                                                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                                                >
                                                    {showSmtpPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </Button>
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </div>

                            <hr className="my-4 text-muted" />

                            {/* SECTION D: Save / Cancel Controls */}
                            <div className="d-flex align-items-center justify-content-between pt-2">
                                <Form.Check
                                    type="checkbox"
                                    id="isDefaultCheck"
                                    label="Set this account as my primary/default mailbox"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                />
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setShowForm(false)}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        type="submit"
                                        disabled={saving}
                                        className="d-flex align-items-center"
                                    >
                                        {saving && <Spinner size="sm" animation="border" className="me-2" />}
                                        Save Configuration
                                    </Button>
                                </div>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            ) : (
                /* Configured Accounts List */
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                        <h5 className="mb-0 fw-bold">My Configured Accounts ({accounts.length})</h5>
                        <Button variant="outline-secondary" size="sm" onClick={loadAccounts} disabled={loading}>
                            <RefreshCw size={14} className={`me-1 ${loading ? 'spin' : ''}`} />
                            Refresh
                        </Button>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {loading && accounts.length === 0 ? (
                            <div className="text-center py-5">
                                <Spinner animation="border" variant="primary" />
                                <p className="text-muted mt-2 mb-0">Loading email accounts...</p>
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="text-center py-5 px-3">
                                <Mail size={48} className="text-muted mb-3 opacity-50" />
                                <h6 className="fw-bold">No personal email accounts configured yet</h6>
                                <p className="text-muted small col-md-6 mx-auto mb-4">
                                    Connect your external email provider (Gmail, Outlook, Yahoo, or corporate IMAP/POP3)
                                    to send, receive, and manage emails directly from MASTERHRMS.
                                </p>
                                <Button variant="primary" onClick={handleOpenAdd}>
                                    <Plus size={16} className="me-1" />
                                    Configure Email Account
                                </Button>
                            </div>
                        ) : (
                            <Table responsive hover className="align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Account</th>
                                        <th>Incoming (Server / Port)</th>
                                        <th>Outgoing SMTP</th>
                                        <th>Status</th>
                                        <th>Last Tested</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map((acc) => (
                                        <tr key={acc.id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div>
                                                        <div className="fw-bold text-dark d-flex align-items-center">
                                                            {acc.email}
                                                            {acc.isDefault && (
                                                                <Badge bg="soft-primary" text="primary" className="ms-2">
                                                                    <Star size={10} className="me-1 fill-primary" />Default
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="small text-muted">
                                                            {acc.displayName || acc.fromName || 'Personal Mailbox'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-soft-info text-info me-1">{acc.incomingProtocol}</span>
                                                <span className="small text-dark">{acc.incomingHost}:{acc.incomingPort}</span>
                                                <div className="text-muted" style={{ fontSize: '11px' }}>{acc.incomingSecurity}</div>
                                            </td>
                                            <td>
                                                <span className="badge bg-soft-secondary text-secondary me-1">SMTP</span>
                                                <span className="small text-dark">{acc.smtpHost}:{acc.smtpPort}</span>
                                                <div className="text-muted" style={{ fontSize: '11px' }}>{acc.smtpSecurity}</div>
                                            </td>
                                            <td>
                                                {renderStatusBadge(acc.status)}
                                                {acc.statusMessage && (
                                                    <div className="text-muted text-truncate" style={{ maxWidth: '160px', fontSize: '11px' }} title={acc.statusMessage}>
                                                        {acc.statusMessage}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="small text-muted">
                                                {acc.lastTestedAt ? new Date(acc.lastTestedAt).toLocaleString() : 'Never'}
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex align-items-center justify-content-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="flush-dark"
                                                        title="Test Incoming & SMTP"
                                                        onClick={() => {
                                                            handleTestIncoming(acc.id);
                                                            handleTestSmtp(acc.id);
                                                        }}
                                                    >
                                                        <RefreshCw size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="flush-dark"
                                                        title="Send Test Email"
                                                        onClick={() => handleOpenSendTest(acc)}
                                                    >
                                                        <Send size={14} />
                                                    </Button>
                                                    {!acc.isDefault && (
                                                        <Button
                                                            size="sm"
                                                            variant="flush-dark"
                                                            title="Set as Default Account"
                                                            onClick={() => handleSetDefault(acc.id, acc.email)}
                                                        >
                                                            <Star size={14} />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="flush-dark"
                                                        title="Edit Configuration"
                                                        onClick={() => handleOpenEdit(acc)}
                                                    >
                                                        <Edit2 size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="flush-dark"
                                                        className="text-danger"
                                                        title="Disconnect & Delete"
                                                        onClick={() => handleDelete(acc.id, acc.email)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </Card.Body>
                </Card>
            )}

            {/* SEND TEST EMAIL MODAL */}
            <Modal show={showSendTestModal} onHide={() => setShowSendTestModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6 fw-bold">
                        <Send size={16} className="me-2 text-primary" />
                        Send Controlled Test Email
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="small text-muted mb-3">
                        Dispatches one controlled test email through your account{' '}
                        <strong>{selectedAccountForTest?.email}</strong> using its configured SMTP settings.
                    </p>

                    {sendTestResult && (
                        <Alert
                            variant={sendTestResult.success ? 'success' : 'danger'}
                            dismissible
                            onClose={() => setSendTestResult(null)}
                            className="py-2 small"
                        >
                            {sendTestResult.message}
                        </Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Test Destination Mailbox</Form.Label>
                        <Form.Control
                            type="email"
                            placeholder="authorized-recipient@domain.com"
                            value={testRecipientEmail}
                            onChange={(e) => setTestRecipientEmail(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                            Only send to an authorized test address or your own personal mailbox.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setShowSendTestModal(false)}>
                        Close
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSendTestEmail}
                        disabled={sendingTestMail || !testRecipientEmail}
                        className="d-flex align-items-center"
                    >
                        {sendingTestMail ? <Spinner size="sm" animation="border" className="me-2" /> : <Send size={14} className="me-1" />}
                        Send Test Email
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
