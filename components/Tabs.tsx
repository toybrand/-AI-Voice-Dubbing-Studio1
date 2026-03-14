import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabClick: (id: string) => void;
  disabled: boolean;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabClick, disabled }) => {
  return (
    <div>
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !disabled && onTabClick(tab.id)}
            disabled={disabled}
            className={`flex-1 py-2 px-1 text-center text-sm font-medium transition-colors duration-200
              ${activeTab === tab.id
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};