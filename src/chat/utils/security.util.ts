export class SecurityUtil {
  private static readonly MAX_MESSAGE_LENGTH = 1000;
  private static readonly MAX_MESSAGES_PER_MINUTE = 20;
  private static readonly BLOCKED_WORDS = ['spam', 'bot', 'fake'];

  private static userMessageCounts = new Map<
    number,
    { count: number; resetTime: number }
  >();

  /**
   * Check if user is rate limited
   */
  static checkRateLimit(userId: number): boolean {
    const now = Date.now();
    const userCount = this.userMessageCounts.get(userId);

    if (!userCount || now > userCount.resetTime) {
      this.userMessageCounts.set(userId, {
        count: 1,
        resetTime: now + 60000, // 1 minute
      });
      return true;
    }

    if (userCount.count >= this.MAX_MESSAGES_PER_MINUTE) {
      return false;
    }

    userCount.count++;
    return true;
  }

  /**
   * Filter and sanitize message content
   */
  static filterContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Trim and limit length
    let filtered = content.trim().substring(0, this.MAX_MESSAGE_LENGTH);

    // Remove potential XSS
    filtered = filtered.replace(/<script[^>]*>.*?<\/script>/gi, '');
    filtered = filtered.replace(/<[^>]*>/g, '');

    // Filter blocked words
    this.BLOCKED_WORDS.forEach((word) => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });

    return filtered;
  }

  /**
   * Check if content is spam
   */
  static isSpamContent(content: string): boolean {
    if (!content) return false;

    // Check for repeated characters
    if (/(.)\1{10,}/.test(content)) {
      return true;
    }

    // Check for multiple URLs
    const urlCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlCount > 2) {
      return true;
    }

    // Check for excessive caps
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    if (capsCount > content.length * 0.7 && content.length > 10) {
      return true;
    }

    return false;
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    filename: string,
    mimeType: string,
    size: number,
  ): boolean {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'text/plain',
    ];

    // Check file size
    if (size > MAX_FILE_SIZE) {
      return false;
    }

    // Check mime type
    if (!ALLOWED_TYPES.includes(mimeType)) {
      return false;
    }

    // Check filename
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return false;
    }

    return true;
  }

  /**
   * Clean up old rate limit data
   */
  static cleanupRateLimitData(): void {
    const now = Date.now();
    for (const [userId, data] of this.userMessageCounts.entries()) {
      if (now > data.resetTime) {
        this.userMessageCounts.delete(userId);
      }
    }
  }
}
