import React, { useRef, useState, useEffect } from 'react';
import { Edit2, Square, Circle, Minus, RotateCcw, Download, CircleDot } from 'lucide-react';

export default function WhiteboardContainer({ socket, roomId }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // pen, eraser, line, rect, circle
  const [color, setColor] = useState('#ffd600'); // yellow accent default
  const [lineWidth, setLineWidth] = useState(4);
  const [strokesHistory, setStrokesHistory] = useState([]);

  // Store start position for shapes
  const startPos = useRef({ x: 0, y: 0 });
  const [tempDrawingData, setTempDrawingData] = useState(null);

  const strokesHistoryRef = useRef([]);

  useEffect(() => {
    strokesHistoryRef.current = strokesHistory;
  }, [strokesHistory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    
    // Fit canvas to parent container size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.clientWidth;
      const height = parent.clientHeight - 60; // Subtract control bar height
      canvas.width = width * 2;
      canvas.height = height * 2;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');
      context.scale(2, 2);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      contextRef.current = context;

      redrawStrokes(strokesHistoryRef.current);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Socket Event listeners
    if (socket) {
      const handleDrawStroke = (stroke) => {
        setStrokesHistory((prev) => {
          const updated = [...prev, stroke];
          return updated;
        });
        drawSingleStroke(contextRef.current, stroke);
      };

      const handleClearCanvas = () => {
        clearLocalCanvas();
        setStrokesHistory([]);
      };

      const handleRoomInit = (data) => {
        if (data.canvasStrokes) {
          setStrokesHistory(data.canvasStrokes);
          redrawStrokes(data.canvasStrokes);
        }
      };

      socket.on('draw-stroke-update', handleDrawStroke);
      socket.on('clear-canvas-update', handleClearCanvas);
      socket.on('room-init', handleRoomInit);

      return () => {
        window.removeEventListener('resize', resizeCanvas);
        socket.off('draw-stroke-update', handleDrawStroke);
        socket.off('clear-canvas-update', handleClearCanvas);
        socket.off('room-init', handleRoomInit);
      };
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [socket]);

  const drawSingleStroke = (ctx, stroke) => {
    if (!ctx) return;
    const { type, x0, y0, x1, y1, color, width } = stroke;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width;

    if (type === 'pen' || type === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    } else if (type === 'line') {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    } else if (type === 'rect') {
      ctx.beginPath();
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.stroke();
    } else if (type === 'circle') {
      ctx.beginPath();
      const radius = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
      ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const redrawStrokes = (strokes) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach((stroke) => {
      drawSingleStroke(ctx, stroke);
    });
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e);
    startPos.current = { x, y };
    setIsDrawing(true);

    if (tool === 'pen' || tool === 'eraser') {
      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    const ctx = contextRef.current;

    const strokeColor = tool === 'eraser' ? '#ffffff' : color; // erase with white on white background!

    if (tool === 'pen' || tool === 'eraser') {
      // Draw locally
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineTo(x, y);
      ctx.stroke();

      const newStroke = {
        type: tool,
        x0: startPos.current.x,
        y0: startPos.current.y,
        x1: x,
        y1: y,
        color: strokeColor,
        width: lineWidth
      };

      if (socket) {
        socket.emit('draw-stroke', { roomId, stroke: newStroke });
      }

      setStrokesHistory((prev) => [...prev, newStroke]);
      startPos.current = { x, y };
    } else {
      // For shapes (line, rect, circle)
      redrawStrokes(strokesHistory);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      
      const previewStroke = {
        type: tool,
        x0: startPos.current.x,
        y0: startPos.current.y,
        x1: x,
        y1: y,
        color,
        width: lineWidth
      };
      
      drawSingleStroke(ctx, previewStroke);
      setTempDrawingData(previewStroke);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === 'line' || tool === 'rect' || tool === 'circle') && tempDrawingData) {
      if (socket) {
        socket.emit('draw-stroke', { roomId, stroke: tempDrawingData });
      }
      setStrokesHistory((prev) => [...prev, tempDrawingData]);
      setTempDrawingData(null);
    }
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleClear = () => {
    if (socket) {
      socket.emit('clear-canvas', roomId);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a temporary canvas with white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `codelobby-board-${roomId}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#ffffff' }}>
      {/* Control bar */}
      <div style={{
        height: '60px',
        backgroundColor: '#f9f9f9',
        borderBottom: '2px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0.6rem',
        gap: '0.4rem',
        userSelect: 'none'
      }}>
        {/* Tools Selection */}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button
            onClick={() => setTool('pen')}
            title="Pen"
            style={{
              padding: '0.4rem',
              background: tool === 'pen' ? '#ffd600' : 'transparent',
              color: '#000000',
              border: tool === 'pen' ? '2px solid #ffd600' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            title="Eraser"
            style={{
              padding: '0.4rem',
              background: tool === 'eraser' ? '#ffd600' : 'transparent',
              color: '#000000',
              border: tool === 'eraser' ? '2px solid #ffd600' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <CircleDot size={14} />
          </button>
          <button
            onClick={() => setTool('line')}
            title="Line"
            style={{
              padding: '0.4rem',
              background: tool === 'line' ? '#ffd600' : 'transparent',
              color: '#000000',
              border: tool === 'line' ? '2px solid #ffd600' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Minus size={14} />
          </button>
          <button
            onClick={() => setTool('rect')}
            title="Rectangle"
            style={{
              padding: '0.4rem',
              background: tool === 'rect' ? '#ffd600' : 'transparent',
              color: '#000000',
              border: tool === 'rect' ? '2px solid #ffd600' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Square size={14} />
          </button>
          <button
            onClick={() => setTool('circle')}
            title="Circle"
            style={{
              padding: '0.4rem',
              background: tool === 'circle' ? '#ffd600' : 'transparent',
              color: '#000000',
              border: tool === 'circle' ? '2px solid #ffd600' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Circle size={14} />
          </button>
        </div>

        {/* Colors & sizes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          {/* Drawing colors - yellow and black are highly visible on white canvas! */}
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#111111', fontWeight: 'bold' }}>Color:</span>
            <button
              onClick={() => setColor('#ffd600')}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#ffd600',
                border: color === '#ffd600' ? '2px solid #000000' : '1px solid #ccc',
                cursor: 'pointer'
              }}
              title="Yellow"
            />
            <button
              onClick={() => setColor('#111111')}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: '#111111',
                border: color === '#111111' ? '2px solid #ffd600' : '1px solid #ccc',
                cursor: 'pointer'
              }}
              title="Charcoal"
            />
          </div>

          {/* Width */}
          <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#111111', fontWeight: 'bold' }}>Size:</span>
            <select
              className="cyber-select"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              style={{ padding: '0.1rem 0.2rem', fontSize: '0.7rem', border: '1px solid #ffd600' }}
            >
              <option value={2}>2px</option>
              <option value={4}>4px</option>
              <option value={8}>8px</option>
              <option value={12}>12px</option>
            </select>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <button
            onClick={handleClear}
            className="cyber-button-white"
            style={{ padding: '0.4rem', display: 'flex', alignItems: 'center' }}
            title="Clear Whiteboard"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={handleDownload}
            className="cyber-button"
            style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', color: '#000000' }}
            title="Export Board as PNG"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ display: 'block', backgroundColor: '#ffffff' }}
        />
      </div>
    </div>
  );
}
