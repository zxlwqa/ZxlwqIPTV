import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  playlistUrl?: string;
  onPlaylistUrlChange?: (url: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, playlistUrl = '', onPlaylistUrlChange }) => {
  const [inputUrl, setInputUrl] = useState(playlistUrl);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setInputUrl(playlistUrl);
    }
  }, [isOpen, playlistUrl]);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    if (inputUrl.trim()) {
      onPlaylistUrlChange?.(inputUrl.trim());
      alert('频道列表URL已更新');
    }
  };

  const handleResetUrl = () => {
    const defaultUrl = './M3U8/index.json';
    setInputUrl(defaultUrl);
    onPlaylistUrlChange?.(defaultUrl);
  };

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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-300">频道列表URL</label>
              <button
                onClick={handleResetUrl}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                title="重置为默认"
              >
                重置默认
              </button>
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="https://example.com/channels.json 或 ./M3U8/index.json"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-2">
              支持 JSON 数组、文件索引或 M3U8/M3U 格式。例如：https://gist.githubusercontent.com/.../raw/config.json
            </p>
          </div>
        </div>

        <div className="p-4 bg-surfaceHover border-t border-white/5 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition"
          >
            关闭
          </button>
          <button
            onClick={handleSaveUrl}
            className="px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
