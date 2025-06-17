// security/websocket-security.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebSocketSecurityService {
  private readonly logger = new Logger(WebSocketSecurityService.name);
  private suspiciousIPs = new Map<string, number>();
  private blockedIPs = new Set<string>();
  private readonly MAX_SUSPICIOUS_ATTEMPTS = 10;
  private readonly BLOCK_DURATION = 3600000; // 1 hour

  checkIPSecurity(ip: string): boolean {
    if (this.blockedIPs.has(ip)) {
      this.logger.warn(`Blocked IP ${ip} attempted connection`);
      return false;
    }

    const attempts = this.suspiciousIPs.get(ip) || 0;
    return attempts < this.MAX_SUSPICIOUS_ATTEMPTS;
  }

  markSuspiciousActivity(ip: string) {
    const current = this.suspiciousIPs.get(ip) || 0;
    this.suspiciousIPs.set(ip, current + 1);

    if (current + 1 >= this.MAX_SUSPICIOUS_ATTEMPTS) {
      this.blockedIPs.add(ip);
      this.logger.warn(`IP ${ip} has been blocked due to suspicious activity`);

      // Auto-unblock after duration
      setTimeout(() => {
        this.blockedIPs.delete(ip);
        this.suspiciousIPs.delete(ip);
        this.logger.log(`IP ${ip} has been unblocked`);
      }, this.BLOCK_DURATION);
    }
  }

  filterContent(content: string): string {
    if (!content) return content;

    // Remove potentially dangerous content
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  isSpamContent(content: string): boolean {
    const spamPatterns = [
      /(.)\1{10,}/g, // Repeated characters
      /(https?:\/\/[^\s]+){3,}/g, // Multiple URLs
      /FREE|URGENT|CLICK HERE|LIMITED TIME/gi, // Common spam keywords
    ];

    return spamPatterns.some(pattern => pattern.test(content));
  }
}
