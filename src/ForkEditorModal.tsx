import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { useTranslation } from './i18n';

interface ForkEditorModalProps {
  node: any;
  events: any[];
  actors: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

export default function ForkEditorModal({ node, events, actors, onSave, onCancel }: ForkEditorModalProps) {
  const { t, locale } = useTranslation();
  const originalData = node?.originalData || node?.data?.originalData || {};
  const typeKey = Object.keys(originalData)[0] || 'Fork';
  const eventData = originalData[typeKey] || {};
  const initialForks = eventData.forks || [];
  const initialJoin = eventData.join?.idx ?? 65535;

  const getEventLabel = (ev: any, idx: number) => {
    if (!ev || !ev.data) return `Event${idx}`;
    const typeKey = Object.keys(ev.data)[0];
    const eventData = ev.data[typeKey];
    let label = "";

    let typeText = typeKey;
    if (typeKey === 'Action') typeText = locale === 'zh' ? "动作" : "Action";
    else if (typeKey === 'Switch') typeText = locale === 'zh' ? "条件" : "Switch";
    else if (typeKey === 'Fork') typeText = locale === 'zh' ? "分支" : "Fork";
    else if (typeKey === 'Join') typeText = locale === 'zh' ? "汇合" : "Join";
    else if (typeKey === 'SubFlow') typeText = locale === 'zh' ? "子流程" : "SubFlow";

    if (typeKey === 'Action') {
      const actor = actors[eventData.actor?.idx];
      const actorName = actor?.identifier?.name || "UnknownActor";
      const actionName = actor?.actions?.[eventData.actor_action?.idx] || "UnknownAction";
      label = `${actorName}::${actionName}`;
    } else if (typeKey === 'Switch') {
      const actor = actors[eventData.actor?.idx];
      const actorName = actor?.identifier?.name || "UnknownActor";
      const queryName = actor?.queries?.[eventData.actor_query?.idx] || "UnknownQuery";
      label = `${actorName}::${queryName}`;
    } else if (typeKey === 'SubFlow') {
      label = `${eventData.res_flowchart_name}::${eventData.entry_point_name}`;
    } else if (typeKey === 'Fork') {
      label = `Forks: ${eventData.forks?.length || 0}`;
    } else if (typeKey === 'Join') {
      label = "Wait for parallel join";
    }

    const eventName = ev.name || `Event${idx}`;
    if (label) {
      return `${eventName} - ${typeText} - ${label}`;
    }
    return `${eventName} - ${typeText}`;
  };
  
  // Convert to array of { id: string, targetEvent: number }
  const [forksList, setForksList] = useState<{ id: string, targetEvent: number }[]>(() => {
    return initialForks.map((f: any) => ({
      id: Math.random().toString(36).substring(7),
      targetEvent: f?.idx ?? -1
    }));
  });
  const [joinTarget, setJoinTarget] = useState<number>(initialJoin === 65535 ? -1 : initialJoin);

  const handleAddFork = () => {
    setForksList([...forksList, { 
      id: Math.random().toString(36).substring(7), 
      targetEvent: -1 
    }]);
  };

  const handleRemoveFork = (idToRemove: string) => {
    setForksList(forksList.filter(f => f.id !== idToRemove));
  };

  const handleForkChange = (id: string, newTarget: number) => {
    setForksList(forksList.map(f => 
      f.id === id ? { ...f, targetEvent: newTarget } : f
    ));
  };

  const handleSave = () => {
    const newForks = forksList.map(f => ({ v: null, idx: Number(f.targetEvent) }));

    const updatedData = {
      ...originalData,
      [typeKey]: {
        ...eventData,
        forks: newForks,
        join: { v: null, idx: joinTarget === -1 ? 65535 : joinTarget }
      }
    };
    onSave({ ...node, id: node?.id || node?.data?.id, originalData: updatedData });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon"></div>
            <span>{t('modals.forkEditor.title')}</span>
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
                  <th style={{ width: '85%' }}>{locale === 'zh' ? '目标事件 ID' : 'Target Event ID'}</th>
                  <th style={{ width: '15%' }}></th>
                </tr>
              </thead>
              <tbody>
                {forksList.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      {locale === 'zh' ? '暂无并行分支，请点击下方添加。' : 'No branches defined. Add a branch below.'}
                    </td>
                  </tr>
                ) : (
                  forksList.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <select 
                          className="table-select"
                          value={f.targetEvent}
                          onChange={(e) => handleForkChange(f.id, parseInt(e.target.value, 10))}
                        >
                          <option value={-1}>{locale === 'zh' ? '- 选择目标事件 -' : '- Select Event -'}</option>
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
                          onClick={() => handleRemoveFork(f.id)}
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
            <button className="btn secondary" onClick={handleAddFork}>
              <Plus size={16} /> {t('modals.forkEditor.addBranch')}
            </button>
          </div>
          
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              {t('modals.forkEditor.joinNode')}
            </label>
            <select 
              className="table-select"
              value={joinTarget}
              onChange={(e) => setJoinTarget(parseInt(e.target.value, 10))}
              style={{ width: '100%', padding: '8px' }}
            >
              <option value={-1}>{locale === 'zh' ? '- 无汇合目标 (None) -' : '- No Join (None) -'}</option>
              {events.map((ev: any, idx: number) => {
                if (idx === parseInt(node.id)) return null;
                const typeKey = ev.data && Object.keys(ev.data)[0];
                if (typeKey !== 'Join') return null;
                return (
                  <option key={idx} value={idx}>
                    {getEventLabel(ev, idx)}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn secondary" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="btn primary" onClick={handleSave}>
            <Save size={16} /> {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
