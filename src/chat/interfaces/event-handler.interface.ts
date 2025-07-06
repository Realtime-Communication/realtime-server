import { AuthenticatedSocket } from '../guards/ws-jwt.guard';

export interface BaseEventHandler {
  handle(client: AuthenticatedSocket, data: any): Promise<void>;
}

export interface EventHandlerResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export interface EventContext {
  client: AuthenticatedSocket;
  eventName: string;
  data: any;
  timestamp: Date;
}

export interface BroadcastOptions {
  targetRooms: string[];
  excludeClient?: string;
  timeout?: number;
}

export interface EventHandlerMetadata {
  name: string;
  description: string;
  rateLimited?: boolean;
  requiresAuth?: boolean;
  validationSchema?: any;
} 
