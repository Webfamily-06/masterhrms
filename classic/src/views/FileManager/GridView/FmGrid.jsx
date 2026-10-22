import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Col, Dropdown, Row } from 'react-bootstrap';
import { Copy, Download, Eye, Info, Link2, MoreHorizontal, SkipForward, Star, Trash2, UserPlus } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { Link } from '/src/utils/router-compat.jsx';
import HkAlert from '../../../components/@hk-alert/@hk-alert';
import api from '../../../utils/api';

//Images
import mock7 from '../../../assets/img/gallery/mock7.jpg';
import mock5 from '../../../assets/img/gallery/mock5.jpg';

const FmGrid = ({ fileInfo }) => {
    const [liveFiles, setLiveFiles] = useState([]);

    const fetchMedia = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/media');
            const items = Array.isArray(res) ? res : res.data;
            if (Array.isArray(items)) {
                setLiveFiles(items);
            }
        } catch (err) {
            console.warn('Could not fetch media for grid:', err.message);
        }
    }, []);

    useEffect(() => {
        fetchMedia();
        const onUploaded = () => fetchMedia();
        window.addEventListener('hrms-media-uploaded', onUploaded);
        return () => window.removeEventListener('hrms-media-uploaded', onUploaded);
    }, [fetchMedia]);

    return (
        <div className="fm-body">
            <SimpleBar className="nicescroll-bar">
                <div className="file-card-view">
                    <HkAlert variant="warning" className="alert-wth-icon" dismissible >
                        <span className="alert-icon-wrap"><i className="ri-alert-line" /></span>
                        <div className="d-flex align-items-center flex-wrap flex-sm-nowrap">
                            You must provide value for account name.
                            <Button size="sm" variant="warning" className="ms-sm-auto mt-sm-0 mt-2 flex-shrink-0">Upgrade Storage</Button>
                        </div>
                    </HkAlert>
                    <div className="collapse-simple mt-4">
                        <Card>
                            <Card.Header>
                                <Link role="button" data-bs-toggle="collapse" to="#fm_collapse_1" aria-expanded="true">
                                    <h5 className="mb-0">Quick Access ({liveFiles.length > 0 ? liveFiles.length : 'Default'} files)</h5>
                                </Link>
                            </Card.Header>
                            <div id="fm_collapse_1" className="collapse show">
                                <Row className="gx-3 row-cols-xxl-6 row-cols-xl-4 row-cols-lg-3 row-cols-md-2 row-cols-1 mt-3">
                                    {liveFiles.map((item, idx) => {
                                        const isImg = item.mimeType?.startsWith('image/');
                                        const isPdf = item.mimeType?.includes('pdf');
                                        const iconClass = isImg ? "ri-image-fill text-success" : isPdf ? "ri-file-pdf-fill text-danger" : "ri-file-text-fill text-blue";
                                        const sizeText = item.sizeBytes ? `${(item.sizeBytes / 1024).toFixed(1)} KB` : "15 KB";
                                        const nameText = item.originalName || item.filename || "Uploaded File";
                                        return (
                                            <Col key={item.id || idx}>
                                                <Card className="file-card card-border">
                                                    <Card.Body className="fmapp-info-trigger" onClick={fileInfo}>
                                                        {isImg && item.url ? (
                                                            <img src={item.url} alt={nameText} style={{ maxHeight: 60, objectFit: 'contain' }} className="d-block mx-auto" />
                                                        ) : (
                                                            <i className={iconClass} />
                                                        )}
                                                    </Card.Body>
                                                    <Card.Footer>
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="text-truncate">
                                                                <div className="file-name text-truncate" title={nameText}>{nameText}</div>
                                                                <div className="text-truncate fs-8 mb-2">{sizeText}</div>
                                                            </div>
                                                            <div className="d-flex">
                                                                <span className="file-star marked">
                                                                    <span className="feather-icon">
                                                                        <Star />
                                                                    </span>
                                                                </span>
                                                                <Dropdown>
                                                                    <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                                        <span className="icon">
                                                                            <span className="feather-icon">
                                                                                <MoreHorizontal />
                                                                            </span>
                                                                        </span>
                                                                    </Dropdown.Toggle>
                                                                    <Dropdown.Menu>
                                                                        <Dropdown.Item as="a" href={item.url || "#"} target="_blank">
                                                                            <span className="feather-icon dropdown-icon"><Eye /></span>
                                                                            <span>Preview</span>
                                                                        </Dropdown.Item>
                                                                        <Dropdown.Item as="a" href={item.url || "#"} download>
                                                                            <span className="feather-icon dropdown-icon"><Download /></span>
                                                                            <span>Download</span>
                                                                        </Dropdown.Item>
                                                                    </Dropdown.Menu>
                                                                </Dropdown>
                                                            </div>
                                                        </div>
                                                        <p className="text-truncate p-xs">Tenant Asset</p>
                                                    </Card.Footer>
                                                </Card>
                                            </Col>
                                        );
                                    })}
                                    <Col>
                                        <Card className="file-card card-border">
                                            <Card.Body className="fmapp-info-trigger" onClick={fileInfo}>
                                                <i className="ri-file-excel-2-fill text-blue" />
                                            </Card.Body>
                                            <Card.Footer>
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <div className="file-name">Website_content.exl</div>
                                                        <div className="text-truncate fs-8 mb-2">2,637 KB</div>
                                                    </div>
                                                    <div className="d-flex">
                                                        <span className="file-star marked">
                                                            <span className="feather-icon">
                                                                <Star />
                                                            </span>
                                                        </span>
                                                        <Dropdown>
                                                            <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                                <span className="icon">
                                                                    <span className="feather-icon">
                                                                        <MoreHorizontal />
                                                                    </span>
                                                                </span>
                                                            </Dropdown.Toggle>

                                                            <Dropdown.Menu>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Eye />
                                                                    </span>
                                                                    <span>Preview</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Copy />
                                                                    </span>
                                                                    <span>Duplicate</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <SkipForward />
                                                                    </span>
                                                                    <span>Move</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <UserPlus />
                                                                    </span>
                                                                    <span>Invite</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Link2 />
                                                                    </span>
                                                                    <span>Share Link</span>
                                                                </Dropdown.Item>
                                                                <div className="dropdown-divider" />
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Info />
                                                                    </span>
                                                                    <span>View Details</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Download />
                                                                    </span>
                                                                    <span>Download</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Trash2 />
                                                                    </span>
                                                                    <span>Delete</span>
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </div>
                                                <p className="text-truncate p-xs">Last Access: 2 hours ago</p>
                                            </Card.Footer>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-card card-border">
                                            <Card.Body className="fmapp-info-trigger" onClick={fileInfo}>
                                                <i className="ri-file-pdf-fill text-danger" />
                                            </Card.Body>
                                            <Card.Footer>
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <div className="file-name">Website_content.exl</div>
                                                        <div className="text-truncate fs-8 mb-2">21.73 MB</div>
                                                    </div>
                                                    <div className="d-flex">
                                                        <span className="file-star">
                                                            <span className="feather-icon">
                                                                <Star />
                                                            </span>
                                                        </span>
                                                        <Dropdown>
                                                            <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                                <span className="icon">
                                                                    <span className="feather-icon">
                                                                        <MoreHorizontal />
                                                                    </span>
                                                                </span>
                                                            </Dropdown.Toggle>

                                                            <Dropdown.Menu>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Eye />
                                                                    </span>
                                                                    <span>Preview</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Copy />
                                                                    </span>
                                                                    <span>Duplicate</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <SkipForward />
                                                                    </span>
                                                                    <span>Move</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <UserPlus />
                                                                    </span>
                                                                    <span>Invite</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Link2 />
                                                                    </span>
                                                                    <span>Share Link</span>
                                                                </Dropdown.Item>
                                                                <div className="dropdown-divider" />
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Info />
                                                                    </span>
                                                                    <span>View Details</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Download />
                                                                    </span>
                                                                    <span>Download</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Trash2 />
                                                                    </span>
                                                                    <span>Delete</span>
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </div>
                                                <p className="text-truncate p-xs">Last Access: 2 hours ago	</p>
                                            </Card.Footer>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-card card-border">
                                            <Card.Body className="fmapp-info-trigger" onClick={fileInfo}>
                                                <i className="ri-file-word-2-fill text-blue" />
                                            </Card.Body>
                                            <Card.Footer>
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <div className="file-name">jampack.doc</div>
                                                        <div className="text-truncate fs-8 mb-2">951 KB</div>
                                                    </div>
                                                    <div className="d-flex">
                                                        <span className="file-star">
                                                            <span className="feather-icon">
                                                                <Star />
                                                            </span>
                                                        </span>
                                                        <Dropdown>
                                                            <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                                <span className="icon">
                                                                    <span className="feather-icon">
                                                                        <MoreHorizontal />
                                                                    </span>
                                                                </span>
                                                            </Dropdown.Toggle>

                                                            <Dropdown.Menu>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Eye />
                                                                    </span>
                                                                    <span>Preview</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Copy />
                                                                    </span>
                                                                    <span>Duplicate</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <SkipForward />
                                                                    </span>
                                                                    <span>Move</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <UserPlus />
                                                                    </span>
                                                                    <span>Invite</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Link2 />
                                                                    </span>
                                                                    <span>Share Link</span>
                                                                </Dropdown.Item>
                                                                <div className="dropdown-divider" />
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Info />
                                                                    </span>
                                                                    <span>View Details</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Download />
                                                                    </span>
                                                                    <span>Download</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Trash2 />
                                                                    </span>
                                                                    <span>Delete</span>
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </div>
                                                <p className="text-truncate p-xs">Last Access: 2 hours ago</p>
                                            </Card.Footer>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-card card-border">
                                            <Card.Body className=" fmapp-info-trigger" onClick={fileInfo}>
                                                <i className="ri-folder-2-fill text-warning" />
                                            </Card.Body>
                                            <Card.Footer>
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <div className="file-name">Jampack - html - v1.0</div>
                                                        <div className="text-truncate fs-8 mb-2">1.6 GB</div>
                                                    </div>
                                                    <div className="d-flex">
                                                        <span className="file-star">
                                                            <span className="feather-icon">
                                                                <Star />
                                                            </span>
                                                        </span>
                                                        <Dropdown>
                                                            <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                                <span className="icon">
                                                                    <span className="feather-icon">
                                                                        <MoreHorizontal />
                                                                    </span>
                                                                </span>
                                                            </Dropdown.Toggle>

                                                            <Dropdown.Menu>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Eye />
                                                                    </span>
                                                                    <span>Preview</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Copy />
                                                                    </span>
                                                                    <span>Duplicate</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <SkipForward />
                                                                    </span>
                                                                    <span>Move</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <UserPlus />
                                                                    </span>
                                                                    <span>Invite</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Link2 />
                                                                    </span>
                                                                    <span>Share Link</span>
                                                                </Dropdown.Item>
                                                                <div className="dropdown-divider" />
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Info />
                                                                    </span>
                                                                    <span>View Details</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Download />
                                                                    </span>
                                                                    <span>Download</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Trash2 />
                                                                    </span>
                                                                    <span>Delete</span>
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </div>
                                                <p className="text-truncate p-xs">Last Access: 2 hours ago</p>
                                            </Card.Footer>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-card card-border">
                                            <Card.Body className=" fmapp-info-trigger" onClick={fileInfo}>
                                                <i className="ri-folder-2-fill text-warning" />
                                            </Card.Body>
                                            <Card.Footer>
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <div className="file-name">Jampack - Angular</div>
                                                        <div className="text-truncate fs-8 mb-2">2,637 KB</div>
                                                    </div>
                                                    <div className="d-flex">
                                                        <span className="file-star">
                                                            <span className="feather-icon">
                                                                <Star />
                                                            </span>
                                                        </span>
                                                        <Dropdown>
                                                            <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                                <span className="icon">
                                                                    <span className="feather-icon">
                                                                        <MoreHorizontal />
                                                                    </span>
                                                                </span>
                                                            </Dropdown.Toggle>

                                                            <Dropdown.Menu>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Eye />
                                                                    </span>
                                                                    <span>Preview</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Copy />
                                                                    </span>
                                                                    <span>Duplicate</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <SkipForward />
                                                                    </span>
                                                                    <span>Move</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <UserPlus />
                                                                    </span>
                                                                    <span>Invite</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Link2 />
                                                                    </span>
                                                                    <span>Share Link</span>
                                                                </Dropdown.Item>
                                                                <div className="dropdown-divider" />
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Info />
                                                                    </span>
                                                                    <span>View Details</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Download />
                                                                    </span>
                                                                    <span>Download</span>
                                                                </Dropdown.Item>
                                                                <Dropdown.Item>
                                                                    <span className="feather-icon dropdown-icon">
                                                                        <Trash2 />
                                                                    </span>
                                                                    <span>Delete</span>
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </div>
                                                <p className="text-truncate p-xs">Last Access: 2 hours ago</p>
                                            </Card.Footer>
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        </Card>
                    </div>
                    <div className="collapse-simple mt-4">
                        <Card>
                            <Card.Header>
                                <Link role="button" data-bs-toggle="collapse" to="#fm_collapse_2" aria-expanded="true">
                                    <h5 className="mb-0">Folders</h5>
                                </Link>
                            </Card.Header>
                            <div id="fm_collapse_2" className="collapse show">
                                <Row className="gx-3 row-cols-xxl-5 row-cols-xl-4 row-cols-lg-3 row-cols-md-2 row-cols-1 mt-4">
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-sm avatar-soft-warning">
                                                            <span className="initial-wrap"><i className="ri-folder-2-fill" /></span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">Jampack - HTML - v1.0</div>
                                                        <div className="text-truncate fs-8 mb-2">1.6 GB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star marked">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-sm avatar-soft-warning">
                                                            <span className="initial-wrap"><i className="ri-folder-2-fill" /></span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">Jampack - Angular</div>
                                                        <div className="text-truncate fs-8 mb-2">2,635 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star marked">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-sm avatar-soft-warning">
                                                            <span className="initial-wrap"><i className="ri-folder-2-fill" /></span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">Designs</div>
                                                        <div className="text-truncate fs-8 mb-2">1.48 GB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-sm avatar-soft-warning">
                                                            <span className="initial-wrap"><i className="ri-folder-2-fill" /></span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">Inspiration</div>
                                                        <div className="text-truncate fs-8 mb-2">3.5 GB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        </Card>
                    </div>
                    <div className="collapse-simple mt-4">
                        <Card>
                            <Card.Header>
                                <Link role="button" data-bs-toggle="collapse" to="#fm_collapse_3" aria-expanded="true">
                                    <h5 className="mb-0">Files</h5>
                                </Link>
                            </Card.Header>
                            <div id="fm_collapse_3" className="collapse show">
                                <Row className="gx-3 row-cols-xxl-5 row-cols-xl-4 row-cols-lg-3 row-cols-md-2 row-cols-1 mt-4">
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-soft-blue avatar-sm">
                                                            <span className="initial-wrap">
                                                                <i className="ri-file-excel-2-fill" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">Website_content.exl</div>
                                                        <div className="text-truncate fs-8 mb-2">2,635 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-soft-danger avatar-sm">
                                                            <span className="initial-wrap">
                                                                <i className="ri-file-pdf-fill" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">jampack.pdf</div>
                                                        <div className="text-truncate fs-8 mb-2">21.73 MB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star marked">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <img src={mock7} alt="user" className="d-block img-fluid h-50p" />
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">jonas-kakaroto-KIPqvvTxl</div>
                                                        <div className="text-truncate fs-8 mb-2">4,178 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-soft-blue avatar-sm">
                                                            <span className="initial-wrap">
                                                                <i className="ri-folder-zip-fill" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">jampack.zip</div>
                                                        <div className="text-truncate fs-8 mb-2">2.45 GB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-soft-light avatar-sm">
                                                            <span className="initial-wrap">
                                                                <i className="ri-keynote-fill" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">presentation.keynote</div>
                                                        <div className="text-truncate fs-8 mb-2">20 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <img src={mock5} alt="user" className="d-block img-fluid h-50p" />
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">joel-mott-LaK153ghdig</div>
                                                        <div className="text-truncate fs-8 mb-2">2,635 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-soft-blue avatar-sm">
                                                            <span className="initial-wrap">
                                                                <i className="ri-file-text-fill" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">expenses.doc</div>
                                                        <div className="text-truncate fs-8 mb-2">2,635 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-soft-blue avatar-sm">
                                                            <span className="initial-wrap">
                                                                <i className="ri-file-text-fill" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">minutes_meeting.doc</div>
                                                        <div className="text-truncate fs-8 mb-2">2,635 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col>
                                        <Card className="file-compact-card card-border">
                                            <Card.Body className=" d-flex justify-content-between">
                                                <div className="media fmapp-info-trigger" onClick={fileInfo}>
                                                    <div className="media-head me-3">
                                                        <div className="avatar avatar-icon avatar-sm avatar-soft-blue">
                                                            <span className="initial-wrap">
                                                                <i className="ri-file-word-2-fill" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="media-body">
                                                        <div className="file-name">proposal.doc</div>
                                                        <div className="text-truncate fs-8 mb-2">951 KB</div>
                                                    </div>
                                                </div>
                                                <div className="d-flex">
                                                    <span className="file-star marked">
                                                        <span className="feather-icon">
                                                            <Star />
                                                        </span>
                                                    </span>
                                                    <Dropdown>
                                                        <Dropdown.Toggle variant='flush-dark' size="xs" className="btn-icon btn-rounded flush-soft-hover flex-shrink-0 no-caret">
                                                            <span className="icon">
                                                                <span className="feather-icon">
                                                                    <MoreHorizontal />
                                                                </span>
                                                            </span>
                                                        </Dropdown.Toggle>

                                                        <Dropdown.Menu>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Eye />
                                                                </span>
                                                                <span>Preview</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Copy />
                                                                </span>
                                                                <span>Duplicate</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <SkipForward />
                                                                </span>
                                                                <span>Move</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <UserPlus />
                                                                </span>
                                                                <span>Invite</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Link2 />
                                                                </span>
                                                                <span>Share Link</span>
                                                            </Dropdown.Item>
                                                            <div className="dropdown-divider" />
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Info />
                                                                </span>
                                                                <span>View Details</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Download />
                                                                </span>
                                                                <span>Download</span>
                                                            </Dropdown.Item>
                                                            <Dropdown.Item>
                                                                <span className="feather-icon dropdown-icon">
                                                                    <Trash2 />
                                                                </span>
                                                                <span>Delete</span>
                                                            </Dropdown.Item>
                                                        </Dropdown.Menu>
                                                    </Dropdown>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>
                            </div>
                        </Card>
                    </div>
                </div>
            </SimpleBar>
        </div>
    )
}

export default FmGrid
