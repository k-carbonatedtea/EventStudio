import { useState } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import ActorDetailsPanel from './components/ActorDetailsPanel';
import { useTranslation } from './i18n';

interface ActorManagerProps {
  evflData: any;
  onUpdateEvflData: (newData: any, title?: string, detail?: string) => void;
}

// 角色管理主组件（支持平滑行内添加角色、动作、查询与参数）
export default function ActorManager({ evflData, onUpdateEvflData }: ActorManagerProps) {
  const { t, locale } = useTranslation();
  const [selectedActorIdx, setSelectedActorIdx] = useState<number | null>(null);

  // 新增角色行内输入状态
  const [isAddingActor, setIsAddingActor] = useState(false);
  const [newActorName, setNewActorName] = useState("");
  const [newActorSubName, setNewActorSubName] = useState("");

  if (!evflData || !evflData.flowchart) {
    return <div className="actor-manager" style={{ padding: 20 }}>{t('actors.noActors')}</div>;
  }

  const actors = evflData.flowchart.actors || [];
  const selectedActor = selectedActorIdx !== null ? actors[selectedActorIdx] : null;

  // 提交新增角色
  const handleConfirmAddActor = () => {
    const trimmed = newActorName.trim();
    if (!trimmed) return;

    const newEvflData = structuredClone(evflData);
    if (!newEvflData.flowchart.actors) newEvflData.flowchart.actors = [];

    newEvflData.flowchart.actors.push({
      identifier: { name: trimmed, sub_name: newActorSubName.trim() },
      argument_name: "",
      argument_entry_point: { v: null, idx: 65535 },
      actions: [],
      queries: [],
      params: null,
      concurrent_clips: 65535,
    });

    const subDetail = newActorSubName.trim() ? `Sub: ${newActorSubName.trim()}` : "New actor definition";
    onUpdateEvflData(newEvflData, `Add Actor: ${trimmed}`, subDetail);
    setSelectedActorIdx(newEvflData.flowchart.actors.length - 1);
    setNewActorName("");
    setNewActorSubName("");
    setIsAddingActor(false);
  };

  // 删除指定角色
  const handleDeleteActor = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const actorName = actors[idx]?.identifier?.name || `Actor[${idx}]`;
    const confirmMsg = locale === 'zh'
      ? `确定要删除角色 "${actorName}" 吗？此操作可能影响引用该角色的动作事件。`
      : `Are you sure you want to delete actor "${actorName}"? This may affect events referencing it.`;
    if (!confirm(confirmMsg)) return;

    const newEvflData = structuredClone(evflData);
    newEvflData.flowchart.actors.splice(idx, 1);
    onUpdateEvflData(newEvflData, `Delete Actor: ${actorName}`, "Remove actor definition");

    if (selectedActorIdx === idx) {
      setSelectedActorIdx(null);
    } else if (selectedActorIdx !== null && selectedActorIdx > idx) {
      setSelectedActorIdx(selectedActorIdx - 1);
    }
  };

  return (
    <div className="actor-manager">
      <div className="am-top">
        <div className="am-header">
          <span>{locale === 'zh' ? `共 ${actors.length} 个角色` : `Total ${actors.length} Actors`}</span>
          <button 
            className="am-btn" 
            onClick={() => setIsAddingActor(!isAddingActor)}
          >
            <Plus size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}/>
            {isAddingActor ? (locale === 'zh' ? "取消添加" : "Cancel") : (locale === 'zh' ? "添加角色..." : "Add Actor...")}
          </button>
        </div>

        {/* 角色内联添加栏 */}
        {isAddingActor && (
          <div className="am-inline-bar">
            <div className="am-inline-inputs">
              <div className="am-input-wrap">
                <span className="am-input-label">{locale === 'zh' ? '角色名:' : 'Name:'}</span>
                <input
                  autoFocus
                  type="text"
                  className="am-input"
                  placeholder="EventSystemActor / GameROMPlayer"
                  value={newActorName}
                  onChange={(e) => setNewActorName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmAddActor();
                    if (e.key === "Escape") setIsAddingActor(false);
                  }}
                />
              </div>
              <div className="am-input-wrap">
                <span className="am-input-label">{locale === 'zh' ? '子名称:' : 'Sub:'}</span>
                <input
                  type="text"
                  className="am-input"
                  placeholder="00"
                  value={newActorSubName}
                  onChange={(e) => setNewActorSubName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmAddActor();
                    if (e.key === "Escape") setIsAddingActor(false);
                  }}
                />
              </div>
            </div>
            <div className="am-inline-actions">
              <button 
                className="am-btn-primary" 
                onClick={handleConfirmAddActor} 
                disabled={!newActorName.trim()}
              >
                <Check size={14} /> {locale === 'zh' ? '确认添加 (Enter)' : 'Confirm (Enter)'}
              </button>
              <button className="am-btn-secondary" onClick={() => setIsAddingActor(false)}>
                <X size={14} /> {t('common.cancel')} (Esc)
              </button>
            </div>
          </div>
        )}

        <div className="am-content">
          <table className="am-table">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{locale === 'zh' ? '子名称' : 'Sub Name'}</th>
                <th>{locale === 'zh' ? '部署名' : 'Argument'}</th>
                <th>{locale === 'zh' ? '部署入口点' : 'Entry Point'}</th>
                <th>{locale === 'zh' ? '动作数' : 'Actions'}</th>
                <th>{locale === 'zh' ? '查询数' : 'Queries'}</th>
                <th style={{ width: 48, textAlign: 'center' }}>{locale === 'zh' ? '操作' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {actors.map((actor: any, idx: number) => (
                <tr 
                  key={idx} 
                  className={selectedActorIdx === idx ? 'selected' : ''}
                  onClick={() => setSelectedActorIdx(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>{actor.identifier?.name}</td>
                  <td>{actor.identifier?.sub_name || '-'}</td>
                  <td>{actor.argument_name || '-'}</td>
                  <td>{actor.argument_entry_point?.idx !== 65535 ? actor.argument_entry_point?.idx : '-'}</td>
                  <td>{actor.actions ? actor.actions.length : 0}</td>
                  <td>{actor.queries ? actor.queries.length : 0}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="close-btn" 
                      style={{ padding: '2px 4px', color: '#ef4444' }} 
                      title={t('common.delete')}
                      onClick={(e) => handleDeleteActor(idx, e)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {actors.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                    {t('actors.noActors')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 角色动作、查询与参数管理面板 */}
      <ActorDetailsPanel
        selectedActor={selectedActor}
        selectedActorIdx={selectedActorIdx}
        evflData={evflData}
        onUpdateEvflData={onUpdateEvflData}
      />
    </div>
  );
}
