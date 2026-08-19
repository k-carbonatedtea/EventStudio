import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n';
import ActorParamsList from './actor/ActorParamsList';

interface ActorDetailsPanelProps {
  selectedActor: any;
  selectedActorIdx: number | null;
  evflData: any;
  onUpdateEvflData: (newData: any, title?: string, detail?: string) => void;
}

// 角色详情面板：管理所选角色的动作列表、查询列表与参数字典（支持 AI 自动补全与默认参数）
export default function ActorDetailsPanel({
  selectedActor,
  selectedActorIdx,
  evflData,
  onUpdateEvflData,
}: ActorDetailsPanelProps) {
  const { t, locale } = useTranslation();

  // 1. 新增动作输入状态
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  // 2. 新增查询输入状态
  const [isAddingQuery, setIsAddingQuery] = useState(false);
  const [newQueryName, setNewQueryName] = useState('');
  const [availableQueries, setAvailableQueries] = useState<string[]>([]);

  const actorName = selectedActor?.identifier?.name || (locale === 'zh' ? '角色' : 'Actor');

  // 加载该角色所有游戏内置 Action / Query 定义
  useEffect(() => {
    if (!selectedActor?.identifier?.name) {
      setAvailableActions([]);
      setAvailableQueries([]);
      return;
    }
    invoke<string[]>('get_actor_available_actions', { actorName: selectedActor.identifier.name })
      .then(setAvailableActions)
      .catch(() => setAvailableActions([]));
    invoke<string[]>('get_actor_available_queries', { actorName: selectedActor.identifier.name })
      .then(setAvailableQueries)
      .catch(() => setAvailableQueries([]));
  }, [selectedActor?.identifier?.name]);

  // 提交新增动作
  const handleConfirmAddAction = () => {
    const trimmed = newActionName.trim();
    if (!selectedActor || !trimmed || selectedActorIdx === null) return;

    const targetActor = evflData.flowchart.actors[selectedActorIdx];
    const currentActions = targetActor.actions || [];
    if (!currentActions.includes(trimmed)) {
      const newEvflData = {
        ...evflData,
        flowchart: {
          ...evflData.flowchart,
          actors: evflData.flowchart.actors.with(selectedActorIdx, {
            ...targetActor,
            actions: [...currentActions, trimmed]
          })
        }
      };
      onUpdateEvflData(newEvflData, `Add Action: ${actorName}.${trimmed}`, 'New action definition');
    }
    setNewActionName('');
    setIsAddingAction(false);
  };

  // 提交新增查询
  const handleConfirmAddQuery = () => {
    const trimmed = newQueryName.trim();
    if (!selectedActor || !trimmed || selectedActorIdx === null) return;

    const targetActor = evflData.flowchart.actors[selectedActorIdx];
    const currentQueries = targetActor.queries || [];
    if (!currentQueries.includes(trimmed)) {
      const newEvflData = {
        ...evflData,
        flowchart: {
          ...evflData.flowchart,
          actors: evflData.flowchart.actors.with(selectedActorIdx, {
            ...targetActor,
            queries: [...currentQueries, trimmed]
          })
        }
      };
      onUpdateEvflData(newEvflData, `Add Query: ${actorName}.${trimmed}`, 'New query definition');
    }
    setNewQueryName('');
    setIsAddingQuery(false);
  };

  return (
    <div className="am-bottom">
      {/* 动作列表 */}
      <div className="am-section">
        <div className="am-header">
          <span>
            {locale === 'zh'
              ? `动作 (${selectedActor?.actions?.length || 0})`
              : `Actions (${selectedActor?.actions?.length || 0})`}
          </span>
          <button
            className="am-btn"
            onClick={() => setIsAddingAction(!isAddingAction)}
            disabled={!selectedActor}
          >
            <Plus size={13} style={{ marginRight: 3 }} />
            {isAddingAction ? t('common.cancel') : t('common.add')}
          </button>
        </div>

        {isAddingAction && selectedActor && (
          <div className="am-inline-sub-bar">
            <input
              autoFocus
              type="text"
              list="actor-action-suggestions"
              className="am-sub-input"
              placeholder={locale === 'zh' ? '输入或选择动作名...' : 'Enter or select action...'}
              value={newActionName}
              onChange={(e) => setNewActionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmAddAction();
                if (e.key === 'Escape') setIsAddingAction(false);
              }}
            />
            <datalist id="actor-action-suggestions">
              {availableActions.map((act) => (
                <option key={act} value={act} />
              ))}
            </datalist>
            <button
              className="am-btn-icon am-btn-success"
              onClick={handleConfirmAddAction}
              title="Confirm (Enter)"
              disabled={!newActionName.trim()}
            >
              <Check size={14} />
            </button>
            <button
              className="am-btn-icon"
              onClick={() => setIsAddingAction(false)}
              title="Cancel (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="am-content">
          {selectedActor ? (
            <ul className="am-list">
              {selectedActor.actions?.map((action: string, idx: number) => (
                <li key={idx} className="am-list-item">
                  <span>{action}</span>
                  <button
                    className="close-btn"
                    style={{ padding: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetActor = evflData.flowchart.actors[selectedActorIdx!];
                      const newEvflData = {
                        ...evflData,
                        flowchart: {
                          ...evflData.flowchart,
                          actors: evflData.flowchart.actors.with(selectedActorIdx!, {
                            ...targetActor,
                            actions: targetActor.actions.toSpliced(idx, 1)
                          })
                        }
                      };
                      onUpdateEvflData(
                        newEvflData,
                        `Delete Action: ${actorName}.${action}`,
                        'Remove action',
                      );
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>
              {t('actors.selectActorHint')}
            </div>
          )}
        </div>
      </div>

      {/* 查询列表 */}
      <div className="am-section">
        <div className="am-header">
          <span>
            {locale === 'zh'
              ? `查询 (${selectedActor?.queries?.length || 0})`
              : `Queries (${selectedActor?.queries?.length || 0})`}
          </span>
          <button
            className="am-btn"
            onClick={() => setIsAddingQuery(!isAddingQuery)}
            disabled={!selectedActor}
          >
            <Plus size={13} style={{ marginRight: 3 }} />
            {isAddingQuery ? t('common.cancel') : t('common.add')}
          </button>
        </div>

        {isAddingQuery && selectedActor && (
          <div className="am-inline-sub-bar">
            <input
              autoFocus
              type="text"
              list="actor-query-suggestions"
              className="am-sub-input"
              placeholder={locale === 'zh' ? '输入或选择查询名...' : 'Enter or select query...'}
              value={newQueryName}
              onChange={(e) => setNewQueryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmAddQuery();
                if (e.key === 'Escape') setIsAddingQuery(false);
              }}
            />
            <datalist id="actor-query-suggestions">
              {availableQueries.map((q) => (
                <option key={q} value={q} />
              ))}
            </datalist>
            <button
              className="am-btn-icon am-btn-success"
              onClick={handleConfirmAddQuery}
              title="Confirm (Enter)"
              disabled={!newQueryName.trim()}
            >
              <Check size={14} />
            </button>
            <button
              className="am-btn-icon"
              onClick={() => setIsAddingQuery(false)}
              title="Cancel (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="am-content">
          {selectedActor ? (
            <ul className="am-list">
              {selectedActor.queries?.map((query: string, idx: number) => (
                <li key={idx} className="am-list-item">
                  <span>{query}</span>
                  <button
                    className="close-btn"
                    style={{ padding: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const targetActor = evflData.flowchart.actors[selectedActorIdx!];
                      const newEvflData = {
                        ...evflData,
                        flowchart: {
                          ...evflData.flowchart,
                          actors: evflData.flowchart.actors.with(selectedActorIdx!, {
                            ...targetActor,
                            queries: targetActor.queries.toSpliced(idx, 1)
                          })
                        }
                      };
                      onUpdateEvflData(
                        newEvflData,
                        `Delete Query: ${actorName}.${query}`,
                        'Remove query',
                      );
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>
              {t('actors.selectActorHint')}
            </div>
          )}
        </div>
      </div>

      {/* 参数列表组件 */}
      <ActorParamsList
        selectedActor={selectedActor}
        selectedActorIdx={selectedActorIdx}
        evflData={evflData}
        onUpdateEvflData={onUpdateEvflData}
        actorName={actorName}
      />
    </div>
  );
}
