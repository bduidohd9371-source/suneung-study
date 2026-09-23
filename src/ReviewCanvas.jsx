import { useCallback, useEffect, useRef } from 'react';
import { Eraser, Undo2 } from 'lucide-react';

export default function ReviewCanvas({ strokes, onChange }) {
  const canvasRef = useRef(null);
  const activeStroke = useRef(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineWidth = 2.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = document.documentElement.dataset.theme === 'dark' ? '#c1b8ff' : '#6555e9';
    strokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      context.beginPath();
      context.moveTo(stroke[0].x * width, stroke[0].y * height);
      stroke.slice(1).forEach((point) => context.lineTo(point.x * width, point.y * height));
      context.stroke();
    });
  }, [strokes]);

  useEffect(() => {
    redraw();
    const observer = new ResizeObserver(redraw);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [redraw]);

  function pointFromEvent(event) {
    const bounds = canvasRef.current.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)), y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)) };
  }

  function startStroke(event) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStroke.current = [pointFromEvent(event)];
    onChange([...strokes, activeStroke.current]);
  }

  function continueStroke(event) {
    if (!activeStroke.current) return;
    activeStroke.current = [...activeStroke.current, pointFromEvent(event)];
    onChange([...strokes.slice(0, -1), activeStroke.current]);
  }

  function finishStroke() {
    activeStroke.current = null;
  }

  return (
    <div className="review-canvas-wrap">
      <canvas ref={canvasRef} className="review-canvas" aria-label="오답 풀이를 손가락이나 마우스로 그리는 캔버스" onPointerDown={startStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} />
      <div className="canvas-tools"><span>손가락이나 마우스로 풀이를 적어보세요</span><div><button type="button" onClick={() => onChange(strokes.slice(0, -1))} disabled={!strokes.length} aria-label="마지막 선 지우기"><Undo2 size={14} /> 실행 취소</button><button type="button" onClick={() => onChange([])} disabled={!strokes.length} aria-label="캔버스 전체 지우기"><Eraser size={14} /> 지우기</button></div></div>
    </div>
  );
}
