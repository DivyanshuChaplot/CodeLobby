import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import RoomLogin from './components/RoomLogin';
import EditorContainer from './components/EditorContainer';
import WhiteboardContainer from './components/WhiteboardContainer';
import ChatContainer from './components/ChatContainer';
import CodeMap from './components/CodeMap';
import { Terminal, Edit2, Share2, LogOut, Copy, Check, MessageSquare, Network, Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from 'lucide-react';


export default function App() {
  const [session, setSession] = useState(null); // { roomId, username }
  const [socket, setSocket] = useState(null);
  const [myId, setMyId] = useState('');
  
  // App states synchronized via socket
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  
  // UI States
  const [copied, setCopied] = useState(false);

  // WebRTC Audio/Video Call states
  const [inCall, setInCall] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoCameraOff, setVideoCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // socketId -> RTCPeerConnection
  const editorRef = useRef(null);

  // Start Media Call (Audio + Video)
  const startCall = async () => {
    if (!socket || !session) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setInCall(true);
      setAudioMuted(false);
      setVideoCameraOff(false);

      socket.emit('send-message', {
        roomId: session.roomId,
        message: '📹 Joined the lobby video call.'
      });

      // Signal to other users in the room to initiate connection
      Object.keys(users).forEach((userId) => {
        if (userId !== myId) {
          initiatePeerConnection(userId, stream, true);
        }
      });
    } catch (err) {
      alert(`Camera/Mic permission denied or device error: ${err.message}`);
    }
  };

  // Stop Call
  const stopCall = () => {
    setInCall(false);
    setLocalStream(null);
    setRemoteStreams({});
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    Object.entries(peersRef.current).forEach(([userId, peer]) => {
      peer.close();
    });
    peersRef.current = {};

    if (socket && session) {
      socket.emit('send-message', {
        roomId: session.roomId,
        message: '🔇 Left the video call.'
      });
    }
  };

  // Toggle Mic
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoCameraOff(!videoTrack.enabled);
      }
    }
  };

  const initiatePeerConnection = (targetUserId, stream, isInitiator) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peersRef.current[targetUserId] = peer;

    // Add local stream tracks to peer connection
    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    peer.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc-signal', {
          targetSocketId: targetUserId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    peer.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => ({ ...prev, [targetUserId]: remoteStream }));
    };

    if (isInitiator) {
      peer.createOffer().then((offer) => {
        return peer.setLocalDescription(offer);
      }).then(() => {
        if (socket) {
          socket.emit('webrtc-signal', {
            targetSocketId: targetUserId,
            signal: { type: 'offer', sdp: peer.localDescription }
          });
        }
      });
    }

    return peer;
  };

  // Connect to Socket.io and attach events
  useEffect(() => {
    if (!session) return;

    // Connect to local Node Express server
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', {
        roomId: session.roomId,
        username: session.username
      });
    });

    newSocket.on('room-init', (data) => {
      setCode(data.code);
      setLanguage(data.language);
      setUsers(data.users);
      setChatMessages(data.chatMessages);
      setMyId(data.myId);
    });

    newSocket.on('user-joined', ({ userId, user }) => {
      setUsers((prev) => ({ ...prev, [userId]: user }));
      
      // If we are in call, connect to the new joiner
      if (localStreamRef.current) {
        initiatePeerConnection(userId, localStreamRef.current, true);
      }
    });

    newSocket.on('user-left', ({ userId, username }) => {
      setUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      // Cleanup remote connection
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
      }
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    newSocket.on('receive-message', (message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // Handle incoming WebRTC signals
    newSocket.on('webrtc-signal-receive', async ({ senderSocketId, signal }) => {
      let peer = peersRef.current[senderSocketId];

      if (!peer && localStreamRef.current) {
        peer = initiatePeerConnection(senderSocketId, localStreamRef.current, false);
      }

      if (!peer) return;

      try {
        if (signal.type === 'offer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          newSocket.emit('webrtc-signal', {
            targetSocketId: senderSocketId,
            signal: { type: 'answer', sdp: peer.localDescription }
          });
        } else if (signal.type === 'answer') {
          await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate') {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('WebRTC signal handling failed:', err);
      }
    });

    return () => {
      newSocket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(peersRef.current).forEach((peer) => peer.close());
    };
  }, [session]);

  // Hook RTC signaling inside server to bridge signals
  useEffect(() => {
    if (!socket) return;
    
    socket.on('webrtc-signal-bridge', (data) => {
      socket.emit('webrtc-signal-receive', data);
    });

    return () => {
      socket.off('webrtc-signal-bridge');
    };
  }, [socket]);

  // Handle clicking AST Code Map items to jump user's editor line
  const handleSelectLine = (line) => {
    const editor = editorRef.current;
    if (editor) {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    }
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(session.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    stopCall();
    setSession(null);
    setSocket(null);
    setCode('');
    setUsers({});
    setChatMessages([]);
  };

  if (!session) {
    return <RoomLogin onJoin={(data) => setSession(data)} />;
  }

  return (
    <div className="app-container">
      {/* Sleek Light Cyber Header */}
      <header className="header" style={{ borderBottom: '2px solid #ffd600' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 className="logo-text cyber-glow">
            CODE<span>LOBBY</span>
          </h1>
        </div>

        {/* Room actions & call indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Call Status & Controls */}
          {inCall ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={toggleMute}
                className={audioMuted ? 'cyber-button-white' : 'cyber-button'}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem' }}
                title={audioMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {audioMuted ? <MicOff size={12} /> : <Mic size={12} />}
              </button>
              <button
                onClick={toggleCamera}
                className={videoCameraOff ? 'cyber-button-white' : 'cyber-button'}
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.7rem' }}
                title={videoCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {videoCameraOff ? <VideoOff size={12} /> : <Video size={12} />}
              </button>
              <button
                onClick={stopCall}
                className="cyber-button pulse-yellow-effect"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
              >
                <PhoneOff size={12} />
                LEAVE CALL
              </button>
            </div>
          ) : (
            <button
              onClick={startCall}
              className="cyber-button"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: '#000000' }}
            >
              <Video size={12} />
              JOIN VIDEO CALL
            </button>
          )}

          {/* Workspace ID Copy Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#f9f9f9',
            border: '2px solid #ffd600',
            padding: '0.4rem 0.8rem',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: '#111111'
          }}>
            <span style={{ color: '#555555', fontWeight: 'bold' }}>KEY:</span>
            <span style={{ color: '#000000', fontWeight: 'bold' }}>{session.roomId}</span>
            <button
              onClick={copyRoomLink}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? '#ffd600' : '#000000',
                cursor: 'pointer',
                marginLeft: '0.2rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />}
            </button>
          </div>

          <button onClick={handleLogout} className="cyber-button-white" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
            <LogOut size={12} />
            EXIT
          </button>
        </div>
      </header>

      {/* Main Workspace Frame - Multi-Panel side-by-side Dashboard */}
      <div className="workspace-grid">
        {/* Left Column: Flow Map (Top half) & Chat Feed (Bottom half) */}
        <aside className="sidebar-panel">
          <div style={{ borderBottom: '2px solid #e5e5e5', overflowY: 'auto' }}>
            <CodeMap
              code={code}
              language={language}
              onSelectLine={handleSelectLine}
            />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <ChatContainer
              socket={socket}
              roomId={session.roomId}
              users={users}
              chatMessages={chatMessages}
            />
          </div>
        </aside>

        {/* Center Column: Monaco Editor (Top) & Compiler Output (Bottom) */}
        <main className="workspace-center">
          <div className="tab-content" style={{ borderRight: '2px solid #e5e5e5' }}>
            <EditorContainer
              socket={socket}
              roomId={session.roomId}
              code={code}
              setCode={setCode}
              language={language}
              setLanguage={setLanguage}
              editorRef={editorRef}
              users={users}
            />
          </div>
        </main>

        {/* Right Column: Collaborative Whiteboard + Live Video Feed Grid */}
        <aside className="whiteboard-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* WebRTC Video Grid (shows when inCall) */}
          {inCall && (
            <div style={{
              padding: '0.8rem',
              backgroundColor: '#f9f9f9',
              borderBottom: '2px solid #ffd600',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#111111', textTransform: 'uppercase' }}>
                🎥 Live Video Feeds
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.5rem'
              }}>
                {/* Local Camera Video */}
                <div style={{
                  position: 'relative',
                  aspectRatio: '4/3',
                  backgroundColor: '#000000',
                  border: '2px solid #ffd600',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  {localStream && !videoCameraOff ? (
                    <video
                      ref={(el) => { if (el) el.srcObject = localStream; }}
                      autoPlay
                      muted
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '0.7rem'
                    }}>
                      Camera Off
                    </div>
                  )}
                  <div style={{
                    position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: '#ffffff', fontSize: '0.65rem', padding: '1px 4px', borderRadius: '1px'
                  }}>
                    You ({session.username}) {audioMuted && '🔇'}
                  </div>
                </div>

                {/* Remote Cameras Video */}
                {Object.entries(remoteStreams).map(([userId, stream]) => {
                  const user = users[userId] || { name: 'Collaborator' };
                  return (
                    <div
                      key={userId}
                      style={{
                        position: 'relative',
                        aspectRatio: '4/3',
                        backgroundColor: '#000000',
                        border: `2px solid ${user.color || '#ffd600'}`,
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}
                    >
                      <video
                        ref={(el) => { if (el) el.srcObject = stream; }}
                        autoPlay
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(0,0,0,0.6)', color: '#ffffff', fontSize: '0.65rem', padding: '1px 4px', borderRadius: '1px'
                      }}>
                        {user.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Whiteboard Workspace below the videos */}
          <div style={{ flex: 1 }}>
            <WhiteboardContainer
              socket={socket}
              roomId={session.roomId}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
