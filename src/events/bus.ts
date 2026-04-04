/**
 * Event-driven architecture: publish-subscribe event bus with filtering.
 */

export interface Event {
  topic: string;
  payload: Record<string, unknown>;
  eventId: string;
  timestamp: string;
  source: string;
  correlationId?: string;
  metadata: Record<string, unknown>;
}

export type EventHandler = (event: Event) => Promise<void>;
export type EventFilter = (event: Event) => boolean;

interface Subscription {
  subId: string;
  topicPattern: string;
  handler: EventHandler;
  filter?: EventFilter;
  maxRetries: number;
}

interface DeadLetter {
  event: Event;
  reason: string;
  failedAt: string;
}

export interface EventBusStats {
  processed: number;
  errors: number;
  deadLetters: number;
  queueSize: number;
  subscriptions: number;
  topics: string[];
}

export class EventBus {
  private subscriptions = new Map<string, Subscription[]>();
  private queue: Event[] = [];
  private running = false;
  private processedCount = 0;
  private errorCount = 0;
  private deadLetterQueue: DeadLetter[] = [];
  private maxQueueSize: number;

  constructor(maxQueueSize = 10000) {
    this.maxQueueSize = maxQueueSize;
  }

  subscribe(
    topic: string,
    handler: EventHandler,
    filter?: EventFilter,
  ): string {
    const subId = crypto.randomUUID().slice(0, 8);
    const sub: Subscription = {
      subId,
      topicPattern: topic,
      handler,
      filter,
      maxRetries: 3,
    };
    const existing = this.subscriptions.get(topic) ?? [];
    existing.push(sub);
    this.subscriptions.set(topic, existing);
    return subId;
  }

  unsubscribe(subId: string): boolean {
    for (const [topic, subs] of this.subscriptions.entries()) {
      const idx = subs.findIndex((s) => s.subId === subId);
      if (idx >= 0) {
        subs.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  publish(event: Partial<Event> & { topic: string; payload: Record<string, unknown> }): void {
    const fullEvent: Event = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source: "",
      metadata: {},
      ...event,
    };
    if (this.queue.length >= this.maxQueueSize) {
      console.error(`Event queue full, dropping event ${fullEvent.eventId}`);
      return;
    }
    this.queue.push(fullEvent);
    if (this.running) {
      this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (!event) break;
      await this.dispatch(event);
      this.processedCount++;
    }
  }

  private async dispatch(event: Event): Promise<void> {
    const topicSubs = this.subscriptions.get(event.topic) ?? [];
    const wildcardSubs = this.subscriptions.get("*") ?? [];
    const allSubs = [...topicSubs, ...wildcardSubs];

    for (const sub of allSubs) {
      if (sub.filter && !sub.filter(event)) continue;
      let retries = 0;
      while (retries <= sub.maxRetries) {
        try {
          await sub.handler(event);
          break;
        } catch (err) {
          retries++;
          if (retries > sub.maxRetries) {
            this.errorCount++;
            this.deadLetterQueue.push({
              event,
              reason: `Handler ${sub.subId} failed after ${sub.maxRetries} retries: ${err}`,
              failedAt: new Date().toISOString(),
            });
          } else {
            await new Promise((r) => setTimeout(r, 100 * 2 ** retries));
          }
        }
      }
    }
  }

  async start(): Promise<void> {
    this.running = true;
    await this.processNext();
  }

  stop(): void {
    this.running = false;
  }

  get stats(): EventBusStats {
    return {
      processed: this.processedCount,
      errors: this.errorCount,
      deadLetters: this.deadLetterQueue.length,
      queueSize: this.queue.length,
      subscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.length, 0
      ),
      topics: Array.from(this.subscriptions.keys()),
    };
  }
}
