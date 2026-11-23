import { create } from 'zustand';

export interface ActiveCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  receiverId?: string;
  receiverName?: string;
  receiverAvatar?: string | null;
  callType: 'audio' | 'video';
  threadId?: string;
  groupId?: string;
  groupName?: string;
  isGroupMeeting?: boolean;
  status: 'dialing' | 'ringing' | 'connected' | 'reconnecting' | 'ended';
  startedAt?: string;
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  isMinimized: boolean;
}

export interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  callerPhone?: string;
  callerEmail?: string;
  callType: 'audio' | 'video';
  threadId?: string;
  tenantId?: string;
  isGroup?: boolean;
  groupId?: string;
  groupName?: string;
}

export type DynamicIslandActivityType =
  | 'ongoing_call'
  | 'incoming_call'
  | 'group_call'
  | 'timer'
  | 'goal_progress'
  | 'finance_statistic'
  | 'daily_streak'
  | 'download'
  | 'notification'
  | 'voice_recording'
  | 'face_id'
  | 'plan';

export type DynamicIslandMode = 'minimal' | 'compact' | 'expanded';

export interface DynamicIslandActivity {
  id: string;
  type: DynamicIslandActivityType;
  title: string;
  subtitle?: string;
  metricValue?: string;
  metricDelta?: string;
  progress?: number; // 0-100
  accentColor?: string;
  mode: DynamicIslandMode;
  targetRoute?: string;
}

interface CallStoreState {
  activeCall: ActiveCallData | null;
  incomingCall: IncomingCallData | null;
  dynamicIsland: DynamicIslandActivity | null;
  setActiveCall: (call: ActiveCallData | null) => void;
  updateActiveCall: (updates: Partial<ActiveCallData>) => void;
  setIncomingCall: (call: IncomingCallData | null) => void;
  setMinimized: (minimized: boolean) => void;
  incrementDuration: () => void;
  resetCall: () => void;
  showDynamicIsland: (activity: Omit<DynamicIslandActivity, 'id' | 'mode'> & { id?: string; mode?: DynamicIslandMode }) => void;
  setDynamicIslandMode: (mode: DynamicIslandMode) => void;
  updateDynamicIsland: (updates: Partial<DynamicIslandActivity>) => void;
  dismissDynamicIsland: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  activeCall: null,
  incomingCall: null,
  dynamicIsland: null,

  setActiveCall: (call) => set({ activeCall: call }),

  updateActiveCall: (updates) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, ...updates } : null,
    })),

  setIncomingCall: (call) => set({ incomingCall: call }),

  setMinimized: (minimized) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, isMinimized: minimized } : null,
    })),

  incrementDuration: () =>
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, durationSeconds: state.activeCall.durationSeconds + 1 }
        : null,
    })),

  resetCall: () => set({ activeCall: null, incomingCall: null }),

  showDynamicIsland: (activity) =>
    set({
      dynamicIsland: {
        id: activity.id || `di-${Date.now()}`,
        mode: activity.mode || 'compact',
        ...activity,
      },
    }),

  setDynamicIslandMode: (mode) =>
    set((state) => ({
      dynamicIsland: state.dynamicIsland ? { ...state.dynamicIsland, mode } : null,
    })),

  updateDynamicIsland: (updates) =>
    set((state) => ({
      dynamicIsland: state.dynamicIsland ? { ...state.dynamicIsland, ...updates } : null,
    })),

  dismissDynamicIsland: () => set({ dynamicIsland: null }),
}));
