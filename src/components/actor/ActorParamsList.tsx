import { useState } from 'react';
import { Plus, Trash2, Check, X, Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n';

interface ActorParamsListProps {
  selectedActor: any;
  selectedActorIdx: number | null;
  evflData: any;
  onUpdateEvflData: (newData: any, title?: string, detail?: string) => void;
  actorName: string;
}

// 角色参数列表面板，用于展示和编辑选中角色的默认参数与字典
export default function ActorParamsList({
  selectedActor,
  selectedActorIdx,
  evflData,
  onUpdateEvflData,
  actorName,
}: ActorParamsListProps) {
  const { t } = useTranslation();

  const [isAddingParam, setIsAddingParam] = useState(false);
  const [newParamType, setNewParamType] = useState('String');
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamVal, setNewParamVal] = useState('');

  // 提交新增参数
  const handleConfirmAddParam = () => {
    const trimmedKey = newParamKey.trim();
    if (!selectedActor || !trimmedKey || selectedActorIdx === null) return;

    const targetActor = evflData.flowchart.actors[selectedActorIdx];
    const currentParams = targetActor.params || { data: {} };

    let parsedVal: any = newParamVal;
    if (newParamType === 'Int') parsedVal = parseInt(newParamVal, 10) || 0;
    else if (newParamType === 'Float') parsedVal = parseFloat(newParamVal) || 0.0;
    else if (newParamType === 'Bool') parsedVal = newParamVal === 'true';

    const newEvflData = {
      ...evflData,
      flowchart: {
        ...evflData.flowchart,
        actors: evflData.flowchart.actors.with(selectedActorIdx, {
          ...targetActor,
          params: {
            ...currentParams,
            data: {
              ...currentParams.data,
              [trimmedKey]: { [newParamType]: parsedVal }
            }
          }
        })
      }
    };
    onUpdateEvflData(newEvflData, `Add Param: ${actorName}.${trimmedKey}`, `Type: ${newParamType}`);
    setNewParamKey('');
    setNewParamVal('');
    setIsAddingParam(false);
  };

  // 添加默认创建参数
  const handleAddDefaultParams = () => {
    if (!selectedActor || selectedActorIdx === null) return;
    const targetActor = evflData.flowchart.actors[selectedActorIdx];
    const currentParams = targetActor.params || { data: {} };
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
    
    const newData = { ...currentParams.data };
    for (const [k, v] of Object.entries(defaultParams)) {
      if (!newData[k]) {
        newData[k] = v;
      }
    }

    const newEvflData = {
      ...evflData,
      flowchart: {
        ...evflData.flowchart,
        actors: evflData.flowchart.actors.with(selectedActorIdx, {
          ...targetActor,
          params: {
            ...currentParams,
            data: newData
          }
        })
      }
    };
    onUpdateEvflData(newEvflData, `Add Default Params: ${actorName}`, 'Default create parameters');
  };

  // 删除参数
  const handleDeleteParam = (key: string) => {
    if (!selectedActor || selectedActorIdx === null) return;
    const targetActor = evflData.flowchart.actors[selectedActorIdx];
    const newData = { ...targetActor.params.data };
    delete newData[key];

    const newEvflData = {
      ...evflData,
      flowchart: {
        ...evflData.flowchart,
        actors: evflData.flowchart.actors.with(selectedActorIdx, {
          ...targetActor,
          params: {
            ...targetActor.params,
            data: newData
          }
        })
      }
    };
    onUpdateEvflData(
      newEvflData,
      `Delete Param: ${actorName}.${key}`,
      'Remove parameter definition',
    );
  };

  return (
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
            {isAddingParam ? t('common.cancel') : t('common.add')}
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
            placeholder={t('common.key')}
            value={newParamKey}
            onChange={(e) => setNewParamKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAddParam();
              if (e.key === 'Escape') setIsAddingParam(false);
            }}
          />
          {newParamType === 'Bool' ? (
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
              type={newParamType === 'Int' || newParamType === 'Float' ? 'number' : 'text'}
              step={newParamType === 'Float' ? 'any' : '1'}
              className="am-param-input"
              placeholder={t('common.value')}
              value={newParamVal}
              onChange={(e) => setNewParamVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmAddParam();
                if (e.key === 'Escape') setIsAddingParam(false);
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
          <button
            className="am-btn-icon"
            onClick={() => setIsAddingParam(false)}
            title="Cancel (Esc)"
          >
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
              {!selectedActor.params?.data ||
              Object.keys(selectedActor.params.data).length === 0 ? (
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
                        <button
                          className="close-btn"
                          style={{ padding: 2 }}
                          onClick={() => handleDeleteParam(key)}
                        >
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
  );
}
