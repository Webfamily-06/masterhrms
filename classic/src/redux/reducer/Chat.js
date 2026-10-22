import { START_CHATING, SENT_MSG, REPLY_MSG, GROUP_MSG, CONTACT_MSG, SET_USER } from "../constants/Chat";
//images
import avatar8 from '../../assets/img/avatar8.jpg';

const initialState = {
    startChating: false,
    avatar: avatar8,
    userId: 2,
    userName: "Huma Therman",
    msg: [],
    grpMsg: [],
    contactMsg: [],
    rplyMsg: [],
};

const ChatReducer = (state = initialState, action) => {
    switch (action.type) {
        case START_CHATING:
            return {
                ...state,
                startChating: action.startChating
            };
        case SENT_MSG:
            return {
                ...state,
                msg: [...state.msg, action.msg]
            };
        case SET_USER:
            return {
                ...state,
                userId: action.userId,
                avatar: action.avatar,
                userName: action.userName,

            };
        case GROUP_MSG:
            return {
                ...state,
                grpMsg: [...state.grpMsg, action.grpMsg]
            };
        case CONTACT_MSG:
            return {
                ...state,
                contactMsg: [...state.contactMsg, action.contactMsg]
            };
        case REPLY_MSG:
            return {
                ...state,
                rplyMsg: [...state.rplyMsg, action.rplyMsg]
            };
        default:
            return state;
    }
};

export default ChatReducer;