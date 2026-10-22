import { DIRECT_MSG, SEND_MSG } from "../constants/ChatPopup";

const initialState = {
    msg: [
        { text: "I have a plan regarding pricing", types: "sent" },
        { text: "Welcome back! Are you looking to upgrade your existing plan?", types: "received" }
    ],
    directMsgs: [],
};

const ChatPopupReducer = (state = initialState, action) => {
    switch (action.type) {
        case SEND_MSG:
            return {
                ...state,
                msg: [...state.msg, action.msg]
            };
        case DIRECT_MSG:
            return {
                ...state,
                directMsgs: [...state.directMsgs, action.directMsgs]
            };
        default:
            return state;
    }
};

export default ChatPopupReducer;