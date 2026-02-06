import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { Channel } from '../types';
import { ArrowLeft } from 'lucide-react';

// Types for ArtPlayer settings
interface ArtPlayerSetting {
  html: string;
  find?: (predicate: (s: ArtPlayerSetting) => boolean) => ArtPlayerSetting | undefined;
}

// Type for selector options with html and value
interface SelectorOption {
  html: string;
  value: number;
}

interface ArtPlayerProps {
  channel: Channel;
  onBack: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentIndex?: number;
  totalCount?: number;
  onSelectEpisode?: (index: number) => void;
  skipIntro?: boolean;
  introEnd?: number;
  outroStart?: number;
  onSkipConfigChange?: (config: {
    skipIntro: boolean;
    introEnd: number;
    outroStart: number;
  }) => void;
}

const ArtPlayer: React.FC<ArtPlayerProps> = ({
  channel,
  onBack,
  onNext,
  onPrev,
  currentIndex: _currentIndex,
  totalCount: _totalCount,
  onSelectEpisode: _onSelectEpisode,
  skipIntro: propSkipIntro,
  introEnd: propIntroEnd,
  outroStart: propOutroStart,
  onSkipConfigChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const useProxyRef = useRef<boolean>(false);
  const originalHostnameRef = useRef<string>('');

  // Store callbacks in refs to avoid dependency warnings
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const onBackRef = useRef(onBack);

  // Update refs when callbacks change
  useEffect(() => {
    onNextRef.current = onNext;
    onPrevRef.current = onPrev;
    onBackRef.current = onBack;
  }, [onNext, onPrev, onBack]);

  // Skip intro/outro settings - use refs to access latest values in callbacks
  const getSkipIntroInitial = (): boolean => {
    if (propSkipIntro !== undefined) return propSkipIntro;
    const saved = localStorage.getItem('iptv_skip_intro');
    return saved === 'true';
  };
  const getIntroEndInitial = (): number => {
    if (propIntroEnd !== undefined) return propIntroEnd;
    const saved = localStorage.getItem('iptv_intro_end');
    return saved ? parseFloat(saved) : 0;
  };
  const getOutroStartInitial = (): number => {
    if (propOutroStart !== undefined) return propOutroStart;
    const saved = localStorage.getItem('iptv_outro_start');
    return saved ? parseFloat(saved) : 0;
  };

  const skipIntroRef = useRef<boolean>(getSkipIntroInitial());
  const introEndRef = useRef<number>(getIntroEndInitial());
  const outroStartRef = useRef<number>(getOutroStartInitial());

  // Update refs when props change
  useEffect(() => {
    if (propSkipIntro !== undefined) {
      skipIntroRef.current = propSkipIntro;
      setSkipIntro(propSkipIntro);
    }
    if (propIntroEnd !== undefined) {
      introEndRef.current = propIntroEnd;
      setIntroEnd(propIntroEnd);
    }
    if (propOutroStart !== undefined) {
      outroStartRef.current = propOutroStart;
      setOutroStart(propOutroStart);
    }
  }, [propSkipIntro, propIntroEnd, propOutroStart]);

  const [skipIntro, setSkipIntro] = useState<boolean>(skipIntroRef.current);
  // Note: introEnd and outroStart are only used via refs, state is kept for React re-renders
  const [, setIntroEnd] = useState<number>(introEndRef.current);
  const [, setOutroStart] = useState<number>(outroStartRef.current);

  // Helper function to get proxy URL
  const getProxyUrl = (url: string): string => {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  // Format time to MM:SS or -MM:SS
  const formatTime = (seconds: number): string => {
    const absSeconds = Math.abs(seconds);
    const h = Math.floor(absSeconds / 3600);
    const m = Math.floor((absSeconds % 3600) / 60);
    const s = Math.floor(absSeconds % 60);
    const sign = seconds < 0 ? '-' : '';
    if (h > 0) {
      return `${sign}${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // destroy previous
    if (artRef.current) {
      artRef.current.destroy(false);
      artRef.current = null;
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3U8 = channel.url.toLowerCase().includes('.m3u8');

    // Check if URL is cross-origin
    let originalUrl = channel.url;
    let isSameOrigin = false;

    try {
      const urlObj = new URL(originalUrl);
      originalHostnameRef.current = urlObj.hostname;
      isSameOrigin = urlObj.origin === window.location.origin;
      // For cross-origin HLS, start with proxy to avoid CORS issues
      useProxyRef.current = !isSameOrigin && isM3U8;
    } catch {
      // Invalid URL
      originalHostnameRef.current = '';
      useProxyRef.current = false;
    }

    const art = new Artplayer({
      container: containerRef.current,
      url: useProxyRef.current ? getProxyUrl(channel.url) : channel.url,
      autoplay: true,
      autoSize: false,
      autoMini: true,
      screenshot: false,
      fullscreen: true,
      pip: true,
      setting: true,
      hotkey: true,
      settings: [
        {
          width: 200,
          html: '播放速度',
          selector: [
            {
              html: '0.5x',
              value: 0.5,
            },
            {
              html: '0.75x',
              value: 0.75,
            },
            {
              html: '正常',
              value: 1.0,
            },
            {
              html: '1.25x',
              value: 1.25,
            },
            {
              html: '1.5x',
              value: 1.5,
            },
            {
              html: '2.0x',
              value: 2.0,
            },
          ],
          onSelect: function (item) {
            const option = item as unknown as SelectorOption;
            art.playbackRate = option.value;
            return option.html;
          },
        },
        {
          width: 200,
          name: '跳过片头片尾',
          html: '跳过片头片尾',
          switch: skipIntro,
          onSwitch: function () {
            const newValue = !skipIntroRef.current;
            skipIntroRef.current = newValue;
            setSkipIntro(newValue);
            localStorage.setItem('iptv_skip_intro', String(newValue));
            if (onSkipConfigChange) {
              onSkipConfigChange({
                skipIntro: newValue,
                introEnd: introEndRef.current,
                outroStart: outroStartRef.current,
              });
            }
            return newValue;
          },
        },
        {
          width: 200,
          name: '设置片头',
          html: '设置片头',
          tooltip:
            introEndRef.current === 0 ? '设置片头时间' : `${formatTime(introEndRef.current)}`,
          onClick: function () {
            const video = art.video;
            if (video && !video.paused) {
              const currentTime = video.currentTime;
              introEndRef.current = currentTime;
              setIntroEnd(currentTime);
              localStorage.setItem('iptv_intro_end', String(currentTime));
              if (onSkipConfigChange) {
                onSkipConfigChange({
                  skipIntro: skipIntroRef.current,
                  introEnd: currentTime,
                  outroStart: outroStartRef.current,
                });
              }
              (art.notice as unknown as { show: string }).show =
                `已设置片头结束时间为 ${formatTime(currentTime)}`;
              return `${formatTime(currentTime)}`;
            } else {
              (art.notice as unknown as { show: string }).show = '请先播放视频';
              return '';
            }
          },
        },
        {
          width: 200,
          name: '设置片尾',
          html: '设置片尾',
          tooltip:
            outroStartRef.current >= 0 ? '设置片尾时间' : `-${formatTime(-outroStartRef.current)}`,
          onClick: function () {
            const video = art.video;
            if (video && !video.paused && video.duration > 0) {
              const currentTime = video.currentTime;
              const duration = video.duration;
              // Calculate negative time from end (片尾开始时间 = 当前时间 - 总时长)
              const outroTime = currentTime - duration;
              outroStartRef.current = outroTime;
              setOutroStart(outroTime);
              localStorage.setItem('iptv_outro_start', String(outroTime));
              if (onSkipConfigChange) {
                onSkipConfigChange({
                  skipIntro: skipIntroRef.current,
                  introEnd: introEndRef.current,
                  outroStart: outroTime,
                });
              }
              (art.notice as unknown as { show: string }).show =
                `已设置片尾开始时间为 ${formatTime(outroTime)}`;
              return `-${formatTime(-outroTime)}`;
            } else {
              (art.notice as unknown as { show: string }).show = '请先播放视频';
              return '';
            }
          },
        },
        {
          width: 200,
          html: '删除跳过配置',
          onClick: function () {
            skipIntroRef.current = false;
            introEndRef.current = 0;
            outroStartRef.current = 0;
            setSkipIntro(false);
            setIntroEnd(0);
            setOutroStart(0);
            localStorage.removeItem('iptv_skip_intro');
            localStorage.removeItem('iptv_intro_end');
            localStorage.removeItem('iptv_outro_start');
            if (onSkipConfigChange) {
              onSkipConfigChange({
                skipIntro: false,
                introEnd: 0,
                outroStart: 0,
              });
            }
            // Update setting displays - only update switch state and tooltips
            art.setting.update({
              name: '跳过片头片尾',
              switch: false,
            });
            art.setting.update({
              name: '设置片头',
              tooltip: '设置片头时间',
            });
            art.setting.update({
              name: '设置片尾',
              tooltip: '设置片尾时间',
            });
            (art.notice as unknown as { show: string }).show = '已删除跳过配置';
            return '';
          },
        },
      ],
      customType: {
        m3u8: (video: HTMLVideoElement, url: string) => {
          if (Hls.isSupported()) {
            const hlsConfig: {
              enableWorker?: boolean;
              lowLatencyMode?: boolean;
              xhrSetup?: (xhr: XMLHttpRequest, url: string) => void;
            } = {
              enableWorker: false,
              lowLatencyMode: false,
              xhrSetup: (xhr: XMLHttpRequest, requestUrl: string) => {
                xhr.withCredentials = false;

                // In proxy mode, intercept requests to the original source domain
                if (
                  useProxyRef.current &&
                  originalHostnameRef.current &&
                  requestUrl.includes(originalHostnameRef.current) &&
                  !requestUrl.includes('/api/proxy')
                ) {
                  try {
                    const proxyUrl = getProxyUrl(requestUrl);
                    console.warn(`Intercepting direct request: ${requestUrl} -> ${proxyUrl}`);

                    // Override the open method to use proxy URL
                    const originalOpen = xhr.open.bind(xhr);
                    xhr.open = function (
                      method: string,
                      url: string | URL,
                      async?: boolean,
                      username?: string | null,
                      password?: string | null
                    ) {
                      const urlStr = typeof url === 'string' ? url : url.href;
                      if (
                        urlStr.includes(originalHostnameRef.current) &&
                        !urlStr.includes('/api/proxy')
                      ) {
                        const proxiedUrl = getProxyUrl(urlStr);
                        return originalOpen(
                          method,
                          proxiedUrl,
                          async !== undefined ? async : true,
                          username || null,
                          password || null
                        );
                      }
                      return originalOpen(
                        method,
                        url,
                        async !== undefined ? async : true,
                        username || null,
                        password || null
                      );
                    };
                  } catch (e) {
                    console.warn('Failed to process URL:', requestUrl, e);
                  }
                }
              },
            };

            const hls = new Hls(hlsConfig);
            hlsRef.current = hls;

            hls.loadSource(url);
            hls.attachMedia(video);

            // Handle HLS errors and switch to proxy if CORS error occurs
            hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                const isCORSError =
                  data.details === 'manifestLoadError' ||
                  data.details === 'keyLoadError' ||
                  (data.response && data.response.code === 0);

                if (isCORSError && !useProxyRef.current) {
                  console.warn('HLS: CORS error detected, switching to proxy mode...');
                  useProxyRef.current = true;
                  const proxyUrl = getProxyUrl(originalUrl);
                  hls.destroy();
                  hlsRef.current = null;

                  // Reload with proxy - need to update hlsConfig to use proxy mode
                  const proxyHlsConfig = {
                    ...hlsConfig,
                    xhrSetup: (xhr: XMLHttpRequest, requestUrl: string) => {
                      xhr.withCredentials = false;
                      if (
                        originalHostnameRef.current &&
                        requestUrl.includes(originalHostnameRef.current) &&
                        !requestUrl.includes('/api/proxy')
                      ) {
                        try {
                          const originalOpen = xhr.open.bind(xhr);
                          xhr.open = function (
                            method: string,
                            url: string | URL,
                            async?: boolean,
                            username?: string | null,
                            password?: string | null
                          ) {
                            const urlStr = typeof url === 'string' ? url : url.href;
                            if (
                              urlStr.includes(originalHostnameRef.current) &&
                              !urlStr.includes('/api/proxy')
                            ) {
                              return originalOpen(
                                method,
                                getProxyUrl(urlStr),
                                async !== undefined ? async : true,
                                username || null,
                                password || null
                              );
                            }
                            return originalOpen(
                              method,
                              url,
                              async !== undefined ? async : true,
                              username || null,
                              password || null
                            );
                          };
                        } catch (error) {
                          console.warn('Failed to process URL:', requestUrl, error);
                        }
                      }
                    },
                  };

                  const newHls = new Hls(proxyHlsConfig);
                  hlsRef.current = newHls;
                  newHls.loadSource(proxyUrl);
                  newHls.attachMedia(video);

                  // Re-attach error handler
                  newHls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                      console.warn('HLS: Network error, trying to recover...');
                      newHls.startLoad();
                    } else if (data.fatal && data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                      console.warn('HLS: Media error, trying to recover...');
                      newHls.recoverMediaError();
                    }
                  });

                  art.on('destroy', () => newHls.destroy());
                } else if (isCORSError && useProxyRef.current) {
                  console.error('HLS: CORS error persists even with proxy');
                  (art.notice as unknown as { show: string }).show =
                    '视频源跨域访问被阻止，请检查视频源是否可访问';
                } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                  console.warn('HLS: Network error, trying to recover...');
                  hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                  console.warn('HLS: Media error, trying to recover...');
                  hls.recoverMediaError();
                }
              }
            });

            art.on('destroy', () => {
              if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
          } else {
            (art.notice as unknown as { show: string }).show = '当前浏览器不支持 HLS';
          }
        },
      },
      type: isM3U8 ? 'm3u8' : undefined,
    });

    // Skip intro/outro logic
    art.on('ready', () => {
      const video = art.video;
      if (video) {
        const handleTimeUpdate = () => {
          if (!skipIntroRef.current) return;

          const currentTime = video.currentTime;
          const duration = video.duration;

          // Skip intro
          if (introEndRef.current > 0 && currentTime < introEndRef.current) {
            video.currentTime = introEndRef.current;
          }

          // Skip outro
          if (outroStartRef.current < 0 && duration > 0) {
            const outroTime = duration + outroStartRef.current; // outroStart is negative
            if (currentTime >= outroTime && currentTime < duration - 1) {
              video.currentTime = duration - 1;
            }
          }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);

        // Mobile touch gesture support for fast forward/rewind (fixed 20 seconds)
        let touchStartX = 0;
        let touchStartY = 0;
        let hasSeeked = false;
        let seekIndicator: HTMLElement | null = null;
        const SEEK_AMOUNT = 20; // Fixed 20 seconds
        const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger

        const createSeekIndicator = () => {
          if (seekIndicator) return seekIndicator;
          seekIndicator = document.createElement('div');
          seekIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: opacity 0.2s;
          `;
          if (containerRef.current) {
            containerRef.current.appendChild(seekIndicator);
          }
          return seekIndicator;
        };

        const showSeekIndicator = (isForward: boolean) => {
          const indicator = createSeekIndicator();
          const icon = isForward ? '⏩' : '⏪';
          indicator.innerHTML = `${icon} ${SEEK_AMOUNT}秒`;
          indicator.style.opacity = '1';
        };

        const hideSeekIndicator = () => {
          if (seekIndicator) {
            seekIndicator.style.opacity = '0';
            setTimeout(() => {
              if (seekIndicator && seekIndicator.parentNode) {
                seekIndicator.parentNode.removeChild(seekIndicator);
                seekIndicator = null;
              }
            }, 200);
          }
        };

        const performSeek = (isForward: boolean) => {
          if (!video || hasSeeked) return;

          const duration = video.duration;
          if (isNaN(duration) || duration === 0) return;

          const seekSeconds = isForward ? SEEK_AMOUNT : -SEEK_AMOUNT;
          const newTime = Math.max(0, Math.min(duration, video.currentTime + seekSeconds));

          video.currentTime = newTime;
          showSeekIndicator(isForward);
          hasSeeked = true;

          setTimeout(() => {
            hideSeekIndicator();
          }, 1000);
        };

        const handleTouchStart = (e: TouchEvent) => {
          if (e.touches.length !== 1) return;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          hasSeeked = false;
        };

        const handleTouchMove = (e: TouchEvent) => {
          if (e.touches.length !== 1 || !video || hasSeeked) return;
          const touchX = e.touches[0].clientX;
          const touchY = e.touches[0].clientY;
          const deltaX = touchX - touchStartX;
          const deltaY = touchY - touchStartY;

          // Only trigger if horizontal movement is greater than vertical and exceeds threshold
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
            // Prevent default to avoid browser back/forward gesture
            e.preventDefault();
            e.stopPropagation();

            const isForward = deltaX > 0;
            performSeek(isForward);
          }
        };

        const handleTouchEnd = () => {
          hasSeeked = false;
        };

        // Add touch event listeners to the video element
        video.addEventListener('touchstart', handleTouchStart, { passive: false });
        video.addEventListener('touchmove', handleTouchMove, { passive: false });
        video.addEventListener('touchend', handleTouchEnd, { passive: true });

        art.on('destroy', () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('touchstart', handleTouchStart);
          video.removeEventListener('touchmove', handleTouchMove);
          video.removeEventListener('touchend', handleTouchEnd);
          hideSeekIndicator();
        });
      }
    });

    artRef.current = art;

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      art.destroy(false);
      artRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  return (
    <div className="relative w-full h-full bg-black">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-black/60 border border-white/15 text-white hover:bg-white/10 transition"
      >
        <ArrowLeft size={20} />
      </button>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default ArtPlayer;
