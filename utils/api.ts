// Hardcoded ID for single-user mode.
// Everyone accessing this deployment will share the same settings (Favorites/Logos).
export const GLOBAL_USER_ID = 'master_settings';

export interface CloudSettings {
  favorites: string[];
  customLogos: Record<string, string>;
  customUrls: Record<string, string>;
  playlistUrl: string;
  skipIntro?: boolean;
  introEnd?: number;
  outroStart?: number;
}

export const fetchCloudSettings = async (
  userId: string = GLOBAL_USER_ID
): Promise<CloudSettings | null> => {
  try {
    const res = await fetch(`/api/settings?userId=${userId}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const contentType = res.headers.get('content-type') || '';
    // In local preview (vite preview) /api is not available and may return HTML fallback
    if (contentType.includes('text/html')) {
      console.warn(
        'Settings API returned HTML (likely not running on Pages functions), skip cloud sync.'
      );
      return null;
    }
    const data = await res.json();
    if (!data) return null;

    return {
      favorites: JSON.parse(data.favorites || '[]'),
      customLogos: JSON.parse(data.custom_logos || '{}'),
      customUrls: JSON.parse(data.custom_urls || '{}'),
      playlistUrl: data.playlist_url,
      skipIntro: data.skip_intro === 'true',
      introEnd: data.intro_end ? parseFloat(data.intro_end) : undefined,
      outroStart: data.outro_start ? parseFloat(data.outro_start) : undefined,
    };
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return null;
  }
};

export const saveCloudSettings = async (
  userId: string = GLOBAL_USER_ID,
  settings: {
    favorites: string[];
    customLogos: Record<string, string>;
    customUrls: Record<string, string>;
    playlistUrl: string;
    skipIntro?: boolean;
    introEnd?: number;
    outroStart?: number;
  }
) => {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        favorites: settings.favorites,
        customLogos: settings.customLogos,
        customUrls: settings.customUrls,
        playlistUrl: settings.playlistUrl,
        skipIntro: settings.skipIntro,
        introEnd: settings.introEnd,
        outroStart: settings.outroStart,
      }),
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export interface CustomChannel {
  id: string;
  name: string;
  group: string;
  logo?: string;
  url: string;
  tvgId?: string;
}

export const fetchCustomChannels = async (
  userId: string = GLOBAL_USER_ID
): Promise<CustomChannel[]> => {
  try {
    const res = await fetch(`/api/channels?userId=${userId}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      console.warn(
        'Channels API returned HTML (likely not running on Pages functions), skip cloud sync.'
      );
      return [];
    }
    const data = await res.json();
    return data || [];
  } catch (error) {
    console.error('Failed to fetch custom channels:', error);
    return [];
  }
};

export const saveCustomChannel = async (
  userId: string = GLOBAL_USER_ID,
  channel: {
    name: string;
    group?: string;
    logo?: string;
    url: string;
    tvgId?: string;
  }
): Promise<string | null> => {
  try {
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ...channel,
      }),
    });
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    return data.id || null;
  } catch (error) {
    console.error('Failed to save custom channel:', error);
    return null;
  }
};

export const deleteCustomChannel = async (
  userId: string = GLOBAL_USER_ID,
  channelId: string
): Promise<boolean> => {
  try {
    const res = await fetch(`/api/channels?id=${channelId}&userId=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Network response was not ok');
    return true;
  } catch (error) {
    console.error('Failed to delete custom channel:', error);
    return false;
  }
};
