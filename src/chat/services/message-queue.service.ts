import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
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
  HIGH = 10, // Messages, calls
  MEDIUM = 5, // Group operations, deletes
  LOW = 1, // Typing, presence updates
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
    // Add a small delay to ensure other services are ready
    setTimeout(async () => {
      await this.connectWithRetry();
    }, 2000);
  }

  private async connectWithRetry(
    maxRetries: number = 3,
    retryDelay: number = 5000,
  ): Promise<void> {
    let retries: number = 0;
    while (retries < maxRetries) {
      try {
        await this.connect();
        if (this.isConnected) {
          this.logger.log(
            'RabbitMQ connected successfully after retry attempt',
          );
          return;
        }
      } catch (error) {
        retries++;
        this.logger.warn(
          `RabbitMQ connection attempt ${retries}/${maxRetries} failed: ${
            error?.message || error
          }`,
        );

        if (retries < maxRetries) {
          this.logger.log(
            `Retrying RabbitMQ connection in ${retryDelay / 1000} seconds...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    this.logger.error(
      `Failed to connect to RabbitMQ after ${maxRetries} attempts`,
    );
    this.logger.warn(
      'Application will continue without RabbitMQ functionality',
    );
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://guest:guest@localhost:5672',
      );

      this.logger.log(`Attempting to connect to RabbitMQ at: ${rabbitmqUrl}`);

      this.connection = connect([rabbitmqUrl], {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 10,
        connectionOptions: {
          timeout: 30000,
        },
      });

      this.connection.on('connect', () => {
        this.logger.log('RabbitMQ connected successfully');
        this.isConnected = true;
      });

      this.connection.on('disconnect', (err) => {
        const errorMessage = err?.err?.message || 'Unknown error';
        this.logger.warn('RabbitMQ disconnected:', errorMessage);
        this.isConnected = false;
      });

      this.connection.on('connectFailed', (err) => {
        const errorMessage = err?.err?.message || 'Unknown error';
        this.logger.error('RabbitMQ connection failed:', errorMessage);
        this.isConnected = false;
      });

      // Add error handling for connection
      this.connection.on('error', (err) => {
        this.logger.error(
          'RabbitMQ connection error:',
          err?.message || 'Unknown error',
        );
        this.isConnected = false;
      });

      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: (channel: amqp.Channel) => this.setupQueues(channel),
      });

      // Add error handling for channel
      this.channelWrapper.on('error', (err: Error) => {
        this.logger.error(
          'RabbitMQ channel error:',
          err?.message || 'Unknown error',
        );
        this.isConnected = false;
      });

      this.channelWrapper.on('close', () => {
        this.logger.warn('RabbitMQ channel closed');
        this.isConnected = false;
      });

      // Wait for connection to be established with timeout
      try {
        await Promise.race([
          this.channelWrapper.waitForConnect(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error('RabbitMQ connection timeout after 15 seconds'),
                ),
              15000,
            ),
          ),
        ]);

        this.logger.log('RabbitMQ channel ready');
        this.isConnected = true;
      } catch (connectionError) {
        this.logger.error(
          'Failed to establish RabbitMQ connection:',
          connectionError?.message,
        );
        this.isConnected = false;
      }
    } catch (error) {
      this.logger.error(
        'Failed to connect to RabbitMQ:',
        error?.message || error,
      );
      this.isConnected = false;
      // Don't throw error to prevent app from crashing
      this.logger.warn(
        'Application will continue without RabbitMQ queue functionality. Please ensure RabbitMQ is running and accessible.',
      );
    }
  }

  private async setupQueues(channel: amqp.Channel): Promise<void> {
    // Dead letter exchange and queue
    await channel.assertExchange('messages.dead_letter', 'direct', {
      durable: true,
    });
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
    await channel.bindQueue(
      QueueType.DEAD_LETTER,
      'messages.dead_letter',
      QueueType.DEAD_LETTER,
    );

    this.logger.log('RabbitMQ queues and exchanges configured');
  }

  async publishMessage(
    routingKey: string,
    message: QueueMessage,
    priority: QueuePriority = QueuePriority.MEDIUM,
  ): Promise<boolean> {
    if (!this.isConnected || !this.channelWrapper) {
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

      // Check if channel is still active before publishing
      if (
        !this.channelWrapper._channel ||
        this.channelWrapper._channel.closed
      ) {
        this.logger.warn('RabbitMQ channel is closed, attempting to reconnect');
        this.isConnected = false;
        return false;
      }

      const result = await this.channelWrapper.publish(
        'messages',
        routingKey,
        messageWithMetadata,
        {
          persistent: true,
          priority,
          messageId: messageWithMetadata.id,
          timestamp: Date.now(),
        },
      );

      if (result) {
        this.logger.debug(
          `Message published to ${routingKey}:`,
          messageWithMetadata.id,
        );
        return true;
      } else {
        this.logger.warn(
          `Failed to publish message to ${routingKey}: Publish returned false`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to publish message to ${routingKey}:`,
        error?.message || error,
      );
      this.isConnected = false;
      return false;
    }
  }

  // High priority message publishing
  async publishHighPriorityMessage(
    type: string,
    payload: any,
    userId: number,
    socketId?: string,
  ): Promise<boolean> {
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
      QueuePriority.HIGH,
    );
  }

  // Medium priority message publishing
  async publishMediumPriorityMessage(
    type: string,
    payload: any,
    userId: number,
    socketId?: string,
  ): Promise<boolean> {
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
      QueuePriority.MEDIUM,
    );
  }

  // Low priority message publishing
  async publishLowPriorityMessage(
    type: string,
    payload: any,
    userId: number,
    socketId?: string,
  ): Promise<boolean> {
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
      QueuePriority.LOW,
    );
  }

  // Connection status check
  isConnectedToQueue(): boolean {
    return this.isConnected && this.channelWrapper !== undefined;
  }

  // Consumer setup
  async setupConsumer(
    queueName: string,
    handler: (message: QueueMessage) => Promise<void>,
    options: { prefetch?: number; maxRetries?: number } = {},
  ): Promise<void> {
    const { prefetch = 10, maxRetries = 3 } = options;

    if (!this.isConnected) {
      this.logger.warn(
        `Cannot setup consumer for ${queueName}: RabbitMQ not connected`,
      );
      return; // Don't throw error, just return
    }

    try {
      const consumerChannel = this.connection.createChannel({
        json: true,
        setup: async (channel: amqp.Channel) => {
          try {
            await channel.prefetch(prefetch);

            return channel.consume(queueName, async (msg) => {
              if (msg) {
                try {
                  const message = JSON.parse(msg.content.toString());
                  await handler(message);
                  channel.ack(msg);
                  this.logger.debug(
                    `Message processed successfully: ${message.id}`,
                  );
                } catch (error) {
                  this.logger.error(
                    `Error processing message:`,
                    error?.message || error,
                  );

                  const retryCount =
                    (msg.properties.headers?.retryCount || 0) + 1;

                  if (retryCount <= maxRetries) {
                    // Retry with exponential backoff
                    const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
                    setTimeout(() => {
                      try {
                        channel.nack(msg, false, true);
                      } catch (nackError) {
                        this.logger.error(
                          'Failed to nack message for retry:',
                          nackError?.message,
                        );
                      }
                    }, delay);
                    this.logger.warn(
                      `Retrying message (${retryCount}/${maxRetries})`,
                    );
                  } else {
                    // Send to dead letter queue
                    try {
                      channel.nack(msg, false, false);
                      this.logger.error(
                        `Message failed after ${maxRetries} retries, sent to dead letter queue`,
                      );
                    } catch (deadLetterError) {
                      this.logger.error(
                        'Failed to send message to dead letter queue:',
                        deadLetterError?.message,
                      );
                    }
                  }
                }
              }
            });
          } catch (setupError) {
            this.logger.error(
              `Failed to setup consumer channel for ${queueName}:`,
              setupError?.message || setupError,
            );
            throw setupError;
          }
        },
      });

      // Add error handling for consumer channel
      consumerChannel.on('error', (err: Error) => {
        this.logger.error(
          `Consumer channel error for ${queueName}:`,
          err?.message || err,
        );
      });

      consumerChannel.on('close', () => {
        this.logger.warn(`Consumer channel closed for ${queueName}`);
      });

      await consumerChannel.waitForConnect();
      this.logger.log(`Consumer setup for queue: ${queueName}`);
    } catch (error) {
      this.logger.error(
        `Failed to setup consumer for ${queueName}:`,
        error?.message || error,
      );
      // Don't throw to prevent app crash
    }
  }

  // Queue statistics
  async getQueueStats(
    queueName: string,
  ): Promise<{ messageCount: number; consumerCount: number } | null> {
    if (!this.isConnected || !this.connection) {
      this.logger.warn(
        `Cannot get queue stats for ${queueName}: RabbitMQ not connected`,
      );
      return null;
    }

    try {
      const channel = await this.connection.createChannel();

      try {
        const queue = await channel.checkQueue(queueName);
        await channel.close();

        return {
          messageCount: queue.messageCount,
          consumerCount: queue.consumerCount,
        };
      } catch (queueError) {
        this.logger.warn(
          `Queue ${queueName} may not exist or is not accessible:`,
          queueError?.message,
        );
        await channel.close().catch(() => {});
        return null;
      }
    } catch (error) {
      this.logger.error(
        `Failed to get queue stats for ${queueName}:`,
        error?.message || error,
      );
      return null;
    }
  }

  // Health check
  async healthCheck(): Promise<{
    connected: boolean;
    queues: Record<string, any>;
    connectionInfo?: any;
  }> {
    const result = {
      connected: this.isConnected,
      queues: {} as Record<string, any>,
      connectionInfo: undefined as any,
    };

    if (this.isConnected && this.connection) {
      try {
        // Test connection by creating a temporary channel
        const testChannel = await this.connection.createChannel();
        await testChannel.close();

        // Get queue stats if connection is working
        for (const queueName of Object.values(QueueType)) {
          result.queues[queueName] = await this.getQueueStats(queueName);
        }

        result.connectionInfo = {
          status: 'connected',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        this.logger.error('Health check failed:', error?.message || error);
        result.connected = false;
        this.isConnected = false;
      }
    }

    return result;
  }

  // Check if RabbitMQ service is reachable
  async checkRabbitMQAvailability(): Promise<boolean> {
    try {
      const rabbitmqUrl = this.configService.get<string>(
        'RABBITMQ_URL',
        'amqp://guest:guest@localhost:5672',
      );

      // Try to create a simple connection to test if RabbitMQ is available
      const testConnection = connect([rabbitmqUrl], {
        heartbeatIntervalInSeconds: 5,
        reconnectTimeInSeconds: 1,
      });

      const testChannel = testConnection.createChannel({
        setup: async (channel: amqp.Channel) => {
          // Just test if we can create a channel
          return true;
        },
      });

      await Promise.race([
        testChannel.waitForConnect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 5000),
        ),
      ]);

      await testConnection.close();
      return true;
    } catch (error) {
      this.logger.warn(
        'RabbitMQ availability check failed:',
        error?.message || error,
      );
      return false;
    }
  }

  // Attempt to reconnect to RabbitMQ
  async attemptReconnect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    this.logger.log('Attempting to reconnect to RabbitMQ...');

    try {
      await this.disconnect();
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      await this.connect();
      return this.isConnected;
    } catch (error) {
      this.logger.error(
        'Reconnection attempt failed:',
        error?.message || error,
      );
      return false;
    }
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
