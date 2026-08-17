import { useState } from 'react';
import { X, Info, Code, Heart } from 'lucide-react';
import { useTranslation } from '../i18n';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 关于软件弹窗：展示版本信息、使用的开源库列表及社区致谢
export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  const { t, locale } = useTranslation();
  const [activeTab, setActiveTab] = useState<'info' | 'libraries' | 'credits'>('info');

  if (!isOpen) return null;

  // 使用的核心开源库列表
  const rustLibraries = [
    { name: 'Tauri v2', desc: locale === 'zh' ? '高性能轻量级桌面端应用程序框架' : 'High-performance desktop application framework', author: 'Tauri Apps' },
    { name: 'revfl', desc: locale === 'zh' ? '任天堂 EVFL (EventFlow) 二进制与 JSON 序列化库' : 'Nintendo EVFL binary & JSON serialization library', author: 'k-carbonatedtea / leoetlino' },
    { name: 'roead', desc: locale === 'zh' ? 'SARC 归档包、Yaz0 压缩及 BYML/AAMP 数据解析库' : 'SARC, Yaz0 compression & BYML/AAMP format library', author: 'NiceneNerd' },
    { name: 'msyt / msbt', desc: locale === 'zh' ? '任天堂 MSBT 消息文本格式与 MSYT 解析转换库' : 'Nintendo MSBT text format and MSYT parser', author: 'NiceneNerd' },
  ];

  const frontendLibraries = [
    { name: '@xyflow/react (React Flow)', desc: locale === 'zh' ? '现代化交互式节点流向图可视化引擎' : 'Modern interactive node graph visualization engine', author: 'xyflow' },
    { name: '@monaco-editor/react', desc: locale === 'zh' ? '基于 VS Code 的代码与文本高亮编辑器' : 'VS Code-based code and text editor component', author: 'suren-atoyan' },
    { name: 'dagre', desc: locale === 'zh' ? '有向图层次化自动排版与布局计算算法' : 'Directed graph layered layout calculation engine', author: 'dagrejs' },
    { name: 'lucide-react', desc: locale === 'zh' ? '简洁美观的现代化矢量图标库' : 'Clean & modern SVG icon library', author: 'Lucide' },
    { name: 'js-yaml', desc: locale === 'zh' ? '标准 YAML 文件解析与序列化工具' : 'Standard YAML parser and serializer', author: 'nodeca' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 620, maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={18} color="#38bdf8" />
            <span style={{ fontWeight: 600 }}>{t('menu.about')}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* 选项卡导航 */}
        <div className="settings-tabs" style={{ padding: '0 16px' }}>
          <button
            className={`settings-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={14} />
            <span>{t('about.tabInfo')}</span>
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'libraries' ? 'active' : ''}`}
            onClick={() => setActiveTab('libraries')}
          >
            <Code size={14} />
            <span>{t('about.tabLibs')}</span>
          </button>
          <button
            className={`settings-tab-btn ${activeTab === 'credits' ? 'active' : ''}`}
            onClick={() => setActiveTab('credits')}
          >
            <Heart size={14} />
            <span>{t('about.tabCredits')}</span>
          </button>
        </div>

        {/* 主体内容 */}
        <div className="modal-body" style={{ overflowY: 'auto', maxHeight: '55vh', padding: 20 }}>
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: '#38bdf8' }}>{t('about.title')}</h2>
                <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{t('about.version')}</div>
              </div>

              <div className="settings-tip">
                {t('about.desc')}
              </div>

              <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#cbd5e1' }}>
                <p style={{ margin: '0 0 8px 0' }}>{t('about.featuresTitle')}</p>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#94a3b8' }}>
                  {t('about.features').map((feat: string, i: number) => (
                    <li key={i}>{feat}</li>
                  ))}
                </ul>
              </div>

              {/* 开发者与交流联系方式 */}
              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '0.92rem' }}>{t('about.devContactTitle')}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.86rem', color: '#cbd5e1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#94a3b8', width: 75 }}>{t('about.discordLabel')}</span>
                    <code style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>ylimhs_</code>
                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{t('about.or')}</span>
                    <code style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>carbonatedtea</code>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#94a3b8', width: 75 }}>{t('about.qqLabel')}</span>
                    <code style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>2875285430</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'libraries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#38bdf8', fontSize: '0.92rem' }}>{t('about.rustLibsTitle')}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rustLibraries.map((lib) => (
                    <div key={lib.name} style={{ background: '#141414', border: '1px solid #333333', borderRadius: 6, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.88rem' }}>{lib.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{lib.author}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>{lib.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#38bdf8', fontSize: '0.92rem' }}>{t('about.frontendLibsTitle')}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {frontendLibraries.map((lib) => (
                    <div key={lib.name} style={{ background: '#141414', border: '1px solid #333333', borderRadius: 6, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.88rem' }}>{lib.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{lib.author}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>{lib.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="settings-tip">
                {t('about.creditsTip')}
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>{t('about.coreContributors')}</h4>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.7 }}>
                  <li><strong>k-carbonatedtea / leoetlino</strong> - revfl parser and EVFL binary format reversing.</li>
                  <li><strong>NiceneNerd</strong> - roead (SARC, Yaz0, BYML, AAMP), msyt.</li>
                  <li><strong>leoetlino</strong> - BotW reverse engineering, BCML / SARC tooling.</li>
                </ul>
              </div>

              <div style={{ background: '#141414', border: '1px solid #333333', borderRadius: 8, padding: 14 }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>{t('about.communityTitle')}</h4>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  {t('about.communityDesc')}
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
