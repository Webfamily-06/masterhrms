import React, { useEffect, useState } from 'react'
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { DATASET } from './KanbanDatas';
import DragDropCards from './DragDropCards';
import { nanoid } from 'nanoid';
import { api } from '../../../utils/api';

const Board = () => {
    const [dataset, setDataset] = useState(() => {
        try {
            const savedDataset = localStorage.getItem("kanban-board") || sessionStorage.getItem("kanban-board");
            return savedDataset ? JSON.parse(savedDataset) : DATASET;
        } catch {
            return DATASET;
        }
    });

    const [tasks, setTasks] = useState(dataset.tasks);
    const [cards, setCards] = useState(dataset.cards);
    const [cardOrder, setCardOrder] = useState(dataset.cardOrder);

    const [addNewBoard, setAddNewBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState("");

    // Load shared board state from database if available
    useEffect(() => {
        let isMounted = true;
        api.get('/api/projects/kanban-state')
            .then(res => {
                if (isMounted && res?.state) {
                    const st = typeof res.state === 'string' ? JSON.parse(res.state) : res.state;
                    if (st.tasks) setTasks(st.tasks);
                    if (st.cards) setCards(st.cards);
                    if (st.cardOrder) setCardOrder(st.cardOrder);
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

    // Load live tasks from server if available
    useEffect(() => {
        let isMounted = true;
        api.get('/api/projects')
            .then(res => {
                if (isMounted && res?.tasks && Array.isArray(res.tasks) && res.tasks.length > 0) {
                    const serverTasks = {};
                    const todoIds = [];
                    const inProgIds = [];
                    const doneIds = [];

                    res.tasks.forEach(t => {
                        const taskId = t.id;
                        serverTasks[taskId] = {
                            id: taskId,
                            Task_Name: t.title,
                            Description: t.description || "",
                            Footer_Text: t.dueDate || "Due soon",
                            Priority: t.priority === "high" ? "High" : t.priority === "low" ? "Low" : "Medium",
                            Progress: t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 10,
                            Progress_Text: t.status === "done" ? "Completed" : t.status === "in_progress" ? "In Progress" : "Pending",
                        };
                        if (t.status === "done" || t.status === "completed") {
                            doneIds.push(taskId);
                        } else if (t.status === "in_progress") {
                            inProgIds.push(taskId);
                        } else {
                            todoIds.push(taskId);
                        }
                    });

                    setTasks(prev => ({ ...prev, ...serverTasks }));
                    setCards(prevCards => {
                        const updated = { ...prevCards };
                        if (updated['card-1']) updated['card-1'] = { ...updated['card-1'], taskIds: Array.from(new Set([...updated['card-1'].taskIds, ...todoIds])) };
                        if (updated['card-2']) updated['card-2'] = { ...updated['card-2'], taskIds: Array.from(new Set([...updated['card-2'].taskIds, ...inProgIds])) };
                        if (updated['card-3']) updated['card-3'] = { ...updated['card-3'], taskIds: Array.from(new Set([...updated['card-3'].taskIds, ...doneIds])) };
                        return updated;
                    });
                }
            })
            .catch(err => console.warn('Could not load projects for Kanban:', err.message));
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("kanban-board", JSON.stringify({ tasks, cards, cardOrder }));
        } catch {}
        // Debounce sync to backend database
        const timer = setTimeout(() => {
            api.put('/api/projects/kanban-state', { state: { tasks, cards, cardOrder } }).catch(() => {});
        }, 800);
        return () => clearTimeout(timer);
    }, [tasks, cards, cardOrder]);

    const onAddNewCard = () => {
        const newCard = {
            id: "card-" + nanoid(),
            title: newBoardName,
            taskIds: []
        };
        const newCardOrder = Array.from(cardOrder);
        newCardOrder.push(newCard.id);
        setCards({
            ...cards,
            [newCard.id]: newCard
        });
        setCardOrder(newCardOrder);
        setNewBoardName("")
        setAddNewBoard(false);
    };


    return (
        <>
            <div className="taskboard-body">
                <div>
                    <div className="taskbar-toolbar">
                        <div className="d-flex align-items-center flex-grow-1 flex-lg-grow-0">
                            <Button variant="soft-primary" className="flex-shrink-0 btn-add-newlist me-4" onClick={() => setAddNewBoard(!addNewBoard)} >Create New</Button>
                            <Form.Check
                                type="switch"
                                id="custom-switch"
                                label="Show description"
                                className="ms-auto"
                                defaultChecked
                            />
                        </div>
                        <Form role="search" className="d-lg-flex d-none">
                            <Form.Control type="text" placeholder="Search in conversation" />
                        </Form>
                    </div>
                    <PerfectScrollbar className="tasklist-scroll position-relative">
                        <div id="tasklist_wrap">
                            <DragDropCards
                                cards={cards}
                                tasks={tasks}
                                cardOrder={cardOrder}
                                setCards={setCards}
                                setTasks={setTasks}
                                setCardOrder={setCardOrder}
                            />
                        </div>
                        <div className="card card-simple card-border tasklist add-new-task">
                            <Button variant="soft-primary" className="btn-add-newlist flex-shrink-0" onClick={() => setAddNewBoard(!addNewBoard)} >Add New List</Button>
                        </div>
                    </PerfectScrollbar>
                </div>
            </div>

            {/* Add New Board */}
            <Modal show={addNewBoard} onHide={() => setAddNewBoard(!addNewBoard)} size="sm" centered className="add-tasklist-modal">
                <Modal.Body>
                    <Button bsPrefix="btn-close" onClick={() => setAddNewBoard(!addNewBoard)} >
                        <span aria-hidden="true">×</span>
                    </Button>
                    <h5 className="mb-4">Add Task List</h5>
                    <Form>
                        <Row className="gx-3">
                            <Col sm={12}>
                                <Form.Group>
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control type="text" value={newBoardName} onChange={e => setNewBoardName(e.target.value)} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer className="align-items-center">
                    <Button variant="secondary" onClick={() => setAddNewBoard(!addNewBoard)} >Cancel</Button>
                    <Button variant="primary" className="btn-add-Board" onClick={onAddNewCard}>Add</Button>
                </Modal.Footer>
            </Modal>
        </>
    )
}

export default Board
