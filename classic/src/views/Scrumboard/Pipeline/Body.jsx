import React, { useEffect, useState } from 'react';
import PerfectScrollbar from 'react-perfect-scrollbar';
import 'react-perfect-scrollbar/dist/css/styles.css';
import { Button, Card, Col, Form, Modal, Row } from 'react-bootstrap';
import { Plus } from 'react-feather';
import { DATASET } from './Data';
import { nanoid } from 'nanoid';
import DragDropCard from './DragDropCard';
import PipelineHeader from './PipelineHeader';
import api from '../../../utils/api';

const PipelineBody = () => {

    const [dataset, setDataset] = useState(() => {
        try {
            const savedDataset = localStorage.getItem("pipeline-board") || sessionStorage.getItem("pipeline-board");
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

    // Load shared pipeline state from database
    useEffect(() => {
        let isMounted = true;
        api.get('/api/projects/pipeline-state')
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

    useEffect(() => {
        try {
            localStorage.setItem("pipeline-board", JSON.stringify({ tasks, cards, cardOrder }));
        } catch {}
        // Debounce sync to database
        const timer = setTimeout(() => {
            api.put('/api/projects/pipeline-state', { state: { tasks, cards, cardOrder } }).catch(() => {});
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
            <PipelineHeader addNewDeal={() => setAddNewBoard(!addNewBoard)} />
            <div className="taskboard-body taskboard-body-alt">
                <div>
                    <PerfectScrollbar className="tasklist-scroll position-relative">
                        {/* <div id="tasklist_wrap" className="tasklist-wrap"> */}
                        <div id="tasklist_wrap" className="tasklist-wrap">
                            <DragDropCard
                                cards={cards}
                                tasks={tasks}
                                cardOrder={cardOrder}
                                setCards={setCards}
                                setTasks={setTasks}
                                setCardOrder={setCardOrder}
                            />

                            <Card className="card-simple card-border spipeline-list create-new-list">
                                <Card.Header className="card-header-action">
                                    <Button variant="light" className="btn-block bg-transparent border-0 text-primary" onClick={() => setAddNewBoard(!addNewBoard)}>
                                        <span>
                                            <span className="icon">
                                                <span className="feather-icon">
                                                    <Plus />
                                                </span>
                                            </span>
                                            <span className="btn-text">Add New List</span>
                                        </span>
                                    </Button>
                                </Card.Header>
                            </Card>
                        </div>
                        {/* </div> */}
                    </PerfectScrollbar>
                </div>
            </div>

            <Modal Modal show={addNewBoard} onHide={() => setAddNewBoard(!addNewBoard)} size="sm" centered >
                {/* <div className="modal-dialog modal-dialog-centered modal-sm" role="document"> */}
                <div className="modal-content">
                    <Modal.Body>
                        <Button bsPrefix="btn-close" onClick={() => setAddNewBoard(!addNewBoard)} >
                            <span aria-hidden="true">×</span>
                        </Button>
                        <h5 className="mb-4">Add New List</h5>
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
                    <div className="modal-footer align-items-center">
                        <Button variant="secondary" onClick={() => setAddNewBoard(!addNewBoard)} >Cancel</Button>
                        <Button variant="primary" className="btn-add-tasklist" onClick={onAddNewCard} >Add</Button>
                    </div>
                </div>
                {/* </div> */}
            </Modal >
        </>
    )
}

export default PipelineBody
