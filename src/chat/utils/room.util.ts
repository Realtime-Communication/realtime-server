import { ConversationType } from 'src/groups/model/conversation.vm';

export class RoomUtil {
  /**
   * Get room name for friend conversations
   */
  static getFriendRoomName(userId1: number, userId2: number): string {
    const minId = Math.min(userId1, userId2);
    const maxId = Math.max(userId1, userId2);
    return `friend:${minId}:${maxId}`;
  }

  /**
   * Get room name for group conversations
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
   * Get target rooms for broadcasting
   */
  static getTargetRooms(
    conversationType: ConversationType,
    conversationId: number,
    currentUserId: number
  ): string[] {
    const roomName = this.getRoomName(conversationType, conversationId, currentUserId);
    return [roomName];
  }

  /**
   * Get user's personal room for notifications
   */
  static getUserRoomName(userId: number): string {
    return `user:${userId}`;
  }

  /**
   * Get online users room
   */
  static getOnlineUsersRoom(): string {
    return 'online-users';
  }
} 
