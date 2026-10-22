import React, { useState, useEffect } from 'react';
import { Button, Card, Col, Container, Row, Badge, Form } from 'react-bootstrap';
import { Link } from '/src/utils/router-compat.jsx';
import SimpleBar from 'simplebar-react';
import api from '../../../utils/api';

// Fallback images
import symbolAvatar1 from '../../../assets/img/symbol-avatar-1.png';
import symbolAvatar4 from '../../../assets/img/symbol-avatar-4.png';
import symbolAvatar12 from '../../../assets/img/symbol-avatar-12.png';
import symbolAvatar14 from '../../../assets/img/symbol-avatar-14.png';

const fallbackAvatars = [symbolAvatar14, symbolAvatar4, symbolAvatar12, symbolAvatar1];

const Body = () => {
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [entitlements, setEntitlements] = useState({});

    useEffect(() => {
        let mounted = true;
        const fetchCatalog = async () => {
            try {
                const [addonsRes, entitlementsRes] = await Promise.allSettled([
                    api.get('/api/cms/addons'),
                    api.get('/api/addons/entitlements')
                ]);

                if (addonsRes.status === 'fulfilled') {
                    const data = Array.isArray(addonsRes.value) ? addonsRes.value : (addonsRes.value.data || []);
                    if (mounted) setAddons(data);
                }

                if (entitlementsRes.status === 'fulfilled' && entitlementsRes.value) {
                    const ent = entitlementsRes.value.entitlements || entitlementsRes.value;
                    if (mounted) setEntitlements(ent || {});
                }
            } catch (err) {
                console.warn('Failed to fetch add-on catalog:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchCatalog();
        return () => { mounted = false; };
    }, []);

    const categories = ['All', ...new Set(addons.map(a => a.category).filter(Boolean))];

    const filteredAddons = addons.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = !searchQuery || 
            (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="integrations-body">
            <SimpleBar className="nicescroll-bar">
                <Container className="mt-md-5 mt-3">
                    <div className="d-flex flex-md-nowrap flex-wrap align-items-center justify-content-between mb-4">
                        <div>
                            <h4 className="mb-1">Organization Add-on &amp; Integration Hub</h4>
                            <p className="text-muted">Explore and connect verified enterprise extensions, APIs, and business workflows.</p>
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-md-0 mt-3">
                            <Form.Control
                                type="text"
                                placeholder="Search extensions..."
                                size="sm"
                                style={{ minWidth: 200 }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="d-flex flex-wrap gap-2 mb-4">
                        {categories.slice(0, 10).map((cat) => (
                            <Button
                                key={cat}
                                size="xs"
                                variant={selectedCategory === cat ? 'primary' : 'outline-secondary'}
                                className="rounded-pill px-3"
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status" />
                            <p className="mt-2 text-muted">Loading enterprise catalog...</p>
                        </div>
                    ) : (
                        <Row>
                            {filteredAddons.map((addon, index) => {
                                const isEntitled = Boolean(entitlements[addon.slug]);
                                const avatarImg = fallbackAvatars[index % fallbackAvatars.length];
                                const priceText = addon.priceMonthly > 0 ? `$${addon.priceMonthly}/mo` : 'Free';

                                return (
                                    <Col xxl={3} xl={4} md={6} key={addon.id || addon.slug || index}>
                                        <Card className="card-border card-int mb-4 h-100 d-flex flex-column">
                                            <Card.Body className="flex-grow-1">
                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                    <div className="avatar avatar-sm avatar-logo">
                                                        <span className="initial-wrap bg-light">
                                                            {addon.icon ? (
                                                                <img src={addon.icon} alt={addon.name} />
                                                            ) : (
                                                                <img src={avatarImg} alt={addon.name} />
                                                            )}
                                                        </span>
                                                    </div>
                                                    <Badge bg={isEntitled ? 'success' : 'soft-primary'} className="text-uppercase fs-9">
                                                        {isEntitled ? 'Installed' : priceText}
                                                    </Badge>
                                                </div>
                                                <h6 className="app-name mb-1">
                                                    <Link to={`/apps/integrations/integrations-detail?slug=${addon.slug}`}>
                                                        {addon.name}
                                                    </Link>
                                                </h6>
                                                <div className="app-cat fs-8 text-primary mb-2">{addon.category}</div>
                                                <p className="p-sm multine-ellipsis text-muted" style={{ minHeight: '3.6em' }}>
                                                    {addon.tagline || addon.description || 'Enterprise-grade integration module for MasterHRMS.'}
                                                </p>
                                            </Card.Body>
                                            <div className="card-footer justify-content-between border-0 bg-transparent pt-0 pb-3">
                                                <span className="d-flex align-items-center fs-8 text-muted">
                                                    <i className="ri-shield-check-line fs-7 me-1 text-success" />
                                                    Verified
                                                </span>
                                                <Button
                                                    as={Link}
                                                    to={`/apps/integrations/integrations-detail?slug=${addon.slug}`}
                                                    variant={isEntitled ? 'outline-success' : 'outline-primary'}
                                                    size="sm"
                                                >
                                                    {isEntitled ? 'Configured' : 'Configure'}
                                                </Button>
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}
                </Container>
            </SimpleBar>
        </div>
    );
};

export default Body;
