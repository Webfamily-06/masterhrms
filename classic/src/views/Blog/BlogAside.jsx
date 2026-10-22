import React, { useState } from 'react';
import { Button, Card, Form, Nav, Tab } from 'react-bootstrap';
import { ChevronDown, Plus } from 'react-feather';
import { Link } from '/src/utils/router-compat.jsx';
import SimpleBar from 'simplebar-react';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import HkTags from '../../components/@hk-tags/@hk-tags';
import HkDropZone from '../../components/@hk-drop-zone/HkDropZone';

const BlogAside = () => {
    const [startDate, setStartDate] = useState(new Date());
    const multiSelectOpt = [
        { value: "collaborator", label: "Collaborator" },
        { value: "designer", label: "Designer" },
        { value: "react-developer", label: "React Developer" },
    ]


    return (
        <div className="content-aside">
            <Button variant="outline-secondary" className="btn-block" disabled>Preview Changes</Button>
            <Button variant="primary" className="btn-block mb-3">Publish</Button>
            <Card className="card-border">
                <Card.Body>
                    <Form className="edit-post-form">
                        <Form.Group className="mb-3" >
                            <Form.Label>Published Date</Form.Label>
                            <DateRangePicker
                                initialSettings={{
                                    singleDatePicker: true,
                                    timePicker: true,
                                    showDropdowns: true,
                                    startDate: startDate,
                                    locale: {
                                        format: 'M/DD/YYYY hh:mm A',
                                    },
                                }}
                                onApply={(event, picker) => {
                                    setStartDate(new Date(picker.startDate));
                                }}
                            >
                                <Form.Control type="text" name="single-date" />
                            </DateRangePicker>
                        </Form.Group>
                        <Form.Group className="mb-3" >
                            <Form.Label>Visibility</Form.Label>
                            <Form.Select>
                                <option value={1}>Public</option>
                                <option value={2}>Private</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3" >
                            <Form.Label>Status</Form.Label>
                            <Form.Select>
                                <option value={1}>--</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Card.Body>
            </Card>
            <Card className="card-border overflow-hidden">
                <Card.Header className="card-header-action">
                    <Link to="#" data-bs-toggle="collapse" data-bs-target="#categories_1" aria-expanded="true">
                        <div className="d-flex align-items-center">
                            <h6 className="me-2 mb-0">Categories</h6>
                            <span className="btn btn-xs btn-icon btn-rounded btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Add Category">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Plus />
                                    </span>
                                </span>
                            </span>
                        </div>
                    </Link>
                    <div className="card-action-wrap">
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover" data-bs-toggle="collapse" href="#categories_1" aria-expanded="true">
                            <span className="icon">
                                <span className="feather-icon">
                                    <ChevronDown />
                                </span>
                            </span>
                        </Button>
                    </div>
                </Card.Header>
                <div id="categories_1" className="collapse show">
                    <Card.Body>
                        <Tab.Container defaultActiveKey="tabCat" >
                            <Nav justify className="nav-light nav-tabs nav-segmented-tabs segmented-tabs-soft">
                                <Nav.Item>
                                    <Nav.Link eventKey="tabCat">
                                        <span className="nav-link-text">All Categories</span>
                                    </Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="tabFreq">
                                        <span className="nav-link-text badge-on-text">Frequent</span>
                                    </Nav.Link>
                                </Nav.Item>
                            </Nav>
                            <Tab.Content>
                                <Tab.Pane eventKey="tabCat">
                                    <div className="h-180p">
                                        <SimpleBar className="nicescroll-bar p-0">
                                            <Form.Check
                                                type="checkbox"
                                                label="Design"
                                                id="catchk1"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Development"
                                                id="catchk2"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Technology"
                                                id="catchk3"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Business"
                                                id="catchk4"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Social Media"
                                                id="catchk5"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Sports"
                                                id="catchk6"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Writing"
                                                id="catchk7"
                                            />
                                        </SimpleBar>
                                    </div>
                                </Tab.Pane>
                                <Tab.Pane eventKey="tabFreq">
                                    <div className="h-180p">
                                        <SimpleBar className="nicescroll-bar p-0">
                                            <Form.Check
                                                type="checkbox"
                                                label="Design"
                                                id="catchk8"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Development"
                                                id="catchk9"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Technology"
                                                id="catchk10"
                                            />
                                            <Form.Check
                                                type="checkbox"
                                                label="Business"
                                                id="catchk11"
                                            />
                                        </SimpleBar>
                                    </div>
                                </Tab.Pane>
                            </Tab.Content>
                        </Tab.Container>
                    </Card.Body>
                </div>
            </Card>
            <Card className="card-border">
                <Card.Header className="card-header-action">
                    <Link to="#" role="button" data-bs-toggle="collapse" aria-expanded="true" data-bs-target="#tags_1">
                        <h6 className="mb-0">Add Tags(Upto 5)</h6>
                    </Link>
                    <div className="card-action-wrap">
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover" data-bs-toggle="collapse" aria-expanded="true" href="#tags_1">
                            <span className="icon">
                                <span className="feather-icon">
                                    <ChevronDown />
                                </span>
                            </span>
                        </Button>
                    </div>
                </Card.Header>
                <div id="tags_1" className="collapse show">
                    <Card.Body>
                        <HkTags
                            options={multiSelectOpt}
                            defaultValue={[multiSelectOpt[0], multiSelectOpt[1], multiSelectOpt[2], multiSelectOpt[3]]}
                        />
                    </Card.Body>
                </div>
            </Card>
            <Card className="card-border overflow-hidden">
                <Card.Header className="card-header-action">
                    <Link to="#" role="button" data-bs-toggle="collapse" href="#post_1" aria-expanded="true" data-bs-target="#post_1">
                        <div className="d-flex align-items-center">
                            <h6 className="me-2 mb-0">Post type</h6>
                            <span className="btn btn-xs btn-icon btn-rounded btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Add Category">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Plus />
                                    </span>
                                </span>
                            </span>
                        </div>
                    </Link>
                    <div className="card-action-wrap">
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover" data-bs-toggle="collapse" aria-expanded="true" href="#post_1">
                            <span className="icon">
                                <span className="feather-icon">
                                    <ChevronDown />
                                </span>
                            </span>
                        </Button>
                    </div>
                </Card.Header>
                <div id="post_1" className="collapse show">
                    <Card.Body>
                        <Form.Check type="radio" className="mb-1" label="Image Post" id="customRadio1" defaultChecked />
                        <Form.Check type="radio" className="mb-1" label="Video Post" id="customRadio2" />
                        <Form.Check type="radio" className="mb-1" label="Quote Post" id="customRadio3" />
                        <Form.Check type="radio" label="Gallery Post" id="customRadio4" />
                    </Card.Body>
                </div>
            </Card>
            <Card className="card-border overflow-hidden">
                <Card.Header className="card-header-action">
                    <Link to="#" role="button" data-bs-toggle="collapse" data-bs-target="#prev_1" aria-expanded="true">
                        <div className="d-flex align-items-center">
                            <h6 className="me-2 mb-0">Preview Image</h6>
                            <Button variant="light" size="xs" className="btn-icon btn-rounded" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Add Category">
                                <span className="icon">
                                    <span className="feather-icon">
                                        <Plus />
                                    </span>
                                </span>
                            </Button>
                        </div>
                    </Link>
                    <div className="card-action-wrap">
                        <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover" data-bs-toggle="collapse" aria-expanded="true" href="#prev_1">
                            <span className="icon">
                                <span className="feather-icon">
                                    <ChevronDown />
                                </span>
                            </span>
                        </Button>
                    </div>
                </Card.Header>
                <div id="prev_1" className="collapse show">
                    <Card.Body>
                        <HkDropZone>
                            <span className="main-text">Upload a high quality image to</span><div className="fw-light text-muted"> Make your blog post inviting</div>
                        </HkDropZone>
                    </Card.Body>
                </div>
            </Card>
        </div>
    )
}

export default BlogAside
