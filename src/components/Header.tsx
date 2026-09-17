import React from 'react';
import { Sparkles, Users, Shuffle, Volume2, VolumeX, GraduationCap } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface HeaderProps {
  activeTab: 'picker' | 'groups' | 'roster';
  setActiveTab: (tab: 'picker' | 'groups' | 'roster') => void;
  totalCount: number;
  activeCount: number;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  totalCount,
  activeCount,
  isMuted,
  setIsMuted,
}) => {
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
    if (!next) {
      soundManager.playTick(1.2);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-3.5 gap-3">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  課堂隨機抽籤與分組
                  <span className="hidden md:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    教師專用小幫手
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  名單共 {totalCount} 人 · 參與抽籤/分組 {activeCount} 人
                </p>
              </div>
            </div>

            {/* Sound Toggle for Mobile */}
            <button
              id="sound-toggle-mobile"
              type="button"
              onClick={toggleMute}
              className={`sm:hidden p-2 rounded-lg border transition-all ${
                isMuted
                  ? 'bg-slate-100 text-slate-500 border-slate-200'
                  : 'bg-indigo-50 text-indigo-600 border-indigo-200'
              }`}
              title={isMuted ? '開啟音效' : '靜音'}
              aria-label={isMuted ? '開啟音效' : '靜音'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 w-full sm:w-auto justify-center">
            <button
              id="tab-picker"
              type="button"
              onClick={() => setActiveTab('picker')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'picker'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeTab === 'picker' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>隨機抽籤</span>
            </button>

            <button
              id="tab-groups"
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'groups'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Shuffle className={`w-4 h-4 ${activeTab === 'groups' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>自動分組</span>
            </button>

            <button
              id="tab-roster"
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                activeTab === 'roster'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/70'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Users className={`w-4 h-4 ${activeTab === 'roster' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>名單管理</span>
              <span className="text-xs px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                {activeCount}
              </span>
            </button>
          </div>

          {/* Sound Mute Toggle for Desktop */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              id="sound-toggle-desktop"
              type="button"
              onClick={toggleMute}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                isMuted
                  ? 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
              title={isMuted ? '目前靜音中，點擊開啟音效' : '音效已開啟，點擊靜音'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? '靜音中' : '音效已開'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
