import React, { useEffect, useState, useCallback } from 'react';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';
import { ganttViewMode } from '../../../redux/action/ToDo';
import HkGantt from '../../../components/@hk-gantt/@hk-gantt';
import moment from 'moment';
import api from '../../../utils/api';

const DEFAULT_GANTT_TASKS = [
    {
        id: "task_1",
        name: "Draft the new contract document for sales team",
        start: moment().subtract(5, 'days').format('YYYY-MM-DD'),
        end: moment().add(2, 'days').format('YYYY-MM-DD'),
        progress: 55,
    }, {
        id: "task_2",
        name: "Find out the old contract documents",
        start: moment().subtract(2, 'days').format('YYYY-MM-DD'),
        end: moment().add(4, 'days').format('YYYY-MM-DD'),
        progress: 85,
        dependencies: "task_1"
    }, {
        id: "task_3",
        name: "Organize meeting with sales associates to understand need in detail",
        start: moment().add(3, 'days').format('YYYY-MM-DD'),
        end: moment().add(6, 'days').format('YYYY-MM-DD'),
        progress: 80,
        dependencies: "task_2"
    }, {
        id: "task_4",
        name: "iOS App home page",
        start: moment().subtract(7, 'days').format('YYYY-MM-DD'),
        end: moment().subtract(1, 'days').format('YYYY-MM-DD'),
        progress: 80
    }, {
        id: "task_5",
        name: "Write a release note",
        start: moment().add(1, 'days').format('YYYY-MM-DD'),
        end: moment().add(7, 'days').format('YYYY-MM-DD'),
        progress: 65,
        dependencies: "task_4"
    }, {
        id: "task_6",
        name: "Setup new sales project",
        start: moment().subtract(3, 'days').format('YYYY-MM-DD'),
        end: moment().add(12, 'days').format('YYYY-MM-DD'),
        progress: 25
    }, {
        id: "task_7",
        name: "Invite user to a project",
        start: moment().add(8, 'days').format('YYYY-MM-DD'),
        end: moment().add(14, 'days').format('YYYY-MM-DD'),
        progress: 40,
        dependencies: "task_6"
    }
];

const GanttChart = ({ ganttViewMode, vm }) => {
    const [tasks, setTasks] = useState(() => {
        try {
            const saved = localStorage.getItem("hrms_gantt_tasks");
            if (saved) return JSON.parse(saved);
        } catch {}
        return DEFAULT_GANTT_TASKS;
    });

    // Load server tasks if available
    useEffect(() => {
        let isMounted = true;
        api.get('/api/projects')
            .then(res => {
                if (isMounted && res?.tasks && Array.isArray(res.tasks) && res.tasks.length > 0) {
                    const serverMapped = res.tasks.map((t, idx) => {
                        const start = t.createdAt ? moment(t.createdAt).format('YYYY-MM-DD') : moment().subtract(idx + 1, 'days').format('YYYY-MM-DD');
                        const end = t.dueDate ? moment(t.dueDate).format('YYYY-MM-DD') : moment(start).add(5, 'days').format('YYYY-MM-DD');
                        return {
                            id: t.id,
                            name: t.title || "Project Task",
                            start: moment(start).isBefore(end) ? start : moment(end).subtract(3, 'days').format('YYYY-MM-DD'),
                            end: end,
                            progress: t.status === "done" ? 100 : t.status === "in_progress" ? 50 : 15,
                        };
                    });
                    setTasks(serverMapped);
                }
            })
            .catch(() => {});
        return () => { isMounted = false; };
    }, []);

    // Persist tasks locally on changes
    useEffect(() => {
        try {
            localStorage.setItem("hrms_gantt_tasks", JSON.stringify(tasks));
        } catch {}
    }, [tasks]);

    // 👇️ scroll to viewPort every time messages change
    useEffect(() => {
        const element = document.querySelector('#split_2 .simplebar-content-wrapper');
        if (element) {
            element.scrollTo({ left: 300, behavior: "smooth" });
        }
    }, [tasks]);

    const handleDateChange = useCallback((task, start, end) => {
        const startDate = moment(start).format('YYYY-MM-DD');
        const endDate = moment(end).format('YYYY-MM-DD');

        setTasks(prev => {
            const updated = prev.map(t => t.id === task.id ? { ...t, start: startDate, end: endDate } : t);
            try {
                localStorage.setItem("hrms_gantt_tasks", JSON.stringify(updated));
            } catch {}
            return updated;
        });

        // Persist to backend if server task
        if (task.id && !task.id.startsWith("task_")) {
            api.put(`/api/projects/tasks/${task.id}`, { dueDate: moment(end).toISOString() }).catch(() => {});
        }
    }, []);

    const handleProgressChange = useCallback((task, progress) => {
        setTasks(prev => {
            const updated = prev.map(t => t.id === task.id ? { ...t, progress } : t);
            try {
                localStorage.setItem("hrms_gantt_tasks", JSON.stringify(updated));
            } catch {}
            return updated;
        });

        // Persist status change to backend if server task
        if (task.id && !task.id.startsWith("task_")) {
            const status = progress >= 100 ? "done" : progress > 0 ? "in_progress" : "todo";
            api.put(`/api/projects/tasks/${task.id}`, { status }).catch(() => {});
        }
    }, []);

    return (
        <SimpleBar autoHide={false} style={{ maxHeight: "100vh" }} className="split" id="split_2" >
            <div className="gantt-wrap">
                <span className="gantt-container" >
                    <span className="gantt">
                        <HkGantt
                            tasks={tasks}
                            viewMode={vm}
                            onProgressChange={handleProgressChange}
                            onDateChange={handleDateChange}
                        />
                    </span>
                </span>
            </div>
        </SimpleBar>
    );
};

const mapStateToProps = ({ toDoReducer }) => {
    const { vm } = toDoReducer;
    return { vm }
};

export default connect(mapStateToProps, { ganttViewMode })(GanttChart);
