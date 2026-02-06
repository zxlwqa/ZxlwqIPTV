import { Channel } from '../types';

// Simple hash function to generate stable IDs
const generateId = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Parse JSON format channel list
const parseJSON = (content: string, defaultGroupName: string = '未分类'): Channel[] => {
  try {
    const data = JSON.parse(content);
    const channels: Channel[] = [];

    // Support multiple JSON formats:
    // 1. Array format: [{name, url, ...}]
    // 2. Object with channels property: {channels: [{name, url, ...}]}
    // 3. Object with lives property: {lives: {key: {name, url, ...}}}

    interface JsonChannelItem {
      name: string;
      url: string;
      group?: string;
      logo?: string;
      tvgId?: string;
    }

    if (Array.isArray(data)) {
      // Format 1: Array format
      data.forEach((item: JsonChannelItem) => {
        if (!item.url || !item.name) return;

        const id = generateId(`${item.url}|${item.name}`);
        channels.push({
          id,
          name: item.name,
          url: item.url,
          group: item.group || defaultGroupName,
          logo: item.logo || undefined,
          tvgId: item.tvgId || undefined,
        });
      });
    } else if (data.channels && Array.isArray(data.channels)) {
      // Format 2: Object with channels array
      data.channels.forEach((item: JsonChannelItem) => {
        if (!item.url || !item.name) return;

        const id = generateId(`${item.url}|${item.name}`);
        channels.push({
          id,
          name: item.name,
          url: item.url,
          group: item.group || defaultGroupName,
          logo: item.logo || undefined,
          tvgId: item.tvgId || undefined,
        });
      });
    } else if (data.lives && typeof data.lives === 'object') {
      // Format 3: Object with lives property (like lunatv.txt format)
      // lives can be an object with keys, each key has {name, url, ...}
      Object.keys(data.lives).forEach(key => {
        const item = data.lives[key] as JsonChannelItem;
        if (!item.url || !item.name) return;

        const id = generateId(`${item.url}|${item.name}`);
        channels.push({
          id,
          name: item.name,
          url: item.url,
          group: item.group || defaultGroupName,
          logo: item.logo || undefined,
          tvgId: item.tvgId || key || undefined,
        });
      });
    } else {
      // Try to find any array-like structure
      const possibleChannels = data.channels || data.items || data.list || [];
      if (Array.isArray(possibleChannels)) {
        possibleChannels.forEach((item: JsonChannelItem) => {
          if (!item.url || !item.name) return;

          const id = generateId(`${item.url}|${item.name}`);
          channels.push({
            id,
            name: item.name,
            url: item.url,
            group: item.group || defaultGroupName,
            logo: item.logo || undefined,
            tvgId: item.tvgId || undefined,
          });
        });
      }
    }

    return channels;
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    return [];
  }
};

export const parseM3U = (content: string, defaultGroupName: string = '未分类'): Channel[] => {
  // Try to parse as JSON first
  const trimmedContent = content.trim();
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    return parseJSON(content, defaultGroupName);
  }

  const lines = content.split('\n');
  const channels: Channel[] = [];

  // State for M3U parsing
  let currentM3UChannel: Partial<Channel> = {};

  // State for TXT parsing (group context)
  // Initialize with the filename-based group
  let currentTxtGroup = defaultGroupName;

  // Detect format heuristic: looks for #EXTINF
  const isM3U = content.includes('#EXTINF:');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // --- M3U Logic ---
    if (isM3U) {
      if (line.startsWith('#EXTINF:')) {
        // Parse Metadata
        const info = line.substring(8);
        const durationMatch = info.match(/^(-?\d+)/);
        const props = info.substring(durationMatch ? durationMatch[0].length : 0).trim();

        // Extract properties
        const tvgIdMatch = props.match(/tvg-id="([^"]*)"/);
        const tvgLogoMatch = props.match(/tvg-logo="([^"]*)"/);
        const groupTitleMatch = props.match(/group-title="([^"]*)"/);

        // The name is usually after the last comma
        const nameParts = line.split(',');
        const name = nameParts[nameParts.length - 1].trim();

        currentM3UChannel = {
          name: name || '未知频道',
          tvgId: tvgIdMatch ? tvgIdMatch[1] : undefined,
          logo: tvgLogoMatch ? tvgLogoMatch[1] : undefined,
          // Use parsed group if available, otherwise use defaultGroupName (filename)
          group: groupTitleMatch ? groupTitleMatch[1] : defaultGroupName,
        };
      } else if (line.startsWith('http') || line.endsWith('.m3u8')) {
        if (currentM3UChannel.name) {
          const url = line;
          const id = generateId(`${url}|${currentM3UChannel.name}`);
          channels.push({
            ...currentM3UChannel,
            id,
            url,
          } as Channel);
          currentM3UChannel = {};
        }
      }
    }
    // --- TXT Logic (Name,URL or #Genre#) ---
    else {
      if (line.includes('#Genre#')) {
        const parts = line.split('#Genre#');
        // e.g. "News,#Genre#" or just "#Genre#News" depending on format variance
        // Usually found as "GroupName,#Genre#"
        const groupName = parts[0].trim();
        if (groupName) {
          currentTxtGroup = groupName;
        }
        continue;
      }

      // Check for "Name,URL" format
      if (line.includes(',')) {
        const [namePart, urlPart] = line.split(',', 2);
        const url = urlPart?.trim();
        const name = namePart?.trim();

        if (url && (url.startsWith('http') || url.startsWith('rtmp') || url.endsWith('.m3u8'))) {
          const id = generateId(`${url}|${name}`);
          channels.push({
            id,
            name: name || '未知频道',
            url,
            group: currentTxtGroup, // Will use filename if no #Genre# was found yet
            logo: undefined, // TXT usually doesn't support logos inline
          });
        }
      }
    }
  }

  return channels;
};
