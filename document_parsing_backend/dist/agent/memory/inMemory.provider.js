"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryMemoryProvider = void 0;
class InMemoryMemoryProvider {
    static instance;
    store = new Map();
    constructor() { }
    static getInstance() {
        if (!InMemoryMemoryProvider.instance) {
            InMemoryMemoryProvider.instance = new InMemoryMemoryProvider();
        }
        return InMemoryMemoryProvider.instance;
    }
    async getMessages(conversationId) {
        return this.store.get(conversationId) || [];
    }
    async saveMessage(conversationId, message) {
        const list = this.store.get(conversationId) || [];
        list.push({ ...message, timestamp: message.timestamp || new Date() });
        this.store.set(conversationId, list);
    }
    async clear(conversationId) {
        this.store.delete(conversationId);
    }
}
exports.InMemoryMemoryProvider = InMemoryMemoryProvider;
exports.default = InMemoryMemoryProvider;
