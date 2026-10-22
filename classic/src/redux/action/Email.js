import { COMPOSE_EMAIL, MAXIMIZE_COMPOSE_MODAL, MINIMIZE_COMPOSE_MODAL } from "../constants/Email";

export function Compose(composeEmail) {
    return {
        type: COMPOSE_EMAIL,
        composeEmail
    };
}

export function Maximize(maximize) {
    return {
        type: MAXIMIZE_COMPOSE_MODAL,
        maximize
    };
}

export function Minimize(minimize) {
    return {
        type: MINIMIZE_COMPOSE_MODAL,
        minimize
    };
}