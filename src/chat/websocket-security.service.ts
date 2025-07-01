// security/websocket-security.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { WebSocketConfig } from './config/websocket.config';

@Injectable()
export class WebSocketSecurityService {
  private readonly logger = new Logger(WebSocketSecurityService.name);
  private suspiciousIPs = new Map<string, number>();
  private blockedIPs = new Set<string>();
  private readonly maxSuspiciousAttempts = WebSocketConfig.security.maxSuspiciousAttempts;
  private readonly blockDuration = WebSocketConfig.security.blockDuration;
  private readonly spamPatterns = WebSocketConfig.security.spamPatterns;

  /**
   * Check if IP address is secure for connection
   */
  checkIPSecurity(ip: string): boolean {
    if (this.blockedIPs.has(ip)) {
      this.logger.warn(`Blocked IP ${ip} attempted connection`);
      return false;
    }

    const attempts = this.suspiciousIPs.get(ip) || 0;
    return attempts < this.maxSuspiciousAttempts;
  }

  /**
   * Mark suspicious activity from an IP
   */
  markSuspiciousActivity(ip: string): void {
    const current = this.suspiciousIPs.get(ip) || 0;
    this.suspiciousIPs.set(ip, current + 1);

    if (current + 1 >= this.maxSuspiciousAttempts) {
      this.blockIP(ip);
    }
  }

  /**
   * Block an IP address
   */
  private blockIP(ip: string): void {
    this.blockedIPs.add(ip);
    this.logger.warn(`IP ${ip} has been blocked due to suspicious activity`);

    // Auto-unblock after duration
    setTimeout(() => {
      this.unblockIP(ip);
    }, this.blockDuration);
  }

  /**
   * Unblock an IP address
   */
  private unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    this.logger.log(`IP ${ip} has been unblocked`);
  }

  /**
   * Filter content for security (remove scripts, etc.)
   */
  filterContent(content: string): string {
    if (!content) return content;

    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Check if content is spam
   */
  isSpamContent(content: string): boolean {
    if (!content) return false;

    return this.spamPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Validate message rate limiting per user
   */
  checkMessageRateLimit(userId: number): boolean {
    const key = `message_rate_${userId}`;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Get or create user's message timestamps
    const timestamps = this.getUserMessageTimestamps(key);
    
    // Remove old timestamps
    const recentTimestamps = timestamps.filter(ts => ts > windowStart);
    
    // Check if under limit (e.g., 30 messages per minute)
    if (recentTimestamps.length >= 30) {
      this.logger.warn(`Rate limit exceeded for user ${userId}`);
      return false;
    }

    // Add current timestamp
    recentTimestamps.push(now);
    this.setUserMessageTimestamps(key, recentTimestamps);

    return true;
  }

  /**
   * Validate file upload security
   */
  validateFileUpload(filename: string, mimeType: string, fileSize: number): boolean {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx'];
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    // Check file size
    if (fileSize > maxFileSize) {
      this.logger.warn(`File size ${fileSize} exceeds limit for ${filename}`);
      return false;
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(mimeType)) {
      this.logger.warn(`Invalid MIME type ${mimeType} for ${filename}`);
      return false;
    }

    // Check file extension
    const hasAllowedExtension = allowedExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );

    if (!hasAllowedExtension) {
      this.logger.warn(`Invalid file extension for ${filename}`);
      return false;
    }

    return true;
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    suspiciousIPs: number;
    blockedIPs: number;
    totalAttempts: number;
  } {
    const totalAttempts = Array.from(this.suspiciousIPs.values())
      .reduce((sum, attempts) => sum + attempts, 0);

    return {
      suspiciousIPs: this.suspiciousIPs.size,
      blockedIPs: this.blockedIPs.size,
      totalAttempts,
    };
  }

  /**
   * Clear all security data (for testing or maintenance)
   */
  clearSecurityData(): void {
    this.suspiciousIPs.clear();
    this.blockedIPs.clear();
    this.logger.log('Security data cleared');
  }

  // Private helper methods for rate limiting storage
  private messageTimestamps = new Map<string, number[]>();

  private getUserMessageTimestamps(key: string): number[] {
    return this.messageTimestamps.get(key) || [];
  }

  private setUserMessageTimestamps(key: string, timestamps: number[]): void {
    this.messageTimestamps.set(key, timestamps);
    
    // Clean up old entries periodically
    if (timestamps.length === 0) {
      this.messageTimestamps.delete(key);
    }
  }
}
