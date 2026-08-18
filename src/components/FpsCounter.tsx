import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from '../i18n';

/**
 * 实时帧率显示组件 (FPS Counter)
 * 嵌入在流程图控制栏 (ReactFlow Controls) 底部，实时测量并显示当前画面的渲染帧率。
 */
export const FpsCounter: React.FC = () => {
  const { t } = useTranslation();
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    // 启动基于 requestAnimationFrame 的帧率统计循环
    const updateFps = (now: number) => {
      frameCountRef.current += 1;
      const delta = now - lastTimeRef.current;

      // 每 500ms 刷新一次帧率显示，保证数字易读且不过度触发 React 重绘
      if (delta >= 500) {
        const currentFps = Math.round((frameCountRef.current * 1000) / delta);
        setFps(currentFps);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      reqIdRef.current = requestAnimationFrame(updateFps);
    };

    reqIdRef.current = requestAnimationFrame(updateFps);

    return () => {
      if (reqIdRef.current !== null) {
        cancelAnimationFrame(reqIdRef.current);
      }
    };
  }, []);

  // 根据帧率高低确定颜色风格
  const fpsClass = fps >= 50 ? 'fps-high' : fps >= 30 ? 'fps-medium' : 'fps-low';

  return (
    <div
      className={`react-flow__controls-fps ${fpsClass}`}
      title={`${t('common.fpsTooltip')}: ${fps} FPS`}
      aria-label={`${t('common.fps')}: ${fps}`}
    >
      <span className="fps-value">{fps}</span>
      <span className="fps-unit">FPS</span>
    </div>
  );
};
