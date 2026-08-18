import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File, FileJson, Archive } from 'lucide-react';
import { FileNode } from '../types/fileTree';

interface FileTreeProps {
  nodes: FileNode[];
  selectedPath?: string | null;
  onFileSelect: (path: string) => void;
  onContextMenu?: (node: FileNode, e: React.MouseEvent) => void;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  selectedPath?: string | null;
  onFileSelect: (path: string) => void;
  onContextMenu?: (node: FileNode, e: React.MouseEvent) => void;
  level: number;
}> = ({ node, selectedPath, onFileSelect, onContextMenu, level }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isSelected = selectedPath === node.path;
  const paddingLeft = `${level * 12 + 8}px`;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.is_dir || node.is_sarc) {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(node, e);
    }
  };

  const renderIcon = () => {
    if (node.is_dir || node.is_sarc) {
      return (
        <div className="tree-icon-wrapper" onClick={handleToggle}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {node.is_sarc ? (
            <Archive size={14} className="tree-icon file-pack" />
          ) : (
            <Folder size={14} className="tree-icon folder" />
          )}
        </div>
      );
    }

    return (
      <div className="tree-icon-wrapper file-wrapper">
        {node.name.toLowerCase().endsWith('.json') ? (
          <FileJson size={14} className="tree-icon file-json" />
        ) : node.name.toLowerCase().endsWith('.sbeventpack') ||
          node.name.toLowerCase().endsWith('.pack') ? (
          <Archive size={14} className="tree-icon file-pack" />
        ) : (
          <File size={14} className="tree-icon file-default" />
        )}
      </div>
    );
  };

  return (
    <div>
      <div
        className={`tree-node ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft }}
        onClick={handleToggle}
        onContextMenu={handleContextMenu}
        title={node.path}
      >
        {renderIcon()}
        <span className="tree-node-name">{node.name}</span>
      </div>
      {(node.is_dir || node.is_sarc) && isOpen && node.children && (
        <div className="tree-children">
          {node.children.map((childNode, index) => (
            <FileTreeNode
              key={`${childNode.path}-${index}`}
              node={childNode}
              selectedPath={selectedPath}
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  selectedPath,
  onFileSelect,
  onContextMenu,
}) => {
  if (!nodes || nodes.length === 0) {
    return <div className="tree-empty">No files found.</div>;
  }

  return (
    <div className="file-tree-container">
      {nodes.map((node, index) => (
        <FileTreeNode
          key={`${node.path}-${index}`}
          node={node}
          selectedPath={selectedPath}
          onFileSelect={onFileSelect}
          onContextMenu={onContextMenu}
          level={0}
        />
      ))}
    </div>
  );
};

export default FileTree;
