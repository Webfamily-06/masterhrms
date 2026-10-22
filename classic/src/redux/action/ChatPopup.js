import { DIRECT_MSG, SEND_MSG } from "../constants/ChatPopup";

export function sendMsg(msg) {
    return {
        type: SEND_MSG,
        msg,
    }
}

export function DirectMsg(directMsgs) {
    return {
        type: DIRECT_MSG,
        directMsgs,
    }
}