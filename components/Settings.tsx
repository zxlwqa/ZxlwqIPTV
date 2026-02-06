import React from 'react';
import { X, RefreshCw } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surfaceHover shrink-0">
          <h2 className="text-white font-semibold text-lg">系统设置</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-4">
            <h3 className="text-blue-400 text-sm font-semibold mb-1 flex items-center">
              <RefreshCw size={14} className="mr-2" />
              使用说明
            </h3>
            <ul className="text-xs text-blue-200/60 space-y-1 list-disc list-inside">
              <li>由于您绑定了 D1 数据库，您的收藏和设置将自动保存。</li>
              <li>所有访问此网页的设备将共享同一份设置（单用户模式）。</li>
              <li>在左侧边栏点击"添加频道"按钮可以添加自定义频道。</li>
              <li>在 GitHub 仓库中更新 M3U8 文件夹内容可更新频道列表。</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-surfaceHover border-t border-white/5 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
