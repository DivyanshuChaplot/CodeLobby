import React, { useState, useEffect } from 'react';
import { Network, Circle, Code } from 'lucide-react';

export default function CodeMap({ code, language, onSelectLine }) {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    if (!code) {
      setNodes([]);
      return;
    }

    const lines = code.split('\n');
    const parsedNodes = [];

    if (language === 'javascript') {
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const funcMatch = line.match(/^\s*function\s+([a-zA-Z0-9_$]+)\s*\(/);
        if (funcMatch) {
          parsedNodes.push({
            id: `fn-${lineNum}`,
            name: funcMatch[1],
            type: 'function',
            line: lineNum
          });
          return;
        }

        const arrowMatch = line.match(/^\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/);
        if (arrowMatch) {
          parsedNodes.push({
            id: `arrow-${lineNum}`,
            name: arrowMatch[1],
            type: 'arrow-function',
            line: lineNum
          });
          return;
        }

        const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_$]+)/);
        if (classMatch) {
          parsedNodes.push({
            id: `class-${lineNum}`,
            name: classMatch[1],
            type: 'class',
            line: lineNum
          });
        }
      });
    } else if (language === 'python') {
      lines.forEach((line, index) => {
        const lineNum = index + 1;
        const defMatch = line.match(/^\s*def\s+([a-zA-Z0-9_]+)\s*\(/);
        if (defMatch) {
          parsedNodes.push({
            id: `def-${lineNum}`,
            name: defMatch[1],
            type: 'function',
            line: lineNum
          });
          return;
        }

        const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_]+)/);
        if (classMatch) {
          parsedNodes.push({
            id: `class-${lineNum}`,
            name: classMatch[1],
            type: 'class',
            line: lineNum
          });
        }
      });
    }

    setNodes(parsedNodes);
  }, [code, language]);

  return (
    <div style={{
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#ffffff'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#111111',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: '0.8rem',
        borderBottom: '2px solid #e5e5e5',
        paddingBottom: '0.4rem'
      }}>
        <Network size={12} style={{ color: '#ffd600' }} />
        <span>Workspace Flow Map</span>
      </div>

      {nodes.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888888',
          fontSize: '0.75rem',
          textAlign: 'center',
          gap: '0.3rem',
          padding: '1rem'
        }}>
          <Code size={16} />
          <span>No classes or functions detected.</span>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onSelectLine(node.line)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.7rem',
                backgroundColor: '#f9f9f9',
                border: '2px solid #e5e5e5',
                borderRadius: '2px',
                color: '#111111',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#ffd600';
                e.currentTarget.style.backgroundColor = 'rgba(255, 214, 0, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e5e5e5';
                e.currentTarget.style.backgroundColor = '#f9f9f9';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {node.type === 'class' ? (
                  <Circle size={8} style={{ fill: '#111111', stroke: '#111111' }} />
                ) : (
                  <Circle size={8} style={{ fill: '#ffd600', stroke: '#ffd600' }} />
                )}
                <span style={{ fontWeight: 600 }}>{node.name}</span>
              </div>
              <span style={{
                color: '#000000',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                backgroundColor: '#ffd600',
                padding: '0.1rem 0.3rem',
                borderRadius: '2px'
              }}>
                L{node.line}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Legend Footer */}
      <div style={{
        marginTop: '0.8rem',
        borderTop: '2px solid #e5e5e5',
        paddingTop: '0.6rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        fontSize: '0.7rem',
        color: '#555555'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Circle size={6} style={{ fill: '#ffd600', stroke: '#ffd600' }} />
          <span>Function / Def</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Circle size={6} style={{ fill: '#111111', stroke: '#111111' }} />
          <span>Class / Module</span>
        </div>
      </div>
    </div>
  );
}
