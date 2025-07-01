import { Injectable, Logger } from '@nestjs/common';
import { CacheManager } from '../cache.service';
import { MessageQueueService } from '../queue/message-queue.service';
import { PresenceService } from '../services/presence.service';

export interface PerformanceMetrics {
  timestamp: Date;
  redis: {
    connected: boolean;
    latency: number;
    memoryUsage: number;
    totalKeys: number;
    onlineUsers: number;
    totalRooms: number;
  };
  queue: {
    connected: boolean;
    totalQueued: number;
    processingRate: number;
    errorRate: number;
    queues: Record<string, any>;
  };
  websocket: {
    totalConnections: number;
    activeRooms: number;
    messagesPerSecond: number;
    averageResponseTime: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
  };
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS_HISTORY = 100;
  
  // Performance counters
  private messageCount = 0;
  private errorCount = 0;
  private totalResponseTime = 0;
  private responseTimeCount = 0;
  private startTime = Date.now();

  constructor(
    private readonly cacheManager: CacheManager,
    private readonly messageQueueService: MessageQueueService,
    private readonly presenceService: PresenceService,
  ) {
    // Start periodic metrics collection
    this.startMetricsCollection();
  }

  /**
   * Start collecting metrics every 30 seconds
   */
  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.storeMetrics(metrics);
      } catch (error) {
        this.logger.error(`Error collecting metrics: ${error.message}`);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Collect comprehensive performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const [redisHealth, redisStats, queueStats, presenceStats] = await Promise.all([
      this.cacheManager.healthCheck(),
      this.cacheManager.getPerformanceStats(),
      this.getQueueMetrics(),
      this.presenceService.getPresenceStats(),
    ]);

    const systemMetrics = this.getSystemMetrics();

    return {
      timestamp: new Date(),
      redis: {
        connected: redisHealth.connected,
        latency: redisHealth.latency,
        memoryUsage: redisHealth.memoryUsage,
        totalKeys: redisStats.totalKeys,
        onlineUsers: redisStats.onlineUsers,
        totalRooms: redisStats.totalRooms,
      },
      queue: queueStats,
      websocket: {
        totalConnections: presenceStats.onlineUsers,
        activeRooms: redisStats.totalRooms,
        messagesPerSecond: this.calculateMessagesPerSecond(),
        averageResponseTime: this.calculateAverageResponseTime(),
      },
      system: systemMetrics,
    };
  }

  /**
   * Get queue-specific metrics
   */
  private async getQueueMetrics(): Promise<PerformanceMetrics['queue']> {
    try {
      const isHealthy = await this.messageQueueService.healthCheck();
      const queueStats = await this.messageQueueService.getQueueStats();
      
      const totalQueued = Object.values(queueStats).reduce((sum, queue: any) => {
        return sum + (queue.messageCount || 0);
      }, 0);

      return {
        connected: isHealthy,
        totalQueued,
        processingRate: this.calculateProcessingRate(),
        errorRate: this.calculateErrorRate(),
        queues: queueStats,
      };
    } catch (error) {
      this.logger.error(`Error getting queue metrics: ${error.message}`);
      return {
        connected: false,
        totalQueued: 0,
        processingRate: 0,
        errorRate: 0,
        queues: {},
      };
    }
  }

  /**
   * Get system metrics
   */
  private getSystemMetrics(): PerformanceMetrics['system'] {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: memUsage.heapUsed,
      cpuUsage: this.getCPUUsage(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Store metrics with circular buffer
   */
  private storeMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the last N metrics
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Track message processing
   */
  trackMessage(): void {
    this.messageCount++;
  }

  /**
   * Track processing errors
   */
  trackError(): void {
    this.errorCount++;
  }

  /**
   * Track response time
   */
  trackResponseTime(responseTime: number): void {
    this.totalResponseTime += responseTime;
    this.responseTimeCount++;
  }

  /**
   * Calculate messages per second
   */
  private calculateMessagesPerSecond(): number {
    const uptime = (Date.now() - this.startTime) / 1000;
    return uptime > 0 ? this.messageCount / uptime : 0;
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(): number {
    return this.responseTimeCount > 0 
      ? this.totalResponseTime / this.responseTimeCount 
      : 0;
  }

  /**
   * Calculate processing rate
   */
  private calculateProcessingRate(): number {
    const uptime = (Date.now() - this.startTime) / 1000;
    const totalProcessed = this.messageCount + this.errorCount;
    return uptime > 0 ? totalProcessed / uptime : 0;
  }

  /**
   * Calculate error rate percentage
   */
  private calculateErrorRate(): number {
    const totalProcessed = this.messageCount + this.errorCount;
    return totalProcessed > 0 ? (this.errorCount / totalProcessed) * 100 : 0;
  }

  /**
   * Get CPU usage (simplified)
   */
  private getCPUUsage(): number {
    // This is a simplified CPU usage calculation
    // In production, you might want to use a more sophisticated approach
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert to milliseconds
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    const latest = this.getLatestMetrics();
    if (!latest) {
      return {
        status: 'critical',
        score: 0,
        issues: ['No metrics available'],
        recommendations: ['Wait for metrics collection to start'],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check Redis health
    if (!latest.redis.connected) {
      issues.push('Redis disconnected');
      recommendations.push('Check Redis connection');
      score -= 30;
    } else if (latest.redis.latency > 100) {
      issues.push('High Redis latency');
      recommendations.push('Optimize Redis configuration');
      score -= 10;
    }

    // Check queue health
    if (!latest.queue.connected) {
      issues.push('Message queue disconnected');
      recommendations.push('Check RabbitMQ connection');
      score -= 30;
    } else if (latest.queue.totalQueued > 1000) {
      issues.push('High queue backlog');
      recommendations.push('Scale queue consumers');
      score -= 15;
    }

    // Check error rate
    if (latest.queue.errorRate > 5) {
      issues.push('High error rate');
      recommendations.push('Investigate error causes');
      score -= 20;
    }

    // Check response time
    if (latest.websocket.averageResponseTime > 1000) {
      issues.push('Slow response times');
      recommendations.push('Optimize message processing');
      score -= 10;
    }

    // Determine status
    let status: 'healthy' | 'warning' | 'critical';
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 60) {
      status = 'warning';
    } else {
      status = 'critical';
    }

    return {
      status,
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  /**
   * Reset counters
   */
  resetCounters(): void {
    this.messageCount = 0;
    this.errorCount = 0;
    this.totalResponseTime = 0;
    this.responseTimeCount = 0;
    this.startTime = Date.now();
    this.logger.log('Performance counters reset');
  }
} 
