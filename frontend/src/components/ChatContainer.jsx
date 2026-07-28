import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Users } from 'lucide-react';

export default function ChatContainer({ socket, roomId, users, chatMessages }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (socket) {
      socket.emit('send-message', { roomId, message: message.trim() });
      setMessage('');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#ffffff',
      borderTop: '2px solid #ffd600'
    }}>
      {/* Collaborators List Panel */}
      <div style={{
        padding: '0.8rem 1rem',
        borderBottom: '2px solid #e5e5e5',
        background: '#f9f9f9'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#111111',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          marginBottom: '0.5rem'
        }}>
          <Users size={12} style={{ color: '#ffd600' }} />
          <span>Lobby Coders ({Object.keys(users).length})</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {Object.entries(users).map(([id, user]) => (
            <div
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                backgroundColor: '#ffffff',
                border: `2px solid ${user.color}`,
                padding: '0.15rem 0.5rem',
                borderRadius: '2px',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#111111'
              }}
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: user.color,
                boxShadow: `0 0 4px ${user.color}`
              }} />
              {user.name}
            </div>
          ))}
        </div>
      </div>

      {/* Messages List Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.8rem',
        background: '#ffffff'
      }}>
        {chatMessages.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888888',
            fontSize: '0.75rem',
            textAlign: 'center',
            gap: '0.4rem',
            opacity: 0.8
          }}>
            <MessageSquare size={20} style={{ color: '#ffd600' }} />
            <span>Lobby feed is empty.<br />Start discussing code!</span>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{
                  color: msg.senderColor === '#FFFFFF' ? '#555555' : msg.senderColor, // Prevent white name on white background
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}>
                  {msg.senderName}
                </span>
                <span style={{ color: '#888888', fontSize: '0.6rem' }}>{msg.timestamp}</span>
              </div>
              <div style={{
                backgroundColor: '#f9f9f9',
                borderLeft: `3px solid ${msg.senderColor === '#FFFFFF' ? '#ffd600' : msg.senderColor}`,
                padding: '0.4rem 0.6rem',
                fontSize: '0.8rem',
                color: '#111111',
                lineHeight: 1.35,
                wordBreak: 'break-word',
                fontFamily: msg.text.startsWith('`') ? 'monospace' : 'inherit'
              }}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Sender Form */}
      <form onSubmit={handleSend} style={{
        padding: '0.8rem',
        background: '#f9f9f9',
        borderTop: '2px solid #e5e5e5',
        display: 'flex',
        gap: '0.4rem'
      }}>
        <input
          type="text"
          className="cyber-input"
          placeholder="Type coords (message)..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ padding: '0.5rem 0.7rem', fontSize: '0.8rem', border: '2px solid #e5e5e5' }}
        />
        <button type="submit" className="cyber-button" style={{ padding: '0.5rem 0.7rem' }}>
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
