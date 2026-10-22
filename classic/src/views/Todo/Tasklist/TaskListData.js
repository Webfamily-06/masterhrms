import { nanoid } from "nanoid";
//Images
import avatar2 from '../../../assets/img/avatar2.jpg';
import avatar7 from '../../../assets/img/avatar7.jpg';
import avatar9 from '../../../assets/img/avatar9.jpg';
import avatar10 from '../../../assets/img/avatar10.jpg';
import avatar13 from '../../../assets/img/avatar13.jpg';
import avatar15 from '../../../assets/img/avatar15.jpg';

export const TaskListData = [
    {
        id: nanoid(),
        task_group: "Recently Assigned",
        tasks: [
            {
                id: nanoid(),
                checked: false,
                stared: true,
                task_name: "Video conference with Canada Team",
                priority: "High",
                indicator: "danger",
                task_time: [{ time: "Tomorrow", text: "primary" }],
                img: avatar7,
                badge: [{ text: "Calls", bg: "primary" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Client objective meeting",
                priority: "High",
                indicator: "warning",
                task_time: [{ time: "Yesterday", text: "danger" }],
                img: avatar9,
                badge: [{ text: "Conferences", bg: "violet" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Target market trend analysis on the go",
                indicator: "danger",
                task_time: [{ time: "Today", text: "primary" }],
                img: avatar7,
                badge: [{ text: "Meetings", bg: "pink" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: true,
                task_name: "Send revised proposal to Mr. Dow Jones",
                priority: "Low",
                indicator: "gold",
                task_time: [{ time: "Saturday", text: "" }],
                img: avatar10,
                badge: [{ text: "Project", bg: "orange" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Set up first call for demo",
                indicator: "warning",
                task_time: [{ time: "Sunday", text: "" }],
                init_avt: [{ text: "H", bg: "primary" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: true,
                task_name: "Upgrade dependency on resouces",
                priority: "Medium",
                indicator: "danger",
                task_time: [{ time: "27 Nov, 2020", text: "" }],
                img: avatar15,
                badge: [{ text: "Calls", bg: "primary" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Update contribution guidelines and licence",
                indicator: "danger",
                task_time: [{ time: "Today", text: "primary" }],
                img: avatar15,
                badge: [{ text: "Meetings", bg: "pink" }],
            },
        ]
    },
    {
        id: nanoid(),
        task_group: "Yesterday",
        tasks: [
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Fix tooltip word wrap/break rules",
                priority: "High",
                indicator: "warning",
                task_time: [{ time: "4 Days ago", text: "danger" }],
                img: avatar2,
                badge: [{ text: "Project", bg: "warning" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Redesigning the base model",
                priority: "Urgent",
                indicator: "warning",
                task_time: [{ time: "2 Aug, 2020", text: "" }],
                img: avatar13,
            },
            {
                id: nanoid(),
                checked: false,
                stared: true,
                task_name: "Configure security analysis feature",
                priority: "Medium",
                indicator: "gold",
                task_time: [{ time: "8 Aug, 2020", text: "" }],
                img: avatar7,
                badge: [{ text: "Calls", bg: "primary" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Remove notifications panel from inbox",
                priority: "Urgent",
                indicator: "danger",
                task_time: [{ time: "24 Sep, 2020", text: "" }],
                img: avatar15,
                badge: [{ text: "Meetings", bg: "pink" }],
            },

        ]
    },
    {
        id: nanoid(),
        task_group: "15 July, 20",
        tasks: [
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Send an invite to join project",
                priority: "Low",
                indicator: "warning",
                task_time: [{ time: "Yesterday", text: "danger" }],
                img: avatar7,
                badge: [{ text: "Project", bg: "warning" }],
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Connect to software tools",
                priority: "High",
                indicator: "danger",
                task_time: [{ time: "Saturday", text: "" }],
                img: avatar10,
            },
            {
                id: nanoid(),
                checked: false,
                stared: false,
                task_name: "Speed up project review with planner",
                priority: "High",
                indicator: "danger",
                task_time: [{ time: "15 Oct, 2020", text: "" }],
                img: avatar9,
                badge: [{ text: "Calls", bg: "primary" }],
            },


        ]
    }
]