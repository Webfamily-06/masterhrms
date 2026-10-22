import React, { useState, useEffect } from 'react';
import { Button, Card, Col, Container, Row, Badge, Modal, Form } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import { Link } from '/src/utils/router-compat.jsx';
import api from '../../../utils/api';

// Fallback images
import symbolAvatar14 from '../../../assets/img/symbol-avatar-14.png';
import symbolAvatar2 from '../../../assets/img/symbol-avatar-2.png';
import symbolAvatar10 from '../../../assets/img/symbol-avatar-10.png';
import symbolAvatar12 from '../../../assets/img/symbol-avatar-12.png';

const fallbackAvatars = [symbolAvatar14, symbolAvatar2, symbolAvatar10, symbolAvatar12];

const defaultConnectors = [
    { connector: 'woocommerce', name: 'WooCommerce Store Sync', category: 'E-Commerce', status: 'not_configured', configured: false },
    { connector: 'shopify', name: 'Shopify Store Sync', category: 'E-Commerce', status: 'not_configured', configured: false },
    { connector: 'google-workspace', name: 'Google Workspace Integration', category: 'Productivity', status: 'configured', configured: true },
    { connector: 'razorpay', name: 'Razorpay Gateway', category: 'Finance', status: 'connected', configured: true },
    { connector: 'whatsapp', name: 'WhatsApp Alerts', category: 'Messaging', status: 'not_configured', configured: false },
    { connector: 'webhook', name: 'Outbound / Inbound Webhooks', category: 'Integration', status: 'connected', configured: true }
];

const Body = () => {
    const [connectors, setConnectors] = useState(defaultConnectors);
    const [loading, setLoading] = useState(true);
    const [activeModal, setActiveModal] = useState(null); // { connector, action: 'configure' | 'disconnect' }
    const [actionLoading, setActionLoading] = useState(false);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/integrations/status');
            if (res?.connectors && Array.isArray(res.connectors)) {
                setConnectors(res.connectors);
            }
        } catch (err) {
            console.warn('Could not load integrations status, using defaults:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleToggleConnection = async () => {
        if (!activeModal) return;
        setActionLoading(true);
        try {
            const { connector, action } = activeModal;
            const newStatus = action === 'disconnect' ? 'disconnected' : 'connected';
            // Update local connector state
            setConnectors(prev => prev.map(c => 
                (c.connector === connector.connector || c.metadata?.id === connector.connector)
                    ? { ...c, status: newStatus, configured: newStatus === 'connected' }
                    : c
            ));
            setActiveModal(null);
        } catch (err) {
            console.error('Failed to update integration:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'connected':
                return <Badge bg="success" className="text-uppercase fs-9">Connected</Badge>;
            case 'configured':
                return <Badge bg="primary" className="text-uppercase fs-9">Configured</Badge>;
            case 'disconnected':
                return <Badge bg="danger" className="text-uppercase fs-9">Disconnected</Badge>;
            default:
                return <Badge bg="secondary" className="text-uppercase fs-9">Available</Badge>;
        }
    };

    return (
        <div className="integrations-body">
            <SimpleBar className="nicescroll-bar">
                <Container className="mt-md-5 mt-3">
                    <div className="d-flex flex-md-nowrap flex-wrap align-items-center justify-content-between mb-4">
                        <div>
                            <h4 className="mb-1">Active Connectors &amp; Service Links</h4>
                            <p className="text-muted">Manage active tenant connections, authentication credentials, and data synchronizations.</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status" />
                        </div>
                    ) : (
                        <Row>
                            {connectors.map((item, indx) => {
                                const name = item.name || item.metadata?.name || item.connector;
                                const category = item.category || item.metadata?.category || 'General';
                                const status = item.status || 'not_configured';
                                const isConnected = status === 'connected';
                                const avatarImg = fallbackAvatars[indx % fallbackAvatars.length];

                                return (
                                    <Col xxl={3} xl={4} md={6} key={item.connector || indx}>
                                        <Card className="card-border card-int mb-4 h-100 d-flex flex-column">
                                            <Card.Body className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div className="avatar avatar-sm avatar-logo">
                                                        <span className="initial-wrap bg-light">
                                                            <img src={avatarImg} alt="logo" />
                                                        </span>
                                                    </div>
                                                    {getStatusBadge(status)}
                                                </div>
                                                <h6 className="app-name mb-1">{name}</h6>
                                                <div className="app-cat fs-8 text-primary mb-2 text-capitalize">{category}</div>
                                                <p className="p-sm multine-ellipsis text-muted">
                                                    Synchronize tenant organizational events and automated triggers via the {name} gateway.
                                                </p>
                                            </Card.Body>
                                            <div className="card-footer justify-content-between border-0 bg-transparent pt-0 pb-3">
                                                <Button
                                                    as={Link}
                                                    to={`/apps/integrations/integrations-detail?slug=${item.connector}`}
                                                    variant="flush-dark"
                                                    size="sm"
                                                    className="px-0 text-muted"
                                                >
                                                    View Details
                                                </Button>
                                                {isConnected ? (
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        onClick={() => setActiveModal({ connector: item, action: 'disconnect' })}
                                                    >
                                                        Disconnect
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => setActiveModal({ connector: item, action: 'configure' })}
                                                    >
                                                        Connect
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </Container>
            </SimpleBar>

            {/* Action / Confirmation Modal */}
            <Modal show={Boolean(activeModal)} onHide={() => setActiveModal(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="fs-6">
                        {activeModal?.action === 'disconnect' ? 'Disconnect Service' : 'Configure Integration'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {activeModal?.action === 'disconnect' ? (
                        <p className="mb-0">
                            Are you sure you want to disconnect <strong>{activeModal?.connector?.name || activeModal?.connector?.connector}</strong>?
                            Active background synchronization will be suspended for this workspace.
                        </p>
                    ) : (
                        <div>
                            <p className="text-muted mb-3">
                                Enter configuration parameters to authorize <strong>{activeModal?.connector?.name || activeModal?.connector?.connector}</strong> for your workspace.
                            </p>
                            <Form.Group className="mb-3">
                                <Form.Label>API Access Key / Client Token</Form.Label>
                                <Form.Control type="password" placeholder="e.g. sec_live_99x0..." defaultValue="test-token-key-12345" />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>Environment Endpoint</Form.Label>
                                <Form.Control type="text" placeholder="https://api.service.com/v1" defaultValue="https://api.external.com/v1" />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" size="sm" onClick={() => setActiveModal(null)}>Cancel</Button>
                    <Button
                        variant={activeModal?.action === 'disconnect' ? 'danger' : 'primary'}
                        size="sm"
                        onClick={handleToggleConnection}
                        disabled={actionLoading}
                    >
                        {actionLoading ? 'Processing...' : activeModal?.action === 'disconnect' ? 'Disconnect' : 'Save & Connect'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Body;
