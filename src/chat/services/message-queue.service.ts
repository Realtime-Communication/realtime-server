import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { AmqpConnectionManager, connect } from 'amqp-connection-manager';

export interface QueueMessage {
  id: string;
  type: string;
  payload: any;
  priority: number;
  timestamp: Date;
  userId: number;
  socketId?: string;
  retryCount?: number;
}

export enum QueuePriority {
  HIGH = 10,    // Messages, calls
  MEDIUM = 5,   // Group operations, deletes
  LOW = 1,      // Typing, presence updates
}

export enum QueueType {
  MESSAGES_HIGH = 'messages.high',
  MESSAGES_MEDIUM = 'messages.medium', 
  MESSAGES_LOW = 'messages.low',
  DEAD_LETTER = 'messages.dead_letter',
}

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageQueueService.name);
  private connection: AmqpConnectionManager;
  private channelWrapper: any;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL', 'amqp://admin:admin@localhost:5672');
      
      this.connection = connect([rabbitmqUrl], {
        heartbeatIntervalInSeconds: 5,
        reconnectTimeInSeconds: 5,
      });

      this.connection.on('connect', () => {
        this.logger.log('RabbitMQ connected successfully');
        this.isConnected = true;
      });

      this.connection.on('disconnect', (err) => {
        this.logger.error('RabbitMQ disconnected:', err);
        this.isConnected = false;
      });

      this.connection.on('connectFailed', (err) => {
        this.logger.error('RabbitMQ connection failed:', err);
        this.isConnected = false;
      });

      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: (channel: amqp.Channel) => this.setupQueues(channel),
      });

      await this.channelWrapper.waitForConnect();
      this.logger.log('RabbitMQ channel ready');
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  private async setupQueues(channel: amqp.Channel): Promise<void> {
    // Dead letter exchange and queue
    await channel.assertExchange('messages.dead_letter', 'direct', { durable: true });
    await channel.assertQueue(QueueType.DEAD_LETTER, {
      durable: true,
      messageTtl: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Main message exchange
    await channel.assertExchange('messages', 'topic', { durable: true });

    // High priority queue (Messages, calls)
    await channel.assertQueue(QueueType.MESSAGES_HIGH, {
      durable: true,
      maxPriority: 10,
      deadLetterExchange: 'messages.dead_letter',
      deadLetterRoutingKey: QueueType.DEAD_LETTER,
      messageTtl: 30 * 60 * 1000, // 30 minutes
    });

    // Medium priority queue (Group operations, deletes)
    await channel.assertQueue(QueueType.MESSAGES_MEDIUM, {
      durable: true,
      maxPriority: 5,
      deadLetterExchange: 'messages.dead_letter',
      deadLetterRoutingKey: QueueType.DEAD_LETTER,
      messageTtl: 15 * 60 * 1000, // 15 minutes
    });

    // Low priority queue (Typing, presence)
    await channel.assertQueue(QueueType.MESSAGES_LOW, {
      durable: true,
      maxPriority: 1,
      deadLetterExchange: 'messages.dead_letter',
      deadLetterRoutingKey: QueueType.DEAD_LETTER,
      messageTtl: 5 * 60 * 1000, // 5 minutes
    });

    // Bind queues to exchange
    await channel.bindQueue(QueueType.MESSAGES_HIGH, 'messages', 'high.*');
    await channel.bindQueue(QueueType.MESSAGES_MEDIUM, 'messages', 'medium.*');
    await channel.bindQueue(QueueType.MESSAGES_LOW, 'messages', 'low.*');
    await channel.bindQueue(QueueType.DEAD_LETTER, 'messages.dead_letter', QueueType.DEAD_LETTER);

    this.logger.log('RabbitMQ queues and exchanges configured');
  }

  async publishMessage(
    routingKey: string,
    message: QueueMessage,
    priority: QueuePriority = QueuePriority.MEDIUM
  ): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn('RabbitMQ not connected, message not published');
      return false;
    }

    try {
      const messageWithMetadata = {
        ...message,
        id: message.id || this.generateMessageId(),
        timestamp: new Date(),
        priority,
      };

      await this.channelWrapper.publish(
        'messages',
        routingKey,
        messageWithMetadata,
        {
          persistent: true,
          priority,
          messageId: messageWithMetadata.id,
          timestamp: Date.now(),
        }
      );

      this.logger.debug(`Message published to ${routingKey}:`, messageWithMetadata.id);
      return true;
    } catch (error) {
      this.logger.error(`Failed to publish message to ${routingKey}:`, error);
      return false;
    }
  }

  // High priority message publishing
  async publishHighPriorityMessage(type: string, payload: any, userId: number, socketId?: string): Promise<boolean> {
    return this.publishMessage(
      `high.${type}`,
      {
        id: this.generateMessageId(),
        type,
        payload,
        priority: QueuePriority.HIGH,
        timestamp: new Date(),
        userId,
        socketId,
      },
      QueuePriority.HIGH
    );
  }

  // Medium priority message publishing
  async publishMediumPriorityMessage(type: string, payload: any, userId: number, socketId?: string): Promise<boolean> {
    return this.publishMessage(
      `medium.${type}`,
      {
        id: this.generateMessageId(),
        type,
        payload,
        priority: QueuePriority.MEDIUM,
        timestamp: new Date(),
        userId,
        socketId,
      },
      QueuePriority.MEDIUM
    );
  }

  // Low priority message publishing
  async publishLowPriorityMessage(type: string, payload: any, userId: number, socketId?: string): Promise<boolean> {
    return this.publishMessage(
      `low.${type}`,
      {
        id: this.generateMessageId(),
        type,
        payload,
        priority: QueuePriority.LOW,
        timestamp: new Date(),
        userId,
        socketId,
      },
      QueuePriority.LOW
    );
  }

  // Consumer setup
  async setupConsumer(
    queueName: string,
    handler: (message: QueueMessage) => Promise<void>,
    options: { prefetch?: number; maxRetries?: number } = {}
  ): Promise<void> {
    const { prefetch = 10, maxRetries = 3 } = options;

    if (!this.isConnected) {
      throw new Error('RabbitMQ not connected');
    }

    const consumerChannel = this.connection.createChannel({
      json: true,
      setup: (channel: amqp.Channel) => {
        channel.prefetch(prefetch);
        return channel.consume(queueName, async (msg) => {
          if (msg) {
            try {
              const message = JSON.parse(msg.content.toString());
              await handler(message);
              channel.ack(msg);
              this.logger.debug(`Message processed successfully: ${message.id}`);
            } catch (error) {
              this.logger.error(`Error processing message:`, error);
              
              const retryCount = (msg.properties.headers?.retryCount || 0) + 1;
              
              if (retryCount <= maxRetries) {
                // Retry with exponential backoff
                const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
                setTimeout(() => {
                  channel.nack(msg, false, true);
                }, delay);
                this.logger.warn(`Retrying message (${retryCount}/${maxRetries})`);
              } else {
                // Send to dead letter queue
                channel.nack(msg, false, false);
                this.logger.error(`Message failed after ${maxRetries} retries, sent to dead letter queue`);
              }
            }
          }
        });
      },
    });

    await consumerChannel.waitForConnect();
    this.logger.log(`Consumer setup for queue: ${queueName}`);
  }

  // Queue statistics
  async getQueueStats(queueName: string): Promise<{ messageCount: number; consumerCount: number } | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const channel = await this.connection.createChannel();
      const queue = await channel.checkQueue(queueName);
      await channel.close();
      
      return {
        messageCount: queue.messageCount,
        consumerCount: queue.consumerCount,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats for ${queueName}:`, error);
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<{ connected: boolean; queues: Record<string, any> }> {
    const queues: Record<string, any> = {};
    
    if (this.isConnected) {
      for (const queueName of Object.values(QueueType)) {
        queues[queueName] = await this.getQueueStats(queueName);
      }
    }

    return {
      connected: this.isConnected,
      queues,
    };
  }

  private async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.logger.log('RabbitMQ connection closed');
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 
