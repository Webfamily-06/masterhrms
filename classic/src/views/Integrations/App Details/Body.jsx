import React, { useState } from 'react';
import SimpleBar from 'simplebar-react';
import { Link } from '/src/utils/router-compat.jsx';
import { Rating } from 'react-simple-star-rating';
import { Button, Card, Col, Container, Form, ListGroup, Nav, Row, Tab } from 'react-bootstrap';
import { Bookmark, ExternalLink, Share } from 'react-feather';
import ReviewModal from './ReviewModal';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import HkBadge from '../../../components/@hk-badge/@hk-badge';

//Images
import symbolAvatar1 from '../../../assets/img/symbol-avatar-1.png';
import symbolAvatar4 from '../../../assets/img/symbol-avatar-4.png';
import symbolAvatar12 from '../../../assets/img/symbol-avatar-12.png';
import symbolAvatar14 from '../../../assets/img/symbol-avatar-14.png';
import symbolAvatar15 from '../../../assets/img/symbol-avatar-15.png';
import symbolAvatar16 from '../../../assets/img/symbol-avatar-16.png';
import logoAvatar2 from '../../../assets/img/logo-avatar-2.png';
import logoAvatar10 from '../../../assets/img/logo-avatar-10.png';
import avatar2 from '../../../assets/img/avatar2.jpg';
import avatar3 from '../../../assets/img/avatar3.jpg';
import avatar4 from '../../../assets/img/avatar4.jpg';
import avatar7 from '../../../assets/img/avatar7.jpg';
import avatar8 from '../../../assets/img/avatar8.jpg';
import avatar13 from '../../../assets/img/avatar13.jpg';
import slide1 from '../../../assets/img/slide1.jpg';
import slide2 from '../../../assets/img/slide2.jpg';
import slide3 from '../../../assets/img/slide3.jpg';
import slide4 from '../../../assets/img/slide4.jpg';



import api from '../../../utils/api';

const Body = () => {
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [addon, setAddon] = useState(null);
    const [installed, setInstalled] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('slug');
        if (!slug) return;

        setLoading(true);
        api.get(`/api/cms/addons/${slug}`)
            .then(data => {
                if (data && data.name) {
                    setAddon(data);
                }
            })
            .catch(err => {
                console.warn('Could not fetch addon details:', err);
            })
            .finally(() => setLoading(false));
    }, []);

    const appName = addon?.name || "Kickstarter";
    const appTagline = addon?.tagline || "by MasterHRMS Partner Network";
    const appCategory = addon?.category || "Crowdfunding & Business";
    const appDescription = addon?.description || "Think classic lorem ipsum is passé? Connect enterprise modules with verified integrations.";
    const appFeatures = addon?.features && addon.features.length > 0
        ? addon.features
        : [
            "Seamless bi-directional synchronization with MasterHRMS",
            "Role-based permission gating and tenant-level isolation",
            "Real-time event delivery and automated status webhooks",
            "Audited logging and compliance assurance"
        ];

    return (
        <>
            <div className="integrations-body">
                <SimpleBar className="nicescroll-bar">
                    <Container className="container mt-md-7 mt-3">
                        <Row>
                            <Col xxl={8} lg={7}>
                                <div className="media">
                                    <div className="media-head me-3">
                                        <div className="avatar avatar-logo">
                                            <span className="initial-wrap bg-success-light-5">
                                                {addon?.icon ? (
                                                    <img src={addon.icon} alt="logo" />
                                                ) : (
                                                    <img src={symbolAvatar15} alt="logo" />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="media-body">
                                        <h3 className="hd-bold mb-0">{appName}</h3>
                                        <span className="text-muted">{appTagline}</span>
                                        <div className="d-flex align-items-center mt-1">
                                            <div className="d-flex align-items-center">
                                                <Rating initialValue={4} readonly size="20" className="d-flex align-items-center me-2" />
                                                <span>4.8</span>
                                            </div>
                                            <div className="d-sm-flex align-items-center d-none">
                                                <span className="opacity-15 mx-2">●</span>
                                                <span className="d-flex align-items-center fs-8 text-primary">
                                                    <Badge bg="soft-primary" className="me-2">{appCategory}</Badge>
                                                    {addon?.priceMonthly > 0 ? `$${addon.priceMonthly}/mo` : 'Free Tier Included'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                            <Col xxl={4} lg={5} className="mt-lg-0 mt-3">
                                <Button
                                    variant={installed ? "outline-danger" : "primary"}
                                    className="btn-block"
                                    onClick={() => setInstalled(!installed)}
                                >
                                    {installed ? "Uninstall / Disconnect" : "Install & Configure"}
                                </Button>
                                <div className="d-flex mt-3">
                                    <Button variant="light" size="sm" className="btn-block">
                                        <span><span className="icon">
                                            <span className="feather-icon">
                                                <Share />
                                            </span>
                                        </span>
                                            <span>Share</span>
                                        </span>
                                    </Button>
                                    <Button variant="light" size="sm" className="btn-block ms-2 mt-0">
                                        <span><span className="icon">
                                            <span className="feather-icon">
                                                <Bookmark />
                                            </span>
                                        </span>
                                            <span>Bookmark</span>
                                        </span>
                                    </Button>
                                </div>
                            </Col>
                        </Row>
                        <div className="row">
                            <div className="col-xxl-8 col-lg-7">
                                <div className="product-detail-slider">

                                    {/* <div id="owl_demo_1" className="owl-carousel owl-primary mt-6">
                                    <div className="item" data-hash="zero"><img src={slide1} alt="Owl Img" /></div>
                                    <div className="item" data-hash="one"><img src={slide2} alt="Owl Img" /></div>
                                    <div className="item" data-hash="two"><img src={slide3} alt="Owl Img" /></div>
                                    <div className="item" data-hash="three"><img src={slide4} alt="Owl Img" /></div>
                                </div>
                                <div className="thumb-wrap">
                                    <a className="active-thumb" href="#zero" />
                                    <a href="#one" />
                                    <a href="#two" />
                                    <a href="#three" />
                                </div> */}

                                    <Carousel showArrows={false} showIndicators={false} showStatus={false} emulateTouch={true} className="mt-6" >
                                        <div>
                                            <img alt="slide1" src={slide1} />
                                        </div>
                                        <div>
                                            <img alt="slide2" src={slide2} />
                                        </div>
                                        <div>
                                            <img alt="slide3" src={slide3} />
                                        </div>
                                        <div>
                                            <img alt="slide4" src={slide4} />
                                        </div>
                                    </Carousel>

                                </div>
                                <div className="separator" />
                                <Tab.Container defaultActiveKey="tabit1" >
                                    <Nav variant="pills" className="nav nav-light nav-pills-rounded justify-content-center">
                                        <Nav.Item>
                                            <Nav.Link eventKey="tabit1">
                                                <span className="nav-link-text">Overview</span>
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="tabit2">
                                                <span className="nav-link-text">Comments</span>
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link eventKey="tabit3">
                                                <span className="nav-link-text">Reviews</span>
                                            </Nav.Link>
                                        </Nav.Item>
                                    </Nav>
                                    <Tab.Content className="py-7">
                                        <Tab.Pane eventKey="tabit1">
                                            <h5>Overview &amp; Enterprise Architecture</h5>
                                            <p>{appDescription}</p>
                                            <h6 className="mt-4 mb-2">Key Integration Capabilities</h6>
                                            <ul className="list-ul ps-3">
                                                {appFeatures.map((feat, i) => (
                                                    <li className="mb-2" key={i}><span>{feat}</span></li>
                                                ))}
                                            </ul>
                                        </Tab.Pane>
                                        <Tab.Pane eventKey="tabit2">
                                            <div className="title title-lg"><span>3 Responses</span></div>
                                            <div className="comment-block">
                                                <Form className="mb-4">
                                                    <Form.Group>
                                                        <div className="media">
                                                            <div className="media-head">
                                                                <div className="avatar avatar-xs avatar-rounded">
                                                                    <img src={avatar4} alt="user" className="avatar-img" />
                                                                </div>
                                                            </div>
                                                            <div className="media-body">
                                                                <div className="form-inline">
                                                                    <Form.Control className="me-3" />
                                                                    <Button variant="primary">Post</Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Form.Group>
                                                </Form>
                                                <div className="media">
                                                    <div className="media-head">
                                                        <div className="avatar avatar-xs avatar-rounded">
                                                            <img src={avatar4} alt="user" className="avatar-img" />
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div>
                                                            <span className="cm-name">Martin Luther</span>
                                                        </div>
                                                        <p>From there, you can run truffle compile, truffle migrate and truffle test to compile your contracts, deploy those contracts to the network, and run their associated unit tests.</p>
                                                        <div className="comment-action-wrap mt-3">
                                                            <span>3 hours ago</span>
                                                            <span className="comment-dot-sep">●</span>
                                                            <Link to="#">Reply</Link>
                                                            <span className="comment-dot-sep">●</span>
                                                            <Link to="#">Like</Link>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="separator separator-light" />
                                                <div className="media">
                                                    <div className="media-head">
                                                        <div className="avatar avatar-xs avatar-rounded">
                                                            <img src={avatar2} alt="user" className="avatar-img" />
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div>
                                                            <span className="cm-name">Katherine Jones</span>
                                                        </div>
                                                        <p>Dynamically beautiful work done by Ashton Kutcher</p>
                                                        <div className="comment-action-wrap mt-3">
                                                            <span>3 hours ago</span>
                                                            <span className="comment-dot-sep">●</span>
                                                            <Link to="#">Reply</Link>
                                                            <span className="comment-dot-sep">●</span>
                                                            <Link to="#">Like</Link>
                                                        </div>
                                                        <div className="media">
                                                            <div className="media-head">
                                                                <div className="avatar avatar-xs avatar-rounded">
                                                                    <img src={avatar3} alt="user" className="avatar-img" />
                                                                </div>
                                                            </div>
                                                            <div className="media-body">
                                                                <div>
                                                                    <span className="cm-name">Ashton Kutche</span>
                                                                </div>
                                                                <p>Thank you :)</p>
                                                                <div className="comment-action-wrap mt-3">
                                                                    <span>3 hours ago</span>
                                                                    <span className="comment-dot-sep">●</span>
                                                                    <Link to="#">Reply</Link>
                                                                    <span className="comment-dot-sep">●</span>
                                                                    <Link to="#">Like</Link>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="separator separator-light" />
                                                <div className="media">
                                                    <div className="media-head">
                                                        <div className="avatar avatar-xs avatar-rounded">
                                                            <img src={avatar4} alt="user" className="avatar-img" />
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div>
                                                            <span className="cm-name">Pheebee Fry</span>
                                                        </div>
                                                        <p>Like your lorem ipsum extra crispy? Then Bacon Ipsum is the placeholder text generator for you. Side of eggs and hashbrowns is optional, but recommended.</p>
                                                        <div className="comment-action-wrap mt-3">
                                                            <span>8 Feb, 2020</span>
                                                            <span className="comment-dot-sep">●</span>
                                                            <Link to="#">Reply</Link>
                                                            <span className="comment-dot-sep">●</span>
                                                            <Link to="#">Like</Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Tab.Pane>
                                        <Tab.Pane eventKey="tabit3">
                                            <div className="review-block">
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <div className="d-flex align-items-center">
                                                        <div className="title title-lg mb-0 me-3">
                                                            <span>User Reviews</span>
                                                        </div>
                                                        <Button variant="soft-primary" onClick={() => setShowReviewModal(!showReviewModal)} >Write a review</Button>
                                                    </div>
                                                    <div>
                                                        <Form.Select className="d-md-flex d-none">
                                                            <option value={0}>Helpful Reviews</option>
                                                            <option value={1}>Most Rated</option>
                                                            <option value={2}>Less Rated</option>
                                                            <option value={3}>Popular Reviews</option>
                                                        </Form.Select>
                                                    </div>
                                                </div>
                                                <div className="separator mt-4" />
                                                <div className="review">
                                                    <div className="media align-items-center">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-xs avatar-rounded">
                                                                <img src={avatar7} alt="user" className="avatar-img" />
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <span className="cr-name">Martin Luther</span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex flex-sm-nowrap flex-wrap mt-2 mb-1">
                                                        <Rating initialValue={4} readonly size="20" className="d-flex align-items-center me-2 mb-sm-0 mb-2" />
                                                        <div>for <span className="text-dark mx-1">Design Quality</span> <span className="fs-8">12 Jan, 2020</span></div>
                                                    </div>
                                                    <p>A handcrafted, small-batch, artisinal pour-over version of the classic lorem ipsum generator, Hipster Ipsum will give your mocks that blue collar touch.</p>
                                                    <div className="review-action-wrap mt-3">
                                                        <span className="me-1">Was this review helpful?</span>
                                                        <Button variant="outline-light me-1" size="xs">Yes</Button>
                                                        <Button variant="outline-light me-1" size="xs">No</Button>
                                                        <span className="review-dot-sep">●</span>
                                                        <Link to="#">Reply</Link>
                                                        <span className="review-dot-sep">●</span>
                                                        <Link to="#">Report abuse</Link>
                                                    </div>
                                                </div>
                                                <div className="separator separator-light" />
                                                <div className="review">
                                                    <div className="media align-items-center">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-xs">
                                                                <img src={avatar8} alt="user" className="avatar-img rounded-circle" />
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <span className="cr-name">Katherine Jones</span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex flex-sm-nowrap flex-wrap mt-2 mb-1">
                                                        <Rating initialValue={3} readonly size="20" className="d-flex align-items-center me-2 mb-sm-0 mb-2" />
                                                        <div>for <span className="text-dark mx-1">Customer Support</span> <span className="fs-8">10 Jan, 2020</span></div>
                                                    </div>
                                                    <p>Like your lorem ipsum extra crispy? Then Bacon Ipsum is the placeholder text generator for you. Side of eggs and hashbrowns is optional, but recommended. Sugary sweet lorem ipsum? You got it with Cupcake Ipsum, the only text generator that includes marshmallows, carrot cake, and perhaps even a cherry on top.</p>
                                                    <div className="review-action-wrap mt-3">
                                                        <span className="me-1">Was this review helpful?</span>
                                                        <Button variant="outline-light me-1" size="xs">Yes</Button>
                                                        <Button variant="outline-light me-1" size="xs">No</Button>
                                                        <span className="review-dot-sep">●</span>
                                                        <Link to="#">Reply</Link>
                                                        <span className="review-dot-sep">●</span>
                                                        <Link to="#">Report abuse</Link>
                                                    </div>
                                                </div>
                                                <div className="separator separator-light" />
                                                <div className="review">
                                                    <div className="media align-items-center">
                                                        <div className="media-head">
                                                            <div className="avatar avatar-xs">
                                                                <img src={avatar3} alt="user" className="avatar-img rounded-circle" />
                                                            </div>
                                                        </div>
                                                        <div className="media-body">
                                                            <span className="cr-name">Pheebee Fry</span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex flex-sm-nowrap flex-wrap mt-2 mb-1">
                                                        <Rating initialValue={2} readonly size="20" className="d-flex align-items-center me-2 mb-sm-0 mb-2" />
                                                        <div>for <span className="text-dark mx-1">Design Quality</span> <span className="fs-8">31 Dec, 2020</span></div>
                                                    </div>
                                                    <p>A web generator and jQuery plugin, Delorean Ipsum uses the script from Back to the Future to generate quotable lorem ipsum text for every project, past or present.</p>
                                                    <div className="review-action-wrap mt-3">
                                                        <span className="me-1">Was this review helpful?</span>
                                                        <Button variant="outline-light me-1" size="xs">Yes</Button>
                                                        <Button variant="outline-light me-1" size="xs">No</Button>
                                                        <span className="review-dot-sep">●</span>
                                                        <Link to="#">Reply</Link>
                                                        <span className="review-dot-sep">●</span>
                                                        <Link to="#">Report abuse</Link>
                                                    </div>
                                                    <div className="review">
                                                        <div className="media align-items-center">
                                                            <div className="media-head">
                                                                <div className="avatar avatar-xs">
                                                                    <img src={avatar13} alt="user" className="avatar-img rounded-circle" />
                                                                </div>
                                                            </div>
                                                            <div className="media-body">
                                                                <span className="cr-name">Ashton Kutcher</span>
                                                            </div>
                                                        </div>
                                                        <div className="d-flex flex-sm-nowrap flex-wrap mt-2 mb-1">
                                                            <div><span className="fs-8">1 Jan, 2020</span></div>
                                                        </div>
                                                        <p>Space, the final frontier. These are the voyages of the Starship Enterprise.</p>
                                                        <div className="review-action-wrap mt-3">
                                                            <span className="me-1">Was this review helpful?</span>
                                                            <Button variant="outline-light me-1" size="xs">Yes</Button>
                                                            <Button variant="outline-light me-1" size="xs">No</Button>
                                                            <span className="review-dot-sep">●</span>
                                                            <Link to="#">Reply</Link>
                                                            <span className="review-dot-sep">●</span>
                                                            <Link to="#">Report abuse</Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Tab.Pane>
                                    </Tab.Content>
                                </Tab.Container>
                            </div>
                            <Col xxl={4} lg={5}>
                                <div className="content-aside">
                                    <Card className="card-border mt-6">
                                        <Card.Body>
                                            <h6 className="mb-4">Categories</h6>
                                            <div className="tag-cloud">
                                                <HkBadge as={Link} to="#" bg="primary" soft className="me-1">Jampack</HkBadge>
                                                <HkBadge as={Link} to="#" bg="primary" soft className="me-1">Bootstrap 5</HkBadge>
                                                <HkBadge as={Link} to="#" bg="primary" soft className="me-1">Admin Template</HkBadge>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                    <Card className="card-border">
                                        <Card.Body>
                                            <div className="media align-items-center">
                                                <div className="media-head me-3">
                                                    <div className="avatar avatar-sm avatar-icon avatar-soft-success avatar-rounded">
                                                        <span className="initial-wrap">
                                                            <span className="feather-icon">
                                                                <ExternalLink />
                                                            </span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="media-body">
                                                    <h6 className="mb-0">Website</h6>
                                                    <Link to="#" className="link-muted">kickstarter.com</Link>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                    <Card className="card-border">
                                        <Card.Body>
                                            <h6 className="mb-4">Additional Info</h6>
                                            <ul className="list-unstyled">
                                                <li className="mb-3">
                                                    <div className="fs-7">Version</div>
                                                    <div className="text-dark fw-medium">A3.45-4.0</div>
                                                </li>
                                                <li className="mb-3">
                                                    <div className="fs-7">Updated</div>
                                                    <div className="text-dark fw-medium">May 20, 2020</div>
                                                </li>
                                                <li className="mb-3">
                                                    <div className="fs-7">Size</div>
                                                    <div className="text-dark fw-medium">4.35 MB</div>
                                                </li>
                                                <li className="mb-3">
                                                    <div className="fs-7">Languages</div>
                                                    <div className="text-dark fw-medium">English, Spanish, French</div>
                                                </li>
                                                <li className="mb-3">
                                                    <div className="fs-7">Developed by</div>
                                                    <div className="text-dark fw-medium d-flex align-items-center">Hencework<i className="ri-information-fill fs-7 ms-1 lh-1" /></div>
                                                </li>
                                                <li className="mb-3">
                                                    <div className="fs-7">Resources</div>
                                                    <div className="text-dark fw-medium d-flex align-items-center">Product Documentation<a href="#some" className="d-flex"><i className="ri-external-link-line fs-7 ms-1 lh-1" /></a></div>
                                                </li>
                                                <li>
                                                    <a href="#some" className="d-flex align-items-center link-danger"><span className="d-flex"><i className="ri-information-line fs-7 me-1 lh-1" /></span>Report abuse</a>
                                                </li>
                                            </ul>
                                        </Card.Body>
                                    </Card>
                                    <Card className="card-border">
                                        <Card.Body>
                                            <h6 className="mb-4">Related</h6>
                                            <ListGroup as="ul" variant="flush">
                                                <ListGroup.Item as="li" className="border-0 px-0">
                                                    <Link to="#">
                                                        <div className="media align-items-center">
                                                            <div className="media-head me-3">
                                                                <div className="avatar avatar-sm avatar-logo">
                                                                    <span className="initial-wrap bg-success-light-5">
                                                                        <img src={symbolAvatar14} alt="logo" />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="media-body d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <h6 className="mb-0">Intercom</h6>
                                                                    <div className="fs-7 text-muted">Chat Application</div>
                                                                    <div className="d-flex align-items-center fs-8 text-muted"><i className="ri-download-cloud-2-line fs-7 me-1 text-primary" />15M Downloads</div>
                                                                </div>
                                                                <HkBadge size="sm" bg="primary" >
                                                                    <span><span className="icon"><i className="ri-star-s-fill" /></span>4.5</span>
                                                                </HkBadge>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </ListGroup.Item>
                                                <ListGroup.Item as="li" className="border-0 px-0">
                                                    <Link to="#">
                                                        <div className="media align-items-center">
                                                            <div className="media-head me-3">
                                                                <div className="avatar avatar-sm">
                                                                    <img className="avatar-img" src={logoAvatar2} alt="logo" />
                                                                </div>
                                                            </div>
                                                            <div className="media-body d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <h6 className="mb-0">Swiggy</h6>
                                                                    <div className="fs-7 text-muted">Food Delivery</div>
                                                                    <div className="d-flex align-items-center fs-8 text-muted"><i className="ri-download-cloud-2-line fs-7 me-1 text-primary" />15M Downloads</div>
                                                                </div>
                                                                <HkBadge size="sm" bg="warning" >
                                                                    <span><span className="icon"><i className="ri-star-s-fill" /></span>3.5</span>
                                                                </HkBadge>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </ListGroup.Item>
                                                <ListGroup.Item as="li" className="border-0 px-0">
                                                    <Link to="#">
                                                        <div className="media align-items-center">
                                                            <div className="media-head me-3">
                                                                <div className="avatar avatar-sm">
                                                                    <img className="avatar-img" src={logoAvatar10} alt="logo" />
                                                                </div>
                                                            </div>
                                                            <div className="media-body d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <h6 className="mb-0">Medium</h6>
                                                                    <div className="fs-7 text-muted">Blog</div>
                                                                    <div className="d-flex align-items-center fs-8 text-muted"><i className="ri-download-cloud-2-line fs-7 me-1 text-primary" />15M Downloads</div>
                                                                </div>
                                                                <HkBadge size="sm" bg="danger" >
                                                                    <span><span className="icon"><i className="ri-star-s-fill" /></span>2.0</span>
                                                                </HkBadge>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </ListGroup.Item>
                                                <ListGroup.Item as="li" className="border-0 px-0">
                                                    <Link to="#">
                                                        <div className="media align-items-center">
                                                            <div className="media-head me-3">
                                                                <div className="avatar avatar-sm avatar-logo">
                                                                    <span className="initial-wrap bg-dark">
                                                                        <img src={symbolAvatar12} alt="logo" />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="media-body d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <h6 className="mb-0">Figma</h6>
                                                                    <div className="fs-7 text-muted">Design Tool</div>
                                                                    <div className="d-flex align-items-center fs-8 text-muted"><i className="ri-download-cloud-2-line fs-7 me-1 text-primary" />15M Downloads</div>
                                                                </div>
                                                                <HkBadge size="sm" bg="primary" >
                                                                    <span><span className="icon"><i className="ri-star-s-fill" /></span>4.5</span>
                                                                </HkBadge>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </ListGroup.Item>
                                            </ListGroup>
                                        </Card.Body>
                                    </Card>
                                </div>
                            </Col>
                        </div>
                        <h6 className="text-center mt-10 mb-4">Similar Apps like this</h6>
                        <Row>
                            <Col xl={3} md={6}>
                                <Card className="card-border text-center">
                                    <Card.Body>
                                        <div className="avatar avatar-sm avatar-violet mb-3">
                                            <span className="initial-wrap">H</span>
                                        </div>
                                        <div className="app-name">Hencework</div>
                                        <div className="app-cat">Chat Application</div>
                                        <div className="d-flex align-items-center justify-content-center">
                                            <Rating initialValue={3} readonly size="20" className="d-flex align-items-center me-2" />
                                            <span className="fs-8">3,672</span>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xl={3} md={6}>
                                <Card className="card-border text-center">
                                    <Card.Body>
                                        <div className="avatar avatar-sm avatar-logo mb-3">
                                            <span className="initial-wrap">
                                                <img src={symbolAvatar4} alt="logo" />
                                            </span>
                                        </div>
                                        <div className="app-name">Jampack</div>
                                        <div className="app-cat">Dashboard Template</div>
                                        <div className="d-flex align-items-center justify-content-center">
                                            <Rating initialValue={3} readonly size="20" className="d-flex align-items-center me-2" />
                                            <span className="fs-8">3,672</span>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xl={3} md={6}>
                                <Card className="card-border text-center">
                                    <Card.Body>
                                        <div className="avatar avatar-sm avatar-logo mb-3">
                                            <span className="initial-wrap">
                                                <img src={symbolAvatar1} alt="logo" />
                                            </span>
                                        </div>
                                        <div className="app-name">Tinder</div>
                                        <div className="app-cat">Dating App</div>
                                        <div className="d-flex align-items-center justify-content-center">
                                            <Rating initialValue={4} readonly size="20" className="d-flex align-items-center me-2" />
                                            <span className="fs-8">3,672</span>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col xl={3} md={6}>
                                <Card className="card-border text-center">
                                    <Card.Body>
                                        <div className="avatar avatar-sm avatar-logo mb-3">
                                            <span className="initial-wrap">
                                                <img src={symbolAvatar16} alt="logo" />
                                            </span>
                                        </div>
                                        <div className="app-name">Github</div>
                                        <div className="app-cat">Developer Geek</div>
                                        <div className="d-flex align-items-center justify-content-center">
                                            <Rating initialValue={3.5} allowFraction readonly size="20" className="d-flex align-items-center me-2" />
                                            <span className="fs-8">3,672</span>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Container>
                </SimpleBar>
            </div>
            {/* Write Reveiw */}
            <ReviewModal show={showReviewModal} closeModal={() => setShowReviewModal(!showReviewModal)} />

        </>
    )
}

export default Body
