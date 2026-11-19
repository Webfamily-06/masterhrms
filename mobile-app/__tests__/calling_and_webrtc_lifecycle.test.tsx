import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ThemeProvider } from '../src/app/providers/ThemeProvider';
import { ChatService } from '../src/core/services/chatService';
import { apiClient } from '../src/core/api/apiClient';
import { useCallStore } from '../src/store/callStore';
import { FloatingMiniCallWidget } from '../src/components/calling/FloatingMiniCallWidget';
import { FullScreenIncomingCallModal } from '../src/components/calling/FullScreenIncomingCallModal';
import { realtimeManager } from '../src/core/realtime/realtimeManager';

jest.mock('../src/core/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Cross-Platform Calling & WebRTC Lifecycle Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useCallStore.getState().resetCall();
    });
  });

  describe('1. ChatService Calling REST Contracts', () => {
    it('initiates outgoing call with targetUserId and callType', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            callId: 'call_123456',
            status: 'ringing',
            targetUserId: 'usr_target_1',
            callType: 'video',
          },
        },
      });

      const res = await ChatService.initiateCall('usr_target_1', 'video', 'th_100');
      expect(res.callId).toBe('call_123456');
      expect(apiClient.post).toHaveBeenCalledWith('/api/calls/invite', {
        targetUserId: 'usr_target_1',
        callType: 'video',
        threadId: 'th_100',
      });
    });

    it('accepts call via POST /api/calls/:callId/accept', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const res = await ChatService.acceptCall('call_123456');
      expect(res).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith('/api/calls/call_123456/accept', {});
    });

    it('rejects call with custom reason via POST /api/calls/:callId/reject', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const res = await ChatService.rejectCall('call_123456', 'busy');
      expect(res).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith('/api/calls/call_123456/reject', {
        reason: 'busy',
      });
    });

    it('cancels outgoing call before answer via POST /api/calls/:callId/cancel', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const res = await ChatService.cancelCall('call_123456');
      expect(res).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith('/api/calls/call_123456/cancel', {});
    });

    it('ends active call with duration via POST /api/calls/:callId/end', async () => {
      (apiClient.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true },
      });

      const res = await ChatService.endCall('call_123456', 95);
      expect(res).toBe(true);
      expect(apiClient.post).toHaveBeenCalledWith('/api/calls/call_123456/end', {
        durationSeconds: 95,
      });
    });

    it('fetches call logs with pagination and filters via GET /api/chat/calls', async () => {
      const mockCalls = [
        {
          id: 'log_1',
          callerId: 'usr_1',
          callerName: 'Alice',
          receiverId: 'usr_2',
          receiverName: 'Bob',
          callType: 'video',
          direction: 'outgoing',
          status: 'completed',
          durationSeconds: 120,
          callTime: new Date().toISOString(),
        },
      ];

      (apiClient.get as jest.Mock).mockResolvedValueOnce({
        data: {
          calls: mockCalls,
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      });

      const res = await ChatService.getCallLogs({ status: 'completed' });
      expect(res.calls.length).toBe(1);
      expect(res.calls[0].callerName).toBe('Alice');
      expect(apiClient.get).toHaveBeenCalledWith('/api/chat/calls', {
        params: { status: 'completed' },
      });
    });
  });

  describe('2. Call Store & Minimization (PiP)', () => {
    it('manages active call state, minimization, and duration timer', () => {
      useCallStore.getState().setActiveCall({
        callId: 'call_999',
        callerId: 'usr_me',
        callerName: 'Me',
        receiverId: 'usr_colleague',
        receiverName: 'Jane Smith',
        callType: 'video',
        status: 'connected',
        durationSeconds: 0,
        isMuted: false,
        isVideoOff: false,
        isSpeakerOn: false,
        isMinimized: false,
      });

      let state = useCallStore.getState();
      expect(state.activeCall?.status).toBe('connected');
      expect(state.activeCall?.isMinimized).toBe(false);

      // Increment duration
      act(() => {
        useCallStore.getState().incrementDuration();
      });
      state = useCallStore.getState();
      expect(state.activeCall?.durationSeconds).toBe(1);

      // Minimize call
      act(() => {
        useCallStore.getState().setMinimized(true);
      });
      state = useCallStore.getState();
      expect(state.activeCall?.isMinimized).toBe(true);
    });

    it('renders FloatingMiniCallWidget when call is minimized', () => {
      useCallStore.getState().setActiveCall({
        callId: 'call_999',
        callerId: 'usr_me',
        callerName: 'Me',
        receiverId: 'usr_colleague',
        receiverName: 'Jane Smith',
        callType: 'audio',
        status: 'connected',
        durationSeconds: 45,
        isMuted: false,
        isVideoOff: false,
        isSpeakerOn: false,
        isMinimized: true,
      });

      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ThemeProvider>
            <FloatingMiniCallWidget />
          </ThemeProvider>
        );
      });

      const tree = renderer.toJSON();
      expect(tree).not.toBeNull();
    });

    it('FloatingMiniCallWidget returns null when no call is active or not minimized', () => {
      act(() => {
        useCallStore.getState().resetCall();
      });

      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ThemeProvider>
            <FloatingMiniCallWidget />
          </ThemeProvider>
        );
      });

      expect(renderer.toJSON()).toBeNull();
    });
  });

  describe('3. Incoming Call Modal & Realtime Signaling', () => {
    let socketListeners: Record<string, (payload: any) => void> = {};

    beforeEach(() => {
      socketListeners = {};
      jest.spyOn(realtimeManager, 'subscribe').mockImplementation((eventName: string, handler: any) => {
        socketListeners[eventName] = handler;
        return () => {
          delete socketListeners[eventName];
        };
      });
    });

    it('mounts FullScreenIncomingCallModal and listens to call:incoming event', async () => {
      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ThemeProvider>
            <FullScreenIncomingCallModal />
          </ThemeProvider>
        );
      });
      expect(renderer.toJSON()).toBeNull();

      expect(realtimeManager.subscribe).toHaveBeenCalledWith('call:incoming', expect.any(Function));
      expect(realtimeManager.subscribe).toHaveBeenCalledWith('call:cancelled', expect.any(Function));

      // Trigger incoming call event
      act(() => {
        socketListeners['call:incoming']?.({
          callId: 'call_alert_777',
          callerId: 'usr_caller_1',
          callerName: 'Robert Vance',
          callType: 'video',
        });
      });

      const state = useCallStore.getState();
      expect(state.incomingCall?.callId).toBe('call_alert_777');
      expect(state.incomingCall?.callerName).toBe('Robert Vance');
      expect(state.incomingCall?.callType).toBe('video');

      // Dismiss on call:cancelled
      act(() => {
        socketListeners['call:cancelled']?.({ callId: 'call_alert_777' });
      });

      expect(useCallStore.getState().incomingCall).toBeNull();
    });
  });

  describe('4. Visual Parity Components & Dynamic Island LiveActivityService', () => {
    it('executes LiveActivityService lifecycle without runtime exceptions', async () => {
      const { LiveActivityService } = require('../src/core/services/liveActivityService');

      const startRes = await LiveActivityService.startLiveActivity({
        callId: 'call_live_test_1',
        callerName: 'Sarah Connor',
        callType: 'video',
      });
      expect(typeof startRes).toBe('boolean');

      const updateRes = await LiveActivityService.updateLiveActivity(true, 'active', 30);
      expect(typeof updateRes).toBe('boolean');

      const endRes = await LiveActivityService.endLiveActivity();
      expect(typeof endRes).toBe('boolean');
    });

    it('renders CallWaveformView with bar elements', () => {
      const { CallWaveformView } = require('../src/components/calling/CallWaveformView');
      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(<CallWaveformView isActive={false} barCount={8} />);
      });
      expect(renderer.toJSON()).not.toBeNull();
      act(() => {
        renderer.unmount();
      });
    });

    it('renders CallOptionsBottomSheet with Audio, Video, and Group options', () => {
      const { CallOptionsBottomSheet } = require('../src/components/calling/CallOptionsBottomSheet');
      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ThemeProvider>
            <CallOptionsBottomSheet
              visible={true}
              onClose={jest.fn()}
              onSelectAudioCall={jest.fn()}
              onSelectVideoCall={jest.fn()}
              onSelectGroupCall={jest.fn()}
            />
          </ThemeProvider>
        );
      });
      expect(renderer.toJSON()).not.toBeNull();
      act(() => {
        renderer.unmount();
      });
    });

    it('renders CallKeypadModal with DTMF touch keys', () => {
      const { CallKeypadModal } = require('../src/components/calling/CallKeypadModal');
      let renderer: any;
      act(() => {
        renderer = ReactTestRenderer.create(
          <ThemeProvider>
            <CallKeypadModal visible={true} onClose={jest.fn()} onSendDtmfTone={jest.fn()} />
          </ThemeProvider>
        );
      });
      expect(renderer.toJSON()).not.toBeNull();
      act(() => {
        renderer.unmount();
      });
    });

    it('renders InCallOptionsBottomSheet and CallPermissionModal', () => {
      const { InCallOptionsBottomSheet } = require('../src/components/calling/InCallOptionsBottomSheet');
      const { CallPermissionModal } = require('../src/components/calling/CallPermissionModal');

      let inCallRenderer: any;
      act(() => {
        inCallRenderer = ReactTestRenderer.create(
          <ThemeProvider>
            <InCallOptionsBottomSheet
              visible={true}
              onClose={jest.fn()}
              onOpenParticipants={jest.fn()}
              onOpenInviteColleagues={jest.fn()}
            />
          </ThemeProvider>
        );
      });
      expect(inCallRenderer.toJSON()).not.toBeNull();
      act(() => {
        inCallRenderer.unmount();
      });

      let permRenderer: any;
      act(() => {
        permRenderer = ReactTestRenderer.create(
          <ThemeProvider>
            <CallPermissionModal
              visible={true}
              onClose={jest.fn()}
              onRequestPermissions={jest.fn().mockResolvedValue(undefined)}
            />
          </ThemeProvider>
        );
      });
      expect(permRenderer.toJSON()).not.toBeNull();
      act(() => {
        permRenderer.unmount();
      });
    });
  });
});
