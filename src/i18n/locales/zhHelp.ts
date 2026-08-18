import { TranslationSchema } from '../types';

// 中文帮助与使用说明
export const zhHelp: TranslationSchema['help'] = {
  title: '使用说明与支持',
  tabIntro: '入门介绍',
  tabNodes: '节点类型说明',
  tabShortcuts: '快捷键清单',
  tabFaq: '常见问题 (FAQ)',
  introTitle: '关于 Event Studio',
  introDesc1:
    'Event Studio 是一款专为任天堂《塞尔达传说：旷野之息》等游戏打造的高性能可视化事件流 (EventFlow) 编辑工具。',
  introDesc2: '通过直观的节点图表，您可以轻松编辑 NPC 剧情对话、任务流向、过场动画逻辑及镜头动作。',
  introDesc3: '本编辑器支持直接打开与写回 .bfevfl 二进制文件以及 .sbeventpack / .pack 封包归档。',
  githubTitle: 'GitHub 开源仓库',
  githubDesc: '查看项目源代码、更新日志、提交 Issue 反馈或参与开源贡献',
  openGithub: '访问 GitHub 仓库',
  nodeActionDesc: '定义角色或系统执行的具体行为，如播放动画、触发对话、播放音效或传送玩家。',
  nodeSwitchDesc: '条件分支节点，根据传入的查询函数 (Query) 的返回值分流至不同的执行路径。',
  nodeForkDesc: '并行分支节点，将单一流程分流为多条同时执行的并行支线。',
  nodeJoinDesc: '并行汇合节点，等待所有关联的并行分支全部执行完毕后再继续向下流转。',
  nodeSubFlowDesc: '子流程调用节点，跳转并执行另一个独立的流程图文件。',
  nodeEntryPointDesc: '事件入口点标识，指示游戏引擎启动该事件时从哪个节点开始流转。',
  shortcuts: [
    { key: 'Ctrl + O', desc: '打开单个文件（.bfevfl / .sbeventpack / .msbt 等）' },
    { key: 'Ctrl + N', desc: '新建空白事件流文件' },
    { key: 'Ctrl + S', desc: '保存当前文件（若位于压缩包内则自动打包写回）' },
    { key: 'Ctrl + Shift + S', desc: '将当前流程图另存为新文件' },
    { key: 'Ctrl + Z', desc: '撤销上一步操作' },
    { key: 'Ctrl + Y / Ctrl + Shift + Z', desc: '重做上一步操作' },
    { key: 'Ctrl + Shift + R', desc: '重新自动计算排版并刷新图表' },
    { key: 'Ctrl + ,', desc: '打开设置与游戏路径偏好' },
    { key: 'K', desc: '切换切刀模式（开启后点击连线可快速断开连接，再次按 K 退出）' },
    { key: 'F / A / E / J', desc: '快速切换视图（流程图 / 角色 / 事件 / JSON源码）' },
    { key: '右键点击节点', desc: '打开节点操作菜单（编辑、添加子节点、添加父节点、设为入口等）' },
    { key: '右键点击画布', desc: '打开画布全局菜单（快速新建各类事件节点）' },
    { key: '双击节点', desc: '直接打开对应节点的参数属性编辑窗口' },
    { key: 'F1', desc: '打开本使用说明与支持窗口' },
  ],
  faqFormatsTitle: 'Q: 软件支持打开与编辑哪些游戏文件格式？',
  faqFormatsDesc:
    '支持 .bfevfl（流程图可视化与 JSON 源码双向编辑）、.sbeventpack / .pack（Yaz0 自动压缩解压并支持多层级文件树）、.msbt（包含颜色标签高亮与即时渲染的文本本地化编辑器）、以及 .aamp / .byml（自动反编译为 YAML 源码编辑并编译回二进制）。',
  faqTimelineTitle: 'Q: 历史时间轴与多步自动保存是如何工作的？',
  faqTimelineDesc:
    '每次节点增删、属性修改或连线变动，系统都会自动记录带有时间戳的快照并持久化保存至 Documents/EventEditor/autosave/。即使意外关闭或重新打开文件，历史记录也会完整还原，并支持随时跳转到任意历史步骤或单步删除。',
  faqKnifeTitle: 'Q: 如何高效进行连线断开与新建节点？',
  faqKnifeDesc:
    '按 K 键可开启刀切模式，鼠标悬停连线即亮红，单击连线可瞬间断开；在空白画布上拖拽任意节点的输出端并松开，可直接唤出新建菜单，创建后自动与源节点建立连线。',
  faqBlankTitle: 'Q: 为什么对话文本预览显示空白？',
  faqBlankDesc:
    '请先在「设置 -> 偏好设置」中配置好游戏根目录（Game Dir）与目标语言包（如 CNzh），系统将自动加载全量 MSBT 文本字典并在 Flowchart 节点中实时解析显示中文台词。',
  faqSarcTitle: 'Q: SARC / sbeventpack 压缩包是如何保存的？',
  faqSarcDesc:
    '在侧边栏中直接点击压缩包内部的任意 .bfevfl 或 .msbt 进行编辑，点击保存时后台会自动将修改后的二进制文件重新写回压缩包内，并按需进行 Yaz0 压缩。',
  faqFeedbackTitle: 'Q: 发现 Bug 或有新功能建议如何反馈？',
  faqFeedbackDesc:
    '欢迎加入我们的官方 Discord 或 QQ 交流群反馈问题，您也可以在 GitHub 仓库提交 Issue。',
};
