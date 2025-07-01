import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqp-connection-manager';
import { ChannelWrapper, Channel } from 'amqp-connection-manager';
import { ConsumeMessage, Options } from 'amqplib';
import { ConversationType } from 'src/groups/model/conversation.vm';

// Enhanced Event Types
export type EventType = 
  | 'sendMessage'
  | 'joinGroup'
  | 'callRequest'
  | 'typing'
  | 'presence'
  | 'deleteMessage';

export type CallType = 'VOICE' | 'VIDEO';

// Priority levels
export type PriorityLevel = 1 | 3 | 5 | 8 | 10;

// Queue names
export type QueueName = 'HIGH_PRIORITY' | 'MEDIUM_PRIORITY' | 'LOW_PRIORITY' | 'DEAD_LETTER';

// Exchange names
export type ExchangeName = 'EVENTS' | 'DIRECT';

// Base Event Interface
export interface QueuedEvent {
  eventType: EventType;
  userId: number;
  socketId: string;
  data: Record<string, any>;
  timestamp: Date;
  priority?: PriorityLevel;
  retryCount?: number;
}

// Message-specific data interface
export interface MessageData {
  conversationId: number;
  conversationType: ConversationType;
  content: string;
  messageType: string;
  attachments?: Array<{
    id?: string;
    filename: string;
    mimetype: string;
    size: number;
    url?: string;
  }>;
}

// Call-specific data interface
export interface CallData {
  conversationId: number;
  conversationType: ConversationType;
  callType: CallType;
  targetUserId?: number;
  metadata?: {
    duration?: number;
    quality?: 'low' | 'medium' | 'high';
    encrypted?: boolean;
  };
}

// Typing-specific data interface
export interface TypingData {
  conversationId: number;
  conversationType: ConversationType;
  isTyping: boolean;
  timestamp: Date;
}

// Presence-specific data interface
export interface PresenceData {
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: Date;
  customMessage?: string;
}

// Join group-specific data interface
export interface JoinGroupData {
  groupId: number;
  role?: 'member' | 'admin' | 'moderator';
  invitedBy?: number;
}

// Delete message-specific data interface
export interface DeleteMessageData {
  messageId: number;
  conversationId: number;
  conversationType: ConversationType;
  deleteForEveryone: boolean;
}

// Specific Event Interfaces
export interface MessageEvent extends Omit<QueuedEvent, 'data'> {
  eventType: 'sendMessage';
  data: MessageData;
}

export interface CallEvent extends Omit<QueuedEvent, 'data'> {
  eventType: 'callRequest';
  data: CallData;
}

export interface TypingEvent extends Omit<QueuedEvent, 'data'> {
  eventType: 'typing';
  data: TypingData;
}

export interface PresenceEvent extends Omit<QueuedEvent, 'data'> {
  eventType: 'presence';
  data: PresenceData;
}

export interface JoinGroupEvent extends Omit<QueuedEvent, 'data'> {
  eventType: 'joinGroup';
  data: JoinGroupData;
}

export interface DeleteMessageEvent extends Omit<QueuedEvent, 'data'> {
  eventType: 'deleteMessage';
  data: DeleteMessageData;
}

// Union type for all specific events
export type TypedQueuedEvent = 
  | MessageEvent 
  | CallEvent 
  | TypingEvent 
  | PresenceEvent 
  | JoinGroupEvent 
  | DeleteMessageEvent;

// Queue Configuration Interface
export interface QueueConfig {
  durable: boolean;
  arguments: {
    'x-max-priority': number;
    'x-dead-letter-exchange': string;
    'x-dead-letter-routing-key': string;
    'x-message-ttl'?: number;
    'x-max-length'?: number;
  };
}

// Exchange Configuration Interface
export interface ExchangeConfig {
  type: 'topic' | 'direct' | 'fanout' | 'headers';
  durable: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

// Publish Options Interface
export interface PublishOptions extends Options.Publish {
  priority: PriorityLevel;
  persistent: boolean;
  timestamp: number;
  headers: {
    userId: number;
    eventType: EventType;
    retryCount?: number;
    correlationId?: string;
  };
}

// Priority and Routing Configuration
export interface EventPriorityConfig {
  priority: PriorityLevel;
  routingKey: string;
}

// Queue Statistics Interface
export interface QueueStats {
  queue: string;
  messageCount: number;
  consumerCount: number;
}

export interface QueueStatsResponse {
  [queueName: string]: QueueStats | { error: string };
}

// Connection Configuration Interface
export interface ConnectionConfig {
  heartbeatIntervalInSeconds: number;
  reconnectTimeInSeconds: number;
  findServers?: () => string | string[] | Promise<string | string[]>;
  connectionOptions?: any;
}

// Consumer Processor Function Type
export type EventProcessor = (event: TypedQueuedEvent) => Promise<void>;

// Error Handling Interface
export interface ProcessingError extends Error {
  event?: TypedQueuedEvent;
  retryCount?: number;
  timestamp?: Date;
}

@Injectable()
export class MessageQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageQueueService.name);
  private connection: amqp.AmqpConnectionManager;
  private publisherChannel: ChannelWrapper;
  private consumerChannel: ChannelWrapper;

  // Queue configurations
  private readonly QUEUES: Record<QueueName, string> = {
    HIGH_PRIORITY: 'chat.events.high',
    MEDIUM_PRIORITY: 'chat.events.medium',
    LOW_PRIORITY: 'chat.events.low',
    DEAD_LETTER: 'chat.events.dlq',
  } as const;

  private readonly EXCHANGES: Record<ExchangeName, string> = {
    EVENTS: 'chat.events',
    DIRECT: 'chat.direct',
  } as const;

  // Configuration constants
  private readonly QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
    HIGH_PRIORITY: {
      durable: true,
      arguments: {
        'x-max-priority': 10,
        'x-dead-letter-exchange': this.EXCHANGES.DIRECT,
        'x-dead-letter-routing-key': 'dlq',
        'x-message-ttl': 3600000, // 1 hour
        'x-max-length': 10000,
      },
    },
    MEDIUM_PRIORITY: {
      durable: true,
      arguments: {
        'x-max-priority': 5,
        'x-dead-letter-exchange': this.EXCHANGES.DIRECT,
        'x-dead-letter-routing-key': 'dlq',
        'x-message-ttl': 7200000, // 2 hours
        'x-max-length': 5000,
      },
    },
    LOW_PRIORITY: {
      durable: true,
      arguments: {
        'x-max-priority': 1,
        'x-dead-letter-exchange': this.EXCHANGES.DIRECT,
        'x-dead-letter-routing-key': 'dlq',
        'x-message-ttl': 14400000, // 4 hours
        'x-max-length': 2000,
      },
    },
    DEAD_LETTER: {
      durable: true,
      arguments: {
        'x-max-priority': 1,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': '',
      },
    },
  } as const;

  private readonly EXCHANGE_CONFIGS: Record<ExchangeName, ExchangeConfig> = {
    EVENTS: {
      type: 'topic',
      durable: true,
      autoDelete: false,
    },
    DIRECT: {
      type: 'direct',
      durable: true,
      autoDelete: false,
    },
  } as const;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.setupQueues();
    this.logger.log('Message Queue Service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Connect to RabbitMQ
   */
  private async connect(): Promise<void> {
    const rabbitmqUrl: string = this.configService.get<string>(
      'RABBITMQ_URL',
      'amqp://localhost:5672',
    );

    const connectionConfig: ConnectionConfig = {
      heartbeatIntervalInSeconds: 30,
      reconnectTimeInSeconds: 30,
    };

    this.connection = amqp.connect([rabbitmqUrl], connectionConfig);

    this.connection.on('connect', () => {
      this.logger.log('Connected to RabbitMQ');
    });

    this.connection.on('disconnect', (err: Error) => {
      this.logger.error('Disconnected from RabbitMQ:', err);
    });

    // Create channels
    this.publisherChannel = this.connection.createChannel({
      json: true,
      setup: (channel: Channel) => this.setupChannel(channel),
    });

    this.consumerChannel = this.connection.createChannel({
      json: true,
      setup: (channel: Channel) => this.setupChannel(channel),
    });
  }

  /**
   * Setup RabbitMQ channels, exchanges, and queues
   */
  private async setupChannel(channel: Channel): Promise<void> {
    // Set prefetch count for load balancing
    await channel.prefetch(10);

    // Declare exchanges
    for (const [name, exchangeName] of Object.entries(this.EXCHANGES)) {
      const config = this.EXCHANGE_CONFIGS[name as ExchangeName];
      await channel.assertExchange(exchangeName, config.type, {
        durable: config.durable,
        autoDelete: config.autoDelete,
        arguments: config.arguments,
      });
    }

    // Declare queues with configurations
    for (const [name, queueName] of Object.entries(this.QUEUES)) {
      const config = this.QUEUE_CONFIGS[name as QueueName];
      await channel.assertQueue(queueName, config);
    }

    // Bind queues to exchanges
    await channel.bindQueue(
      this.QUEUES.HIGH_PRIORITY,
      this.EXCHANGES.EVENTS,
      'event.high.*',
    );
    await channel.bindQueue(
      this.QUEUES.MEDIUM_PRIORITY,
      this.EXCHANGES.EVENTS,
      'event.medium.*',
    );
    await channel.bindQueue(
      this.QUEUES.LOW_PRIORITY,
      this.EXCHANGES.EVENTS,
      'event.low.*',
    );
    await channel.bindQueue(
      this.QUEUES.DEAD_LETTER,
      this.EXCHANGES.DIRECT,
      'dlq',
    );
  }

  /**
   * Setup queue consumers
   */
  private async setupQueues(): Promise<void> {
    // Prefetch is now handled in setupChannel
    this.logger.debug('Queue setup completed');
  }

  /**
   * Publish event to appropriate queue based on priority
   */
  async publishEvent(event: TypedQueuedEvent): Promise<boolean> {
    try {
      const { priority, routingKey }: EventPriorityConfig = this.determineEventPriority(event);

      const message: TypedQueuedEvent = {
        ...event,
        timestamp: new Date(),
        retryCount: event.retryCount || 0,
      };

      const publishOptions: PublishOptions = {
        priority,
        persistent: true,
        timestamp: Date.now(),
        headers: {
          userId: event.userId,
          eventType: event.eventType,
          retryCount: message.retryCount,
          correlationId: this.generateCorrelationId(),
        },
      };

      await this.publisherChannel.publish(
        this.EXCHANGES.EVENTS,
        routingKey,
        message,
        publishOptions as any,
      );

      this.logger.debug(
        `Event ${event.eventType} published to queue with priority ${priority}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to publish event: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Publish high-priority message event
   */
  async publishMessageEvent(
    userId: number,
    socketId: string,
    messageData: MessageData,
  ): Promise<boolean> {
    const event: MessageEvent = {
      eventType: 'sendMessage',
      userId,
      socketId,
      data: messageData,
      timestamp: new Date(),
      priority: 8,
    };

    return this.publishEvent(event);
  }

  /**
   * Publish call event
   */
  async publishCallEvent(
    userId: number,
    socketId: string,
    callData: CallData,
  ): Promise<boolean> {
    const event: CallEvent = {
      eventType: 'callRequest',
      userId,
      socketId,
      data: callData,
      timestamp: new Date(),
      priority: 10,
    };

    return this.publishEvent(event);
  }

  /**
   * Publish typing event (low priority)
   */
  async publishTypingEvent(
    userId: number,
    socketId: string,
    typingData: TypingData,
  ): Promise<boolean> {
    const event: TypingEvent = {
      eventType: 'typing',
      userId,
      socketId,
      data: typingData,
      timestamp: new Date(),
      priority: 1,
    };

    return this.publishEvent(event);
  }

  /**
   * Publish presence event
   */
  async publishPresenceEvent(
    userId: number,
    socketId: string,
    presenceData: PresenceData,
  ): Promise<boolean> {
    const event: PresenceEvent = {
      eventType: 'presence',
      userId,
      socketId,
      data: presenceData,
      timestamp: new Date(),
      priority: 3,
    };

    return this.publishEvent(event);
  }

  /**
   * Publish join group event
   */
  async publishJoinGroupEvent(
    userId: number,
    socketId: string,
    joinGroupData: JoinGroupData,
  ): Promise<boolean> {
    const event: JoinGroupEvent = {
      eventType: 'joinGroup',
      userId,
      socketId,
      data: joinGroupData,
      timestamp: new Date(),
      priority: 5,
    };

    return this.publishEvent(event);
  }

  /**
   * Publish delete message event
   */
  async publishDeleteMessageEvent(
    userId: number,
    socketId: string,
    deleteData: DeleteMessageData,
  ): Promise<boolean> {
    const event: DeleteMessageEvent = {
      eventType: 'deleteMessage',
      userId,
      socketId,
      data: deleteData,
      timestamp: new Date(),
      priority: 5,
    };

    return this.publishEvent(event);
  }

  /**
   * Setup consumer for specific queue
   */
  async setupConsumer(
    queueName: string,
    processor: EventProcessor,
  ): Promise<void> {
    await this.consumerChannel.consume(queueName, async (msg: ConsumeMessage | null) => {
      if (!msg) return;

      try {
        const event: TypedQueuedEvent = JSON.parse(msg.content.toString());

        // Process the event
        await processor(event);

        // Acknowledge successful processing
        this.consumerChannel.ack(msg);

        this.logger.debug(
          `Processed event ${event.eventType} for user ${event.userId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process message: ${error.message}`,
          error.stack,
        );

        // Reject and requeue with retry logic
        const retryCount: number = msg.properties.headers?.retryCount || 0;
        if (retryCount < 3) {
          // Update retry count and requeue
          msg.properties.headers = {
            ...msg.properties.headers,
            retryCount: retryCount + 1,
          };
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
  async getQueueStats(): Promise<QueueStatsResponse> {
    const stats: QueueStatsResponse = {};

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
  private determineEventPriority(event: TypedQueuedEvent): EventPriorityConfig {
    const priorityMap: Record<EventType, EventPriorityConfig> = {
      callRequest: { priority: 10, routingKey: 'event.high.call' },
      sendMessage: { priority: 8, routingKey: 'event.high.message' },
      joinGroup: { priority: 5, routingKey: 'event.medium.group' },
      deleteMessage: { priority: 5, routingKey: 'event.medium.delete' },
      presence: { priority: 3, routingKey: 'event.low.presence' },
      typing: { priority: 1, routingKey: 'event.low.typing' },
    };

    return priorityMap[event.eventType] || { priority: 1, routingKey: 'event.low.default' };
  }

  /**
   * Generate correlation ID for message tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Disconnect from RabbitMQ
   */
  private async disconnect(): Promise<void> {
    try {
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
    } catch (error) {
      this.logger.error('Error during disconnect:', error.message);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return this.connection?.isConnected() || false;
    } catch {
      return false;
    }
  }

  /**
   * Purge queue (remove all messages)
   */
  async purgeQueue(queueName: string): Promise<{ messageCount: number }> {
    try {
      const result = await this.consumerChannel.purgeQueue(queueName);
      this.logger.log(`Purged ${result.messageCount} messages from queue ${queueName}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to purge queue ${queueName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete queue
   */
  async deleteQueue(queueName: string, options: { ifUnused?: boolean; ifEmpty?: boolean } = {}): Promise<{ messageCount: number }> {
    try {
      const result = await this.consumerChannel.deleteQueue(queueName, options);
      this.logger.log(`Deleted queue ${queueName}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete queue ${queueName}:`, error.message);
      throw error;
    }
  }
}