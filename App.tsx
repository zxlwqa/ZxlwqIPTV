import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Channel } from './types';
import { parseM3U } from './utils/m3uParser';
import ArtPlayer from './components/ArtPlayer';
import ChannelList from './components/ChannelList';
import Settings from './components/Settings';
import Password from './components/Password';
import { Settings as SettingsIcon, Github, Loader2, Cloud } from 'lucide-react';
import {
  GLOBAL_USER_ID,
  fetchCloudSettings,
  saveCloudSettings,
  fetchCustomChannels,
  saveCustomChannel,
  deleteCustomChannel,
  CustomChannel,
} from './utils/api';

// Simple hash function to generate stable IDs (same as in m3uParser)
const generateId = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Default to the local index file in the M3U8 directory (copied to dist during build)
const DEFAULT_INDEX_URL = './M3U8/index.json';

interface FileContent {
  name: string;
  content: string;
}

// Check if user is authenticated
const checkAuth = (): boolean => {
  const authenticated = localStorage.getItem('iptv_authenticated');
  const authTimestamp = localStorage.getItem('iptv_auth_timestamp');

  if (!authenticated || authenticated !== 'true') {
    return false;
  }

  // Optional: Check if session expired (24 hours)
  if (authTimestamp) {
    const timestamp = parseInt(authTimestamp, 10);
    const now = Date.now();
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    if (now - timestamp > SESSION_DURATION) {
      // Session expired
      localStorage.removeItem('iptv_authenticated');
      localStorage.removeItem('iptv_auth_timestamp');
      return false;
    }
  }

  return true;
};

const App: React.FC = () => {
  // Password Protection State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => checkAuth());
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // --- State ---
  const [channels, setChannels] = useState<Channel[]>([]);
  const [customChannels, setCustomChannels] = useState<Channel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  const [activeGroup, setActiveGroup] = useState<string>('全部');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Settings State
  const [playlistUrl, setPlaylistUrl] = useState<string>(
    () => localStorage.getItem('iptv_url') || DEFAULT_INDEX_URL
  );
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('iptv_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [customLogos, setCustomLogos] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('iptv_custom_logos');
    return saved ? JSON.parse(saved) : {};
  });
  const [customUrls, setCustomUrls] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('iptv_custom_urls');
    return saved ? JSON.parse(saved) : {};
  });
  const [skipIntro, setSkipIntro] = useState<boolean>(() => {
    const saved = localStorage.getItem('iptv_skip_intro');
    return saved === 'true';
  });
  const [introEnd, setIntroEnd] = useState<number>(() => {
    const saved = localStorage.getItem('iptv_intro_end');
    return saved ? parseFloat(saved) : 0;
  });
  const [outroStart, setOutroStart] = useState<number>(() => {
    const saved = localStorage.getItem('iptv_outro_start');
    return saved ? parseFloat(saved) : 0;
  });

  // Remember last playing channel to restore after refresh
  useEffect(() => {
    const savedId = localStorage.getItem('iptv_last_channel');
    if (savedId && channels.length > 0 && !currentChannel) {
      const found = channels.find(c => c.id === savedId);
      if (found) {
        setCurrentChannel(found);
      }
    }
  }, [channels, currentChannel]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    setIsCheckingAuth(false);
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  // Helper to strip extension for group name
  const formatGroupName = (fileName: string) => {
    return fileName.replace(/\.(m3u|m3u8|txt)$/i, '');
  };

  // --- Cloud Sync Logic ---
  const isFirstLoad = useRef(true);

  // 1. Initial Cloud Load (Always load 'master' settings)
  useEffect(() => {
    const initCloud = async () => {
      setIsSyncing(true);
      const cloudData = await fetchCloudSettings(GLOBAL_USER_ID);
      if (cloudData) {
        // If cloud data exists, merge/overwrite local
        if (cloudData.playlistUrl) {
          setPlaylistUrl(cloudData.playlistUrl);
          localStorage.setItem('iptv_url', cloudData.playlistUrl);
        }
        if (cloudData.favorites) {
          setFavorites(cloudData.favorites);
          localStorage.setItem('iptv_favorites', JSON.stringify(cloudData.favorites));
        }
        if (cloudData.customLogos) {
          setCustomLogos(cloudData.customLogos);
          localStorage.setItem('iptv_custom_logos', JSON.stringify(cloudData.customLogos));
        }
        if (cloudData.customUrls) {
          setCustomUrls(cloudData.customUrls);
          localStorage.setItem('iptv_custom_urls', JSON.stringify(cloudData.customUrls));
        }
        if (cloudData.skipIntro !== undefined) {
          setSkipIntro(cloudData.skipIntro);
          localStorage.setItem('iptv_skip_intro', String(cloudData.skipIntro));
        }
        if (cloudData.introEnd !== undefined) {
          setIntroEnd(cloudData.introEnd);
          localStorage.setItem('iptv_intro_end', String(cloudData.introEnd));
        }
        if (cloudData.outroStart !== undefined) {
          setOutroStart(cloudData.outroStart);
          localStorage.setItem('iptv_outro_start', String(cloudData.outroStart));
        }
      }
      // Load custom channels
      const customChannelsData = await fetchCustomChannels(GLOBAL_USER_ID);
      if (customChannelsData && customChannelsData.length > 0) {
        const convertedChannels: Channel[] = customChannelsData.map((c: CustomChannel) => ({
          id: c.id,
          name: c.name,
          group: c.group,
          logo: c.logo,
          url: c.url,
          tvgId: c.tvgId,
        }));
        setCustomChannels(convertedChannels);
      }
      setIsSyncing(false);
      isFirstLoad.current = false;
    };
    initCloud();
  }, []);

  // 2. Auto-Save to Cloud (Debounced)
  useEffect(() => {
    if (isFirstLoad.current) return;

    const timer = setTimeout(() => {
      saveCloudSettings(GLOBAL_USER_ID, {
        favorites,
        customLogos,
        customUrls,
        playlistUrl,
        skipIntro,
        introEnd,
        outroStart,
      });
    }, 2000); // 2 second debounce

    return () => clearTimeout(timer);
  }, [favorites, customLogos, customUrls, playlistUrl, skipIntro, introEnd, outroStart]);

  // Merge channels with custom channels
  const allChannels = useMemo(() => {
    return [...channels, ...customChannels];
  }, [channels, customChannels]);

  // Compute Filtered Channels
  const filteredChannels = useMemo(() => {
    let result = allChannels;

    if (activeGroup === '收藏') {
      result = result.filter(c => favorites.includes(c.id));
    } else if (activeGroup !== '全部') {
      result = result.filter(c => c.group === activeGroup);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(lowerSearch) || c.group.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort channels: for JSON format with "第X集" pattern, sort by episode number
    result = [...result].sort((a, b) => {
      // Match "第X集" pattern (e.g., "第1集", "第10集", "第24集")
      const matchA = a.name.match(/第(\d+)集/);
      const matchB = b.name.match(/第(\d+)集/);

      if (matchA && matchB) {
        // Both have episode numbers, sort numerically
        const numA = parseInt(matchA[1], 10);
        const numB = parseInt(matchB[1], 10);
        return numA - numB;
      } else if (matchA) {
        // Only A has episode number, put it first
        return -1;
      } else if (matchB) {
        // Only B has episode number, put it first
        return 1;
      }
      // Neither has episode number, maintain original order
      return 0;
    });

    return result;
  }, [allChannels, activeGroup, searchTerm, favorites]);

  // Channel Navigation Handlers
  const handleNextChannel = () => {
    if (!currentChannel || filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex(c => c.id === currentChannel.id);
    if (currentIndex === -1) {
      setCurrentChannel(filteredChannels[0]);
    } else {
      const nextIndex = (currentIndex + 1) % filteredChannels.length;
      setCurrentChannel(filteredChannels[nextIndex]);
    }
  };

  const handlePrevChannel = () => {
    if (!currentChannel || filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex(c => c.id === currentChannel.id);
    if (currentIndex === -1) {
      setCurrentChannel(filteredChannels[0]);
    } else {
      const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
      setCurrentChannel(filteredChannels[prevIndex]);
    }
  };

  const handleSelectEpisode = (index: number) => {
    if (index >= 0 && index < filteredChannels.length) {
      setCurrentChannel(filteredChannels[index]);
    }
  };

  // Fetch Logic
  const fetchPlaylists = useCallback(async (entryUrl: string) => {
    if (!entryUrl) return;

    setIsLoading(true);
    setLoadingStatus('正在连接资源...');
    setChannels([]);

    try {
      let rawFiles: FileContent[] = [];

      // Priority 1: Check if it's a file reference format: @path:lineNumber
      const fileRefMatch = entryUrl.match(/^@(.+):(\d+)$/);
      if (fileRefMatch) {
        const [, filePath, lineNumStr] = fileRefMatch;
        const lineNumber = parseInt(lineNumStr, 10);

        setLoadingStatus('正在读取文件...');
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('无法读取文件');

        const content = await response.text();
        const lines = content.split('\n');

        if (lineNumber < 1 || lineNumber > lines.length) {
          throw new Error(`行号 ${lineNumber} 超出文件范围`);
        }

        // Extract URL from the specified line
        const targetLine = lines[lineNumber - 1].trim();
        let extractedUrl = '';

        // Try to extract URL from JSON format: "url": "https://..."
        const jsonUrlMatch = targetLine.match(/"url"\s*:\s*"([^"]+)"/);
        if (jsonUrlMatch) {
          extractedUrl = jsonUrlMatch[1];
        } else if (targetLine.startsWith('http://') || targetLine.startsWith('https://')) {
          // Direct URL on the line
          extractedUrl = targetLine;
        } else {
          throw new Error(`第 ${lineNumber} 行未找到有效的 URL`);
        }

        if (!extractedUrl) {
          throw new Error(`无法从第 ${lineNumber} 行提取 URL`);
        }

        // Create a single channel from the extracted URL
        const fileName = filePath.split('/').pop() || '文件';
        const channelName = `${fileName} - 第${lineNumber}行`;
        const id = generateId(extractedUrl);
        const singleChannel: Channel = {
          id,
          name: channelName,
          url: extractedUrl,
          group: formatGroupName(fileName),
        };
        setChannels([singleChannel]);
        setIsLoading(false);
        setLoadingStatus('');
        return;
      }

      // Priority 2: Check if it's a JSON URL (.json extension)
      if (entryUrl.toLowerCase().endsWith('.json')) {
        setLoadingStatus('正在获取文件...');
        
        const indexRes = await fetch(entryUrl, {
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
        });

        if (!indexRes.ok) {
          throw new Error(`无法读取文件 (Status: ${indexRes.status})`);
        }

        // Check for HTML response (SPA fallback 404)
        const contentType = indexRes.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
          throw new Error('资源地址返回了 HTML 页面而非 JSON，请检查 M3U8 文件是否已正确部署。');
        }

        try {
          const jsonData = await indexRes.json();
          
          // Determine if it's a file list or channel list
          let isFileList = false;
          
          if (Array.isArray(jsonData)) {
            // Check if array contains strings (file list) or objects (channel list)
            if (jsonData.length > 0 && typeof jsonData[0] === 'string') {
              isFileList = true;
            }
          }
          
          if (isFileList) {
            // This is a file list index
            const basePathString = entryUrl.substring(0, entryUrl.lastIndexOf('/') + 1);
            setLoadingStatus(`发现 ${jsonData.length} 个文件`);

            const promises = (jsonData as string[]).map(async (filename: string) => {
              const fileUrl = basePathString + filename;
              try {
                const res = await fetch(fileUrl);
                if (res.ok) {
                  // Check if it's a JSON file
                  const contentType = res.headers.get('content-type') || '';
                  if (
                    filename.toLowerCase().endsWith('.json') ||
                    contentType.includes('application/json')
                  ) {
                    // For JSON files, try to parse as channel list directly
                    try {
                      const jsonContent = await res.json();
                      // If it's a channel list JSON, return it as content
                      if (Array.isArray(jsonContent) || jsonContent.channels) {
                        return { name: filename, content: JSON.stringify(jsonContent) };
                      }
                    } catch {
                      // If JSON parsing fails, treat as text
                    }
                  }
                  return { name: filename, content: await res.text() };
                }
              } catch (e) {
                // Failed to load file, skip
              }
              return null;
            });

            const results = await Promise.all(promises);
            rawFiles = results.filter((f): f is FileContent => f !== null);
          } else if (Array.isArray(jsonData) || jsonData.channels || jsonData.lives) {
            // This is a direct channel list (array or object with channels/lives property)
            const fileName = entryUrl.split('/').pop() || '频道列表';
            rawFiles = [{ name: fileName, content: JSON.stringify(jsonData) }];
          } else {
            throw new Error('无法识别 JSON 格式，请确保是频道列表或文件索引');
          }
        } catch (e) {
          throw new Error(`JSON 解析失败: ${(e as Error).message}`);
        }
      }
      // Priority 3: Check if it's a direct URL (http:// or https://)
      else if (entryUrl.startsWith('http://') || entryUrl.startsWith('https://')) {
        // Single channel URL - create a single channel entry
        setLoadingStatus('正在加载频道...');
        const channelName = entryUrl.split('/').pop() || '单个频道';
        const id = generateId(entryUrl);
        const singleChannel: Channel = {
          id,
          name: channelName,
          url: entryUrl,
          group: '单个频道',
        };
        setChannels([singleChannel]);
        setIsLoading(false);
        setLoadingStatus('');
        return;
      }
      // Priority 4: Try to fetch as regular m3u/txt file
      else {
          const guessedName = entryUrl.split('/').pop() || '默认列表';
          setLoadingStatus('正在下载播放列表...');
          const response = await fetch(entryUrl);
          if (!response.ok) throw new Error('下载失败');
          rawFiles = [{ name: guessedName, content: await response.text() }];
        }

      setLoadingStatus('正在解析频道...');

      let allChannels: Channel[] = [];
      rawFiles.forEach(file => {
        if (file.content) {
          const defaultGroupName = formatGroupName(file.name);
          const parsed = parseM3U(file.content, defaultGroupName);
          allChannels = [...allChannels, ...parsed];
        }
      });

      const uniqueChannels = Array.from(new Map(allChannels.map(item => [item.id, item])).values());
      setChannels(uniqueChannels);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`加载失败: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  }, []);

  // Initial Load of Playlists
  useEffect(() => {
    if (playlistUrl) {
      fetchPlaylists(playlistUrl);
    }
  }, [playlistUrl, fetchPlaylists]);

  const toggleFavorite = (id: string) => {
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('iptv_favorites', JSON.stringify(newFavs));
  };

  const updateChannelLogo = (channelId: string, newUrl: string) => {
    const newLogos = { ...customLogos };
    if (newUrl) {
      newLogos[channelId] = newUrl;
    } else {
      delete newLogos[channelId];
    }
    setCustomLogos(newLogos);
    localStorage.setItem('iptv_custom_logos', JSON.stringify(newLogos));
  };

  const updateChannelUrl = (channelId: string, newUrl: string) => {
    const newUrls = { ...customUrls };
    if (newUrl) {
      newUrls[channelId] = newUrl;
    } else {
      delete newUrls[channelId];
    }
    setCustomUrls(newUrls);
    localStorage.setItem('iptv_custom_urls', JSON.stringify(newUrls));
  };

  const handleAddChannel = async (channel: {
    name: string;
    group?: string;
    logo?: string;
    url: string;
    tvgId?: string;
  }) => {
    const channelId = await saveCustomChannel(GLOBAL_USER_ID, channel);
    if (channelId) {
      const newChannel: Channel = {
        id: channelId,
        name: channel.name,
        group: channel.group || '我的收藏',
        logo: channel.logo,
        url: channel.url,
        tvgId: channel.tvgId,
      };
      setCustomChannels(prev => [...prev, newChannel]);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    const success = await deleteCustomChannel(GLOBAL_USER_ID, channelId);
    if (success) {
      setCustomChannels(prev => prev.filter(c => c.id !== channelId));
      // If the deleted channel was currently playing, clear it
      if (currentChannel?.id === channelId) {
        setCurrentChannel(null);
      }
    }
  };

  const handleSelectChannel = (channel: Channel) => {
    setCurrentChannel(channel);
    localStorage.setItem('iptv_last_channel', channel.id);
  };

  const handleBackFromPlayer = () => {
    // Clear last playing channel and return to list
    localStorage.removeItem('iptv_last_channel');
    setCurrentChannel(null);
  };

  // Enable body scroll when in player view, disable when not
  useEffect(() => {
    if (currentChannel) {
      document.body.style.overflow = 'auto';
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'hidden';
    };
  }, [currentChannel]);

  // Show password protection if not authenticated
  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Password onSuccess={handleAuthSuccess} />;
  }

  if (currentChannel) {
    const currentIndex = filteredChannels.findIndex(c => c.id === currentChannel.id);
    const totalCount = filteredChannels.length;

    // Use custom URL if available, otherwise use original URL
    const channelWithCustomUrl = customUrls[currentChannel.id]
      ? { ...currentChannel, url: customUrls[currentChannel.id] }
      : currentChannel;

    return (
      <div className="w-full bg-black">
        {/* Player - Full screen height */}
        <div className="h-screen w-full">
          <ArtPlayer
            channel={channelWithCustomUrl}
            onBack={handleBackFromPlayer}
            onNext={handleNextChannel}
            onPrev={handlePrevChannel}
            currentIndex={currentIndex >= 0 ? currentIndex : undefined}
            totalCount={totalCount > 0 ? totalCount : undefined}
            onSelectEpisode={handleSelectEpisode}
            skipIntro={skipIntro}
            introEnd={introEnd}
            outroStart={outroStart}
            onSkipConfigChange={config => {
              setSkipIntro(config.skipIntro);
              setIntroEnd(config.introEnd);
              setOutroStart(config.outroStart);
              localStorage.setItem('iptv_skip_intro', String(config.skipIntro));
              localStorage.setItem('iptv_intro_end', String(config.introEnd));
              localStorage.setItem('iptv_outro_start', String(config.outroStart));
            }}
          />
        </div>
        {/* Episode Selection Grid - Below player, only visible when scrolling down */}
        {totalCount > 0 && (
          <div className="w-full bg-black/90 backdrop-blur-sm border-t border-white/10 px-4 py-4">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {filteredChannels.map((channel, i) => {
                // Parse M3U format: "SCOP-311 海边被强奸" -> ["SCOP-311", "海边被强奸"]
                // Match pattern: letters-numbers (optional dash) followed by space and description
                const m3uMatch = channel.name.match(/^([A-Z0-9-]+)\s+(.+)$/);
                const isM3UFormat = m3uMatch !== null;
                const [code, description] = isM3UFormat ? [m3uMatch[1], m3uMatch[2]] : [null, null];

                return (
                  <button
                    key={channel.id}
                    onClick={() => {
                      handleSelectEpisode(i);
                    }}
                    className={`
                      aspect-square rounded-lg text-xs font-medium transition-all p-1 overflow-hidden
                      flex flex-col items-center justify-center
                      ${
                        currentIndex === i
                          ? 'bg-primary text-white shadow-lg shadow-blue-500/20'
                          : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                      }
                    `}
                    title={channel.name}
                  >
                    {isM3UFormat ? (
                      <>
                        <div className="text-center leading-tight">{code}</div>
                        <div className="text-left leading-tight text-[10px] mt-0.5 line-clamp-2">
                          {description}
                        </div>
                      </>
                    ) : (
                      <div className="text-center leading-tight">{channel.name}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-zinc-100 font-sans">
      <header className="h-14 bg-surface border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <img
            src="./favicon.ico"
            alt="Logo"
            className="w-8 h-8 rounded-lg shadow-lg shadow-blue-500/20 object-contain bg-black/20"
          />
          <h1 className="font-bold text-lg tracking-tight">
            科技刘<span className="text-primary font-light"> - IPTV</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isSyncing && (
            <div className="flex items-center gap-1 text-xs text-zinc-500 animate-pulse mr-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <span className="hidden sm:inline">已同步</span>
            </div>
          )}
          <a
            href="https://github.com/zxlwq/ZxlwqIPTV"
            target="_blank"
            rel="noreferrer"
            className="p-2 text-zinc-400 hover:text-white transition hidden sm:block"
            title="GitHub 仓库"
          >
            <Github size={20} />
          </a>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition"
            title="设置"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
            </div>
            <p className="text-zinc-300 font-medium animate-pulse">
              {loadingStatus || '加载中...'}
            </p>
            <p className="text-xs text-zinc-500">正在读取 M3U8 目录</p>
          </div>
        ) : (
          <ChannelList
            channels={allChannels}
            filteredChannels={filteredChannels}
            onSelectChannel={handleSelectChannel}
            selectedChannelId={currentChannel?.id}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            customLogos={customLogos}
            onUpdateLogo={updateChannelLogo}
            customUrls={customUrls}
            onUpdateUrl={updateChannelUrl}
            onAddChannel={handleAddChannel}
            onDeleteChannel={handleDeleteChannel}
            activeGroup={activeGroup}
            onSelectGroup={setActiveGroup}
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
          />
        )}
      </main>

      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        playlistUrl={playlistUrl}
        onPlaylistUrlChange={(newUrl) => {
          setPlaylistUrl(newUrl);
          localStorage.setItem('iptv_url', newUrl);
          fetchPlaylists(newUrl);
        }}
      />
    </div>
  );
};

export default App;
