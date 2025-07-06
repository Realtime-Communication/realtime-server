import { Injectable, Logger } from '@nestjs/common';
import { MessageQueueService } from './message-queue.service';
import { CacheManagerService } from './cache-manager.service';
import { ChatService } from '../chat.service';

interface PerformanceMetrics {
  timestamp: Date;
  queueDepth: {
    high: number;
    medium: number;
    low: number;
    deadLetter: number;
  };
  processingRate: {
    messagesPerSecond: number;
    callsPerSecond: number;
    typingEventsPerSecond: number;
  };
  systemHealth: {
    rabbitmqConnected: boolean;
    redisConnected: boolean;
    databaseConnected: boolean;
    overallScore: number;
  };
  cacheStats: {
    onlineUsers: number;
    totalRooms: number;
    memoryUsage: string;
    hitRate: number;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private readonly maxMetricsHistory = 100;
  private readonly maxAlertsHistory = 50;
  
  // Performance counters
  private eventCounters = {
    messages: 0,
    calls: 0,
    typing: 0,
    lastReset: Date.now(),
  };
  
  // Response time tracking
  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 1000;
  
  // Thresholds for alerts
  private readonly thresholds = {
    queueDepth: {
      high: 100,
      medium: 200,
      low: 500,
    },
    responseTime: {
      average: 1000, // 1 second
      p95: 3000, // 3 seconds
      p99: 5000, // 5 seconds
    },
    processingRate: {
      messagesPerSecond: 10,
      callsPerSecond: 5,
    },
    systemHealth: {
      overallScore: 0.8, // 80%
    },
  };

  constructor(
    private readonly messageQueueService: MessageQueueService,
    private readonly cacheManagerService: CacheManagerService,
    private readonly chatService: ChatService,
  ) {
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  private startPerformanceMonitoring(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Reset event counters every minute
    setInterval(() => {
      this.resetEventCounters();
    }, 60000);

    // Cleanup old data every 10 minutes
    setInterval(() => {
      this.cleanupOldData();
    }, 10 * 60 * 1000);

    this.logger.log('Performance monitoring started');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = new Date();
      
      // Collect queue statistics
      const queueStats = await this.messageQueueService.healthCheck();
      
      // Collect cache statistics
      const cacheStats = await this.cacheManagerService.healthCheck();
      
      // Collect database health
      const dbHealth = await this.chatService.healthCheck();
      
      // Calculate processing rates
      const processingRate = this.calculateProcessingRates();
      
      // Calculate response times
      const responseTime = this.calculateResponseTimes();
      
      // Calculate system health score
      const systemHealth = this.calculateSystemHealth(queueStats, cacheStats, dbHealth);
      
      const metrics: PerformanceMetrics = {
        timestamp,
        queueDepth: {
          high: queueStats.queues['messages.high']?.messageCount || 0,
          medium: queueStats.queues['messages.medium']?.messageCount || 0,
          low: queueStats.queues['messages.low']?.messageCount || 0,
          deadLetter: queueStats.queues['messages.dead_letter']?.messageCount || 0,
        },
        processingRate,
        systemHealth,
        cacheStats: cacheStats.stats || {
          onlineUsers: 0,
          totalRooms: 0,
          memoryUsage: '0MB',
          hitRate: 0,
        },
        responseTime,
      };

      // Store metrics
      this.metrics.push(metrics);
      
      // Check for alerts
      this.checkForAlerts(metrics);
      
      // Log summary
      this.logMetricsSummary(metrics);
      
    } catch (error) {
      this.logger.error('Error collecting performance metrics:', error);
    }
  }

  private calculateProcessingRates(): PerformanceMetrics['processingRate'] {
    const now = Date.now();
    const timeDiff = (now - this.eventCounters.lastReset) / 1000; // seconds
    
    return {
      messagesPerSecond: this.eventCounters.messages / timeDiff,
      callsPerSecond: this.eventCounters.calls / timeDiff,
      typingEventsPerSecond: this.eventCounters.typing / timeDiff,
    };
  }

  private calculateResponseTimes(): PerformanceMetrics['responseTime'] {
    if (this.responseTimes.length === 0) {
      return { average: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const average = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      average,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0,
    };
  }

  private calculateSystemHealth(
    queueStats: any,
    cacheStats: any,
    dbHealth: any
  ): PerformanceMetrics['systemHealth'] {
    const rabbitmqConnected = queueStats.connected;
    const redisConnected = cacheStats.connected;
    const databaseConnected = dbHealth.database;

    let score = 0;
    if (rabbitmqConnected) score += 0.4;
    if (redisConnected) score += 0.3;
    if (databaseConnected) score += 0.3;

    return {
      rabbitmqConnected,
      redisConnected,
      databaseConnected,
      overallScore: score,
    };
  }

  private checkForAlerts(metrics: PerformanceMetrics): void {
    const timestamp = new Date();

    // Check queue depth alerts
    if (metrics.queueDepth.high > this.thresholds.queueDepth.high) {
      this.addAlert('warning', 'High priority queue depth exceeded', timestamp, 
        'queueDepth.high', metrics.queueDepth.high, this.thresholds.queueDepth.high);
    }

    if (metrics.queueDepth.medium > this.thresholds.queueDepth.medium) {
      this.addAlert('warning', 'Medium priority queue depth exceeded', timestamp,
        'queueDepth.medium', metrics.queueDepth.medium, this.thresholds.queueDepth.medium);
    }

    if (metrics.queueDepth.low > this.thresholds.queueDepth.low) {
      this.addAlert('warning', 'Low priority queue depth exceeded', timestamp,
        'queueDepth.low', metrics.queueDepth.low, this.thresholds.queueDepth.low);
    }

    // Check response time alerts
    if (metrics.responseTime.average > this.thresholds.responseTime.average) {
      this.addAlert('warning', 'Average response time exceeded', timestamp,
        'responseTime.average', metrics.responseTime.average, this.thresholds.responseTime.average);
    }

    if (metrics.responseTime.p95 > this.thresholds.responseTime.p95) {
      this.addAlert('error', 'P95 response time exceeded', timestamp,
        'responseTime.p95', metrics.responseTime.p95, this.thresholds.responseTime.p95);
    }

    // Check system health alerts
    if (metrics.systemHealth.overallScore < this.thresholds.systemHealth.overallScore) {
      this.addAlert('error', 'System health score below threshold', timestamp,
        'systemHealth.overallScore', metrics.systemHealth.overallScore, this.thresholds.systemHealth.overallScore);
    }

    // Check dead letter queue
    if (metrics.queueDepth.deadLetter > 0) {
      this.addAlert('warning', 'Messages found in dead letter queue', timestamp,
        'queueDepth.deadLetter', metrics.queueDepth.deadLetter, 0);
    }
  }

  private addAlert(type: PerformanceAlert['type'], message: string, timestamp: Date, 
    metric: string, value: number, threshold: number): void {
    const alert: PerformanceAlert = {
      type,
      message,
      timestamp,
      metric,
      value,
      threshold,
    };

    this.alerts.push(alert);
    
    // Log alert
    const logMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'log';
    this.logger[logMethod](`Performance Alert: ${message} (${metric}: ${value} > ${threshold})`);
  }

  private logMetricsSummary(metrics: PerformanceMetrics): void {
    this.logger.debug(`Performance Summary - Health: ${(metrics.systemHealth.overallScore * 100).toFixed(1)}%, ` +
      `Queues: H:${metrics.queueDepth.high} M:${metrics.queueDepth.medium} L:${metrics.queueDepth.low}, ` +
      `Avg Response: ${metrics.responseTime.average.toFixed(0)}ms, ` +
      `Online Users: ${metrics.cacheStats.onlineUsers}`);
  }

  private resetEventCounters(): void {
    this.eventCounters = {
      messages: 0,
      calls: 0,
      typing: 0,
      lastReset: Date.now(),
    };
  }

  private cleanupOldData(): void {
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }

    // Keep only recent response times
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeHistory);
    }

    this.logger.debug('Cleaned up old performance data');
  }

  // =============== Public Methods ===============

  /**
   * Record event for performance tracking
   */
  recordEvent(eventType: 'message' | 'call' | 'typing'): void {
    switch (eventType) {
      case 'message':
        this.eventCounters.messages++;
        break;
      case 'call':
        this.eventCounters.calls++;
        break;
      case 'typing':
        this.eventCounters.typing++;
        break;
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get recent performance metrics
   */
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const currentMetrics = this.getCurrentMetrics();

    if (!currentMetrics) {
      return ['No performance data available'];
    }

    // Queue depth recommendations
    if (currentMetrics.queueDepth.high > 50) {
      recommendations.push('Consider adding more high-priority queue consumers');
    }

    if (currentMetrics.queueDepth.medium > 100) {
      recommendations.push('Consider optimizing medium-priority message processing');
    }

    // Response time recommendations
    if (currentMetrics.responseTime.average > 500) {
      recommendations.push('Response times are elevated - consider system optimization');
    }

    // System health recommendations
    if (currentMetrics.systemHealth.overallScore < 0.9) {
      recommendations.push('System health is degraded - check service connections');
    }

    // Memory recommendations
    if (currentMetrics.cacheStats.memoryUsage.includes('GB')) {
      recommendations.push('Redis memory usage is high - consider cache cleanup');
    }

    if (recommendations.length === 0) {
      recommendations.push('System performance is optimal');
    }

    return recommendations;
  }

  /**
   * Get health check status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    score: number;
    details: any;
  }> {
    const currentMetrics = this.getCurrentMetrics();
    
    if (!currentMetrics) {
      return {
        status: 'unhealthy',
        score: 0,
        details: { error: 'No metrics available' }
      };
    }

    const score = currentMetrics.systemHealth.overallScore;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (score >= 0.9) {
      status = 'healthy';
    } else if (score >= 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      score,
      details: {
        queueDepth: currentMetrics.queueDepth,
        responseTime: currentMetrics.responseTime,
        systemHealth: currentMetrics.systemHealth,
        recentAlerts: this.getRecentAlerts(5),
      }
    };
  }
} 
