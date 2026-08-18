import { TranslationSchema } from '../types';

// English help and documentation
export const enHelp: TranslationSchema['help'] = {
  title: 'User Guide & Support',
  tabIntro: 'Getting Started',
  tabNodes: 'Node Types',
  tabShortcuts: 'Shortcuts',
  tabFaq: 'FAQ',
  introTitle: 'About Event Studio',
  introDesc1:
    'Event Studio is a high-performance visual event flow editor designed for Nintendo games like The Legend of Zelda: Breath of the Wild.',
  introDesc2:
    'With intuitive node flowcharts, you can easily edit NPC dialogues, quest progressions, cutscene triggers, and camera movements.',
  introDesc3:
    'Supports direct editing and saving of .bfevfl binary files as well as .sbeventpack / .pack archives.',
  githubTitle: 'GitHub Repository',
  githubDesc: 'View source code, release notes, report issues, or contribute',
  openGithub: 'Open GitHub Repository',
  nodeActionDesc:
    'Defines specific actions performed by actors or the system, such as playing animations, opening dialogues, playing audio, or teleporting players.',
  nodeSwitchDesc:
    'Conditional branch node that routes execution based on the return value of a query function.',
  nodeForkDesc:
    'Parallel fork node that splits a single flow into multiple concurrent execution branches.',
  nodeJoinDesc:
    'Parallel join node that synchronizes and waits for all associated parallel branches before proceeding.',
  nodeSubFlowDesc: 'Sub-flow call node that executes another independent flowchart file.',
  nodeEntryPointDesc:
    'Event entry point indicating where the game engine begins executing a specific event.',
  shortcuts: [
    { key: 'Ctrl + O', desc: 'Open file (.bfevfl / .sbeventpack / .msbt etc.)' },
    { key: 'Ctrl + N', desc: 'Create new event flow' },
    { key: 'Ctrl + S', desc: 'Save current file' },
    { key: 'Ctrl + Shift + S', desc: 'Save as new file' },
    { key: 'Ctrl + Z', desc: 'Undo last change' },
    { key: 'Ctrl + Y / Ctrl + Shift + Z', desc: 'Redo' },
    { key: 'Ctrl + Shift + R', desc: 'Auto layout and refresh flowchart' },
    { key: 'Ctrl + ,', desc: 'Open settings & game paths' },
    { key: 'K', desc: 'Toggle knife mode (click edge to cut)' },
    { key: 'F / A / E / J', desc: 'Switch view (Flowchart / Actors / Events / JSON)' },
    { key: 'Right Click Node', desc: 'Node context menu' },
    { key: 'Right Click Canvas', desc: 'Canvas global menu' },
    { key: 'Double Click Node', desc: 'Open node properties editor' },
    { key: 'F1', desc: 'Open this user guide' },
  ],
  faqFormatsTitle: 'Q: What file formats are supported?',
  faqFormatsDesc:
    'Supports .bfevfl (visual graph & JSON), .sbeventpack / .pack (Yaz0 compressed SARC archives), .msbt (localized dialogue editor with tags), and .aamp / .byml (YAML decompile/recompile).',
  faqTimelineTitle: 'Q: How does the timeline and auto-save work?',
  faqTimelineDesc:
    'Every node change, edge edit, or parameter update is timestamped and saved into Documents/EventEditor/autosave/. You can jump to any past step or delete individual snapshots.',
  faqKnifeTitle: 'Q: How to quickly cut connections and create nodes?',
  faqKnifeDesc:
    'Press K to enter Knife Mode and click any highlighted edge to cut it. Drag an edge from any output handle onto empty canvas to open the create menu and link instantly.',
  faqBlankTitle: 'Q: Why are dialogue previews blank?',
  faqBlankDesc:
    'Please set your Game Root Directory and target language (e.g. USen, CNzh) in Preferences. The system will load MSBT dictionaries and show text previews on nodes.',
  faqSarcTitle: 'Q: How are SARC / sbeventpack archives saved?',
  faqSarcDesc:
    'Clicking any .bfevfl or .msbt inside an archive opens it directly. When saved, the modified file is updated inside the archive and compressed with Yaz0 as needed.',
  faqFeedbackTitle: 'Q: How to report bugs or request features?',
  faqFeedbackDesc: 'Join our official Discord or submit an issue on our GitHub repository.',
};
