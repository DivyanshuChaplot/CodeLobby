import React, { useState, useEffect } from 'react';
import { Terminal, Users, Cpu } from 'lucide-react';

export default function RoomLogin({ onJoin }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const [loadedFromUrl, setLoadedFromUrl] = useState(false);
  const [customBackendUrl, setCustomBackendUrl] = useState(localStorage.getItem('codelobby_backend_url') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [backendOnline, setBackendOnline] = useState(null); // null = checking, true = online, false = offline

  const getAutoDetectedBackendUrl = () => {
    return import.meta.env.VITE_BACKEND_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:5000` : window.location.origin);
  };

  const activeBackendUrl = customBackendUrl.trim() || getAutoDetectedBackendUrl();

  useEffect(() => {
    setBackendOnline(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(activeBackendUrl, { method: 'GET', signal: controller.signal })
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [activeBackendUrl]);

  const checkStatus = () => {
    setBackendOnline(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(activeBackendUrl, { method: 'GET', signal: controller.signal })
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false))
      .finally(() => clearTimeout(timeoutId));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('roomId');
    if (roomParam) {
      setRoomId(roomParam.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
      setLoadedFromUrl(true);
    }
  }, []);

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

    if (customBackendUrl.trim()) {
      localStorage.setItem('codelobby_backend_url', customBackendUrl.trim());
    } else {
      localStorage.removeItem('codelobby_backend_url');
    }

    onJoin({ 
      roomId: roomId.trim().toLowerCase(), 
      username: username.trim(),
      customBackendUrl: customBackendUrl.trim()
    });
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
        {`[SYSTEM STATUS: ${backendOnline === true ? 'ONLINE' : backendOnline === false ? 'OFFLINE' : 'CHECKING'}]\n[THEME: LIGHT_YELLOW]\n[WHITEBOARD: READY]\n[SERVER_URL: ${activeBackendUrl}]`}
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
              onChange={(e) => {
                setRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                if (loadedFromUrl) setLoadedFromUrl(false);
              }}
              style={{ border: '2px solid #e0e0e0', color: '#111111' }}
            />
            {loadedFromUrl && (
              <span style={{
                fontSize: '0.75rem',
                color: '#a38200',
                fontWeight: 'bold',
                display: 'inline-block',
                marginTop: '0.3rem'
              }}>
                ✓ Room ID loaded automatically from invitation link!
              </span>
            )}
          </div>

          {/* Pre-flight Connectivity Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            border: '2px dashed #ffd600',
            padding: '0.5rem 0.8rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            borderRadius: '2px',
            color: '#111111'
          }}>
            <span style={{ color: '#555555' }}>Backend Server:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: backendOnline === true ? '#00c853' : backendOnline === false ? '#ff4d4d' : '#ffb300',
                display: 'inline-block'
              }} />
              <span style={{
                color: backendOnline === true ? '#00c853' : backendOnline === false ? '#ff4d4d' : '#ffb300',
                textTransform: 'uppercase'
              }}>
                {backendOnline === true ? 'Online' : backendOnline === false ? 'Offline' : 'Checking...'}
              </span>
            </div>
          </div>

          {/* Advanced Backend Configuration Toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                alignSelf: 'flex-start',
                background: 'none',
                border: 'none',
                color: '#888888',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                textDecoration: 'underline'
              }}
            >
              {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
            </button>

            {showAdvanced && (
              <div style={{
                backgroundColor: '#ffffff',
                border: '2px solid #ffd600',
                padding: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                borderRadius: '2px',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <label style={{ fontSize: '0.65rem', color: '#111111', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Custom Backend Server URL
                </label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="e.g. https://my-backend.onrender.com"
                  value={customBackendUrl}
                  onChange={(e) => setCustomBackendUrl(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    border: '2px solid #e5e5e5',
                    color: '#111111'
                  }}
                />
                <span style={{ fontSize: '0.6rem', color: '#888888', fontStyle: 'italic' }}>
                  Leave blank to auto-detect backend URL.
                </span>
                <button
                  type="button"
                  onClick={checkStatus}
                  style={{
                    alignSelf: 'flex-start',
                    background: '#111111',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.65rem',
                    padding: '0.2rem 0.5rem',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    marginTop: '0.2rem'
                  }}
                >
                  Test Connection
                </button>
              </div>
            )}
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
