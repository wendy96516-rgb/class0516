import React, { useState, useRef } from 'react';
import { Upload, ClipboardList, Trash2, Plus, FileSpreadsheet, CheckCircle2, UserX, Download, RotateCcw, Search } from 'lucide-react';
import { Student } from '../types';
import { parseRosterText } from '../utils/csvParser';
import { SAMPLE_STUDENTS } from '../utils/sampleData';

interface RosterManagerProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onRosterUpdated?: () => void;
}

export const RosterManager: React.FC<RosterManagerProps> = ({
  students,
  setStudents,
  onRosterUpdated,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSeat, setNewStudentSeat] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Handle CSV file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const { students: parsed, warnings } = parseRosterText(content);
        if (parsed.length > 0) {
          setStudents(parsed);
          showFeedback('success', `成功匯入 ${parsed.length} 位學生名單！`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          onRosterUpdated?.();
        } else {
          showFeedback('error', warnings[0] || '檔案內容無效');
        }
      }
    };
    reader.onerror = () => {
      showFeedback('error', '讀取檔案失敗，請再試一次');
    };
    reader.readAsText(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle pasted text parse
  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      showFeedback('error', '請先貼上學生名單文字');
      return;
    }
    const { students: parsed, warnings } = parseRosterText(pastedText);
    if (parsed.length > 0) {
      setStudents(parsed);
      showFeedback('success', `成功建立 ${parsed.length} 位學生名單！`);
      setPastedText('');
      onRosterUpdated?.();
    } else {
      showFeedback('error', warnings[0] || '解析失敗');
    }
  };

  // Load sample data
  const handleLoadSample = () => {
    setStudents(SAMPLE_STUDENTS);
    showFeedback('info', `已載入示範名單（共 ${SAMPLE_STUDENTS.length} 人）`);
    onRosterUpdated?.();
  };

  // Add single student
  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const nextSeat = newStudentSeat.trim() || String(students.length + 1).padStart(2, '0');
    const newStudent: Student = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newStudentName.trim(),
      seatNumber: nextSeat,
      active: true,
    };

    setStudents(prev => [...prev, newStudent]);
    setNewStudentName('');
    setNewStudentSeat('');
    showFeedback('success', `已新增學生：${newStudent.name}`);
    onRosterUpdated?.();
  };

  // Toggle active status (present vs absent)
  const toggleStudentActive = (id: string) => {
    setStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, active: !s.active } : s))
    );
    onRosterUpdated?.();
  };

  // Toggle all active
  const setAllActive = (active: boolean) => {
    setStudents(prev => prev.map(s => ({ ...s, active })));
    showFeedback('info', active ? '全體學生已設為出席' : '全體學生已標記為缺席');
    onRosterUpdated?.();
  };

  // Delete student
  const handleDeleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    onRosterUpdated?.();
  };

  // Clear roster
  const handleClearAll = () => {
    if (window.confirm('確定要清空整份學生名單嗎？此操作無法復原。')) {
      setStudents([]);
      showFeedback('info', '已清空學生名單');
      onRosterUpdated?.();
    }
  };

  // Export current list to CSV
  const handleExportCsv = () => {
    if (students.length === 0) return;
    const header = '座號,姓名,狀態\n';
    const rows = students
      .map(s => `${s.seatNumber || ''},"${s.name}",${s.active ? '出席' : '請假'}`)
      .join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `班級學生名單_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter students
  const filteredStudents = students.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.seatNumber && s.seatNumber.includes(searchQuery))
  );

  const activeCount = students.filter(s => s.active).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Notification banner */}
      {feedbackMsg && (
        <div
          id="roster-feedback"
          className={`p-3.5 rounded-xl text-sm font-medium border flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedbackMsg.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs font-bold underline ml-2 opacity-70 hover:opacity-100"
          >
            關閉
          </button>
        </div>
      )}

      {/* Input Section Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                名單匯入與建立
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                支援 CSV 檔案上傳、Excel 欄位複製，或直接貼上學生姓名
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="load-sample-btn"
                type="button"
                onClick={handleLoadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                載入示範名單 (24人)
              </button>
            </div>
          </div>

          {/* Sub tabs: Paste vs Upload */}
          <div className="flex items-center gap-2 mt-4">
            <button
              id="input-tab-paste"
              type="button"
              onClick={() => setActiveInputTab('paste')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeInputTab === 'paste'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              直接貼上姓名
            </button>

            <button
              id="input-tab-upload"
              type="button"
              onClick={() => setActiveInputTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeInputTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Upload className="w-4 h-4" />
              上傳 CSV 檔案
            </button>
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6 bg-slate-50/50">
          {activeInputTab === 'paste' ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="paste-textarea" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  貼上學生名單（每行一位，或以逗號、空格分隔，可包含座號）
                </label>
                <textarea
                  id="paste-textarea"
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`例如：\n1. 王小明\n2. 李美美\n3. 陳大華\n或直接貼上：林志強, 許雅婷, 張博宇`}
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  💡 支援多種常見格式：座號+姓名、純姓名、Excel 複製整欄直接貼上。
                </span>
                <button
                  id="submit-paste-btn"
                  type="button"
                  onClick={handleParsePasted}
                  disabled={!pastedText.trim()}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
                >
                  確認解析並建立名單
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />

              <div
                id="csv-dropzone"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/20'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">
                  點擊選擇 CSV 檔案，或直接拖曳檔案至此處
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  支援標準 CSV 與純文字檔案（UTF-8 編碼）。檔案欄位範例：『座號,姓名』或單純『姓名』。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roster Management Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                目前班級名單
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                共 {students.length} 位
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                出席 {activeCount} 位
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              可標記學生為「出席」或「請假」，請假的學生不會參與抽籤或分組。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="set-all-present-btn"
              type="button"
              onClick={() => setAllActive(true)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              全體出席
            </button>
            <button
              id="set-all-absent-btn"
              type="button"
              onClick={() => setAllActive(false)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              全體請假
            </button>
            {students.length > 0 && (
              <>
                <button
                  id="export-csv-btn"
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  title="匯出為 CSV 備份"
                >
                  <Download className="w-3.5 h-3.5" />
                  匯出 CSV
                </button>
                <button
                  id="clear-all-btn"
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Add Single Student Bar & Search */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleAddSingleStudent} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              id="quick-add-seat"
              type="text"
              placeholder="座號 (選填)"
              value={newStudentSeat}
              onChange={(e) => setNewStudentSeat(e.target.value)}
              className="w-24 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              id="quick-add-name"
              type="text"
              placeholder="新增學生姓名..."
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="w-36 sm:w-44 px-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              id="quick-add-submit"
              type="submit"
              disabled={!newStudentName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          </form>

          {/* Search bar */}
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="search-students-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋姓名或座號..."
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Student Grid / List */}
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            {students.length === 0 ? (
              <div>
                <p className="text-sm font-medium">目前名單為空，請由上方上傳 CSV 或貼上姓名，也可以點擊「載入示範名單」</p>
              </div>
            ) : (
              <p className="text-sm">沒有找到符合「{searchQuery}」的學生</p>
            )}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[480px] overflow-y-auto">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  student.active
                    ? 'bg-white border-slate-200 hover:border-indigo-300 shadow-2xs'
                    : 'bg-slate-100/80 border-slate-200/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {student.seatNumber || '#'}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold truncate ${student.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                      {student.name}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      {student.active ? '參與中' : '請假中'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleStudentActive(student.id)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      student.active
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        : 'text-slate-400 bg-slate-200/70 border-slate-300 hover:text-slate-700'
                    }`}
                    title={student.active ? '點擊設為請假 (不抽籤/不分組)' : '點擊設為出席'}
                  >
                    {student.active ? <CheckCircle2 className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(student.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                    title="刪除此學生"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
