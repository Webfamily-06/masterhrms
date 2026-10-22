import React from 'react';
import SimpleBar from 'simplebar-react';
import { Star } from 'react-feather';
import { Card, Col } from 'react-bootstrap';
import { Link } from '/src/utils/router-compat.jsx';
import LightGallery from 'lightgallery/react';
import classNames from 'classnames';
// import plugins for lightgallary
import lgFullscreen from 'lightgallery/plugins/fullscreen';
import lgAutoplay from 'lightgallery/plugins/autoplay';
import lgZoom from 'lightgallery/plugins/zoom';
import lgShare from 'lightgallery/plugins/share';
import lgComment from 'lightgallery/plugins/comment';
import lgVideo from 'lightgallery/plugins/video';
// import styles
import 'lightgallery/css/lightgallery-bundle.min.css';

//Image
import mock1 from '../../assets/img/gallery/mock1.jpg';
import mock2 from '../../assets/img/gallery/mock2.jpg';
import mock3 from '../../assets/img/gallery/mock3.jpg';
import mock4 from '../../assets/img/gallery/mock4.jpg';
import mock5 from '../../assets/img/gallery/mock5.jpg';
import mock6 from '../../assets/img/gallery/mock6.jpg';
import mock7 from '../../assets/img/gallery/mock7.jpg';
import mock8 from '../../assets/img/gallery/mock8.jpg';
import mock9 from '../../assets/img/gallery/mock9.jpg';
import mock10 from '../../assets/img/gallery/mock10.jpg';
import mock11 from '../../assets/img/gallery/mock11.jpg';
import mock12 from '../../assets/img/gallery/mock12.jpg';
import mock13 from '../../assets/img/gallery/mock13.jpg';
import mock14 from '../../assets/img/gallery/mock14.jpg';
import mock15 from '../../assets/img/gallery/mock15.jpg';

const GalleryBody = () => {

    return (
        <div className={classNames("gallery-body")}>
            <SimpleBar className="nicescroll-bar">
                <div className="collapse-simple">
                    <Card className="card-border">
                        <Card.Header>
                            <Link role="button" data-bs-toggle="collapse" to="#gal_collapse_1" aria-expanded="true">
                                <h5 className="mb-0">Recently Assigned</h5>
                            </Link>
                        </Card.Header>
                        <div id="gal_collapse_1" className="collapse show">
                            <Card.Body>
                                <LightGallery
                                    elementClassNames="row gx-3 row-cols-xxl-6 row-cols-xl-5 row-cols-lg-3 row-cols-md-2 row-cols-1 hk-gallery"
                                    speed={500}
                                    mode='lg-fade'
                                    plugins={[lgFullscreen, lgAutoplay, lgZoom, lgShare, lgComment, lgVideo]}
                                    thumbnail={false}
                                    subHtmlSelectorRelative={true}
                                    defaultCaptionHeight="100%"

                                >
                                    <Col data-src={mock1}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock1})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock2} >
                                        <Link to="#" >
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock2})` }} >
                                            </Card>
                                            <span className="gallery-star">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock3}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock3})` }} >
                                            </Card>
                                            <span className="gallery-star">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock4} >
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock4})` }} >
                                            </Card>
                                            <span className="gallery-star">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock5}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock5})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src="https://www.youtube.com/watch?v=BvXR97eR1QE" data-poster={mock6}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img gallery-video" style={{ backgroundImage: `url(${mock6})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                </LightGallery>
                            </Card.Body>
                        </div>
                    </Card>
                </div>
                <div className="collapse-simple">
                    <Card className="card-border">
                        <Card.Header>
                            <Link role="button" data-bs-toggle="collapse" to="#gal_collapse_2" aria-expanded="true">
                                <h5 className="mb-0">November 20</h5>
                            </Link>
                        </Card.Header>
                        <div id="gal_collapse_2" className="collapse show">
                            <Card.Body>
                                <LightGallery
                                    elementClassNames="row gx-3 row-cols-xxl-6 row-cols-xl-5 row-cols-lg-3 row-cols-md-2 row-cols-1 hk-gallery"
                                    speed={500}
                                    mode='lg-fade'
                                    plugins={[lgFullscreen, lgAutoplay, lgZoom, lgShare, lgComment, lgVideo]}
                                    thumbnail={false}
                                    subHtmlSelectorRelative={true}

                                >
                                    <Col data-src={mock6}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock6})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock7}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock7})` }} >
                                            </Card>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock8}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock8})` }} >
                                            </Card>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock9}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock9})` }} >
                                            </Card>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock10}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock10})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src="https://www.youtube.com/watch?v=BvXR97eR1QE" data-poster={mock1}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img gallery-video" style={{ backgroundImage: `url(${mock1})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                </LightGallery>
                            </Card.Body>
                        </div>
                    </Card>
                </div>
                <div className="collapse-simple">
                    <Card className="card-border">
                        <Card.Header>
                            <Link role="button" data-bs-toggle="collapse" to="#gal_collapse_3" aria-expanded="true">
                                <h5 className="mb-0">October 20</h5>
                            </Link>
                        </Card.Header>
                        <div id="gal_collapse_3" className="collapse show">
                            <Card.Body>
                                <LightGallery
                                    elementClassNames="row gx-3 row-cols-xxl-6 row-cols-xl-5 row-cols-lg-3 row-cols-md-2 row-cols-1 hk-gallery"
                                    speed={500}
                                    mode='lg-fade'
                                    plugins={[lgFullscreen, lgAutoplay, lgZoom, lgShare, lgComment, lgVideo]}
                                    thumbnail={false}
                                    subHtmlSelectorRelative={true}

                                >
                                    <Col data-src={mock11}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock11})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock12}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock12})` }} >
                                            </Card>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock13}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock13})` }} >
                                            </Card>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock14}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock14})` }} >
                                            </Card>
                                        </Link>
                                    </Col>
                                    <Col data-src={mock15}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img" style={{ backgroundImage: `url(${mock15})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                    <Col data-src="https://www.youtube.com/watch?v=BvXR97eR1QE" data-poster={mock12}>
                                        <Link to="#">
                                            <Card className="card-border gallery-img gallery-video" style={{ backgroundImage: `url(${mock12})` }} >
                                            </Card>
                                            <span className="gallery-star marked">
                                                <span className="feather-icon">
                                                    <Star />
                                                </span>
                                            </span>
                                        </Link>
                                    </Col>
                                </LightGallery>
                            </Card.Body>
                        </div>
                    </Card>
                </div>
            </SimpleBar >
        </div >
    )
}

export default GalleryBody
