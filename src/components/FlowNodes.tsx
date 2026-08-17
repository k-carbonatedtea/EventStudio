import React from 'react';
import { Handle, Position, BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { useTranslation } from '../i18n';

export interface EventNodeData {
  id: string;
  name: string;
  type: string;
  label: string;
  originalData: any;
  expandParams?: boolean;
  messageDict?: Record<string, string>;
  messageText?: string;
  isWarning?: boolean;
  isBlinking?: boolean;
  onSelect: (data: any) => void;
  onDoubleClick?: (data: any) => void;
  onContextMenu: (data: any, e: React.MouseEvent) => void;
}

// 文本查询缓存（提升海量参数节点渲染性能）
const messageCache = new Map<string, string>();

// 查找与解析 MessageId 对应的真实文本
export const resolveMessageText = (rawVal: any, messageDict?: Record<string, string>): string | undefined => {
  if (!messageDict || rawVal === undefined || rawVal === null) return undefined;
  const str = String(rawVal).trim();
  if (!str) return undefined;

  const cacheKey = `${str}`;
  if (messageCache.has(cacheKey)) {
    return messageCache.get(cacheKey);
  }

  let resolved: string | undefined;
  if (messageDict[str]) {
    resolved = messageDict[str];
  } else if (str.includes(':')) {
    const parts = str.split(':');
    const label = parts[parts.length - 1];
    if (messageDict[label]) {
      resolved = messageDict[label];
    } else {
      const filePart = parts[0].split('/').pop();
      if (filePart && messageDict[`${filePart}:${label}`]) {
        resolved = messageDict[`${filePart}:${label}`];
      }
    }
  }

  if (resolved) {
    if (messageCache.size > 2000) messageCache.clear();
    messageCache.set(cacheKey, resolved);
  }
  return resolved;
};

// 事件节点内部渲染组件
const EventNodeInternal = ({ data, selected }: { data: EventNodeData; selected: boolean }) => {
  const { t } = useTranslation();

  return (
    <div 
      className={`custom-node ${selected ? 'selected' : ''} ${data.isWarning ? 'warning' : ''} ${data.isBlinking ? 'blinking-error' : ''}`} 
      onClick={() => data.onSelect(data)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (data.onDoubleClick) data.onDoubleClick(data);
      }}
      style={data.isWarning && !data.isBlinking ? { backgroundColor: 'rgba(239, 68, 68, 0.3)', borderColor: '#ef4444' } : undefined}
    >
      <Handle type="target" position={Position.Top} />
      <div className="node-header">
        <span className="node-type-badge">{data.type}</span>
        {data.name}
      </div>
      <div className="node-body">
        <div style={{ marginBottom: '8px', fontWeight: 500, color: '#e2e8f0', wordBreak: 'break-all' }}>
          {data.label}
        </div>

        {/* 节点未展开时的紧凑对话预览 */}
        {!data.expandParams && data.messageText && (
          <div className="message-dialogue-preview compact" title={data.messageText}>
            {data.messageText}
          </div>
        )}

        {data.expandParams && data.originalData[data.type]?.params?.data && Object.keys(data.originalData[data.type].params.data).length > 0 ? (
          <div className="node-params-expanded" style={{ marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
              {t('nodes.params')}
            </div>
            {Object.entries(data.originalData[data.type].params.data).map(([key, valObj]: [string, any]) => {
              const paramType = Object.keys(valObj)[0];
              const val = valObj[paramType];
              const isMessageId = key.toLowerCase() === 'messageid' || key.toLowerCase() === 'message_id' || key.toLowerCase() === 'msgid';
              const resolvedText = isMessageId ? resolveMessageText(val, data.messageDict) : undefined;

              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', gap: '16px' }}>
                    <span style={{ color: isMessageId ? '#38bdf8' : '#94a3b8', fontWeight: isMessageId ? 600 : 400, flexShrink: 0 }}>
                      {key}
                    </span>
                    <span style={{ color: '#e2e8f0', wordBreak: 'break-all', textAlign: 'right' }}>{String(val)}</span>
                  </div>
                  {/* MessageId 下一行显示真实的文本内容 */}
                  {resolvedText && (
                    <div className="message-dialogue-preview" title={resolvedText}>
                      {resolvedText}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="node-param">
            <span className="node-param-key">{t('nodes.params')}:</span>
            <span className="node-param-val">{data.originalData[data.type]?.params?.data ? Object.keys(data.originalData[data.type].params.data).length : 0}</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// 经过浅比较记忆化包裹的 EventNode
export const EventNode = React.memo(EventNodeInternal, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.data.name === next.data.name &&
    prev.data.label === next.data.label &&
    prev.data.type === next.data.type &&
    prev.data.isWarning === next.data.isWarning &&
    prev.data.isBlinking === next.data.isBlinking &&
    prev.data.expandParams === next.data.expandParams &&
    prev.data.messageText === next.data.messageText &&
    prev.data.originalData === next.data.originalData &&
    prev.data.messageDict === next.data.messageDict
  );
});

// 入口点节点内部渲染组件
const EntryPointNodeInternal = ({
  data
}: {
  data: { id?: string; name: string; isBlinking?: boolean; onDoubleClick?: (data: any) => void; onRename?: (id: string, newName: string) => void };
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={`entry-point-node ${data.isBlinking ? "blinking-error" : ""}`}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (data.onDoubleClick) data.onDoubleClick(data);
      }}
      title={t('subHeader.renamePrompt')}
      style={{
        background: "#10b981",
        color: "white",
        padding: "8px 18px",
        borderRadius: "30px",
        fontWeight: "bold",
        boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
        border: "2px solid #059669",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        userSelect: "none",
        cursor: "pointer"
      }}
    >
      <span>Entry: {data.name}</span>
      <Handle type="source" position={Position.Bottom} style={{ background: "#059669" }} />
    </div>
  );
};

// 经过记忆化包裹的 EntryPointNode
export const EntryPointNode = React.memo(EntryPointNodeInternal, (prev, next) => {
  return (
    prev.data.name === next.data.name &&
    prev.data.isBlinking === next.data.isBlinking
  );
});

// 流动小球动画上下文
export const FlowAnimationContext = React.createContext<boolean>(true);

// 动画连线内部组件
const AnimatedEdgeInternal = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const showAnimation = React.useContext(FlowAnimationContext);
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const strokeColor = style.stroke || '#94a3b8';

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {showAnimation && (
        <circle r="4" fill={strokeColor} style={{ filter: `drop-shadow(0 0 4px ${strokeColor})` }}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
};

// 经过记忆化包裹的 AnimatedEdge
export const AnimatedEdge = React.memo(AnimatedEdgeInternal, (prev, next) => {
  return (
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.sourcePosition === next.sourcePosition &&
    prev.targetPosition === next.targetPosition &&
    prev.style?.stroke === next.style?.stroke
  );
});
