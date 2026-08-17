import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from '../i18n';

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
  const [newActionName, setNewActionName] = useState("");
  const [availableActions, setAvailableActions] = useState<string[]>([]);

  // 2. 新增查询输入状态
  const [isAddingQuery, setIsAddingQuery] = useState(false);
  const [newQueryName, setNewQueryName] = useState("");
  const [availableQueries, setAvailableQueries] = useState<string[]>([]);

  // 3. 新增参数输入状态
  const [isAddingParam, setIsAddingParam] = useState(false);
  const [newParamType, setNewParamType] = useState("String");
  const [newParamKey, setNewParamKey] = useState("");
  const [newParamVal, setNewParamVal] = useState("");

  const actorName = selectedActor?.identifier?.name || (locale === 'zh' ? "角色" : "Actor");

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

    const newEvflData = structuredClone(evflData);
    const targetActor = newEvflData.flowchart.actors[selectedActorIdx];
    if (!targetActor.actions) targetActor.actions = [];
    if (!targetActor.actions.includes(trimmed)) {
      targetActor.actions.push(trimmed);
      onUpdateEvflData(newEvflData, `Add Action: ${actorName}.${trimmed}`, "New action definition");
    }
    setNewActionName("");
    setIsAddingAction(false);
  };

  // 提交新增查询
  const handleConfirmAddQuery = () => {
    const trimmed = newQueryName.trim();
    if (!selectedActor || !trimmed || selectedActorIdx === null) return;

    const newEvflData = structuredClone(evflData);
    const targetActor = newEvflData.flowchart.actors[selectedActorIdx];
    if (!targetActor.queries) targetActor.queries = [];
    if (!targetActor.queries.includes(trimmed)) {
      targetActor.queries.push(trimmed);
      onUpdateEvflData(newEvflData, `Add Query: ${actorName}.${trimmed}`, "New query definition");
    }
    setNewQueryName("");
    setIsAddingQuery(false);
  };

  // 提交新增参数
  const handleConfirmAddParam = () => {
    const trimmedKey = newParamKey.trim();
    if (!selectedActor || !trimmedKey || selectedActorIdx === null) return;

    const newEvflData = structuredClone(evflData);
    let params = newEvflData.flowchart.actors[selectedActorIdx].params;
    if (!params) {
      params = { data: {} };
      newEvflData.flowchart.actors[selectedActorIdx].params = params;
    }

    let parsedVal: any = newParamVal;
    if (newParamType === "Int") parsedVal = parseInt(newParamVal, 10) || 0;
    else if (newParamType === "Float") parsedVal = parseFloat(newParamVal) || 0.0;
    else if (newParamType === "Bool") parsedVal = newParamVal === "true";

    params.data[trimmedKey] = { [newParamType]: parsedVal };
    onUpdateEvflData(newEvflData, `Add Param: ${actorName}.${trimmedKey}`, `Type: ${newParamType}`);
    setNewParamKey("");
    setNewParamVal("");
    setIsAddingParam(false);
  };

  // 添加默认创建参数
  const handleAddDefaultParams = () => {
    if (!selectedActor || selectedActorIdx === null) return;
    const newEvflData = structuredClone(evflData);
    let params = newEvflData.flowchart.actors[selectedActorIdx].params;
    if (!params) {
      params = { data: {} };
      newEvflData.flowchart.actors[selectedActorIdx].params = params;
    }
    const defaultParams: Record<string, any> = {
      CreateMode: { Int: 0 },
      IsGrounding: { Bool: false },
      IsWorld: { Bool: false },
      PosX: { Float: 0.0 },
      PosY: { Float: 0.0 },
      PosZ: { Float: 0.0 },
      RotX: { Float: 0.0 },
      RotY: { Float: 0.0 },
      RotZ: { Float: 0.0 },
    };
    for (const [k, v] of Object.entries(defaultParams)) {
      if (!params.data[k]) {
        params.data[k] = v;
      }
    }
    onUpdateEvflData(newEvflData, `Add Default Params: ${actorName}`, "Default create parameters");
  };

  // 删除参数
  const handleDeleteParam = (key: string) => {
    if (!selectedActor || selectedActorIdx === null) return;
    const newEvflData = structuredClone(evflData);
    delete newEvflData.flowchart.actors[selectedActorIdx].params.data[key];
    onUpdateEvflData(newEvflData, `Delete Param: ${actorName}.${key}`, "Remove parameter definition");
  };

  return (
    <div className="am-bottom">
      {/* 动作列表 */}
      <div className="am-section">
        <div className="am-header">
          <span>{locale === 'zh' ? `动作 (${selectedActor?.actions?.length || 0})` : `Actions (${selectedActor?.actions?.length || 0})`}</span>
          <button 
            className="am-btn" 
            onClick={() => setIsAddingAction(!isAddingAction)} 
            disabled={!selectedActor}
          >
            <Plus size={13} style={{ marginRight: 3 }} />
            {isAddingAction ? t('common.cancel') : (locale === 'zh' ? "添加..." : "Add...")}
          </button>
        </div>

        {isAddingAction && selectedActor && (
          <div className="am-inline-sub-bar">
            <input
              autoFocus
              type="text"
              list="actor-action-suggestions"
              className="am-sub-input"
              placeholder={locale === 'zh' ? "输入或选择动作名..." : "Enter or select action..."}
              value={newActionName}
              onChange={(e) => setNewActionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmAddAction();
                if (e.key === "Escape") setIsAddingAction(false);
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
            <button className="am-btn-icon" onClick={() => setIsAddingAction(false)} title="Cancel (Esc)">
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
                  <button className="close-btn" style={{ padding: 2 }} onClick={(e) => {
                    e.stopPropagation();
                    const newEvflData = structuredClone(evflData);
                    newEvflData.flowchart.actors[selectedActorIdx!].actions.splice(idx, 1);
                    onUpdateEvflData(newEvflData, `Delete Action: ${actorName}.${action}`, "Remove action");
                  }}>
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
          <span>{locale === 'zh' ? `查询 (${selectedActor?.queries?.length || 0})` : `Queries (${selectedActor?.queries?.length || 0})`}</span>
          <button 
            className="am-btn" 
            onClick={() => setIsAddingQuery(!isAddingQuery)} 
            disabled={!selectedActor}
          >
            <Plus size={13} style={{ marginRight: 3 }} />
            {isAddingQuery ? t('common.cancel') : (locale === 'zh' ? "添加..." : "Add...")}
          </button>
        </div>

        {isAddingQuery && selectedActor && (
          <div className="am-inline-sub-bar">
            <input
              autoFocus
              type="text"
              list="actor-query-suggestions"
              className="am-sub-input"
              placeholder={locale === 'zh' ? "输入或选择查询名..." : "Enter or select query..."}
              value={newQueryName}
              onChange={(e) => setNewQueryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmAddQuery();
                if (e.key === "Escape") setIsAddingQuery(false);
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
            <button className="am-btn-icon" onClick={() => setIsAddingQuery(false)} title="Cancel (Esc)">
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
                  <button className="close-btn" style={{ padding: 2 }} onClick={(e) => {
                    e.stopPropagation();
                    const newEvflData = structuredClone(evflData);
                    newEvflData.flowchart.actors[selectedActorIdx!].queries.splice(idx, 1);
                    onUpdateEvflData(newEvflData, `Delete Query: ${actorName}.${query}`, "Remove query");
                  }}>
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
      
      {/* 参数列表 */}
      <div className="am-section" style={{ flex: 1.5 }}>
        <div className="am-header">
          <span>{t('nodes.params')}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button 
              className="am-btn" 
              onClick={handleAddDefaultParams}
              disabled={!selectedActor}
              title={t('autofill.addDefaultParams')}
              style={{ color: '#38bdf8' }}
            >
              <Sparkles size={13} style={{ marginRight: 3 }} />
              {t('autofill.addDefaultParams')}
            </button>
            <button 
              className="am-btn" 
              onClick={() => setIsAddingParam(!isAddingParam)} 
              disabled={!selectedActor}
            >
              <Plus size={13} style={{ marginRight: 3 }} />
              {isAddingParam ? t('common.cancel') : (locale === 'zh' ? "添加..." : "Add...")}
            </button>
          </div>
        </div>

        {isAddingParam && selectedActor && (
          <div className="am-inline-param-bar">
            <select
              className="am-param-select"
              value={newParamType}
              onChange={(e) => setNewParamType(e.target.value)}
            >
              <option value="String">String</option>
              <option value="Int">Int</option>
              <option value="Float">Float</option>
              <option value="Bool">Bool</option>
            </select>
            <input
              autoFocus
              type="text"
              className="am-param-input"
              placeholder="Key"
              value={newParamKey}
              onChange={(e) => setNewParamKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirmAddParam();
                if (e.key === "Escape") setIsAddingParam(false);
              }}
            />
            {newParamType === "Bool" ? (
              <select
                className="am-param-select"
                value={newParamVal}
                onChange={(e) => setNewParamVal(e.target.value)}
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={newParamType === "Int" || newParamType === "Float" ? "number" : "text"}
                step={newParamType === "Float" ? "any" : "1"}
                className="am-param-input"
                placeholder="Value"
                value={newParamVal}
                onChange={(e) => setNewParamVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmAddParam();
                  if (e.key === "Escape") setIsAddingParam(false);
                }}
              />
            )}
            <button 
              className="am-btn-icon am-btn-success" 
              onClick={handleConfirmAddParam} 
              title="Confirm (Enter)" 
              disabled={!newParamKey.trim()}
            >
              <Check size={14} />
            </button>
            <button className="am-btn-icon" onClick={() => setIsAddingParam(false)} title="Cancel (Esc)">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="am-content">
          {selectedActor ? (
            <table className="am-table">
              <thead>
                <tr>
                  <th>{t('common.type')}</th>
                  <th>{t('common.key')}</th>
                  <th>{t('common.value')}</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {!selectedActor.params?.data || Object.keys(selectedActor.params.data).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                      {t('nodes.noParams')}
                    </td>
                  </tr>
                ) : (
                  Object.entries(selectedActor.params.data).map(([key, valObj]: [string, any]) => {
                    const paramType = Object.keys(valObj)[0];
                    const val = valObj[paramType];
                    return (
                      <tr key={key}>
                        <td>{paramType}</td>
                        <td>{key}</td>
                        <td>{val?.toString() ?? ''}</td>
                        <td>
                          <button className="close-btn" style={{ padding: 2 }} onClick={() => handleDeleteParam(key)}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>
              {t('actors.selectActorHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
