export interface Student {
  id: string;
  name: string;
  seatNumber?: string;
  active: boolean; // whether they participate in draw/grouping (e.g. present vs absent)
}

export interface DrawHistoryItem {
  id: string;
  student: Student;
  timestamp: Date;
}

export interface GroupConfig {
  mode: 'bySize' | 'byCount'; // 每組幾人 vs 分成幾組
  groupSize: number;
  groupCount: number;
  remainderMode: 'distribute' | 'separate'; // 餘數均攤 vs 獨立一組
  assignLeader: boolean; // 是否隨機指派小組長
}

export interface GroupItem {
  id: string;
  name: string;
  color: {
    bg: string;
    border: string;
    badge: string;
    accent: string;
    text: string;
  };
  members: Student[];
  leaderId?: string;
}
