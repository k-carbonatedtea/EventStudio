import { useState } from 'react';
import { Plus, Trash2, Check, X, Wand2, ArrowDownUp, Copy, Clipboard } from 'lucide-react';
import { useTranslation } from '../i18n';

interface ParamTableEditorProps {
  params: Record<string, any>;
  isActorEvent: boolean;
  onParamChange: (key: string, value: any, paramType: string) => void;
  onDeleteParam: (key: string) => void;
  onAddParam: (key: string, type: string, value: any) => void;
  onAutoFill?: () => void;
  onReorder?: () => void;
  onCopyJson?: () => void;
  onPasteJson?: () => void;
}

// 节点参数表格与工具栏组件
export default function ParamTableEditor({
  params,
  isActorEvent,
  onParamChange,
  onDeleteParam,
  onAddParam,
  onAutoFill,
  onReorder,
  onCopyJson,
  onPasteJson,
}: ParamTableEditorProps) {
  const { t, locale } = useTranslation();
  const [addingParam, setAddingParam] = useState(false);
  const [newParam, setNewParam] = useState({ key: '', type: 'String', value: '' as any });

  const handleSaveNewParam = () => {
    if (!newParam.key.trim()) return;
    onAddParam(newParam.key.trim(), newParam.type, newParam.value);
    setAddingParam(false);
    setNewParam({ key: '', type: 'String', value: '' });
  };

  return (
    <div className="params-section">
      <div className="params-toolbar">
        <span className="params-title">{t('nodes.params')}</span>
        <div className="params-actions" style={{ display: 'flex', gap: '6px' }}>
          {isActorEvent && (
            <>
              <button className="param-btn" style={{ color: '#38bdf8' }} onClick={onAutoFill} title={t('autofill.autoFill')}>
                <Wand2 size={13} /> {t('autofill.autoFill')}
              </button>
              <button className="param-btn" onClick={onReorder} title={t('autofill.reorder')}>
                <ArrowDownUp size={13} /> {t('autofill.reorder')}
              </button>
            </>
          )}
          <button className="param-btn" onClick={onCopyJson} title={t('autofill.copyJson')}>
            <Copy size={13} /> {t('autofill.copyJson')}
          </button>
          <button className="param-btn" onClick={onPasteJson} title={t('autofill.pasteJson')}>
            <Clipboard size={13} /> {t('autofill.pasteJson')}
          </button>
          <button className="param-btn" onClick={() => setAddingParam(true)}>
            <Plus size={14} /> {locale === 'zh' ? '添加参数...' : 'Add...'}
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="params-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>{t('common.type')}</th>
              <th style={{ width: '150px' }}>{t('common.key')}</th>
              <th>{t('common.value')}</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(params).length === 0 && !addingParam ? (
              <tr>
                <td colSpan={3} className="empty-state">{t('nodes.noParams')}</td>
              </tr>
            ) : (
              Object.entries(params).map(([key, valObj]: [string, any]) => {
                const paramType = Object.keys(valObj)[0];
                const val = valObj[paramType];

                return (
                  <tr key={key}>
                    <td><span className="type-badge">{paramType.toLowerCase()}</span></td>
                    <td className="key-cell">{key}</td>
                    <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {paramType === 'Bool' ? (
                        <input 
                          type="checkbox" 
                          checked={Boolean(val)} 
                          onChange={(e) => onParamChange(key, e.target.checked, paramType)} 
                        />
                      ) : paramType === 'Int' || paramType === 'Float' ? (
                        <input 
                          type="number" 
                          className="param-input"
                          step={paramType === 'Float' ? '0.1' : '1'}
                          value={val ?? 0} 
                          onChange={(e) => onParamChange(key, paramType === 'Float' ? parseFloat(e.target.value) : parseInt(e.target.value), paramType)}
                        />
                      ) : (
                        <input 
                          type="text" 
                          className="param-input"
                          value={val ?? ''} 
                          onChange={(e) => onParamChange(key, e.target.value, paramType)}
                        />
                      )}
                      <button 
                        className="icon-btn" 
                        onClick={() => onDeleteParam(key)}
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '4px' }}
                        title={t('common.delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            {addingParam && (
              <tr>
                <td>
                  <select 
                    className="param-input"
                    value={newParam.type}
                    onChange={e => {
                      const type = e.target.value;
                      let val: any = '';
                      if (type === 'Int' || type === 'Float') val = 0;
                      if (type === 'Bool') val = false;
                      setNewParam({ ...newParam, type, value: val });
                    }}
                  >
                    <option value="String">String</option>
                    <option value="Int">Int</option>
                    <option value="Float">Float</option>
                    <option value="Bool">Bool</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="text" 
                    className="param-input" 
                    placeholder="Key" 
                    value={newParam.key}
                    onChange={e => setNewParam({ ...newParam, key: e.target.value })}
                  />
                </td>
                <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {newParam.type === 'Bool' ? (
                    <input 
                      type="checkbox" 
                      checked={newParam.value} 
                      onChange={e => setNewParam({ ...newParam, value: e.target.checked })}
                    />
                  ) : newParam.type === 'Int' || newParam.type === 'Float' ? (
                    <input 
                      type="number" 
                      className="param-input"
                      step={newParam.type === 'Float' ? '0.1' : '1'}
                      value={newParam.value} 
                      onChange={e => setNewParam({ ...newParam, value: newParam.type === 'Float' ? parseFloat(e.target.value) : parseInt(e.target.value) })}
                    />
                  ) : (
                    <input 
                      type="text" 
                      className="param-input" 
                      placeholder="Value"
                      value={newParam.value}
                      onChange={e => setNewParam({ ...newParam, value: e.target.value })}
                    />
                  )}
                  <button 
                    className="icon-btn" 
                    onClick={handleSaveNewParam}
                    style={{ background: 'transparent', border: 'none', color: '#52c41a', cursor: 'pointer', padding: '4px' }}
                    title={t('common.confirm')}
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    className="icon-btn" 
                    onClick={() => setAddingParam(false)}
                    style={{ background: 'transparent', border: 'none', color: '#8c8c8c', cursor: 'pointer', padding: '4px' }}
                    title={t('common.cancel')}
                  >
                    <X size={14} />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
