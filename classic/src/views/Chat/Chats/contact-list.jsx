import { PhoneCall } from 'react-feather';
//Images
import avatar1 from '../../../assets/img/avatar1.jpg';
import avatar2 from '../../../assets/img/avatar2.jpg';
import avatar3 from '../../../assets/img/avatar3.jpg';
import avatar7 from '../../../assets/img/avatar7.jpg';
import avatar8 from '../../../assets/img/avatar8.jpg';
import avatar9 from '../../../assets/img/avatar9.jpg';
import avatar13 from '../../../assets/img/avatar13.jpg';
import avatar15 from '../../../assets/img/avatar15.jpg';

export const contacts = [
    {
        id: 1,
        name: "Morgan Freeman",
        avatar: avatar2,
        time: "Yesterday",
        lastChat: "Please send some insights of presentation",
        status: "active",
        unread: 15,
    },
    {
        id: 2,
        name: "Huma Therman",
        avatar: avatar8,
        time: "10:25PM",
        lastChat: <>Typing<span className="one">.</span><span className="two">.</span><span className="three">.</span></>,
        status: "active",
        unread: 0,
    },
    {
        id: 3,
        name: "Charlie Chaplin",
        avatar: avatar13,
        time: "5 min",
        lastChat: "Hello mike, thank you for inviting",
        status: "",
        unread: 2,
    },
    {
        id: 4,
        name: "Winston Churchil",
        initAvatar: { title: "W", variant: "soft-danger" },
        time: "3:15 PM",
        lastChat: "Show me what reports you have left",
        status: "",
        unread: 0,
    },
    {
        id: 5,
        name: "😐 Office Board",
        avatar: avatar1,
        time: "Yesterday",
        lastChat: <>Huma: great work <span className="text-primary">@jaquiline</span> you have done a great job</>,
        status: "",
        unread: 0,
    },
    {
        id: 6,
        name: "Boss Baby",
        avatar: avatar15,
        time: "5:23 AM",
        lastChat: "Meeting in the morning",
        status: "active",
        unread: 0,
    },
    {
        id: 7,
        name: "Hencework",
        initAvatar: { title: "H", variant: "primary" },
        time: "24 Jan",
        lastChat: "give me the last copy of jampack",
        status: "",
        unread: 0,
    },
    {
        id: 8,
        name: "Jaquiline Joker",
        avatar: avatar3,
        time: "4:05 AM",
        lastChat: "This is my test chat msg last one",
        status: "active",
        unread: 37,
    },
    {
        id: 9,
        name: "Tom Cruz",
        avatar: avatar7,
        time: "7:40 PM",
        lastChat: <span className="text-danger"><span className="feather-icon fe-x me-1"><PhoneCall /> </span>Missed call</span>,
        status: "active",
        unread: 0,
    },
    {
        id: 10,
        name: "Katherine Jones",
        avatar: avatar9,
        time: "Yesterday",
        lastChat: "Hi!!! I was wondering if you are free",
        status: "",
        unread: 0,
    },
    {
        id: 11,
        name: "Danial Craig",
        initAvatar: { title: "D", variant: "soft-info" },
        time: "3:15PM",
        lastChat: "Boss is looking for you in the office",
        status: "",
        unread: 0,
    },
]