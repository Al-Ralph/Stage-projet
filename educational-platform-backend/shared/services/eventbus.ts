// shared/services/eventbus.ts
import * as amqp from 'amqplib';

export class EventBus {
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  
  async connect(): Promise<void> {
    this.connection = await amqp.connect(process.env.RABBITMQ_URL);
    this.channel = await this.connection.createChannel();
    
    await this.channel.assertExchange('events', 'topic', { durable: true });
  }
  
  async emit(event: string, data: any): Promise<void> {
    if (!this.channel) await this.connect();
    
    await this.channel.publish(
      'events',
      event,
      Buffer.from(JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString()
      }))
    );
  }
  
  async subscribe(pattern: string, handler: (data: any) => Promise<void>): Promise<void> {
    if (!this.channel) await this.connect();
    
    const queue = await this.channel.assertQueue('', { exclusive: true });
    await this.channel.bindQueue(queue.queue, 'events', pattern);
    
    await this.channel.consume(queue.queue, async (msg) => {
      if (!msg) return;
      
      try {
        const event = JSON.parse(msg.content.toString());
        await handler(event);
        this.channel.ack(msg);
      } catch (error) {
        console.error('Event processing error:', error);
        this.channel.nack(msg, false, false);
      }
    });
  }
}