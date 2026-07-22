import { ConversationMemory, Message } from './conversationMemory.interface';

export class InMemoryMemoryProvider implements ConversationMemory {
  private static instance: InMemoryMemoryProvider;
  private store = new Map<string, Message[]>();

  private constructor() {}

  public static getInstance(): InMemoryMemoryProvider {
    if (!InMemoryMemoryProvider.instance) {
      InMemoryMemoryProvider.instance = new InMemoryMemoryProvider();
    }
    return InMemoryMemoryProvider.instance;
  }

  public async getMessages(conversationId: string): Promise<Message[]> {
    return this.store.get(conversationId) || [];
  }

  public async saveMessage(conversationId: string, message: Message): Promise<void> {
    const list = this.store.get(conversationId) || [];
    list.push({ ...message, timestamp: message.timestamp || new Date() });
    this.store.set(conversationId, list);
  }

  public async clear(conversationId: string): Promise<void> {
    this.store.delete(conversationId);
  }
}

export default InMemoryMemoryProvider;
