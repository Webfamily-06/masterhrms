export class NotificationService {
  private subscribers: Map<string, string[]> = new Map();

  subscribe(userId: string, channel: string): void {
    const channels: string[] = this.subscribers.get(userId) || [];
    if (!channels.includes(channel)) {
      channels.push(channel);
      this.subscribers.set(userId, channels);
    }
  }

  unsubscribe(userId: string, channel: string): void {
    const channels: string[] = this.subscribers.get(userId) || [];
    const filtered: string[] = channels.filter((c: string) => c !== channel);
    this.subscribers.set(userId, filtered);
  }

  notify(userId: string, message: string): void {
    const channels: string[] = this.subscribers.get(userId) || [];
    for (const channel of channels) {
      console.log(`[${channel}] → ${userId}: ${message}`);
    }
  }

  notifyAll(message: string): void {
    for (const [userId] of this.subscribers) {
      this.notify(userId, message);
    }
  }
}
