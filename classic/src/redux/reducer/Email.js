import { COMPOSE_EMAIL, MAXIMIZE_COMPOSE_MODAL, MINIMIZE_COMPOSE_MODAL } from "../constants/Email";

const initialState = {
    composeEmail: false,
    maximize: false,
    minimize: false,
};

const EmailReducer = (state = initialState, action) => {
    switch (action.type) {
        case COMPOSE_EMAIL:
            return {
                ...state,
                composeEmail: action.composeEmail
            };
        case MAXIMIZE_COMPOSE_MODAL:
            return {
                ...state,
                maximize: action.maximize
            };
        case MINIMIZE_COMPOSE_MODAL:
            return {
                ...state,
                minimize: action.minimize
            };
        default:
            return state;
    }
};

export default EmailReducer;