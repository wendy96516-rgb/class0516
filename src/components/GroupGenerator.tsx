import React, { useState, useEffect, useMemo } from 'react';
import { Shuffle, Copy, Check, Crown, Users, ArrowRightLeft, Sparkles, Printer, Sliders } from 'lucide-react';
import { Student, GroupConfig, GroupItem } from '../types';
import { GROUP_COLOR_PALETTES } from '../utils/sampleData';
import { soundManager } from '../utils/audio';

interface GroupGeneratorProps {
  students: Student[];
}

export const GroupGenerator: React.FC<GroupGeneratorProps> = ({ students }) => {
  const activeStudents = useMemo(() => students.filter(s => s.active), [students]);

  const [config, setConfig] = useState<GroupConfig>({
    mode: 'bySize',
    groupSize: 4,
    groupCount: 4,
    remainderMode: 'distribute',
    assignLeader: true,
  });

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Group generation logic
  const performGrouping = () => {
    if (activeStudents.length === 0) {
      alert('目前沒有出席的學生可供分組，請先至「名單管理」新增或標記出席！');
      return;
    }

    setIsShuffling(true);
    soundManager.playShuffle();

    // Shuffle student array randomly (Fisher-Yates)
    const pool = [...activeStudents];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let calculatedGroupCount = 1;

    if (config.mode === 'bySize') {
      const size = Math.max(1, config.groupSize);
      if (config.remainderMode === 'distribute') {
        calculatedGroupCount = Math.max(1, Math.round(pool.length / size));
      } else {
        calculatedGroupCount = Math.ceil(pool.length / size);
      }
    } else {
      calculatedGroupCount = Math.max(1, Math.min(pool.length, config.groupCount));
    }

    // Initialize groups
    const newGroups: GroupItem[] = Array.from({ length: calculatedGroupCount }, (_, i) => {
      const palette = GROUP_COLOR_PALETTES[i % GROUP_COLOR_PALETTES.length];
      return {
        id: `grp_${Date.now()}_${i}`,
        name: `第 ${i + 1} 組`,
        color: palette,
        members: [],
      };
    });

    // Distribute students
    if (config.mode === 'bySize' && config.remainderMode === 'separate') {
      // Chunk by exact size
      const size = Math.max(1, config.groupSize);
      let gIndex = 0;
      for (let i = 0; i < pool.length; i += size) {
        if (gIndex < newGroups.length) {
          newGroups[gIndex].members = pool.slice(i, i + size);
          gIndex++;
        }
      }
    } else {
      // Round-robin distribution for balanced group sizes
      pool.forEach((student, index) => {
        const targetGroupIndex = index % calculatedGroupCount;
        newGroups[targetGroupIndex].members.push(student);
      });
    }

    // Assign leaders if requested
    if (config.assignLeader) {
      newGroups.forEach(grp => {
        if (grp.members.length > 0) {
          const leader = grp.members[Math.floor(Math.random() * grp.members.length)];
          grp.leaderId = leader.id;
        }
      });
    }

    setTimeout(() => {
      setGroups(newGroups);
      setIsShuffling(false);
      soundManager.playTick(1.4);
    }, 280);
  };

  // Run grouping once on first load or when active students list changes if groups are empty
  useEffect(() => {
    if (groups.length === 0 && activeStudents.length > 0) {
      performGrouping();
    }
  }, [activeStudents.length]);

  // Reassign leader in a specific group
  const reassignLeader = (groupId: string) => {
    setGroups(prev =>
      prev.map(grp => {
        if (grp.id !== groupId || grp.members.length === 0) return grp;
        const currentLeaderIndex = grp.members.findIndex(m => m.id === grp.leaderId);
        const candidates = grp.members.filter(m => m.id !== grp.leaderId);
        const nextLeader = candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : grp.members[0];
        return {
          ...grp,
          leaderId: nextLeader.id,
        };
      })
    );
    soundManager.playTick(1.5);
  };

  // Move member from one group to another
  const moveMember = (fromGroupId: string, toGroupId: string, memberId: string) => {
    if (fromGroupId === toGroupId) return;

    setGroups(prev => {
      let movedStudent: Student | null = null;
      const step1 = prev.map(grp => {
        if (grp.id === fromGroupId) {
          const found = grp.members.find(m => m.id === memberId);
          if (found) movedStudent = found;
          const nextMembers = grp.members.filter(m => m.id !== memberId);
          const nextLeader = grp.leaderId === memberId && nextMembers.length > 0 ? nextMembers[0].id : grp.leaderId;
          return { ...grp, members: nextMembers, leaderId: nextLeader };
        }
        return grp;
      });

      if (!movedStudent) return prev;

      return step1.map(grp => {
        if (grp.id === toGroupId) {
          return { ...grp, members: [...grp.members, movedStudent!] };
        }
        return grp;
      });
    });
  };

  // Copy results as formatted text
  const handleCopyGroups = () => {
    if (groups.length === 0) return;
    const lines: string[] = [`【課堂分組名單】共 ${activeStudents.length} 人，分為 ${groups.length} 組`];
    lines.push('----------------------------------------');

    groups.forEach((grp) => {
      const leader = grp.members.find(m => m.id === grp.leaderId);
      const memberNames = grp.members.map(m => `${m.name}${m.seatNumber ? `(${m.seatNumber}號)` : ''}`).join('、');
      
      lines.push(`\n📌 ${grp.name}（共 ${grp.members.length} 人）：`);
      if (leader) {
        lines.push(`   👑 組長：${leader.name}${leader.seatNumber ? `(${leader.seatNumber}號)` : ''}`);
      }
      lines.push(`   組員：${memberNames}`);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Print results
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Configuration Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-6 print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              自動分組設定
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              可依「每組人數」或「總組數」自動隨機平均分派，支援組長設定
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="generate-groups-btn"
              type="button"
              onClick={performGrouping}
              disabled={isShuffling || activeStudents.length === 0}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto"
            >
              <Shuffle className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
              <span>🎲 重新隨機分組</span>
            </button>
          </div>
        </div>

        {/* Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              分組方式
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, mode: 'bySize' }))}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  config.mode === 'bySize'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                每組幾人
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, mode: 'byCount' }))}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  config.mode === 'byCount'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                分成幾組
              </button>
            </div>
          </div>

          {/* Size or Count input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {config.mode === 'bySize' ? '每組設定人數' : '預計總組數'}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="group-size-input"
                type="number"
                min="1"
                max={Math.max(1, activeStudents.length)}
                value={config.mode === 'bySize' ? config.groupSize : config.groupCount}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  if (config.mode === 'bySize') {
                    setConfig(prev => ({ ...prev, groupSize: val }));
                  } else {
                    setConfig(prev => ({ ...prev, groupCount: val }));
                  }
                }}
                className="w-full px-3 py-2 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500 font-semibold shrink-0">
                {config.mode === 'bySize' ? '人 / 組' : '組'}
              </span>
            </div>
          </div>

          {/* Remainder mode */}
          {config.mode === 'bySize' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                人數不均處理
              </label>
              <select
                id="remainder-mode-select"
                value={config.remainderMode}
                onChange={(e) => setConfig(prev => ({ ...prev, remainderMode: e.target.value as 'distribute' | 'separate' }))}
                className="w-full px-3 py-2 text-xs sm:text-sm font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="distribute">均衡平攤至各組</option>
                <option value="separate">剩餘人數獨立成組</option>
              </select>
            </div>
          )}

          {/* Leader checkbox */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors">
              <input
                id="assign-leader-checkbox"
                type="checkbox"
                checked={config.assignLeader}
                onChange={(e) => setConfig(prev => ({ ...prev, assignLeader: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                自動隨機指派組長
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Bar (Export, Print, Status) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-bold text-slate-700">
            目前分組結果：
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
            共 {groups.length} 組
          </span>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
            總參與學生 {activeStudents.length} 人
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="copy-groups-btn"
            type="button"
            onClick={handleCopyGroups}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
            title="複製文字格式名單，方便貼到 LINE 或 Google Classroom"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已複製名單' : '一鍵複製名單'}</span>
          </button>

          <button
            id="print-groups-btn"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>列印分組表</span>
          </button>
        </div>
      </div>

      {/* Visualized Groups Grid */}
      {groups.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">尚未產生分組結果，請點擊「🎲 重新隨機分組」開始！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((group, groupIdx) => {
            const palette = group.color;
            return (
              <div
                key={group.id}
                className={`rounded-2xl border-2 ${palette.border} ${palette.bg} p-4 transition-all duration-200 shadow-2xs flex flex-col justify-between`}
              >
                {/* Group Header */}
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${palette.badge}`}>
                        {group.name}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {group.members.length} 人
                      </span>
                    </div>

                    {config.assignLeader && group.members.length > 0 && (
                      <button
                        type="button"
                        onClick={() => reassignLeader(group.id)}
                        className="text-[11px] text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1 print:hidden"
                        title="隨機換一位組長"
                      >
                        <Crown className="w-3 h-3 text-amber-500" />
                        重抽組長
                      </button>
                    )}
                  </div>

                  {/* Student Members */}
                  <div className="space-y-2">
                    {group.members.map((member) => {
                      const isLeader = group.leaderId === member.id;
                      return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-all ${
                            isLeader
                              ? 'bg-amber-50 border-amber-300 shadow-xs'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0">
                              {member.seatNumber || '#'}
                            </span>
                            <span className="font-bold text-slate-800 truncate">
                              {member.name}
                            </span>
                            {isLeader && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300 shrink-0">
                                <Crown className="w-2.5 h-2.5 text-amber-600" />
                                組長
                              </span>
                            )}
                          </div>

                          {/* Move to another group selector (for quick adjustment) */}
                          <div className="print:hidden">
                            <select
                              value={group.id}
                              onChange={(e) => moveMember(group.id, e.target.value, member.id)}
                              className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 border border-slate-200 focus:outline-none cursor-pointer"
                              title="移動至其他組別"
                            >
                              {groups.map((g, gIdx) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
