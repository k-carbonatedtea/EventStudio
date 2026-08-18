import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { useTranslation } from './i18n';

interface SwitchEditorModalProps {
  node: any;
  events: any[];
  actors: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function SwitchEditorModal({
  node,
  events,
  actors,
  onSave,
  onCancel,
}: SwitchEditorModalProps) {
  const { t, locale } = useTranslation();
  const originalData = node?.originalData || node?.data?.originalData || {};
  const typeKey = Object.keys(originalData)[0] || 'Switch';
  const eventData = originalData[typeKey] || {};
  const initialCases = eventData.cases || {};

  const getEventLabel = (ev: any, idx: number) => {
    if (!ev || !ev.data) return `Event${idx}`;
    const typeKey = Object.keys(ev.data)[0];
    const eventData = ev.data[typeKey];
    let label = '';

    let typeText = typeKey;
    if (typeKey === 'Action') typeText = locale === 'zh' ? '动作' : 'Action';
    else if (typeKey === 'Switch') typeText = locale === 'zh' ? '条件' : 'Switch';
    else if (typeKey === 'Fork') typeText = locale === 'zh' ? '分支' : 'Fork';
    else if (typeKey === 'Join') typeText = locale === 'zh' ? '汇合' : 'Join';
    else if (typeKey === 'SubFlow') typeText = locale === 'zh' ? '子流程' : 'SubFlow';

    if (typeKey === 'Action') {
      const actor = actors[eventData.actor?.idx];
      const actorName = actor?.identifier?.name || 'UnknownActor';
      const actionName = actor?.actions?.[eventData.actor_action?.idx] || 'UnknownAction';
      label = `${actorName}::${actionName}`;
    } else if (typeKey === 'Switch') {
      const actor = actors[eventData.actor?.idx];
      const actorName = actor?.identifier?.name || 'UnknownActor';
      const queryName = actor?.queries?.[eventData.actor_query?.idx] || 'UnknownQuery';
      label = `${actorName}::${queryName}`;
    } else if (typeKey === 'SubFlow') {
      label = `${eventData.res_flowchart_name}::${eventData.entry_point_name}`;
    } else if (typeKey === 'Fork') {
      label = `Forks: ${eventData.forks?.length || 0}`;
    } else if (typeKey === 'Join') {
      label = 'Wait for parallel join';
    }

    const eventName = ev.name || `Event${idx}`;
    if (label) {
      return `${eventName} - ${typeText} - ${label}`;
    }
    return `${eventName} - ${typeText}`;
  };

  // Convert to array of { value: string, targetEvent: number } for easier editing
  const [casesList, setCasesList] = useState<{ id: string; value: string; targetEvent: number }[]>(
    () => {
      return Object.entries(initialCases).map(([key, val]: [string, any]) => ({
        id: Math.random().toString(36).substring(7),
        value: key,
        targetEvent: val?.idx ?? -1,
      }));
    },
  );

  const handleAddCase = () => {
    setCasesList([
      ...casesList,
      {
        id: Math.random().toString(36).substring(7),
        value: '0',
        targetEvent: -1,
      },
    ]);
  };

  const handleRemoveCase = (idToRemove: string) => {
    setCasesList(casesList.filter((c) => c.id !== idToRemove));
  };

  const handleCaseChange = (
    id: string,
    field: 'value' | 'targetEvent',
    newValue: string | number,
  ) => {
    setCasesList(casesList.map((c) => (c.id === id ? { ...c, [field]: newValue } : c)));
  };

  const handleSave = () => {
    const newCases: Record<string, { v: null; idx: number }> = {};
    casesList.forEach((c) => {
      newCases[c.value.toString()] = { v: null, idx: Number(c.targetEvent) };
    });

    const updatedData = {
      ...originalData,
      [typeKey]: {
        ...eventData,
        cases: newCases,
      },
    };
    onSave({ ...node, id: node?.id || node?.data?.id, originalData: updatedData });
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon"></div>
            <span>{t('modals.switchEditor.title')}</span>
          </div>
          <button className="close-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="cases-table-container">
            <table className="params-table cases-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>{t('modals.switchEditor.caseValue')}</th>
                  <th style={{ width: '50%' }}>
                    {locale === 'zh' ? '目标事件 ID' : 'Target Event ID'}
                  </th>
                  <th style={{ width: '10%' }}></th>
                </tr>
              </thead>
              <tbody>
                {casesList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}
                    >
                      {locale === 'zh'
                        ? '暂无条件分支，请点击下方按钮添加。'
                        : 'No cases defined. Add a case below.'}
                    </td>
                  </tr>
                ) : (
                  casesList.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <input
                          type="number"
                          className="table-input"
                          value={c.value}
                          onChange={(e) => handleCaseChange(c.id, 'value', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="table-select"
                          value={c.targetEvent}
                          onChange={(e) =>
                            handleCaseChange(c.id, 'targetEvent', parseInt(e.target.value, 10))
                          }
                        >
                          <option value={-1}>
                            {locale === 'zh' ? '- 选择目标事件 -' : '- Select Event -'}
                          </option>
                          {events.map((ev: any, idx: number) => {
                            if (idx === parseInt(node.id)) return null;
                            return (
                              <option key={idx} value={idx}>
                                {getEventLabel(ev, idx)}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-icon danger"
                          onClick={() => handleRemoveCase(c.id)}
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '12px', display: 'flex' }}>
            <button className="btn secondary" onClick={handleAddCase}>
              <Plus size={16} /> {t('modals.switchEditor.addCase')}
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button className="btn primary" onClick={handleSave}>
            <Save size={16} /> {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
