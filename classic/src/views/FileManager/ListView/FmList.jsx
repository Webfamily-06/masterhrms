import React, { useState, useEffect, useCallback } from 'react';
import { Nav, Tab, } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import HkDataTable from '../../../components/@hk-data-table';
import { columns, data as defaultData } from './TableData';
import api from '../../../utils/api';

const FmList = ({ toggleInfo }) => {
    const [fileList, setFileList] = useState(defaultData);

    const fetchMedia = useCallback(async () => {
        try {
            const res = await api.get('/api/v1/media');
            const items = Array.isArray(res) ? res : res.data;
            if (Array.isArray(items) && items.length > 0) {
                const mapped = items.map((item) => ({
                    id: item.id,
                    starred: Boolean(item.tags?.includes('starred')),
                    name: [{
                        icons: item.mimeType?.includes('image') ? 'image-fill' : item.mimeType?.includes('pdf') ? 'file-pdf-fill' : 'file-text-fill',
                        iconBg: item.mimeType?.includes('image') ? 'success' : item.mimeType?.includes('pdf') ? 'danger' : 'blue',
                        img: item.mimeType?.startsWith('image/') ? item.url : null,
                        fileName: item.originalName || item.filename || 'Uploaded File',
                        fileType: item.mimeType?.split('/')[1] || 'document'
                    }],
                    sharing: [{ intAvt: 'ME', initAvtBg: 'primary', userName: 'Owner' }],
                    modified: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Today',
                    size: item.sizeBytes ? `${(item.sizeBytes / 1024).toFixed(1)} KB` : '15 KB',
                    actions: [{ preview: item.url || '#' }]
                }));
                setFileList([...mapped, ...defaultData]);
            }
        } catch (err) {
            console.warn('Could not fetch media list, using default data:', err.message);
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
                <div className="file-list-view">
                    <Tab.Container defaultActiveKey="cloud_doc" >
                        <Nav as="ul" variant="tabs" className="nav-line nav-icon nav-light">
                            <Nav.Item as="li">
                                <Nav.Link eventKey="cloud_doc">
                                    <span className="nav-link-text">Cloud Documents</span>
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item as="li">
                                <Nav.Link>
                                    <span className="nav-link-text">Shared with me</span>
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>
                        <Tab.Content>
                            <Tab.Pane eventKey="cloud_doc">
                                <HkDataTable
                                    column={columns}
                                    rowData={fileList}
                                    rowSelection={true}
                                    markStarred={true}
                                    classes="nowrap w-100 mb-5"
                                    responsive
                                />
                            </Tab.Pane>
                        </Tab.Content>
                    </Tab.Container>
                </div>
            </SimpleBar>
        </div>
    )
}

export default FmList;
