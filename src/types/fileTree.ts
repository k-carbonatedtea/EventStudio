export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  is_sarc?: boolean;
  children: FileNode[] | null;
}
