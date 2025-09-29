'use client';

import { useRef, useState } from 'react';

import { formatTime } from '@/lib/dateUtils';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface ChatProps {
  messages: ChatMessage[];
  currentPlayerId?: string | null;
  onSendMessage: (message: string) => void;
  isConnected: boolean;
  className?: string;
}

export default function Chat({
  messages,
  currentPlayerId,
  onSendMessage,
  isConnected,
  className,
}: ChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suppression complète du scroll automatique

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSendMessage(newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Utilisation de la fonction utilitaire pour éviter les problèmes d'hydratation

  return (
    <div
      className={`card bg-base-200 shadow-xl h-full flex flex-col ${className}`}
    >
      <div className="card-body flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title">Chat</h3>
          <div
            className={`badge ${isConnected ? 'badge-success' : 'badge-warning'}`}
          >
            {isConnected ? 'LIVE' : 'RECONNECTING'}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💬</div>
              <p className="font-bold">No messages yet</p>
              <p className="text-sm opacity-70 mt-2">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.playerId === currentPlayerId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] card ${
                      isOwnMessage
                        ? 'bg-primary text-primary-content'
                        : 'bg-base-100'
                    }`}
                  >
                    <div className="card-body p-3">
                      {!isOwnMessage && (
                        <div className="text-xs font-bold mb-1">
                          {msg.playerName}
                        </div>
                      )}
                      <div className="text-sm">{msg.message}</div>
                      <div
                        className={`text-xs opacity-70 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}
                      >
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isSubmitting || !isConnected}
            className="input input-bordered flex-1"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSubmitting || !isConnected}
            className="btn btn-primary"
          >
            {isSubmitting ? '⏳' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
