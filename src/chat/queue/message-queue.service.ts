import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper } from 'amqp-connection-manager';
import { ConversationType } from 'src/groups/model/conversation.vm';

export interface QueuedEvent {
  eventType: 'sendMessage' | 'joinGroup' | 'callRequest' | 'typing' | 'presence' | 'deleteMessage';
  userId: number;
  socketId: string;
  data: any;
  timestamp: Date;
  priority?: number;
  retryCount?: number;
}

export interface MessageEvent extends QueuedEvent {
  eventType: 'sendMessage';
  data: {
    conversationId: number;
    conversationType: ConversationType;
    content: string;
    messageType: string;
    attachments?: any[];
  };
}

export interface CallEvent extends QueuedEvent {
  eventType: 'callRequest';
  data: {
    conversationId: number;
    conversationType: ConversationType;
    callType: 'VOICE' | 'VIDEO';
    targetUserId?: number;
  };
}

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageQueueService.name);
  private connection: amqp.AmqpConnectionManager;
  private publisherChannel: ChannelWrapper;
  private consumerChannel: ChannelWrapper;

  // Queue configurations
  private readonly QUEUES = {
    HIGH_PRIORITY: 'chat.events.high',
    MEDIUM_PRIORITY: 'chat.events.medium', 
    LOW_PRIORITY: 'chat.events.low',
    DEAD_LETTER: 'chat.events.dlq',
  };

  private readonly EXCHANGES = {
    EVENTS: 'chat.events',
    DIRECT: 'chat.direct',
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
    await this.setupQueues();
    this.logger.log('Message Queue Service initialized');
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Connect to RabbitMQ
   */
  private async connect(): Promise<void> {
    const rabbitmqUrl = this.configService.get('RABBITMQ_URL', 'amqp://localhost:5672');
    
    this.connection = amqp.connect([rabbitmqUrl], {
      heartbeatIntervalInSeconds: 30,
      reconnectTimeInSeconds: 30,
    });

    this.connection.on('connect', () => {
      this.logger.log('Connected to RabbitMQ');
    });

    this.connection.on('disconnect', (err) => {
      this.logger.error('Disconnected from RabbitMQ:', err);
    });

    // Create channels
    this.publisherChannel = this.connection.createChannel({
      json: true,
      setup: (channel) => this.setupChannel(channel),
    });

    this.consumerChannel = this.connection.createChannel({
      json: true,
      setup: (channel) => this.setupChannel(channel),
    });
  }

  /**
   * Setup RabbitMQ channels, exchanges, and queues
   */
  private async setupChannel(channel: any): Promise<void> {
    // Set prefetch count for load balancing
    await channel.prefetch(10);
    
    // Declare exchanges
    await channel.assertExchange(this.EXCHANGES.EVENTS, 'topic', { durable: true });
    await channel.assertExchange(this.EXCHANGES.DIRECT, 'direct', { durable: true });

    // Declare queues with different priorities
    await channel.assertQueue(this.QUEUES.HIGH_PRIORITY, {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': this.EXCHANGES.DIRECT,
        'x-dead-letter-routing-key': 'dlq',
      },
    });

    await channel.assertQueue(this.QUEUES.MEDIUM_PRIORITY, {
      durable: true,
      arguments: {
        'x-max-priority': 5,
        'x-dead-letter-exchange': this.EXCHANGES.DIRECT,
        'x-dead-letter-routing-key': 'dlq',
      },
    });

    await channel.assertQueue(this.QUEUES.LOW_PRIORITY, {
      durable: true,
      arguments: {
        'x-max-priority': 1,
        'x-dead-letter-exchange': this.EXCHANGES.DIRECT,
        'x-dead-letter-routing-key': 'dlq',
      },
    });

    await channel.assertQueue(this.QUEUES.DEAD_LETTER, { durable: true });

    // Bind queues to exchanges
    await channel.bindQueue(this.QUEUES.HIGH_PRIORITY, this.EXCHANGES.EVENTS, 'event.high.*');
    await channel.bindQueue(this.QUEUES.MEDIUM_PRIORITY, this.EXCHANGES.EVENTS, 'event.medium.*');
    await channel.bindQueue(this.QUEUES.LOW_PRIORITY, this.EXCHANGES.EVENTS, 'event.low.*');
    await channel.bindQueue(this.QUEUES.DEAD_LETTER, this.EXCHANGES.DIRECT, 'dlq');
  }

  /**
   * Setup queue consumers
   */
  private async setupQueues(): Promise<void> {
    // Prefetch is now handled in setupChannel
  }

  /**
   * Publish event to appropriate queue based on priority
   */
  async publishEvent(event: QueuedEvent): Promise<boolean> {
    try {
      const { priority, routingKey } = this.determineEventPriority(event);
      
      const message = {
        ...event,
        timestamp: new Date(),
        retryCount: event.retryCount || 0,
      };

      await this.publisherChannel.publish(
        this.EXCHANGES.EVENTS,
        routingKey,
        message,
        {
          priority,
          persistent: true,
          timestamp: Date.now(),
          headers: {
            userId: event.userId,
            eventType: event.eventType,
          },
        } as any,
      );

      this.logger.debug(`Event ${event.eventType} published to queue with priority ${priority}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish event: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Publish high-priority message event
   */
  async publishMessageEvent(userId: number, socketId: string, messageData: any): Promise<boolean> {
    const event: MessageEvent = {
      eventType: 'sendMessage',
      userId,
      socketId,
      data: messageData,
      timestamp: new Date(),
      priority: 8, // High priority for messages
    };

    return this.publishEvent(event);
  }

  /**
   * Publish call event
   */
  async publishCallEvent(userId: number, socketId: string, callData: any): Promise<boolean> {
    const event: CallEvent = {
      eventType: 'callRequest',
      userId,
      socketId,
      data: callData,
      timestamp: new Date(),
      priority: 10, // Highest priority for calls
    };

    return this.publishEvent(event);
  }

  /**
   * Publish typing event (low priority)
   */
  async publishTypingEvent(userId: number, socketId: string, typingData: any): Promise<boolean> {
    const event: QueuedEvent = {
      eventType: 'typing',
      userId,
      socketId,
      data: typingData,
      timestamp: new Date(),
      priority: 1, // Low priority for typing
    };

    return this.publishEvent(event);
  }

  /**
   * Setup consumer for specific queue
   */
  async setupConsumer(
    queueName: string,
    processor: (event: QueuedEvent) => Promise<void>
  ): Promise<void> {
    await this.consumerChannel.consume(queueName, async (msg) => {
      if (!msg) return;

      try {
        const event: QueuedEvent = JSON.parse(msg.content.toString());
        
        // Process the event
        await processor(event);
        
        // Acknowledge successful processing
        this.consumerChannel.ack(msg);
        
        this.logger.debug(`Processed event ${event.eventType} for user ${event.userId}`);
      } catch (error) {
        this.logger.error(`Failed to process message: ${error.message}`, error.stack);
        
        // Reject and requeue with retry logic
        const retryCount = msg.properties.headers?.retryCount || 0;
        if (retryCount < 3) {
          // Requeue for retry
          this.consumerChannel.nack(msg, false, true);
        } else {
          // Send to dead letter queue
          this.consumerChannel.nack(msg, false, false);
        }
      }
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [name, queue] of Object.entries(this.QUEUES)) {
      try {
        const info = await this.consumerChannel.checkQueue(queue);
        stats[name] = {
          queue,
          messageCount: info.messageCount,
          consumerCount: info.consumerCount,
        };
      } catch (error) {
        stats[name] = { error: error.message };
      }
    }
    
    return stats;
  }

  /**
   * Determine event priority and routing key
   */
  private determineEventPriority(event: QueuedEvent): { priority: number; routingKey: string } {
    switch (event.eventType) {
      case 'callRequest':
        return { priority: 10, routingKey: 'event.high.call' };
      case 'sendMessage':
        return { priority: 8, routingKey: 'event.high.message' };
      case 'joinGroup':
        return { priority: 5, routingKey: 'event.medium.group' };
      case 'deleteMessage':
        return { priority: 5, routingKey: 'event.medium.delete' };
      case 'presence':
        return { priority: 3, routingKey: 'event.low.presence' };
      case 'typing':
        return { priority: 1, routingKey: 'event.low.typing' };
      default:
        return { priority: 1, routingKey: 'event.low.default' };
    }
  }

  /**
   * Disconnect from RabbitMQ
   */
  private async disconnect(): Promise<void> {
    if (this.publisherChannel) {
      await this.publisherChannel.close();
    }
    if (this.consumerChannel) {
      await this.consumerChannel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    this.logger.log('Disconnected from RabbitMQ');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return this.connection.isConnected();
    } catch {
      return false;
    }
  }
} 
