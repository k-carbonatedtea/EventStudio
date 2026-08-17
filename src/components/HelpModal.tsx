import { useState } from 'react';
import { X, BookOpen, Layers, Keyboard, HelpCircle } from 'lucide-react';
import { useTranslation } from '../i18n';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 使用说明与帮助指南弹窗
export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<'guide' | 'nodes' | 'shortcuts' | 'faq'>('guide');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 720, maxHeight: '88vh' }} onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="#38bdf8" />
            <span style={{ fontWeight: 600 }}>{t('help.title')}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* 选项卡导航 */}
        <div className="settings-tabs" style={{ padding: '0 16px' }}>
          <button className={`settings-tab-btn ${activeTab === 'guide' ? 'active' : ''}`} onClick={() => setActiveTab('guide')}>
            <BookOpen size={14} />
            <span>{t('help.tabIntro')}</span>
          </button>
          <button className={`settings-tab-btn ${activeTab === 'nodes' ? 'active' : ''}`} onClick={() => setActiveTab('nodes')}>
            <Layers size={14} />
            <span>{t('help.tabNodes')}</span>
          </button>
          <button className={`settings-tab-btn ${activeTab === 'shortcuts' ? 'active' : ''}`} onClick={() => setActiveTab('shortcuts')}>
            <Keyboard size={14} />
            <span>{t('help.tabShortcuts')}</span>
          </button>
          <button className={`settings-tab-btn ${activeTab === 'faq' ? 'active' : ''}`} onClick={() => setActiveTab('faq')}>
            <HelpCircle size={14} />
            <span>{t('help.tabFaq')}</span>
          </button>
        </div>

        {/* 主体内容 */}
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '60vh', padding: 20 }}>
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="settings-tip">
                <strong>Event Studio</strong> {t('help.introDesc1')}
              </div>

              {/* 1. 文件打开与工程管理 */}
              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>
                  {locale === 'zh' ? '1. 文件打开与工程管理' : '1. Open Files & Manage Projects'}
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  <li>
                    <strong>{locale === 'zh' ? '独立文件与封包' : 'Single File & Package'}</strong>: {locale === 'zh' ? '点击顶部 文件(F) -> 打开(O)... 或按 Ctrl+O 选择 .bfevfl、.sbeventpack、.msbt、.aamp 等文件。' : 'Click File -> Open File... or press Ctrl+O to select .bfevfl, .sbeventpack, .msbt, .aamp files.'}
                  </li>
                  <li>
                    <strong>{locale === 'zh' ? '模组工程目录' : 'Mod Project Folder'}</strong>: {locale === 'zh' ? '点击 文件(F) -> 打开模组文件夹... 打开包含 romfs 结构的 Atmosphere / Cemu 模组目录，左侧自动生成多层级资源树。' : 'Click File -> Open Mod Folder... to load Atmosphere/Cemu mod directory with full file explorer.'}
                  </li>
                  <li>
                    <strong>{locale === 'zh' ? '拖拽即开' : 'Drag & Drop'}</strong>: {t('empty.dragHint')}
                  </li>
                </ul>
              </div>

              {/* 2. 多格式支持与源码编辑 */}
              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>
                  {locale === 'zh' ? '2. 多格式支持与源码编辑' : '2. Multi-Format & Source Editing'}
                </h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  <li>
                    <strong>BFEVFL</strong>: {locale === 'zh' ? '支持可视化流程图与 Monaco JSON 源码实时互转编辑（按 J 键切换，Ctrl+S 保存自动写回二进制）。' : 'Supports visual flowchart & raw Monaco JSON two-way editing (press J to toggle, Ctrl+S writes binary).'}
                  </li>
                  <li>
                    <strong>MSBT</strong>: {locale === 'zh' ? '原生游戏文本本地化编辑器，支持颜色控制标签 <1:colour> 装饰与即时渲染。' : 'Native localization text editor with <1:colour> tag decorations & live render.'}
                  </li>
                  <li>
                    <strong>AAMP / BYML</strong>: {locale === 'zh' ? '自动反编译为 YAML 源码进行 Monaco 编辑并编译写回。' : 'Auto decompiles to YAML source and compiles back to binary upon saving.'}
                  </li>
                </ul>
              </div>

              {/* 3. 历史时间轴与多步持久化快照 */}
              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>
                  {locale === 'zh' ? '3. 历史时间轴与多步快照恢复' : '3. History Timeline & Autosave Recovery'}
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  {locale === 'zh' 
                    ? '所有操作自动记录步进快照并持久化于 Documents/EventEditor/autosave/。重新打开文件时自动还原历史记录，在子顶部栏时间轴中可任意跳转、单步删除或一键放弃修改。'
                    : 'All operations capture timestamped snapshots stored in Documents/EventEditor/autosave/. File history is fully restored upon reopening, with jump-to-step, step deletion, and discard support.'}
                </div>
              </div>

              {/* 4. 语言包与台词文本预览 */}
              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>
                  {locale === 'zh' ? '4. 语言包与台词文本预览' : '4. Language Packs & Dialogue Preview'}
                </h4>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  {locale === 'zh' 
                    ? '在 设置(S) -> 偏好设置 中配置游戏根目录与默认语言包（如 CNzh、USen、JPja 等）。当动作节点包含 MessageId 参数时，编辑器将自动读取对应台词并在节点底部实时呈现对话预览。'
                    : 'Configure game root path and language pack (e.g. USen, CNzh, JPja) in Preferences. When an action node contains MessageId, dialogue text is automatically resolved and previewed.'}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'nodes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>ACTION</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{t('nodes.action')}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.nodeActionDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: '#d97706', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>SWITCH</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{t('nodes.switch')}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.nodeSwitchDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>FORK / JOIN</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{t('nodes.fork')} / {t('nodes.join')}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.nodeForkDesc')} {t('help.nodeJoinDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>SUBFLOW</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{t('nodes.subFlow')}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.nodeSubFlowDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: '#e11d48', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>ENTRY POINT</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{t('nodes.entryPoint')}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.nodeEntryPointDesc')}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div>
              <table className="am-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>{locale === 'zh' ? '快捷键' : 'Shortcut'}</th>
                    <th>{locale === 'zh' ? '功能描述' : 'Description'}</th>
                  </tr>
                </thead>
                <tbody>
                  {t('help.shortcuts').map((sc: { key: string; desc: string }, i: number) => (
                    <tr key={i}>
                      <td><code>{sc.key}</code></td>
                      <td>{sc.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'faq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#f8fafc' }}>{t('help.faqFormatsTitle')}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.faqFormatsDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#f8fafc' }}>{t('help.faqTimelineTitle')}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.faqTimelineDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#f8fafc' }}>{t('help.faqKnifeTitle')}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.faqKnifeDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#f8fafc' }}>{t('help.faqBlankTitle')}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.faqBlankDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#f8fafc' }}>{t('help.faqSarcTitle')}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  {t('help.faqSarcDesc')}
                </div>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#f8fafc' }}>{t('help.faqFeedbackTitle')}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  {t('help.faqFeedbackDesc')}
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, color: '#cbd5e1' }}>
                    <div>• <strong>Discord:</strong> <code style={{ color: '#60a5fa' }}>ylimhs_</code> {t('about.or')} <code style={{ color: '#60a5fa' }}>carbonatedtea</code></div>
                    <div>• <strong>QQ:</strong> <code style={{ color: '#34d399' }}>2875285430</code></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="modal-footer">
          <button className="am-btn" onClick={onClose} style={{ padding: '6px 20px' }}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
