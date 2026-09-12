'use client';

import React from 'react';
import { LightboxModal } from '@/components/ui/LightboxModal';
import { Command, Search, X, Printer, Navigation, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    {
      category: 'General & Search',
      items: [
        { key: '/', description: 'Focus active search bar on current page', icon: Search },
        { key: 'Esc', description: 'Close any active drawer, lightbox, or modal', icon: X },
        { key: '?', description: 'Open this Keyboard Shortcuts cheat sheet', icon: HelpCircle },
        { key: 'Ctrl + P', description: 'Print active employee dossier / Save as PDF', icon: Printer },
      ],
    },
    {
      category: 'Quick Navigation (Press "G" then key)',
      items: [
        { key: 'g then o', description: 'Go to Security Overview (/overview)', icon: Navigation },
        { key: 'g then i', description: 'Go to Incident Management (/incidents)', icon: Navigation },
        { key: 'g then e', description: 'Go to Employee Directory (/employees)', icon: Navigation },
        { key: 'g then d', description: 'Go to Device Fleet (/devices)', icon: Navigation },
        { key: 'g then t', description: 'Go to Telemetry Logs (/telemetry)', icon: Navigation },
        { key: 'g then a', description: 'Go to Anomaly Intelligence (/anomalies)', icon: Navigation },
        { key: 'g then r', description: 'Go to Risk Analytics (/analytics)', icon: Navigation },
        { key: 'g then s', description: 'Go to Settings & Alerts (/settings)', icon: Navigation },
      ],
    },

  ];

  return (
    <LightboxModal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      subtitle="Power-user navigation & triage shortcuts for the Activity Management System"
    >
      <div className="space-y-6">
        {shortcuts.map((section) => (
          <div key={section.category} className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-violet-400">
              {section.category}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {section.items.map((sc) => {
                const Icon = sc.icon;
                return (
                  <div
                    key={sc.key}
                    className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon size={14} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-300 truncate">{sc.description}</span>
                    </div>
                    <kbd className="px-2 py-1 rounded bg-white/10 border border-white/15 text-[11px] font-mono font-bold text-violet-300 shadow-sm shrink-0 whitespace-nowrap">
                      {sc.key}
                    </kbd>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </LightboxModal>
  );
};
