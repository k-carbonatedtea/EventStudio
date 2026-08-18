import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Save } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { message } from '@tauri-apps/plugin-dialog';
import { load } from 'js-yaml';
import { useTranslation } from '../i18n';

interface YamlEditorProps {
  filePath: string;
  initialData: { yaml: string; type: string; be: boolean } | null;
  onSaveSuccess?: (savedText: string) => void;
}

// 文本参数与代码编辑器组件（支持 BFEVFL JSON、AAMP、BYML 二进制与文本互转编辑）
const YamlEditor: React.FC<YamlEditorProps> = ({ filePath, initialData, onSaveSuccess }) => {
  const { t } = useTranslation();
  const [yamlText, setYamlText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isJsonMode =
    initialData?.type === 'bfevfl' ||
    initialData?.type === 'json' ||
    filePath.toLowerCase().endsWith('.bfevfl') ||
    filePath.toLowerCase().endsWith('.json');

  useEffect(() => {
    if (initialData) {
      setYamlText(initialData.yaml);
      setError(null);
      setIsSaving(false);
    }
  }, [initialData, filePath]);

  const handleSave = async () => {
    if (!initialData) return;
    setIsSaving(true);
    setError(null);
    try {
      if (isJsonMode) {
        // 校验 JSON 语法
        JSON.parse(yamlText);
        await invoke('save_evfl', {
          path: filePath,
          jsonData: yamlText,
        });
      } else {
        // 预先校验 YAML 语法（过滤掉 !io, !list 等自定义标签）
        const validationText = yamlText.replace(/!+[\w\d_]+/g, '');
        load(validationText);

        await invoke('save_yaml', {
          path: filePath,
          text: yamlText,
          isByml: initialData.type === 'byml',
          isBigEndian: initialData.be,
        });
      }

      onSaveSuccess?.(yamlText);
      await message(t('yamlEditor.saveSuccess'), { title: t('common.success'), kind: 'info' });
    } catch (e: any) {
      let errorMsg = e.toString();
      if (isJsonMode) {
        errorMsg = t('yamlEditor.jsonSyntaxError', { error: e.message || errorMsg });
      } else if (e.name === 'YAMLException' && e.mark) {
        const lineNum = e.mark.line === 0 ? 1 : e.mark.line;
        errorMsg = t('yamlEditor.yamlSyntaxError', {
          line: lineNum,
          detail: e.reason || e.message,
        });
      } else if (errorMsg.includes('Parsing YAML failed')) {
        errorMsg = t('yamlEditor.parserError', { error: errorMsg });
      }
      setError(errorMsg);
      await message(t('yamlEditor.saveFailed', { error: errorMsg }), {
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
        height: '100%',
        width: '100%',
        backgroundColor: '#1e1e1e',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: '1px solid #333',
        }}
      >
        <h2 style={{ color: '#fff', fontSize: '14px', margin: 0 }}>
          {filePath.split(/[/\\]/).pop()}{' '}
          {initialData ? `(${isJsonMode ? 'JSON' : initialData.type.toUpperCase()})` : ''}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {initialData && !isJsonMode && (
            <span style={{ color: '#888', fontSize: '12px' }}>
              {t('yamlEditor.endianness', {
                endian: initialData.be ? t('yamlEditor.bigEndian') : t('yamlEditor.littleEndian'),
              })}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !initialData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isSaving || !initialData ? 'not-allowed' : 'pointer',
            }}
          >
            <Save size={14} />
            {isSaving ? t('yamlEditor.saving') : t('yamlEditor.save')}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          defaultLanguage={isJsonMode ? 'json' : 'yaml'}
          language={isJsonMode ? 'json' : 'yaml'}
          theme="vs-dark"
          value={yamlText}
          onChange={(value) => setYamlText(value || '')}
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
};

export default YamlEditor;
