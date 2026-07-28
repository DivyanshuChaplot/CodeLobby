import React, { useState } from 'react';
import { Terminal, Users, Cpu } from 'lucide-react';

export default function RoomLogin({ onJoin }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRoomId(result);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!roomId.trim()) {
      setError('Workspace/Room ID is required.');
      return;
    }
    onJoin({ roomId: roomId.trim().toLowerCase(), username: username.trim() });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Matrix Background details in Light Yellow */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        color: 'rgba(255, 214, 0, 0.2)',
        pointerEvents: 'none',
        whiteSpace: 'pre'
      }}>
        {`CODELOBBY_SYS_INIT\nAUTH_LEVEL = HIGH\nSTATUS = WAITING_FOR_USER\nIP_LOOKUP: LOCALHOST\nPORT: 5000`}
      </div>

      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '5%',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        color: 'rgba(255, 214, 0, 0.2)',
        pointerEvents: 'none',
        whiteSpace: 'pre'
      }}>
        {`[SYSTEM STATUS: ONLINE]\n[THEME: LIGHT_YELLOW]\n[WHITEBOARD: READY]\n[WEBSOCKET: DISCONNECTED]`}
      </div>

      {/* Main card */}
      <div className="cyber-border pulse-yellow-effect" style={{
        width: '100%',
        maxWidth: '460px',
        background: '#f9f9f9',
        padding: '2.5rem',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        borderRadius: '4px',
        border: '2px solid #ffd600'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 className="logo-text cyber-glow" style={{ fontSize: '2.5rem', marginBottom: '0.3rem', color: '#000000' }}>
            CODE<span style={{ color: '#ffd600' }}>LOBBY</span>
          </h1>
          <p style={{
            fontSize: '0.8rem',
            color: '#111111',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            fontWeight: 700
          }}>
            Collaborative Cyber Workspace
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', color: '#000000', fontWeight: 'bold', textTransform: 'uppercase' }}>
              COLLABORATOR ALIAS (NAME)
            </label>
            <input
              type="text"
              className="cyber-input"
              placeholder="e.g. Neo, Trinity..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              style={{ border: '2px solid #e0e0e0', color: '#111111' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', color: '#000000', fontWeight: 'bold', textTransform: 'uppercase' }}>
                WORKSPACE KEY (ROOM ID)
              </label>
              <button
                type="button"
                onClick={generateRoomId}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#555555',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textTransform: 'uppercase',
                  fontWeight: 700
                }}
                onMouseOver={(e) => e.target.style.color = '#ffd600'}
                onMouseOut={(e) => e.target.style.color = '#555555'}
              >
                Auto Generate Key
              </button>
            </div>
            <input
              type="text"
              className="cyber-input"
              placeholder="Enter room ID or paste key..."
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              style={{ border: '2px solid #e0e0e0', color: '#111111' }}
            />
          </div>

          {error && (
            <p style={{
              color: '#d62828',
              fontSize: '0.85rem',
              fontWeight: 700,
              padding: '0.5rem',
              border: '2px solid #ffd600',
              textAlign: 'center',
              backgroundColor: 'rgba(255, 214, 0, 0.1)'
            }}>
              ERROR: {error}
            </p>
          )}

          <button type="submit" className="cyber-button" style={{ justifyContent: 'center', marginTop: '0.5rem', width: '100%', padding: '1rem', color: '#000000' }}>
            <Terminal size={18} />
            ENTER WORKSPACE
          </button>
        </form>

        <div style={{
          borderTop: '2px solid #e5e5e5',
          paddingTop: '1.2rem',
          display: 'flex',
          justifyContent: 'space-around',
          fontSize: '0.8rem',
          color: '#555555',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={16} style={{ color: '#ffd600' }} />
            <span>2-10 peers</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            <Cpu size={16} style={{ color: '#111111' }} />
            <span>Multi-Panel Grid</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            <Terminal size={16} style={{ color: '#ffd600' }} />
            <span>Node/Py runner</span>
          </div>
        </div>
      </div>
    </div>
  );
}
