// 最近打开的项目与文件类型定义
export type ProjectType = 'mod' | 'bfevfl' | 'sbeventpack' | 'pack' | 'msbt' | 'yaml' | 'other';

export interface RecentProjectItem {
  id: string;
  name: string;
  path: string;
  type: ProjectType;
  lastOpened: number; // 打开时的时间戳
}
