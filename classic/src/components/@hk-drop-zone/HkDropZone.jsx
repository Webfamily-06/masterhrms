import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Image } from 'react-bootstrap';
import { Row, Col } from 'react-bootstrap';
import { Upload } from 'react-feather';

const HkFileInput = ({ children, className }) => {
    const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/gif': ['.gif'],
        },
        maxFiles: 1,
    });

    return (
        <div {...getRootProps()} className={`dropzone ${className}`}>
            <input {...getInputProps()} />
            {acceptedFiles.length > 0 ? (
                acceptedFiles.map((file) => (
                    <div key={file.name} className="dz-preview dz-file-preview">
                        <Image
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            fluid
                            roundedCircle
                        />
                    </div>
                ))
            ) : (
                <span className="dz-default dz-message">
                    <Row className="text-muted mb-2">
                        <Col><Upload /> </Col>
                    </Row>
                    <Row>
                        <Col>{children || 'Drop Files (Custom Preview)'}</Col>
                    </Row>
                </span>
            )}
        </div>
    );
};

export default HkFileInput;
