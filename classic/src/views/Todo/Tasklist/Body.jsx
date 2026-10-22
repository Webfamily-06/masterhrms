import React, { useEffect, useState, useCallback } from 'react';
import SimpleBar from 'simplebar-react';
import { Col, Container, Form, Pagination, Row } from 'react-bootstrap';
import { DATASET } from './Data';
import DragCard from './DragCard';
import api from '../../../utils/api';

const Body = ({ showInfo }) => {

    const [dataset, setDataset] = useState(() => {
        try {
            const savedDataset = localStorage.getItem("todo-task-list");
            if (savedDataset) {
                return JSON.parse(savedDataset);
            }
        } catch (e) {
            console.error("Failed to parse saved todo dataset", e);
        }
        return DATASET;
    });

    const [tasks, setTasks] = useState(dataset.tasks);
    const [cards, setCards] = useState(dataset.cards);
    const [cardOrder, setCardOrder] = useState(dataset.cardOrder);

    // Fetch todos from API and merge
    const loadServerTodos = useCallback(async () => {
        try {
            const res = await api.get('/api/todos');
            const serverTodos = res.data || (Array.isArray(res) ? res : []);
            if (Array.isArray(serverTodos) && serverTodos.length > 0) {
                setTasks(prevTasks => {
                    const updated = { ...prevTasks };
                    serverTodos.forEach(item => {
                        const key = `server-${item.id}`;
                        updated[key] = {
                            id: key,
                            checked: Boolean(item.completed),
                            stared: false,
                            task_name: item.title,
                            priority: item.priority ? (item.priority.charAt(0).toUpperCase() + item.priority.slice(1)) : 'Medium',
                            indicator: item.priority === 'high' ? 'danger' : item.priority === 'low' ? 'gold' : 'warning',
                            task_time: [{ time: item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'Active', text: 'primary' }],
                            badge: [{ text: item.tag || 'Work', bg: 'primary' }]
                        };
                    });
                    return updated;
                });
            }
        } catch (err) {
            console.warn('Could not load server todos:', err.message);
        }
    }, []);

    useEffect(() => {
        loadServerTodos();
    }, [loadServerTodos]);

    useEffect(() => {
        try {
            localStorage.setItem(
                "todo-task-list",
                JSON.stringify({ tasks, cards, cardOrder })
            );
        } catch (e) {
            console.error("Failed to save todo dataset to localStorage", e);
        }
    }, [tasks, cards, cardOrder]);


    return (
        <div className="todo-body">
            <SimpleBar className="nicescroll-bar">
                <Container>
                    <div className="todo-toolbar">
                        <div>
                            <Form.Select size="sm" >
                                <option value={0}>Bulk actions</option>
                                <option value={1}>One</option>
                                <option value={2}>Two</option>
                                <option value={3}>Three</option>
                            </Form.Select>
                            <button className="btn btn-sm btn-light ms-2">Apply</button>
                            <Form.Select size="sm" className="d-xxl-inline-block d-none mx-2">
                                <option value={0}>Sort by date</option>
                                <option value={1}>Sort By Time</option>
                                <option value={2}>Sort By Category</option>
                                <option value={3}>Sort By Priority</option>
                                <option value={4}>Sort By Title</option>
                                <option value={5}>Sort By Assignee</option>
                            </Form.Select>
                        </div>
                        <div>
                            <div className="paging-info d-xxl-inline-block d-none">1 - 10 of 30</div>
                            <Pagination className="custom-pagination pagination-simple m-0 ms-3">
                                <Pagination.Prev disabled >
                                    <i className="ri-arrow-left-s-line" />
                                </Pagination.Prev>
                                <Pagination.Item className="paginate_button">1</Pagination.Item>
                                <Pagination.Item className="paginate_button">2</Pagination.Item>
                                <Pagination.Next className="paginate_button">
                                    <i className="ri-arrow-right-s-line" />
                                </Pagination.Next>
                            </Pagination>
                        </div>
                    </div>

                    <DragCard
                        cards={cards}
                        tasks={tasks}
                        cardOrder={cardOrder}
                        setCards={setCards}
                        setTasks={setTasks}
                        setCardOrder={setCardOrder}
                        taskInfo={showInfo}
                    />

                    <Row className="mt-3">
                        <Col sm={12}>
                            <div className="float-end text-end">
                                <Pagination className="custom-pagination pagination-simple active-theme">
                                    <Pagination.Prev disabled>
                                        <i className="ri-arrow-left-s-line" />
                                    </Pagination.Prev>
                                    <Pagination.Item active>
                                        1
                                    </Pagination.Item>
                                    <Pagination.Item>
                                        2
                                    </Pagination.Item>
                                    <Pagination.Item>
                                        3
                                    </Pagination.Item>
                                    <Pagination.Next>
                                        <i className="ri-arrow-right-s-line" />
                                    </Pagination.Next>
                                </Pagination>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </SimpleBar>
        </div >
    )
}

export default Body
