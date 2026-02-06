import React, { useMemo, useState } from 'react';
import { Channel } from '../types';
import { Search, Heart, Tv, Pencil, X, Save, Plus, Trash2 } from 'lucide-react';

interface ChannelListProps {
  channels: Channel[]; // Raw channels for group counting
  filteredChannels: Channel[]; // Channels to display
  onSelectChannel: (channel: Channel) => void;
  selectedChannelId?: string;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  customLogos: Record<string, string>;
  onUpdateLogo: (channelId: string, url: string) => void;
  customUrls: Record<string, string>;
  onUpdateUrl: (channelId: string, url: string) => void;
  onAddChannel?: (channel: {
    name: string;
    group?: string;
    logo?: string;
    url: string;
    tvgId?: string;
  }) => Promise<void>;
  onDeleteChannel?: (channelId: string) => Promise<void>;

  // Controlled State
  activeGroup: string;
  onSelectGroup: (group: string) => void;
  searchTerm: string;
  onSearch: (term: string) => void;
}

// Internal component for individual card logic
const ChannelCard: React.FC<{
  channel: Channel;
  displayLogo: string | undefined; // Logo after override check
  isSelected: boolean;
  isFavorite: boolean;
  isCustom: boolean; // Whether this is a custom channel
  onToggleFavorite: (id: string) => void;
  onEdit: (channel: Channel) => void;
  onDelete?: (channelId: string) => void;
  onClick: () => void;
}> = ({
  channel,
  displayLogo,
  isSelected,
  isFavorite,
  isCustom,
  onToggleFavorite,
  onEdit,
  onDelete,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset error if logo source changes
  React.useEffect(() => {
    setImgError(false);
  }, [displayLogo]);

  return (
    <div
      onClick={onClick}
      className={`group relative aspect-video bg-zinc-900 rounded-xl overflow-hidden cursor-pointer border transition-all duration-300 hover:-translate-y-1 ${isSelected ? 'border-primary ring-2 ring-primary/50' : 'border-white/10 hover:border-white/30'}`}
    >
      {/* Background Image Layer */}
      {displayLogo && !imgError ? (
        <img
          src={displayLogo}
          alt={channel.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-zinc-700">
          {/* Abstract Pattern or Icon for fallback */}
          <Tv size={48} className="opacity-20" />
        </div>
      )}

      {/* Content Layer (Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col gap-1 z-10">
        <h3
          className={`text-base font-bold truncate leading-tight drop-shadow-md ${isSelected ? 'text-primary' : 'text-white'}`}
          title={channel.name}
        >
          {channel.name}
        </h3>
        <div className="flex items-center">
          <span className="text-[10px] text-zinc-300 font-medium bg-white/10 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5">
            {channel.group}
          </span>
        </div>
      </div>

      {/* Top Right Controls (Hover Only) */}
      <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Edit Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit(channel);
          }}
          className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-300 hover:text-white hover:bg-black/80 transition-all hover:scale-110 border border-white/10"
          title="自定义封面"
        >
          <Pencil size={12} />
        </button>

        {/* Delete Button (Only for custom channels) */}
        {isCustom && onDelete && (
          <button
            onClick={e => {
              e.stopPropagation();
              if (confirm(`确定要删除频道 "${channel.name}" 吗？`)) {
                onDelete(channel.id);
              }
            }}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all hover:scale-110 border border-white/10"
            title="删除频道"
          >
            <Trash2 size={12} />
          </button>
        )}

        {/* Favorite Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            onToggleFavorite(channel.id);
          }}
          className={`p-1.5 rounded-full bg-black/60 backdrop-blur-md transition-all hover:scale-110 border border-white/10
            ${isFavorite ? 'text-accent' : 'text-zinc-300 hover:text-white hover:bg-black/80'}`}
          title={isFavorite ? '取消收藏' : '添加收藏'}
        >
          <Heart size={12} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Selection Indicator overlay (subtle blue tint) */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 pointer-events-none mix-blend-overlay" />
      )}
    </div>
  );
};

// Edit Modal Component
const EditImageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  currentLogo: string;
  currentUrl: string;
  onSaveLogo: (id: string, url: string) => void;
  onSaveUrl: (id: string, url: string) => void;
}> = ({ isOpen, onClose, channel, currentLogo, currentUrl, onSaveLogo, onSaveUrl }) => {
  const [logoUrl, setLogoUrl] = useState('');
  const [channelUrl, setChannelUrl] = useState('');

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLogoUrl(currentLogo || '');
      setChannelUrl(currentUrl || '');
    }
  }, [isOpen, currentLogo, currentUrl]);

  if (!isOpen || !channel) return null;

  const handleSave = () => {
    onSaveLogo(channel.id, logoUrl);
    onSaveUrl(channel.id, channelUrl);
    onClose();
  };

  const handleResetLogo = () => {
    setLogoUrl(''); // Setting empty string triggers delete logic in App.tsx
    onSaveLogo(channel.id, '');
  };

  const handleResetUrl = () => {
    setChannelUrl(''); // Setting empty string triggers delete logic in App.tsx
    onSaveUrl(channel.id, '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surfaceHover">
          <h3 className="text-white font-semibold text-md truncate pr-4">编辑 {channel.name}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex justify-center bg-black/40 rounded-lg p-2 h-32 items-center border border-white/5 dashed relative overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Preview"
                className="w-full h-full object-cover rounded"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className="text-zinc-600 flex flex-col items-center gap-2">
                <Tv size={24} />
                <span className="text-xs">无封面图</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-400">自定义封面链接</label>
              <button
                onClick={handleResetLogo}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                title="重置为原始封面"
              >
                重置
              </button>
            </div>
            <input
              type="text"
              id="custom-logo-url"
              name="custom-logo-url"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-400">频道播放链接</label>
              <button
                onClick={handleResetUrl}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                title="重置为原始链接"
              >
                重置
              </button>
            </div>
            <input
              type="text"
              id="custom-channel-url"
              name="custom-channel-url"
              value={channelUrl}
              onChange={e => setChannelUrl(e.target.value)}
              placeholder="https://example.com/stream.m3u8"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
            />
          </div>
        </div>

        <div className="p-4 bg-surfaceHover border-t border-white/5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-zinc-400 hover:text-white text-sm transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
          >
            <Save size={14} className="mr-2" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Channel Modal Component
const AddChannelModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (channel: {
    name: string;
    group?: string;
    logo?: string;
    url: string;
    tvgId?: string;
  }) => Promise<void>;
}> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('我的收藏');
  const [logo, setLogo] = useState('');
  const [url, setUrl] = useState('');

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setName('');
      setGroup('我的收藏');
      setLogo('');
      setUrl('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) {
      alert('请填写频道名称和播放URL');
      return;
    }
    await onSave({
      name: name.trim(),
      group: group.trim() || '我的收藏',
      logo: logo.trim() || undefined,
      url: url.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-surfaceHover">
          <h3 className="text-white font-semibold text-md">添加频道</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex justify-center bg-black/40 rounded-lg p-2 h-32 items-center border border-white/5 dashed relative overflow-hidden">
            {logo ? (
              <img
                src={logo}
                alt="Preview"
                className="w-full h-full object-cover rounded"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className="text-zinc-600 flex flex-col items-center gap-2">
                <Tv size={24} />
                <span className="text-xs">预览图</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">频道名称 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入频道名称"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">分组</label>
            <input
              type="text"
              value={group}
              onChange={e => setGroup(e.target.value)}
              placeholder="我的收藏"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">预览图链接</label>
            <input
              type="text"
              value={logo}
              onChange={e => setLogo(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">播放URL *</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com/stream.m3u8"
              className="w-full bg-black/50 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition placeholder-zinc-600"
            />
          </div>
        </div>

        <div className="p-4 bg-surfaceHover border-t border-white/5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-zinc-400 hover:text-white text-sm transition"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/20"
          >
            <Save size={14} className="mr-2" />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  filteredChannels,
  onSelectChannel,
  selectedChannelId,
  favorites,
  toggleFavorite,
  customLogos,
  onUpdateLogo,
  customUrls,
  onUpdateUrl,
  onAddChannel,
  onDeleteChannel,
  activeGroup,
  onSelectGroup,
  searchTerm,
  onSearch,
}) => {
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  // Add Channel Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleEditClick = (channel: Channel) => {
    setEditingChannel(channel);
    setIsEditModalOpen(true);
  };

  // Compute Groups (Need to use raw channels to show full counts)
  const groups = useMemo(() => {
    const groupMap = new Map<string, number>();
    groupMap.set('全部', channels.length);
    groupMap.set('收藏', favorites.length);

    channels.forEach(c => {
      const g = c.group || '未分类';
      groupMap.set(g, (groupMap.get(g) || 0) + 1);
    });

    return Array.from(groupMap.entries()).map(([name, count]) => ({ name, count }));
  }, [channels, favorites]);

  return (
    <div className="flex h-full bg-surface">
      {/* Group Sidebar */}
      <div className="w-16 md:w-56 flex-shrink-0 bg-background border-r border-white/5 flex flex-col transition-all duration-300">
        <div className="p-4 border-b border-white/5 text-white font-bold text-lg text-center hidden md:block">
          频道列表
        </div>
        {/* Add Channel Button */}
        {onAddChannel && (
          <div className="p-2 border-b border-white/5">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition border border-primary/20 hover:border-primary/40"
              title="添加频道"
            >
              <Plus size={16} />
              <span className="hidden md:inline text-sm font-medium">添加频道</span>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {groups.map(group => (
            <button
              key={group.name}
              onClick={() => onSelectGroup(group.name)}
              className={`w-full text-left px-2 md:px-4 py-3 text-sm flex items-center md:justify-between justify-center transition border-l-2 group
                ${
                  activeGroup === group.name
                    ? 'border-primary bg-white/5 text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              title={group.name}
            >
              <span className="truncate hidden md:block">{group.name}</span>
              {/* Mobile/Collapsed View: Initials */}
              <span className="md:hidden font-bold text-xs">{group.name.substring(0, 2)}</span>

              <span
                className={`text-xs px-1.5 py-0.5 rounded ml-2 hidden md:inline-block transition-colors ${activeGroup === group.name ? 'bg-primary/20 text-primary-foreground' : 'bg-white/10 text-zinc-500 group-hover:text-zinc-300'}`}
              >
                {group.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Channel Grid Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface">
        {/* Search & Toolbar */}
        <div className="p-4 border-b border-white/5 flex flex-col gap-3 sticky top-0 bg-surface/95 backdrop-blur z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              id="channel-search"
              name="channel-search"
              placeholder="搜索频道..."
              value={searchTerm}
              onChange={e => onSearch(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition shadow-inner"
            />
          </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
              <div className="bg-white/5 p-4 rounded-full mb-3">
                <Search size={32} className="opacity-50" />
              </div>
              <p className="text-sm font-medium">未找到频道</p>
              {searchTerm && <p className="text-xs mt-1">请尝试调整搜索关键词</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 pb-10">
              {filteredChannels.map(channel => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  displayLogo={customLogos[channel.id] || channel.logo}
                  isSelected={selectedChannelId === channel.id}
                  isFavorite={favorites.includes(channel.id)}
                  isCustom={channel.id.startsWith('custom_')}
                  onToggleFavorite={toggleFavorite}
                  onEdit={handleEditClick}
                  onDelete={onDeleteChannel}
                  onClick={() => onSelectChannel(channel)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <EditImageModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        channel={editingChannel}
        currentLogo={
          editingChannel ? customLogos[editingChannel.id] || editingChannel.logo || '' : ''
        }
        currentUrl={editingChannel ? customUrls[editingChannel.id] || editingChannel.url || '' : ''}
        onSaveLogo={onUpdateLogo}
        onSaveUrl={onUpdateUrl}
      />

      {/* Add Channel Modal */}
      {onAddChannel && (
        <AddChannelModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={onAddChannel}
        />
      )}
    </div>
  );
};

export default ChannelList;
