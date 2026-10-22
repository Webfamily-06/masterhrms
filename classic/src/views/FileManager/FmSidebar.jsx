import React, { useState } from 'react';
import { Button, Nav, Spinner } from 'react-bootstrap';
import { Archive, Book, File, FileText, Folder, HardDrive, Image, Play, Settings, Trash2, Upload, Video } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { Star } from 'tabler-icons-react';
import HkTooltip from '../../components/@hk-tooltip/HkTooltip';
import api from '../../utils/api';

const FmSidebar = () => {
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'documents');
            await api.post('/api/v1/media/upload', formData);
            window.dispatchEvent(new CustomEvent('hrms-media-uploaded'));
        } catch (err) {
            console.error('File upload error:', err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <nav className="fmapp-sidebar">
            <SimpleBar className="nicescroll-bar">
                <div className="menu-content-wrap">
                    <div className="btn btn-primary btn-rounded btn-block btn-file mb-4 position-relative">
                        {uploading ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                Upload
                                <input type="file" className="upload" onChange={handleFileUpload} />
                            </>
                        )}
                    </div>
                    <div className="menu-group">
                        <ul className="nav nav-light navbar-nav flex-column">
                            <li className="nav-item active">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <HardDrive />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">My Space</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <File />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">All Files</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <Folder />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Folders</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <Upload />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Shared</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <Star />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Starred</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <Trash2 />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Trash</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="separator separator-light" />
                    <div className="menu-group">
                        <ul className="nav nav-light navbar-nav flex-column">
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <Image />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Images</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <Video />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Videos</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <Play />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Audio</span>
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="#some">
                                    <span className="nav-icon-wrap">
                                        <span className="feather-icon">
                                            <FileText />
                                        </span>
                                    </span>
                                    <span className="nav-link-text">Documents</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </SimpleBar>
            <div className="fmapp-storage">
                <p className="p-sm">Storage is 85% full. 78.5 GB of 1 TB used. You can buy more space.</p>
                <div className="progress-lb-wrap my-2">
                    <label className="progress-label text-uppercase fs-8 fw-medium">78.5 GB of 1 TB</label>
                    <div className="progress progress-bar-rounded progress-bar-xs">
                        <div className="progress-bar bg-danger w-85" role="progressbar" aria-valuenow={25} aria-valuemin={0} aria-valuemax={100} />
                    </div>
                </div>
                <a href="#some" className="fs-7"><u>Buy Storage</u></a>
            </div>
            {/*Sidebar Fixnav*/}
            <div className="fmapp-fixednav">
                <div className="hk-toolbar">
                    <Nav className="nav-light">
                        <Nav.Item className="nav-link">
                            <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                <HkTooltip id="tooltip2" placement="top" title="Settings" >
                                    <span className="icon">
                                        <span className="feather-icon">
                                            <Settings />
                                        </span>
                                    </span>
                                </HkTooltip>
                            </Button>
                        </Nav.Item>
                        <Nav.Item className="nav-link">
                            <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                <HkTooltip id="tooltip3" placement="top" title="Archive" >
                                    <span className="icon">
                                        <span className="feather-icon">
                                            <Archive />
                                        </span>
                                    </span>
                                </HkTooltip>
                            </Button>
                        </Nav.Item>
                        <Nav.Item className="nav-link">
                            <Button variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover">
                                <HkTooltip id="tooltip2" placement="top" title="Help" >
                                    <span className="icon">
                                        <span className="feather-icon">
                                            <Book />
                                        </span>
                                    </span>
                                </HkTooltip>
                            </Button>
                        </Nav.Item>
                    </Nav>
                </div>
            </div>
            {/*/ Sidebar Fixnav*/}
        </nav>
    )
}

export default FmSidebar
