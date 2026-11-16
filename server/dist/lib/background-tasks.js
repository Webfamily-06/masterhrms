"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackBackgroundTask = trackBackgroundTask;
exports.runInBackground = runInBackground;
exports.backgroundTaskMiddleware = backgroundTaskMiddleware;
const async_hooks_1 = require("async_hooks");
/**
 * Serverless-safe background task tracking.
 *
 * On Vercel (and other serverless runtimes) the function instance can be frozen as soon as
 * the HTTP response is sent. Fire-and-forget work such as Pusher triggers and Web Push
 * deliveries that are still in flight at that moment are silently dropped, which breaks
 * realtime call signaling (incoming call, accept, SDP/ICE relay, hang-up notifications).
 *
 * `trackBackgroundTask()` registers a promise against the current request, and
 * `backgroundTaskMiddleware` delays the final `res.end()` until every tracked task has
 * settled (bounded by a safety deadline), so the work always completes before the
 * runtime is allowed to freeze.
 */
const requestTaskStore = new async_hooks_1.AsyncLocalStorage();
const FLUSH_DEADLINE_MS = Number(process.env.BACKGROUND_TASK_FLUSH_MS || 8000);
function trackBackgroundTask(task) {
    const store = requestTaskStore.getStore();
    if (store) {
        const settled = task.then(() => undefined, () => undefined);
        store.add(settled);
        void settled.then(() => store.delete(settled));
    }
    return task;
}
/** Defers a callback to the next macrotask while keeping it tracked for the current request. */
function runInBackground(fn) {
    void trackBackgroundTask(new Promise((resolve) => {
        setImmediate(() => {
            Promise.resolve()
                .then(fn)
                .then(resolve, resolve);
        });
    }));
}
const nextTick = () => new Promise((resolve) => setImmediate(resolve));
async function flushTasks(store) {
    const deadline = Date.now() + FLUSH_DEADLINE_MS;
    // Let synchronously scheduled setImmediate() work register its tasks first.
    await nextTick();
    while (store.size > 0 && Date.now() < deadline) {
        const remaining = Math.max(0, deadline - Date.now());
        await Promise.race([
            Promise.allSettled(Array.from(store)),
            new Promise((resolve) => setTimeout(resolve, remaining)),
        ]);
        await nextTick();
    }
}
function backgroundTaskMiddleware(_req, res, next) {
    const store = new Set();
    const originalEnd = res.end.bind(res);
    let ending = false;
    res.end = function patchedEnd(...args) {
        if (ending)
            return originalEnd(...args);
        ending = true;
        if (store.size === 0) {
            // Fast path: still yield one tick so setImmediate-scheduled tasks can register.
            void nextTick().then(() => {
                if (store.size === 0) {
                    originalEnd(...args);
                }
                else {
                    void flushTasks(store).finally(() => originalEnd(...args));
                }
            });
            return res;
        }
        void flushTasks(store).finally(() => originalEnd(...args));
        return res;
    };
    requestTaskStore.run(store, () => next());
}
