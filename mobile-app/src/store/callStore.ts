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

interface CallStoreState {
  activeCall: ActiveCallData | null;
  incomingCall: IncomingCallData | null;
  setActiveCall: (call: ActiveCallData | null) => void;
  updateActiveCall: (updates: Partial<ActiveCallData>) => void;
  setIncomingCall: (call: IncomingCallData | null) => void;
  setMinimized: (minimized: boolean) => void;
  incrementDuration: () => void;
  resetCall: () => void;
}

export const useCallStore = create<CallStoreState>((set) => ({
  activeCall: null,
  incomingCall: null,

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
}));
