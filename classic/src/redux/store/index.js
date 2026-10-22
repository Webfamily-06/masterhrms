import { compose, createStore } from "redux";
import reducers from "../reducer";

const configureStore = (preloadedState) => {

    const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
    const store = createStore(reducers, preloadedState, composeEnhancers());

    return store;
}

const store = configureStore();

export default store;