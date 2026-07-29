import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader, Terminal as TerminalIcon, Eye } from 'lucide-react';

const LANGUAGE_TEMPLATES = {
  javascript: `// Welcome to CodeLobby JavaScript Sandbox!\nconsole.log("Hello from JavaScript!");`,
  python: `# Welcome to CodeLobby Python Sandbox!\nprint("Hello from Python!")`,
  cpp: `// C++ Environment (requires g++ compiler installed on host system)\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello C++ from CodeLobby!" << endl;\n    return 0;\n}`,
  c: `// C Environment (requires gcc compiler installed on host system)\n#include <stdio.h>\n\nint main() {\n    printf("Hello C from CodeLobby!\\n");\n    return 0;\n}`,
  java: `// Java Environment (requires JDK installed on host system)\n// Keep Class Name as Main!\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello Java from CodeLobby!");\n    }\n}`,
  html: `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>Lobby Live Preview</title>\n  <style>\n    body {\n      background-color: #ffffff;\n      color: #111111;\n      font-family: system-ui, sans-serif;\n      padding: 2rem;\n      text-align: center;\n    }\n    h1 {\n      color: #ffd600;\n      text-shadow: 1px 1px 2px #000000;\n    }\n  </style>\n</head>\n<body>\n  <h1>⚡ CodeLobby Live Preview ⚡</h1>\n  <p>Write your collaborative HTML/CSS structure here.</p>\n</body>\n</html>`
};

export default function EditorContainer({
  socket,
  roomId,
  code,
  setCode,
  language,
  setLanguage,
  editorRef,
  users
}) {
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [stdin, setStdin] = useState('');
  
  const isRemoteChange = useRef(false);
  const decorationsRef = useRef({}); // userId -> decorationIds array

  // Define custom yellow/white theme when Monaco loads
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    monaco.editor.defineTheme('cyber-yellow-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '777777', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'a38200', fontStyle: 'bold' },
        { token: 'identifier', foreground: '111111' },
        { token: 'string', foreground: '222222' },
        { token: 'number', foreground: 'a38200' },
        { token: 'regexp', foreground: 'a38200' },
        { token: 'type', foreground: '000000', fontStyle: 'bold' },
        { token: 'operator', foreground: 'a38200' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#111111',
        'editorCursor.foreground': '#ffd600',
        'editor.lineHighlightBackground': '#fdfbeb',
        'editorLineNumber.foreground': '#888888',
        'editorLineNumber.activeForeground': '#ffd600',
        'editor.selectionBackground': '#c8f2d5', // Beautiful soft light green highlight
        'editor.inactiveSelectionBackground': '#e2f9eb'
      }
    });

    monaco.editor.setTheme('cyber-yellow-light');

    editor.onDidChangeCursorPosition((e) => {
      if (socket) {
        socket.emit('cursor-move', {
          roomId,
          cursor: {
            lineNumber: e.position.lineNumber,
            column: e.position.column
          }
        });
      }
    });
  };

  // Sync edits over Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleCodeUpdate = ({ changes, fullCode }) => {
      const editor = editorRef.current;
      if (!editor) return;

      isRemoteChange.current = true;
      const model = editor.getModel();
      
      if (changes && changes.length > 0) {
        model.pushEditOperations(
          editor.getSelections(),
          changes.map(change => ({
            range: new editorRef.current.constructor.Range(
              change.range.startLineNumber,
              change.range.startColumn,
              change.range.endLineNumber,
              change.range.endColumn
            ),
            text: change.text,
            forceMoveMarkers: true
          })),
          () => null
        );
      } else {
        editor.setValue(fullCode);
      }

      setCode(fullCode);
      isRemoteChange.current = false;
    };

    const handleLanguageUpdate = (lang) => {
      setLanguage(lang);
    };

    const handleCursorUpdate = ({ userId, cursor }) => {
      const editor = editorRef.current;
      if (!editor || !users[userId]) return;

      const user = users[userId];
      let existingDecorations = decorationsRef.current[userId] || [];
      
      let newDecorations = [];
      if (cursor) {
        newDecorations = editor.deltaDecorations(existingDecorations, [
          {
            range: {
              startLineNumber: cursor.lineNumber,
              startColumn: cursor.column,
              endLineNumber: cursor.lineNumber,
              endColumn: cursor.column + 1
            },
            options: {
              className: `remote-cursor-${userId}`,
              beforeContentClassName: `remote-cursor-label-${userId}`,
              hoverMessage: { value: user.name }
            }
          }
        ]);
        
        const styleId = `style-${userId}`;
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          document.head.appendChild(styleEl);
        }
        styleEl.innerHTML = `
          .remote-cursor-${userId} {
            border-left: 2px solid ${user.color};
            margin-left: -1px;
          }
          .remote-cursor-label-${userId}::after {
            content: "${user.name}";
            position: absolute;
            top: -15px;
            left: 2px;
            background: #ffd600;
            color: #000000;
            font-size: 8px;
            font-weight: bold;
            padding: 1px 3px;
            border: 1px solid #000000;
            white-space: nowrap;
            z-index: 10;
            pointer-events: none;
            opacity: 0.9;
          }
        `;
      } else {
        newDecorations = editor.deltaDecorations(existingDecorations, []);
      }

      decorationsRef.current[userId] = newDecorations;
    };

    const handleUserLeft = ({ userId }) => {
      const editor = editorRef.current;
      if (editor && decorationsRef.current[userId]) {
        editor.deltaDecorations(decorationsRef.current[userId], []);
        delete decorationsRef.current[userId];
      }
      const styleEl = document.getElementById(`style-${userId}`);
      if (styleEl) styleEl.remove();
    };

    socket.on('code-update', handleCodeUpdate);
    socket.on('language-update', handleLanguageUpdate);
    socket.on('cursor-update', handleCursorUpdate);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('code-update', handleCodeUpdate);
      socket.off('language-update', handleLanguageUpdate);
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('user-left', handleUserLeft);
    };
  }, [socket, users, setCode, setLanguage, editorRef]);

  const handleEditorChange = (value, event) => {
    if (isRemoteChange.current) return;
    setCode(value);

    if (socket) {
      socket.emit('code-change', {
        roomId,
        changes: event.changes,
        fullCode: value
      });
    }
  };

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    
    // Automatically load template code for the selected language
    const template = LANGUAGE_TEMPLATES[lang] || '';
    setCode(template);

    if (socket) {
      socket.emit('language-change', { roomId, language: lang });
      // Emit full code change for new template load
      socket.emit('code-change', { roomId, changes: [], fullCode: template });
    }
  };

  const runCodeExecution = async () => {
    if (language === 'html') return; // HTML uses instant preview iframe, no compilation needed

    setIsRunning(true);
    setStdout('');
    setStderr('');

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:5000` : window.location.origin);
      const response = await fetch(`${backendUrl}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code,
          stdin
        })
      });

      const data = await response.json();
      if (data.error) {
        setStderr(data.error);
      } else {
        setStdout(data.stdout || '');
        setStderr(data.stderr || '');
      }
    } catch (err) {
      setStderr(`Lobby execution service unreachable: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#ffffff' }}>
      {/* Editor top control bar */}
      <div style={{
        height: '60px',
        backgroundColor: '#f9f9f9',
        borderBottom: '2px solid #ffd600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#111111', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Compiling Environment
          </span>
          <select
            className="cyber-select"
            value={language}
            onChange={handleLanguageChange}
            disabled={isRunning}
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
          >
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="python">Python 3</option>
            <option value="cpp">C++ (g++)</option>
            <option value="c">C (gcc)</option>
            <option value="java">Java (JDK)</option>
            <option value="html">HTML/CSS (Live Preview)</option>
          </select>
        </div>

        {language !== 'html' ? (
          <button
            onClick={runCodeExecution}
            className="cyber-button"
            disabled={isRunning}
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem', color: '#000000' }}
          >
            {isRunning ? <Loader size={14} className="pulse-yellow-effect" /> : <Play size={14} />}
            {isRunning ? 'EXECUTING...' : 'RUN MODULE'}
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#a38200',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            <Eye size={16} />
            <span>INSTANT VIEW ACTIVE</span>
          </div>
        )}
      </div>

      {/* Editor Work Surface */}
      <div style={{ flex: 1, position: 'relative', borderBottom: '2px solid #e5e5e5' }}>
        <Editor
          height="100%"
          language={language === 'html' ? 'html' : language === 'cpp' || language === 'c' ? 'cpp' : language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            wordWrap: 'on',
            lineNumbersMinChars: 4,
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'blink',
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              verticalHasArrows: false,
              horizontalHasArrows: false
            }
          }}
        />
      </div>

      {/* Output Console / Live HTML Preview */}
      <div style={{
        height: '240px',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Console Tab Bar */}
        <div style={{
          height: '35px',
          backgroundColor: '#f9f9f9',
          borderBottom: '2px solid #e5e5e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#000000', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
            <TerminalIcon size={12} style={{ color: '#ffd600' }} />
            <span>{language === 'html' ? 'Web Render Box' : 'Developer Sandbox Output'}</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: '#555555', fontFamily: 'monospace' }}>
            [TYPE: {language.toUpperCase()}]
          </span>
        </div>

        {/* Dynamic Panel Content */}
        {language === 'html' ? (
          <div style={{ flex: 1, backgroundColor: '#ffffff', overflow: 'hidden' }}>
            <iframe
              srcDoc={code}
              title="HTML Sandbox Live Preview"
              sandbox="allow-scripts"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff'
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {/* Output Stream */}
            <div style={{
              flex: 2,
              padding: '1rem',
              overflowY: 'auto',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.8rem',
              color: '#111111',
              borderRight: '2px solid #e5e5e5',
              whiteSpace: 'pre-wrap',
              background: '#ffffff'
            }}>
              {stdout && <div style={{ color: '#111111' }}>{stdout}</div>}
              {stderr && <div style={{ color: '#a38200', fontWeight: 'bold', marginTop: '0.5rem' }}>{stderr}</div>}
              {!stdout && !stderr && !isRunning && (
                <span style={{ color: '#888888' }}>Console output will stream here. Execute a script module.</span>
              )}
              {isRunning && (
                <span style={{ color: '#a38200' }} className="pulse-yellow-effect">Connecting socket execution pipeline...</span>
              )}
            </div>

            {/* Stdin Terminal Input */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: '#fdfdfd'
            }}>
              <div style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.65rem',
                color: '#111111',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                borderBottom: '1px solid #e5e5e5',
                background: '#f9f9f9'
              }}>
                Standard Input (stdin)
              </div>
              <textarea
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Provide inputs for interactive scripts..."
                style={{
                  flex: 1,
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#111111',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '0.75rem',
                  padding: '0.8rem',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
