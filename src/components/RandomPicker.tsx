import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, Check, ArrowRight, History, Award, Undo2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, DrawHistoryItem } from '../types';
import { soundManager } from '../utils/audio';

interface RandomPickerProps {
  students: Student[];
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  drawnIds: string[];
  setDrawnIds: React.Dispatch<React.SetStateAction<string[]>>;
  drawHistory: DrawHistoryItem[];
  setDrawHistory: React.Dispatch<React.SetStateAction<DrawHistoryItem[]>>;
  allowRepeat: boolean;
  setAllowRepeat: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RandomPicker: React.FC<RandomPickerProps> = ({
  students,
  isMuted,
  setIsMuted,
  drawnIds,
  setDrawnIds,
  drawHistory,
  setDrawHistory,
  allowRepeat,
  setAllowRepeat,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [currentDisplayStudent, setCurrentDisplayStudent] = useState<Student | null>(null);
  const [winningStudent, setWinningStudent] = useState<Student | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const animationTimerRef = useRef<number | null>(null);

  // Filter currently active (present) students
  const activeStudents = students.filter(s => s.active);

  // Available pool for non-repeat mode
  const availableStudents = allowRepeat
    ? activeStudents
    : activeStudents.filter(s => !drawnIds.includes(s.id));

  // Initialize display student
  useEffect(() => {
    if (!currentDisplayStudent && activeStudents.length > 0) {
      setCurrentDisplayStudent(activeStudents[0]);
    }
  }, [activeStudents, currentDisplayStudent]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  // Trigger celebratory confetti burst
  const triggerConfetti = () => {
    try {
      // Left cannon
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0.15, y: 0.7 },
        colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
      });
      // Right cannon
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 0.85, y: 0.7 },
        colors: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
      });
    } catch {
      // Ignore if canvas is unavailable
    }
  };

  // Start the random draw process
  const startDraw = useCallback(() => {
    if (isRolling) return;

    if (activeStudents.length === 0) {
      alert('目前沒有出席的學生可供抽籤，請先至「名單管理」新增或標記出席！');
      return;
    }

    if (!allowRepeat && availableStudents.length === 0) {
      if (window.confirm('抽籤池中的學生已經全部抽完了！要重新重置籤筒再開始嗎？')) {
        setDrawnIds([]);
      }
      return;
    }

    setIsRolling(true);
    setWinningStudent(null);

    // Pick final target winner
    const pool = allowRepeat ? activeStudents : availableStudents;
    const finalWinner = pool[Math.floor(Math.random() * pool.length)];

    // Dynamic deceleration animation timing
    // Cycle rapidly then slow down dramatically
    const intervals = [
      40, 40, 40, 40, 45, 45, 50, 50, 60, 65, 75, 90, 110, 135, 170, 220, 280, 360, 480
    ];

    let stepIndex = 0;

    const runStep = () => {
      if (stepIndex >= intervals.length) {
        // Landing step!
        setCurrentDisplayStudent(finalWinner);
        setWinningStudent(finalWinner);
        setIsRolling(false);

        // Sound fanfare & confetti
        soundManager.playFanfare();
        triggerConfetti();

        // Update history and drawn list
        setDrawHistory(prev => [
          {
            id: `draw_${Date.now()}`,
            student: finalWinner,
            timestamp: new Date(),
          },
          ...prev,
        ]);

        if (!allowRepeat) {
          setDrawnIds(prev => [...prev, finalWinner.id]);
        }
        return;
      }

      // Pick random student from active pool to show on this animation frame
      const randomPreview = activeStudents[Math.floor(Math.random() * activeStudents.length)];
      setCurrentDisplayStudent(randomPreview);

      // Play tick sound with pitch modulation
      const progressRatio = stepIndex / intervals.length;
      const pitch = 0.9 + progressRatio * 0.5;
      soundManager.playTick(pitch);

      const nextDelay = intervals[stepIndex];
      stepIndex++;
      animationTimerRef.current = window.setTimeout(runStep, nextDelay);
    };

    runStep();
  }, [isRolling, activeStudents, allowRepeat, availableStudents, setDrawnIds, setDrawHistory]);

  // Keyboard shortcut: Spacebar to draw
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isRolling) {
        // Only trigger if not typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          startDraw();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startDraw, isRolling]);

  // Reset pool
  const handleResetPool = () => {
    if (window.confirm('確定要重置抽籤池嗎？所有已抽出的學生將重新放入抽籤名單中。')) {
      setDrawnIds([]);
      setWinningStudent(null);
    }
  };

  // Put a single student back into the pool
  const handleReturnStudent = (studentId: string) => {
    setDrawnIds(prev => prev.filter(id => id !== studentId));
    if (winningStudent?.id === studentId) {
      setWinningStudent(null);
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Copy winner name
  const handleCopyWinner = () => {
    if (!winningStudent) return;
    navigator.clipboard.writeText(`${winningStudent.seatNumber ? winningStudent.seatNumber + '號 ' : ''}${winningStudent.name}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className={`space-y-6 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-900 text-white p-6 sm:p-12 overflow-y-auto flex flex-col justify-between'
          : 'max-w-5xl mx-auto'
      }`}
    >
      {/* Top Settings Bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
        isFullscreen ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        {/* Draw Mode: Repeatable vs Non-repeatable */}
        <div className="flex items-center gap-3">
          <span className={`text-xs sm:text-sm font-bold ${isFullscreen ? 'text-slate-200' : 'text-slate-700'}`}>
            抽籤規則：
          </span>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              id="mode-non-repeat"
              type="button"
              disabled={isRolling}
              onClick={() => setAllowRepeat(false)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                !allowRepeat
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              不重複抽籤
            </button>
            <button
              id="mode-repeat"
              type="button"
              disabled={isRolling}
              onClick={() => setAllowRepeat(true)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                allowRepeat
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              允許重複抽取
            </button>
          </div>
        </div>

        {/* Stats & Tools */}
        <div className="flex items-center gap-2">
          {!allowRepeat && (
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
              isFullscreen ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}>
              <span>池內剩餘：</span>
              <span className="font-bold text-sm text-indigo-600">{availableStudents.length}</span>
              <span className="opacity-60">/ {activeStudents.length} 人</span>
            </div>
          )}

          {!allowRepeat && drawnIds.length > 0 && (
            <button
              id="reset-pool-btn"
              type="button"
              onClick={handleResetPool}
              disabled={isRolling}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                isFullscreen
                  ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="將已抽出的學生全部重新放入池中"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置籤筒</span>
            </button>
          )}

          <button
            id="picker-sound-btn"
            type="button"
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              soundManager.setMuted(next);
              if (!next) soundManager.playTick(1.2);
            }}
            className={`p-2 rounded-lg border transition-colors ${
              isFullscreen
                ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                : isMuted
                ? 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            }`}
            title={isMuted ? '音效已靜音，點擊開啟' : '音效開啟中，點擊靜音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            id="fullscreen-toggle-btn"
            type="button"
            onClick={toggleFullscreen}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              isFullscreen
                ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="投影機/電子白板全螢幕展示"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? '離開全螢幕' : '全螢幕投影'}</span>
          </button>
        </div>
      </div>

      {/* Main Big Stage */}
      <div
        id="picker-stage"
        className={`relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col items-center justify-center text-center p-8 sm:p-14 ${
          isFullscreen
            ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 my-auto min-h-[500px]'
            : 'bg-gradient-to-b from-white via-indigo-50/20 to-slate-50 border-slate-200 shadow-sm min-h-[420px]'
        } ${
          isRolling
            ? 'ring-4 ring-indigo-400 ring-offset-2 animate-pulse'
            : winningStudent
            ? 'ring-4 ring-emerald-400/80 ring-offset-2'
            : ''
        }`}
      >
        {/* Decorative corner flair */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        {/* State 1: Rolling in progress */}
        {isRolling && (
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs sm:text-sm font-bold animate-bounce">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
              正在隨機抽取幸運學生中...
            </span>

            {/* Rolling student card */}
            <div className="py-6 px-10 rounded-2xl bg-white/90 border border-indigo-200 shadow-lg backdrop-blur-xs transform transition-transform scale-105">
              {currentDisplayStudent?.seatNumber && (
                <div className="text-sm sm:text-base font-bold text-indigo-600 mb-1">
                  座號 {currentDisplayStudent.seatNumber}
                </div>
              )}
              <div className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-wider">
                {currentDisplayStudent?.name || '...'}
              </div>
            </div>

            <p className="text-xs text-slate-400 font-medium tracking-wide">
              緊張刺激的轉盤即將揭曉！
            </p>
          </div>
        )}

        {/* State 2: Winner landed */}
        {!isRolling && winningStudent && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-sm font-extrabold shadow-xs">
              <Award className="w-5 h-5 text-emerald-600" />
              <span>恭喜抽中！</span>
            </div>

            <div className={`p-8 sm:p-12 rounded-3xl border-2 transition-all ${
              isFullscreen
                ? 'bg-slate-800/90 border-emerald-400 shadow-2xl shadow-emerald-500/20'
                : 'bg-white border-emerald-300 shadow-xl shadow-emerald-500/10'
            }`}>
              {winningStudent.seatNumber && (
                <div className="text-lg sm:text-2xl font-black text-emerald-600 mb-2">
                  座號 {winningStudent.seatNumber}
                </div>
              )}
              <h2 className="text-5xl sm:text-7xl md:text-8xl font-black text-slate-900 tracking-tight">
                {winningStudent.name}
              </h2>
            </div>

            {/* Winner action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                id="next-draw-btn"
                type="button"
                onClick={startDraw}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl text-base font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                <span>再抽一位 (空白鍵)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="copy-winner-btn"
                type="button"
                onClick={handleCopyWinner}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold border transition-all ${
                  isFullscreen
                    ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : null}
                <span>{copied ? '已複製姓名' : '複製姓名'}</span>
              </button>

              {!allowRepeat && (
                <button
                  id="return-winner-btn"
                  type="button"
                  onClick={() => handleReturnStudent(winningStudent.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-sm font-semibold border transition-all ${
                    isFullscreen
                      ? 'bg-slate-700 border-slate-600 text-amber-300 hover:bg-slate-600'
                      : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  }`}
                  title="誤抽或想重新讓此學生參與"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>放回抽籤池</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* State 3: Ready / Idle */}
        {!isRolling && !winningStudent && (
          <div className="space-y-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>

            <div className="space-y-2">
              <h3 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${
                isFullscreen ? 'text-white' : 'text-slate-900'
              }`}>
                準備好開始抽籤了嗎？
              </h3>
              <p className={`text-sm sm:text-base max-w-md mx-auto ${
                isFullscreen ? 'text-slate-300' : 'text-slate-500'
              }`}>
                {allowRepeat
                  ? `目前共有 ${activeStudents.length} 位學生在名單中，每次抽取獨立計算。`
                  : `目前抽籤池尚有 ${availableStudents.length} 位學生，抽中者會自動移出池中。`}
              </p>
            </div>

            <div>
              <button
                id="start-draw-btn"
                type="button"
                onClick={startDraw}
                disabled={activeStudents.length === 0 || (!allowRepeat && availableStudents.length === 0)}
                className="px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-lg sm:text-2xl font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                🎲 點我開始隨機抽籤
              </button>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                或直接按下鍵盤『空白鍵 (Space)』即可啟動
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom History Drawer / Record summary */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isFullscreen ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className={`w-4 h-4 ${isFullscreen ? 'text-slate-300' : 'text-indigo-600'}`} />
            <h4 className={`text-sm font-bold ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
              抽籤歷史記錄
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              已抽 {drawHistory.length} 次
            </span>
          </div>

          <div className="flex items-center gap-2">
            {drawHistory.length > 0 && (
              <button
                id="clear-history-btn"
                type="button"
                onClick={() => {
                  if (window.confirm('確定要清空抽籤歷史紀錄嗎？')) {
                    setDrawHistory([]);
                  }
                }}
                className="text-xs text-slate-400 hover:text-rose-600 font-medium transition-colors"
              >
                清空歷史
              </button>
            )}
            <button
              id="view-all-history-toggle"
              type="button"
              onClick={() => setShowHistoryModal(!showHistoryModal)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
            >
              {showHistoryModal ? '收合名單' : '查看抽籤順序'}
            </button>
          </div>
        </div>

        {drawHistory.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">
            尚未進行任何抽籤，點擊上方按鈕開始抽出今日幸運兒！
          </p>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {drawHistory.slice(0, 10).map((item, idx) => (
              <div
                key={item.id}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                  idx === 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                    : isFullscreen
                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {drawHistory.length - idx}
                </span>
                <span>{item.student.name}</span>
                {item.student.seatNumber && (
                  <span className="text-slate-400 text-[10px]">({item.student.seatNumber}號)</span>
                )}
                {!allowRepeat && (
                  <button
                    type="button"
                    onClick={() => handleReturnStudent(item.student.id)}
                    className="ml-1 text-slate-400 hover:text-amber-600"
                    title="放回抽籤池"
                  >
                    <Undo2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Expanded History Modal / List */}
        {showHistoryModal && drawHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 max-h-60 overflow-y-auto space-y-1.5">
            {drawHistory.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs text-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-5">#{drawHistory.length - idx}</span>
                  <span className="font-bold text-slate-900">{item.student.name}</span>
                  {item.student.seatNumber && <span className="text-slate-400">({item.student.seatNumber}號)</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px]">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {!allowRepeat && (
                    <button
                      type="button"
                      onClick={() => handleReturnStudent(item.student.id)}
                      className="text-amber-600 hover:underline text-[11px]"
                    >
                      放回池中
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
