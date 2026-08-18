import { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Save } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { message } from '@tauri-apps/plugin-dialog';
import { useTranslation } from '../i18n';

interface MsbtEditorProps {
  filePath: string;
}

/**
 * 游戏内 MSBT 所支持的文字颜色定义
 */
const SUPPORTED_COLOURS = new Set([
  'white',
  'red',
  'blue',
  'grey',
  'gray',
  'light_grey',
  'light_gray',
  'orange',
  'light_green4',
  'light_green1',
]);

interface DecorationItem {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  inlineClassName: string;
  hoverMessage?: string;
}

/**
 * 解析 MSBT JSON 中的对话文本和颜色控制标签，生成 Monaco 编辑器的高亮装饰
 */
function computeMsbtDecorations(text: string): DecorationItem[] {
  const decorations: DecorationItem[] = [];
  const lines = text.split('\n');

  let inContents = false;
  let inControl = false;
  let currentColor = 'white';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (line.includes('"contents"')) {
      inContents = true;
      inControl = false;
      currentColor = 'white';
    }

    const tokenRegex = /"(?:[^"\\]|\\.)*"|[{}\[\]]/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      const token = match[0];
      const startCol = match.index + 1;
      const endCol = startCol + token.length;

      if (token === '{') {
        if (inContents) inControl = true;
        continue;
      }
      if (token === '}') {
        if (inContents) inControl = false;
        continue;
      }
      if (token === ']' && inContents && !inControl) {
        inContents = false;
        currentColor = 'white';
        continue;
      }

      if (!token.startsWith('"')) continue;
      const unquoted = token.slice(1, -1);

      if (unquoted === 'contents') {
        inContents = true;
        inControl = false;
        currentColor = 'white';
      } else if (inControl) {
        if (unquoted === 'reset_colour') {
          currentColor = 'white';
        } else if (SUPPORTED_COLOURS.has(unquoted.toLowerCase())) {
          currentColor = unquoted.toLowerCase();
          decorations.push({
            startLine: lineNum,
            startCol,
            endLine: lineNum,
            endCol,
            inlineClassName: `msbt-color-${currentColor} msbt-badge-tag`,
            hoverMessage: `文字颜色: ${currentColor}`,
          });
        }
      } else if (inContents) {
        // 对话文本内容着色：默认白色，遇标签变色
        decorations.push({
          startLine: lineNum,
          startCol,
          endLine: lineNum,
          endCol,
          inlineClassName: `msbt-color-${currentColor}`,
          hoverMessage: currentColor !== 'white' ? `高亮颜色: ${currentColor}` : undefined,
        });
      }
    }
  }

  return decorations;
}

export default function MsbtEditor({ filePath }: MsbtEditorProps) {
  const { t } = useTranslation();
  const [jsonText, setJsonText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsCollectionRef = useRef<any>(null);

  // 刷新编辑器内的文本高亮
  const updateDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const model = editorRef.current.getModel();
    if (!model) return;

    const text = model.getValue();
    const rawDecos = computeMsbtDecorations(text);

    const monacoDecos = rawDecos.map((d) => ({
      range: new monacoRef.current.Range(d.startLine, d.startCol, d.endLine, d.endCol),
      options: {
        inlineClassName: d.inlineClassName,
        hoverMessage: d.hoverMessage ? { value: d.hoverMessage } : undefined,
      },
    }));

    if (decorationsCollectionRef.current) {
      decorationsCollectionRef.current.set(monacoDecos);
    } else {
      decorationsCollectionRef.current = editorRef.current.createDecorationsCollection(monacoDecos);
    }
  }, []);

  // 加载 MSBT 数据（保持编辑器常驻，平滑更新内容避免闪烁）
  useEffect(() => {
    let isCancelled = false;
    const loadMsbt = async () => {
      setIsLoading(true);
      setError(null);
      setIsSaving(false);
      try {
        const data = await invoke<string>('load_msbt', { path: filePath });
        if (!isCancelled) {
          try {
            const parsed = JSON.parse(data);
            setJsonText(JSON.stringify(parsed, null, 2));
          } catch {
            setJsonText(data);
          }
        }
      } catch (e: any) {
        if (!isCancelled) {
          setError(e.toString());
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMsbt();
    return () => {
      isCancelled = true;
    };
  }, [filePath]);

  // 当文本内容变更时即时更新高亮装饰
  useEffect(() => {
    if (jsonText) {
      updateDecorations();
    }
  }, [jsonText, updateDecorations]);

  // 当 Monaco 编辑器完成装载时触发
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemas: [],
      enableSchemaRequest: false,
    });

    updateDecorations();

    editor.onDidChangeModelContent(() => {
      updateDecorations();
    });
  };

  // 保存 MSBT 文件
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      JSON.parse(jsonText);
      await invoke('save_msbt', { path: filePath, jsonData: jsonText });
      await message(t('msbtEditor.saveSuccess'), { title: t('common.success'), kind: 'info' });
    } catch (e: any) {
      setError(e.toString());
      await message(t('msbtEditor.saveFailed', { error: e.toString() }), {
        title: t('common.error'),
        kind: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#1e1e1e',
        color: '#d1d5db',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px',
          borderBottom: '1px solid #333',
        }}
      >
        <h2
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'white',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          MSBT Editor - {filePath.split(/[/\\]/).pop()}
          {isLoading && (
            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400 }}>
              {t('msbtEditor.loading')}
            </span>
          )}
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: isSaving || isLoading ? '#4b5563' : '#2563eb',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            cursor: isSaving || isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={16} />
          <span>{isSaving ? t('msbtEditor.saving') : t('msbtEditor.save')}</span>
        </button>
      </div>
      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#7f1d1d',
            color: '#fecaca',
            fontSize: '0.875rem',
          }}
        >
          {t('common.error')}: {error}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage="json"
          theme="vs-dark"
          value={jsonText}
          onMount={handleEditorDidMount}
          onChange={(value) => setJsonText(value || '')}
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            fontSize: 13,
            fontFamily: 'monospace',
            unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false },
          }}
        />
      </div>
    </div>
  );
}
