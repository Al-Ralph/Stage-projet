// shared/services/websocket.ts
import { Server } from 'socket.io';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';

export class WebSocketService {
  private io: Server;
  private redis: Redis;
  private userSockets: Map<string, Set<string>>;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.userSockets = new Map();
  }
  
  initialize(server: any): void {
    this.io = new Server(server, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      }
    });
    
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as any;
        socket.data.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
    
    this.io.on('connection', (socket) => {
      const userId = socket.data.user.userId;
      
      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(socket.id);
      
      // Join user room
      socket.join(`user:${userId}`);
      
      // Handle disconnection
      socket.on('disconnect', () => {
        this.userSockets.get(userId)?.delete(socket.id);
        if (this.userSockets.get(userId)?.size === 0) {
          this.userSockets.delete(userId);
        }
      });
      
      // Custom events
      socket.on('join:course', (courseId: string) => {
        socket.join(`course:${courseId}`);
      });
      
      socket.on('join:thread', (threadId: string) => {
        socket.join(`thread:${threadId}`);
      });
      
      socket.on('join:group', (groupId: string) => {
        socket.join(`group:${groupId}`);
      });
    });
  }
  
  sendToUser(userId: string, data: any): void {
    this.io.to(`user:${userId}`).emit('notification', data);
  }
  
  broadcast(room: string, data: any): void {
    this.io.to(room).emit('update', data);
  }
}