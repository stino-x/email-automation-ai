// Facebook Messenger Client
// This module handles Facebook Messenger API interactions
import type { FacebookMessage, FacebookThread } from '../../types/facebook';
import facebookChatApi from 'facebook-chat-api';

interface FacebookRawMessage {
  messageID: string;
  threadID: string;
  senderID: string;
  senderName?: string;
  body?: string;
  timestamp?: number;
  attachments?: unknown[];
}

interface FacebookRawThread {
  threadID: string;
  name?: string;
  isGroup: boolean;
  participantIDs?: string[];
  timestamp: number;
}

interface FacebookUserInfo {
  [userId: string]: {
    name: string;
    [key: string]: unknown;
  };
}

interface FacebookAPI {
  listen: (callback: (err: Error | null, message: FacebookRawMessage) => void) => void;
  sendMessage: (message: string, threadId: string, callback?: (err: Error | null) => void) => void;
  getThreadList: (count: number, callback: (err: Error | null, threads: FacebookRawThread[]) => void) => void;
  getUserInfo: (userId: string, callback: (err: Error | null, userInfo: FacebookUserInfo) => void) => void;
  markAsRead: (threadId: string, callback?: (err: Error | null) => void) => void;
}

export class FacebookClient {
  private api: FacebookAPI | null = null;
  private appState: object | null = null;

  constructor(appState: string) {
    try {
      this.appState = JSON.parse(appState);
    } catch {
      throw new Error('Invalid Facebook app state');
    }
  }

  async initialize(): Promise<void> {
    // Use the imported facebook-chat-api
    try {
      return new Promise((resolve, reject) => {
        facebookChatApi({ appState: this.appState }, (err: Error | null, api: unknown) => {
          if (err) {
            reject(new Error(`Failed to initialize Facebook API: ${err.message}`));
            return;
          }
          this.api = api as FacebookAPI;
          resolve();
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new Error(`facebook-chat-api error: ${message}`);
    }
  }

  async getThreads(): Promise<FacebookThread[]> {
    if (!this.api) throw new Error('Facebook API not initialized');

    return new Promise((resolve, reject) => {
      this.api!.getThreadList(50, (err, threads) => {
        if (err) {
          reject(err);
          return;
        }

        const formattedThreads: FacebookThread[] = threads.map((thread) => ({
          threadId: thread.threadID,
          name: thread.name || 'Unknown',
          type: thread.isGroup ? 'group' : 'dm',
          participantCount: thread.participantIDs?.length,
          lastMessageTime: thread.timestamp.toString()
        }));

        resolve(formattedThreads);
      });
    });
  }

  async listenForMessages(
    callback: (message: FacebookMessage) => void,
    errorCallback: (error: Error) => void
  ): Promise<void> {
    if (!this.api) throw new Error('Facebook API not initialized');

    this.api.listen((err, message) => {
      if (err) {
        errorCallback(err);
        return;
      }

      // Format message
      const formattedMessage: FacebookMessage = {
        messageId: message.messageID,
        threadId: message.threadID,
        senderId: message.senderID,
        senderName: message.senderName || 'Unknown',
        body: message.body || '',
        timestamp: message.timestamp || Date.now(),
        attachments: (message.attachments || []) as { type: string; url?: string }[]
      };

      callback(formattedMessage);
    });
  }

  async sendMessage(threadId: string, message: string): Promise<void> {
    if (!this.api) throw new Error('Facebook API not initialized');

    return new Promise((resolve, reject) => {
      this.api!.sendMessage(message, threadId, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async markAsRead(threadId: string): Promise<void> {
    if (!this.api) throw new Error('Facebook API not initialized');

    return new Promise((resolve, reject) => {
      this.api!.markAsRead(threadId, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async getUserInfo(userId: string): Promise<FacebookUserInfo> {
    if (!this.api) throw new Error('Facebook API not initialized');

    return new Promise((resolve, reject) => {
      this.api!.getUserInfo(userId, (err, userInfo) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(userInfo);
      });
    });
  }
}

export default FacebookClient;
