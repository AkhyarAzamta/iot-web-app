// src/lib/eventBus.js
import { EventEmitter } from 'events';

class Bus extends EventEmitter {
  setIoInstance(io) {
    this.io = io;
  }
  emitTo(roomOrEvent, payload) {
    if (this.io) this.io.emit(roomOrEvent, payload);
  }
}

const bus = new Bus();
export default bus;
