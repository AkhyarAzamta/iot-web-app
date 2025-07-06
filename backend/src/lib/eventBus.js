// src/lib/eventBus.js
class EventBus {
  constructor() {
    this.listeners = {};
    this.ioInstance = null;
  }

  setIoInstance(io) {
    this.ioInstance = io;
  }

  emit(event, data) {
    if (this.ioInstance) {
      this.ioInstance.emit(event, data);
    }
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        listener => listener !== callback
      );
    }
  }
}

const eventBus = new EventBus();
export default eventBus;