import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Card } from 'react-bootstrap';
import Task from './Task';
import { Link } from '/src/utils/router-compat.jsx';

const Board = (props) => {
    return (
        <div className="collapse-simple mt-4">
            <Card>
                <Card.Header>
                    <Link role="button" data-bs-toggle="collapse" to={`#${props.card.id}`} aria-expanded="true">
                        <h5 className="mb-0">{props.card.title}</h5>
                    </Link>
                </Card.Header>
                <div id={props.card.id} className="collapse show">
                    <Droppable droppableId={props.card.id} type="task">
                        {(provided, snapshot) => (
                            <Card.Body
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                <ul className="advance-list">
                                    {props.tasks.map((task, index) => (
                                        <Task
                                            key={task.id}
                                            task={task}
                                            index={index}
                                            cardId={props.card.id}
                                            onRemoveTask={props.onRemoveTask}
                                            taskInfo={props.taskInfo}
                                        />

                                    ))}

                                    {provided.placeholder}
                                </ul>
                            </Card.Body>
                        )}
                    </Droppable>
                </div>
            </Card>
        </div>
    )
}

export default Board
