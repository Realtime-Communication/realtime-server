import { ConversationType } from 'src/groups/model/conversation.vm';

export class RoomUtil {
  /**
   * Generate consistent room name for friend conversations
   */
  static getFriendRoomName(userId1: number, userId2: number): string {
    const minId = Math.min(userId1, userId2);
    const maxId = Math.max(userId1, userId2);
    return `friend:${minId}:${maxId}`;
  }

  /**
   * Generate room name for group conversations
   */
  static getGroupRoomName(groupId: number): string {
    return `group:${groupId}`;
  }

  /**
   * Get room name based on conversation type
   */
  static getRoomName(
    conversationType: ConversationType,
    conversationId: number,
    currentUserId?: number
  ): string {
    if (conversationType === ConversationType.FRIEND && currentUserId) {
      return this.getFriendRoomName(currentUserId, conversationId);
    }
    return this.getGroupRoomName(conversationId);
  }

  /**
   * Get all room names a user should join for a conversation
   */
  static getTargetRooms(
    conversationType: ConversationType,
    conversationId: number,
    currentUserId: number,
    includeUserSocket = false
  ): string[] {
    const rooms: string[] = [];

    if (conversationType === ConversationType.FRIEND) {
      rooms.push(this.getFriendRoomName(currentUserId, conversationId));
    } else {
      rooms.push(this.getGroupRoomName(conversationId));
    }

    if (includeUserSocket) {
      rooms.push(`user:${currentUserId}`);
    }

    return rooms;
  }

  /**
   * Parse room name to extract information
   */
  static parseRoomName(roomName: string): {
    type: 'friend' | 'group' | 'user';
    id: number;
    friendId?: number;
  } | null {
    // Friend room: friend:1:2
    const friendMatch = roomName.match(/^friend:(\d+):(\d+)$/);
    if (friendMatch) {
      return {
        type: 'friend',
        id: parseInt(friendMatch[1]),
        friendId: parseInt(friendMatch[2]),
      };
    }

    // Group room: group:123
    const groupMatch = roomName.match(/^group:(\d+)$/);
    if (groupMatch) {
      return {
        type: 'group',
        id: parseInt(groupMatch[1]),
      };
    }

    // User room: user:123
    const userMatch = roomName.match(/^user:(\d+)$/);
    if (userMatch) {
      return {
        type: 'user',
        id: parseInt(userMatch[1]),
      };
    }

    return null;
  }

  /**
   * Get presence room name for user status
   */
  static getPresenceRoomName(userId: number): string {
    return `presence:${userId}`;
  }

  /**
   * Get notification room name for user
   */
  static getNotificationRoomName(userId: number): string {
    return `notifications:${userId}`;
  }
} 
