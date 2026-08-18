import { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { useTranslation } from './i18n';

interface EventManagerProps {
  evflData: any;
  onUpdateEvflData: (newData: any, title?: string, detail?: string) => void;
  onEditNode: (node: any) => void;
  onEditSwitchNode: (node: any) => void;
  onEditForkNode: (node: any) => void;
}

export default function EventManager({
  evflData,
  onUpdateEvflData,
  onEditNode,
  onEditSwitchNode,
  onEditForkNode,
}: EventManagerProps) {
  const { t, locale } = useTranslation();
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);

  if (!evflData || !evflData.flowchart) {
    return (
      <div className="event-manager" style={{ padding: 20 }}>
        {t('events.noEvents')}
      </div>
    );
  }

  const events = evflData.flowchart.events || [];
  const actors = evflData.flowchart.actors || [];

  const handleEditEvent = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const ev = events[idx];
    if (!ev) return;
    const typeKey = Object.keys(ev.data)[0];
    const mockNode = {
      id: idx.toString(),
      data: {
        id: idx.toString(),
        name: ev.name,
        type: typeKey,
        originalData: ev.data,
      },
    };
    if (typeKey === 'Switch') {
      onEditSwitchNode(mockNode);
    } else if (typeKey === 'Fork') {
      onEditForkNode(mockNode);
    } else {
      onEditNode(mockNode);
    }
  };

  const handleDeleteEvent = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const evName = events[idx]?.name || `#${idx}`;
    const confirmMsg =
      locale === 'zh'
        ? `确定要删除事件 "${evName}" 吗？此操作可能影响相关连线。`
        : `Are you sure you want to delete event "${evName}"? This may affect existing connections.`;
    if (!confirm(confirmMsg)) return;

    const newEvflData = structuredClone(evflData);
    newEvflData.flowchart.events.splice(idx, 1);

    onUpdateEvflData(newEvflData, `Delete Event: ${evName}`, 'Removed from event list');
    if (selectedEventIdx === idx) {
      setSelectedEventIdx(null);
    } else if (selectedEventIdx !== null && selectedEventIdx > idx) {
      setSelectedEventIdx(selectedEventIdx - 1);
    }
  };

  const selectedEvent = selectedEventIdx !== null ? events[selectedEventIdx] : null;
  const selectedType = selectedEvent ? Object.keys(selectedEvent.data)[0] : null;
  const selectedData = selectedType ? selectedEvent.data[selectedType] : null;

  const renderDetails = () => {
    if (!selectedEvent || !selectedData) {
      return (
        <div style={{ padding: 20, color: '#94a3b8', textAlign: 'center' }}>
          {locale === 'zh' ? '请选择一个事件查看详情' : 'Select an event to view details'}
        </div>
      );
    }

    const getActorName = (idx: number) => {
      if (idx === 65535) return '-';
      return actors[idx]?.identifier?.name || `Actor[${idx}]`;
    };

    const getActionQueryName = (actorIdx: number, actionIdx: number, isQuery: boolean) => {
      if (actorIdx === 65535 || actionIdx === 65535) return '-';
      const actor = actors[actorIdx];
      if (!actor) return `[${actionIdx}]`;
      const arr = isQuery ? actor.queries : actor.actions;
      return arr && arr[actionIdx] ? arr[actionIdx] : `[${actionIdx}]`;
    };

    return (
      <div style={{ padding: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '16px',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc' }}>
            {selectedEvent.name} ({selectedType})
          </h3>
          <button
            className="am-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={(e) => handleEditEvent(selectedEventIdx!, e)}
          >
            <Edit size={16} /> {locale === 'zh' ? '编辑事件' : 'Edit Event'}
          </button>
        </div>

        <table className="am-table" style={{ width: '100%', maxWidth: '600px' }}>
          <tbody>
            {selectedType === 'Action' && (
              <>
                <tr>
                  <td style={{ width: 120, fontWeight: 600 }}>{t('nodes.actor')}</td>
                  <td>{getActorName(selectedData.actor?.idx)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>{t('nodes.action')}</td>
                  <td>
                    {getActionQueryName(
                      selectedData.actor?.idx,
                      selectedData.actor_action?.idx,
                      false,
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Next Node</td>
                  <td>{selectedData.nxt?.idx === 65535 ? 'None (End)' : selectedData.nxt?.idx}</td>
                </tr>
              </>
            )}

            {selectedType === 'Switch' && (
              <>
                <tr>
                  <td style={{ width: 120, fontWeight: 600 }}>{t('nodes.actor')}</td>
                  <td>{getActorName(selectedData.actor?.idx)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Query</td>
                  <td>
                    {getActionQueryName(
                      selectedData.actor?.idx,
                      selectedData.actor_query?.idx,
                      true,
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Cases</td>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {Object.entries(selectedData.cases || {}).map(
                        ([val, target]: [string, any]) => (
                          <li key={val}>
                            Value {val} ➔ Node {target.idx}
                          </li>
                        ),
                      )}
                    </ul>
                  </td>
                </tr>
              </>
            )}

            {selectedType === 'Fork' && (
              <>
                <tr>
                  <td style={{ width: 120, fontWeight: 600 }}>Join Node</td>
                  <td>{selectedData.join?.idx}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Branches</td>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {(selectedData.forks || []).map((f: any, i: number) => (
                        <li key={i}>➔ Node {f.idx}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              </>
            )}

            {selectedType === 'Join' && (
              <>
                <tr>
                  <td style={{ width: 120, fontWeight: 600 }}>Next Node</td>
                  <td>{selectedData.nxt?.idx === 65535 ? 'None (End)' : selectedData.nxt?.idx}</td>
                </tr>
              </>
            )}

            {selectedType === 'SubFlow' && (
              <>
                <tr>
                  <td style={{ width: 120, fontWeight: 600 }}>Flowchart</td>
                  <td>{selectedData.res_flowchart_name}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Entry Point</td>
                  <td>{selectedData.entry_point_name}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Next Node</td>
                  <td>{selectedData.nxt?.idx === 65535 ? 'None (End)' : selectedData.nxt?.idx}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {/* Display Params if they exist */}
        {selectedData.params?.data && Object.keys(selectedData.params.data).length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '8px' }}>{t('nodes.params')}</h4>
            <table className="am-table" style={{ width: '100%', maxWidth: '600px' }}>
              <thead>
                <tr>
                  <th>{t('common.type')}</th>
                  <th>{t('common.key')}</th>
                  <th>{t('common.value')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(selectedData.params.data).map(([key, valObj]: [string, any]) => {
                  const paramType = Object.keys(valObj)[0];
                  const val = valObj[paramType];
                  let displayVal = val;
                  if (Array.isArray(val)) displayVal = `[${val.join(', ')}]`;
                  else if (typeof val === 'object') displayVal = JSON.stringify(val);
                  else displayVal = String(val);

                  return (
                    <tr key={key}>
                      <td>{paramType}</td>
                      <td>{key}</td>
                      <td>{displayVal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="actor-manager">
      <div className="am-top" style={{ flex: 1.5 }}>
        <div className="am-header">
          <span>
            {locale === 'zh' ? `共 ${events.length} 个事件` : `Total ${events.length} Events`}
          </span>
        </div>
        <div className="am-content">
          <table className="am-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>{t('common.name')}</th>
                <th>{t('common.type')}</th>
                <th>{t('nodes.actor')}</th>
                <th>{locale === 'zh' ? '下一节点' : 'Next Node'}</th>
                <th style={{ width: 80 }}>{locale === 'zh' ? '操作' : 'Action'}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event: any, idx: number) => {
                const typeKey = Object.keys(event.data)[0];
                const evtData = event.data[typeKey];

                let nextNodeStr = '-';
                if (evtData.nxt && evtData.nxt.idx !== 65535)
                  nextNodeStr = `Node ${evtData.nxt.idx}`;
                else if (typeKey === 'Switch')
                  nextNodeStr = `${Object.keys(evtData.cases || {}).length} ${locale === 'zh' ? '分支' : 'Cases'}`;
                else if (typeKey === 'Fork') nextNodeStr = `➔ Join ${evtData.join?.idx}`;

                let actorStr = '-';
                if (evtData.actor && evtData.actor.idx !== 65535) {
                  actorStr =
                    actors[evtData.actor.idx]?.identifier?.name || `Actor[${evtData.actor.idx}]`;
                }

                return (
                  <tr
                    key={idx}
                    className={selectedEventIdx === idx ? 'selected' : ''}
                    onClick={() => setSelectedEventIdx(idx)}
                    onDoubleClick={(e) => handleEditEvent(idx, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{idx}</td>
                    <td>{event.name}</td>
                    <td>{typeKey}</td>
                    <td>{actorStr}</td>
                    <td>{nextNodeStr}</td>
                    <td>
                      <button
                        className="am-btn"
                        style={{ padding: '2px 6px', marginRight: 4 }}
                        onClick={(e) => handleEditEvent(idx, e)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="am-btn"
                        style={{ padding: '2px 6px', color: '#ef4444' }}
                        onClick={(e) => handleDeleteEvent(idx, e)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                    {t('events.noEvents')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="am-bottom" style={{ flex: 1 }}>
        <div className="am-content" style={{ height: '100%' }}>
          {renderDetails()}
        </div>
      </div>
    </div>
  );
}
