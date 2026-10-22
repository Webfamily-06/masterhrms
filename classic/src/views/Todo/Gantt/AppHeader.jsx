import React, { useState } from 'react';
import { Button, ButtonGroup, Dropdown, Form, InputGroup } from 'react-bootstrap';
import { ChevronDown, ChevronUp, Columns, Maximize, Minimize, Plus, Sidebar, Star } from 'react-feather';
import { toggleTopNav } from '../../../redux/action/Theme';
import { connect } from 'react-redux';
import { ganttViewMode } from '../../../redux/action/ToDo';

//Images
import avatar2 from '../../../assets/img/avatar2.jpg';
import avatar8 from '../../../assets/img/avatar8.jpg';
import avatar13 from '../../../assets/img/avatar13.jpg';
import HkTooltip from '../../../components/@hk-tooltip/HkTooltip';
import classNames from 'classnames';
import { Link } from '/src/utils/router-compat.jsx';


const AppHeader = ({ topNavCollapsed, toggleTopNav, toggleSidebar, showSidebar, ganttViewMode, vm }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fullScreen = (e) => {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);

        if (!isFullscreen) {
            document.body.requestFullscreen();
        }
        else {
            document.exitFullscreen();
        }
    }

    return (
        <header className="todo-header">
            <div className="d-flex align-items-center flex-1">
                <div className="d-flex">
                    <Link to="#" className="todoapp-title link-dark">
                        <h1>
                            Jampack
                            <span className="task-star marked">
                                <span className="feather-icon">
                                    <Star />
                                </span>
                            </span>
                        </h1>
                    </Link>
                    <div className="mx-3">
                        <InputGroup>
                            <span className="input-affix-wrapper">
                                <span className="input-prefix"><i className="ri-lock-line" /></span>
                                <Form.Select>
                                    <option value={1}>Private Board</option>
                                    <option value={2}>Public Board</option>
                                </Form.Select>
                            </span>
                        </InputGroup>
                    </div>
                </div>
            </div>
            <ButtonGroup className="d-md-inline-flex d-none" role="group" id="modes-filter">
                <Button name="modes" id="qday" variant="outline-light" onClick={() => ganttViewMode("QuarterDay")} active={vm === "QuarterDay"} >Quarter Day</Button>
                <Button name="modes" id="hday" variant="outline-light" onClick={() => ganttViewMode("Half Day")} active={vm === "Half Day"} >Half Day</Button>
                <Button name="modes" id="day" variant="outline-light" onClick={() => ganttViewMode("Day")} active={vm === "Day"}>Day</Button>
                <Button name="modes" id="week" variant="outline-light" onClick={() => ganttViewMode("Week")} active={vm === "Week"} >Week</Button>
                <Button name="modes" id="month" variant="outline-light" onClick={() => ganttViewMode("Month")} active={vm === "Month"} >Month</Button>
            </ButtonGroup>
            <div className="todo-options-wrap flex-lg-grow-1 flex-lg-shrink-1 flex-basis-0">
                <div className="d-flex ms-auto">
                    <div className="avatar-group avatar-group-overlapped d-xl-flex d-none me-3">
                        <div className="avatar avatar-rounded">
                            <HkTooltip placement="top" title="Katharine">
                                <img src={avatar8} alt="user" className="avatar-img" />
                            </HkTooltip>
                        </div>
                        <div className="avatar avatar-rounded">
                            <HkTooltip placement="top" title="Dean">
                                <img src={avatar13} alt="user" className="avatar-img" />
                            </HkTooltip>
                        </div>
                        <div className="avatar avatar-xs avatar-soft-danger avatar-rounded">
                            <HkTooltip placement="top" title="Tom">
                                <span className="initial-wrap">T</span>
                            </HkTooltip>
                        </div>
                        <div className="avatar avatar-rounded">
                            <HkTooltip placement="top" title="Morgan">
                                <img src={avatar2} alt="user" className="avatar-img" />
                            </HkTooltip>
                        </div>
                        <div className="avatar avatar-icon avatar-primary avatar-rounded">
                            <HkTooltip placement="top" title="Tooltip">
                                <span className="initial-wrap"><span className="feather-icon"><Plus /></span></span>
                            </HkTooltip>
                        </div>
                    </div>
                    <div className="v-separator  d-lg-inline-block d-none" />
                    <Dropdown>
                        <Dropdown.Toggle as="a" className="btn btn-icon btn-flush-dark flush-soft-hover no-caret active ms-0  d-lg-inline-block d-none">
                            <span className="icon">
                                <span className="feather-icon">
                                    <Columns />
                                </span>
                            </span>
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="end" className="mnw-0">
                            <Dropdown.Item>
                                <span className="feather-icon dropdown-icon me-0">
                                    <Sidebar />
                                </span>
                            </Dropdown.Item>
                            <Dropdown.Item>
                                <span className="feather-icon dropdown-icon me-0">
                                    <Columns />
                                </span>
                            </Dropdown.Item>
                            <Dropdown.Item>
                                <span className="feather-icon dropdown-icon me-0 icon-flip-y">
                                    <Sidebar />
                                </span>
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                    <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover full-screenapp" onClick={fullScreen} >
                        <span className="icon">
                            <span className="feather-icon" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-original-title="Maximize">
                                {isFullscreen ? <Minimize /> : <Maximize />}
                            </span>

                        </span>
                    </Button>
                    <Button as="a" variant="flush-dark" className="btn-icon btn-rounded flush-soft-hover hk-navbar-togglable d-sm-inline-block d-none" onClick={() => toggleTopNav(!topNavCollapsed)} >
                        <HkTooltip placement={topNavCollapsed ? "bottom" : "top"} title="Collapse" >
                            <span className="icon">
                                <span className="feather-icon">
                                    {
                                        topNavCollapsed ? <ChevronDown /> : <ChevronUp />
                                    }
                                </span>
                            </span>
                        </HkTooltip>
                    </Button>
                </div>
            </div>
            <div className={classNames("hk-sidebar-togglable", { "active": showSidebar })} onClick={toggleSidebar} />
        </header>
    )
}

const mapStateToProps = ({ theme, toDoReducer }) => {
    const { topNavCollapsed } = theme;
    const { vm } = toDoReducer;
    return { topNavCollapsed, vm }
};

export default connect(mapStateToProps, { toggleTopNav, ganttViewMode })(AppHeader);
