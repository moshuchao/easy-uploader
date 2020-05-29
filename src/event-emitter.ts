
import { Event, Listener, EventCallbackMap, Dict } from './types';

export default class EventEmitter {
    private event: Dict<Listener<any>[]> = {};

    on<K extends keyof EventCallbackMap>(type: K, cb: Listener<EventCallbackMap[K]>) {
        if (!this.event[type]) {
            this.event[type] = [cb];
            return;
        }

        this.event[type]?.push(cb);
    }

    emit<K extends keyof EventCallbackMap>(type: K, arg: EventCallbackMap[K]) {
        const listeners = this.event[type];
        if (!listeners || !listeners.length) return;
        listeners.forEach(cb => cb(arg));
    }
}