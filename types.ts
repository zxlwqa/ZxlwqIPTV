export interface Channel {
  id: string;
  name: string;
  group: string;
  logo?: string;
  url: string;
  tvgId?: string;
}

export interface Group {
  name: string;
  count: number;
}

export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

export enum ViewMode {
  GRID = 'GRID',
  LIST = 'LIST',
}
