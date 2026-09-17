import { useState, useEffect } from 'react';
import { Student, DrawHistoryItem } from './types';
import { SAMPLE_STUDENTS } from './utils/sampleData';
import { Header } from './components/Header';
import { RandomPicker } from './components/RandomPicker';
import { GroupGenerator } from './components/GroupGenerator';
import { RosterManager } from './components/RosterManager';
import { soundManager } from './utils/audio';

const STORAGE_KEY_STUDENTS = 'classroom_picker_students_v1';
const STORAGE_KEY_MUTED = 'classroom_picker_muted_v1';
const STORAGE_KEY_ALLOW_REPEAT = 'classroom_picker_allow_repeat_v1';

export default function App() {
  // Load initial student list from localStorage or fallback to sample
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return SAMPLE_STUDENTS;
  });

  const [activeTab, setActiveTab] = useState<'picker' | 'groups' | 'roster'>('picker');

  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
    } catch {
      return false;
    }
  });

  const [allowRepeat, setAllowRepeat] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ALLOW_REPEAT) === 'true';
    } catch {
      return false; // Default to non-repeatable for teachers
    }
  });

  const [drawnIds, setDrawnIds] = useState<string[]>([]);
  const [drawHistory, setDrawHistory] = useState<DrawHistoryItem[]>([]);

  // Sync isMuted with soundManager
  useEffect(() => {
    soundManager.setMuted(isMuted);
    try {
      localStorage.setItem(STORAGE_KEY_MUTED, String(isMuted));
    } catch {
      // Ignore
    }
  }, [isMuted]);

  // Persist students in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    } catch {
      // Ignore
    }
  }, [students]);

  // Persist allowRepeat in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ALLOW_REPEAT, String(allowRepeat));
    } catch {
      // Ignore
    }
  }, [allowRepeat]);

  const activeCount = students.filter(s => s.active).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalCount={students.length}
        activeCount={activeCount}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'picker' && (
          <RandomPicker
            students={students}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            drawnIds={drawnIds}
            setDrawnIds={setDrawnIds}
            drawHistory={drawHistory}
            setDrawHistory={setDrawHistory}
            allowRepeat={allowRepeat}
            setAllowRepeat={setAllowRepeat}
          />
        )}

        {activeTab === 'groups' && (
          <GroupGenerator students={students} />
        )}

        {activeTab === 'roster' && (
          <RosterManager
            students={students}
            setStudents={setStudents}
            onRosterUpdated={() => {
              // Clear drawn history when roster changes significantly
              setDrawnIds([]);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 px-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            課堂隨機抽籤與分組小幫手 · 專為教師設計的教學輔助工具
          </span>
          <div className="flex items-center gap-3 text-slate-400">
            <span>支援全螢幕投影</span>
            <span>•</span>
            <span>空白鍵快速抽籤</span>
            <span>•</span>
            <span>自訂 CSV 匯入</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
