import { useAppDispatch, useAppSelector } from '../../store';
import { setRightPanelTab } from '../../features/uiSlice';
import { DomainPanel } from './DomainPanel';
import { SuggestionsPanel } from './SuggestionsPanel';
import { HistoryPanel } from './HistoryPanel';
import { Globe, Lightbulb, Clock, X } from 'lucide-react';
import { toggleRightPanel } from '../../features/uiSlice';

const tabs = [
  { id: 'domain' as const, label: 'Domain', icon: Globe },
  { id: 'suggestions' as const, label: 'Suggestions', icon: Lightbulb },
  { id: 'history' as const, label: 'History', icon: Clock },
];

export function RightPanel() {
  const dispatch = useAppDispatch();
  const { rightPanelTab } = useAppSelector((state) => state.ui);

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Tab bar */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => dispatch(setRightPanelTab(tab.id))}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
              rightPanelTab === tab.id
                ? 'text-primary-600 bg-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </div>
            {rightPanelTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
            )}
          </button>
        ))}
        <button
          onClick={() => dispatch(toggleRightPanel())}
          className="px-3 text-slate-400 hover:text-slate-600"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'domain' && <DomainPanel />}
        {rightPanelTab === 'suggestions' && <SuggestionsPanel />}
        {rightPanelTab === 'history' && <HistoryPanel />}
      </div>
    </div>
  );
}

