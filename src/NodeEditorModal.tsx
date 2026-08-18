import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from './i18n';
import ParamTableEditor from './components/ParamTableEditor';

interface NodeEditorModalProps {
  node: any;
  actors: any[];
  onSave: (updatedData: any) => void;
  onCancel: () => void;
}

// 节点属性与参数编辑模态框
export default function NodeEditorModal({ node, actors, onSave, onCancel }: NodeEditorModalProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    const orig = node?.originalData || node?.data?.originalData;
    if (orig) {
      setData(structuredClone(orig));
    }
  }, [node]);

  if (!data) return null;

  const typeKey = Object.keys(data)[0]; // Action, Switch, SubFlow, Fork, Join
  const eventData = data[typeKey];
  const params = eventData.params?.data || {};
  const isActorEvent = typeKey === 'Action' || typeKey === 'Switch';

  const currentActorIdx = eventData.actor?.idx;
  const currentActor = currentActorIdx !== undefined ? actors[currentActorIdx] : null;

  // 提示信息定时隐藏
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // 修改单个参数值
  const handleParamChange = (key: string, value: any, paramType: string) => {
    const newData = { ...data };
    newData[typeKey].params.data[key][paramType] = value;
    setData(newData);
  };

  // 子流程相关属性变更
  const handleSubFlowChange = (field: 'res_flowchart_name' | 'entry_point_name', value: string) => {
    const newData = { ...data };
    newData[typeKey][field] = value;
    setData(newData);
  };

  // 角色切换
  const handleActorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newActorIdx = parseInt(e.target.value, 10);
    const newData = { ...data };
    newData[typeKey].actor = { v: null, idx: newActorIdx };
    if (typeKey === 'Action') {
      newData[typeKey].actor_action = { v: null, idx: 0 };
    } else if (typeKey === 'Switch') {
      newData[typeKey].actor_query = { v: null, idx: 0 };
    }
    setData(newData);
  };

  // 动作或查询切换
  const handleActionQueryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIdx = parseInt(e.target.value, 10);
    const newData = { ...data };
    if (typeKey === 'Action') {
      newData[typeKey].actor_action = { v: null, idx: newIdx };
    } else if (typeKey === 'Switch') {
      newData[typeKey].actor_query = { v: null, idx: newIdx };
    }
    setData(newData);
  };

  // 删除参数
  const handleDeleteParam = (key: string) => {
    const newData = { ...data };
    delete newData[typeKey].params.data[key];
    setData(newData);
  };

  // 新增自定义参数
  const handleAddParam = (key: string, type: string, value: any) => {
    const newData = { ...data };
    if (!newData[typeKey].params) {
      newData[typeKey].params = { data: {} };
    }
    if (!newData[typeKey].params.data) {
      newData[typeKey].params.data = {};
    }
    newData[typeKey].params.data[key] = { [type]: value };
    setData(newData);
  };

  // 1. 自动填充参数
  const handleAutoFill = async () => {
    const actorName = currentActor?.identifier?.name;
    const isQuery = typeKey === 'Switch';
    const actionQueryName = isQuery
      ? currentActor?.queries?.[eventData.actor_query?.idx]
      : currentActor?.actions?.[eventData.actor_action?.idx];

    if (!actorName || !actionQueryName) {
      showFeedback(t('autofill.noActorOrAction'), 'error');
      return;
    }

    try {
      const filled = await invoke<Record<string, any>>('autofill_event_parameters', {
        actorName,
        actionQueryName,
        isQuery,
      });

      const newData = { ...data };
      if (!newData[typeKey].params) newData[typeKey].params = { data: {} };
      newData[typeKey].params.data = filled;
      setData(newData);
      showFeedback(t('autofill.autoFillSuccess'), 'success');
    } catch (err) {
      showFeedback(`${t('autofill.autoFillFailed')}: ${err}`, 'error');
    }
  };

  // 2. 参数重新排序
  const handleReorder = async () => {
    const actorName = currentActor?.identifier?.name;
    const isQuery = typeKey === 'Switch';
    const actionQueryName = isQuery
      ? currentActor?.queries?.[eventData.actor_query?.idx]
      : currentActor?.actions?.[eventData.actor_action?.idx];

    if (!actorName || !actionQueryName) return;

    try {
      const reordered = await invoke<Record<string, any>>('reorder_event_parameters', {
        actorName,
        actionQueryName,
        isQuery,
        currentParams: params,
      });

      const newData = { ...data };
      newData[typeKey].params.data = reordered;
      setData(newData);
      showFeedback(t('autofill.reorderSuccess'), 'success');
    } catch (err) {
      showFeedback(`${t('autofill.reorderFailed')}: ${err}`, 'error');
    }
  };

  // 3. 复制 JSON
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(params, null, 2));
      showFeedback(t('autofill.copyJsonSuccess'), 'success');
    } catch (err) {
      showFeedback(String(err), 'error');
    }
  };

  // 4. 粘贴 JSON
  const handlePasteJson = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        const newData = { ...data };
        if (!newData[typeKey].params) newData[typeKey].params = { data: {} };
        newData[typeKey].params.data = parsed;
        setData(newData);
        showFeedback(t('autofill.pasteJsonSuccess'), 'success');
      } else {
        showFeedback(t('autofill.pasteJsonFailed'), 'error');
      }
    } catch (err) {
      showFeedback(t('autofill.pasteJsonFailed'), 'error');
    }
  };

  const handleSave = () => {
    onSave({ ...node, id: node?.id || node?.data?.id, originalData: data });
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div
            className="modal-title"
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <div className="modal-icon"></div>
            <span>{locale === 'zh' ? `编辑事件 (${typeKey})` : `Edit Event (${typeKey})`}</span>
            {feedbackMsg && (
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  color: feedbackMsg.type === 'success' ? '#4ade80' : '#f87171',
                  background:
                    feedbackMsg.type === 'success'
                      ? 'rgba(74, 222, 128, 0.12)'
                      : 'rgba(248, 113, 113, 0.12)',
                  border: `1px solid ${feedbackMsg.type === 'success' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  lineHeight: '1.3',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                {feedbackMsg.text}
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {isActorEvent && (
            <div className="actor-selectors">
              <select
                className="actor-select"
                value={
                  currentActorIdx === undefined || currentActorIdx === 65535 ? '' : currentActorIdx
                }
                onChange={handleActorChange}
              >
                <option value="" disabled>
                  {locale === 'zh' ? '-- 请选择角色 --' : '-- Select Actor --'}
                </option>
                {actors.map((actor, idx) => (
                  <option key={idx} value={idx}>
                    {actor.identifier?.name || 'UnknownActor'}
                  </option>
                ))}
              </select>
              <span className="separator">::</span>
              <select
                className="action-select"
                value={
                  (typeKey === 'Action'
                    ? eventData.actor_action?.idx
                    : eventData.actor_query?.idx) === undefined ||
                  (typeKey === 'Action'
                    ? eventData.actor_action?.idx
                    : eventData.actor_query?.idx) === 65535
                    ? ''
                    : typeKey === 'Action'
                      ? eventData.actor_action?.idx
                      : eventData.actor_query?.idx
                }
                onChange={handleActionQueryChange}
              >
                <option value="" disabled>
                  {locale === 'zh' ? '-- 请选择动作/条件 --' : '-- Select Action/Query --'}
                </option>
                {typeKey === 'Action' && currentActor && currentActor.actions
                  ? currentActor.actions.map((action: string, idx: number) => (
                      <option key={idx} value={idx}>
                        {action}
                      </option>
                    ))
                  : typeKey === 'Switch' && currentActor && currentActor.queries
                    ? currentActor.queries.map((query: string, idx: number) => (
                        <option key={idx} value={idx}>
                          {query}
                        </option>
                      ))
                    : null}
              </select>
            </div>
          )}

          {!isActorEvent && typeKey === 'SubFlow' && (
            <>
              <div className="form-section">
                <div className="form-row">
                  <span className="form-label">
                    {locale === 'zh' ? '流程图(F):' : 'Flowchart:'}
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={
                      locale === 'zh' ? '流程图名称（可选）' : 'Flowchart name (Optional)'
                    }
                    value={eventData.res_flowchart_name || ''}
                    onChange={(e) => handleSubFlowChange('res_flowchart_name', e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <span className="form-label">
                    {locale === 'zh' ? '入口点(E):' : 'Entry Point:'}
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={locale === 'zh' ? '入口点（必填）' : 'Entry point name (Required)'}
                    value={eventData.entry_point_name || ''}
                    onChange={(e) => handleSubFlowChange('entry_point_name', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-help-text">
                {locale === 'zh'
                  ? '说明：若未指定流程图，将使用当前流程图。'
                  : 'Note: If flowchart is not specified, current flowchart is used.'}
              </div>
            </>
          )}

          <ParamTableEditor
            params={params}
            isActorEvent={isActorEvent}
            onParamChange={handleParamChange}
            onDeleteParam={handleDeleteParam}
            onAddParam={handleAddParam}
            onAutoFill={handleAutoFill}
            onReorder={handleReorder}
            onCopyJson={handleCopyJson}
            onPasteJson={handlePasteJson}
          />
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" onClick={handleSave}>
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
