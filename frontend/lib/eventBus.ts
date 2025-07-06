/* eslint-disable @typescript-eslint/no-explicit-any */
// src/lib/eventBus.ts
type EventCallback<T = any> = (data: T) => void;

class EventBus {
  private listeners = new Map<string, EventCallback[]>();

  on<T = any>(event: string, callback: EventCallback<T>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off<T = any>(event: string, callback: EventCallback<T>) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    
    this.listeners.set(
      event, 
      callbacks.filter(cb => cb !== callback)
    );
  }

  emit<T = any>(event: string, data: T) {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    
    // Clone array untuk menghindari masalah jika callback dihapus selama iterasi
    [...callbacks].forEach(callback => callback(data));
  }
}

const eventBus = new EventBus();
export default eventBus;