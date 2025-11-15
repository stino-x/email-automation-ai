"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookClient = void 0;
const facebook_chat_api_1 = __importDefault(require("facebook-chat-api"));
class FacebookClient {
    constructor(appState) {
        this.api = null;
        this.appState = null;
        try {
            this.appState = JSON.parse(appState);
        }
        catch {
            throw new Error('Invalid Facebook app state');
        }
    }
    async initialize() {
        // Use the imported facebook-chat-api
        try {
            return new Promise((resolve, reject) => {
                (0, facebook_chat_api_1.default)({ appState: this.appState }, (err, api) => {
                    if (err) {
                        reject(new Error(`Failed to initialize Facebook API: ${err.message}`));
                        return;
                    }
                    this.api = api;
                    resolve();
                });
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            throw new Error(`facebook-chat-api error: ${message}`);
        }
    }
    async getThreads() {
        if (!this.api)
            throw new Error('Facebook API not initialized');
        return new Promise((resolve, reject) => {
            this.api.getThreadList(50, (err, threads) => {
                if (err) {
                    reject(err);
                    return;
                }
                const formattedThreads = threads.map((thread) => ({
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
    async listenForMessages(callback, errorCallback) {
        if (!this.api)
            throw new Error('Facebook API not initialized');
        this.api.listen((err, message) => {
            if (err) {
                errorCallback(err);
                return;
            }
            // Format message
            const formattedMessage = {
                messageId: message.messageID,
                threadId: message.threadID,
                senderId: message.senderID,
                senderName: message.senderName || 'Unknown',
                body: message.body || '',
                timestamp: message.timestamp || Date.now(),
                attachments: (message.attachments || [])
            };
            callback(formattedMessage);
        });
    }
    async sendMessage(threadId, message) {
        if (!this.api)
            throw new Error('Facebook API not initialized');
        return new Promise((resolve, reject) => {
            this.api.sendMessage(message, threadId, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    async markAsRead(threadId) {
        if (!this.api)
            throw new Error('Facebook API not initialized');
        return new Promise((resolve, reject) => {
            this.api.markAsRead(threadId, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    async getUserInfo(userId) {
        if (!this.api)
            throw new Error('Facebook API not initialized');
        return new Promise((resolve, reject) => {
            this.api.getUserInfo(userId, (err, userInfo) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(userInfo);
            });
        });
    }
}
exports.FacebookClient = FacebookClient;
exports.default = FacebookClient;
