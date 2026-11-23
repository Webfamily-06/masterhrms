import { NativeModules, Platform } from 'react-native';
import { apiClient } from '../api/apiClient';

const { LiveActivityModule } = NativeModules;

export interface LiveActivityStartParams {
  callId: string;
  callerName: string;
  callType: 'audio' | 'video';
  isGroup?: boolean;
  groupName?: string;
}

export class LiveActivityService {
  private static isSupported = Platform.OS === 'ios';
  private static activeCallId: string | null = null;

  /**
   * Starts an iOS Live Activity on iPhone (ActivityKit / Dynamic Island).
   * On Android, logs ongoing foreground call notification.
   */
  static async startLiveActivity(params: LiveActivityStartParams): Promise<boolean> {
    this.activeCallId = params.callId;

    if (this.isSupported && LiveActivityModule?.startLiveActivity) {
      try {
        const res = await LiveActivityModule.startLiveActivity(
          params.callId,
          params.callerName,
          params.callType,
          Boolean(params.isGroup),
          params.groupName || null
        );
        return Boolean(res?.success);
      } catch (err) {
        console.warn('[LiveActivity] Failed to start iOS ActivityKit activity:', err);
        return false;
      }
    } else if (Platform.OS === 'android') {
      // Android ongoing call notification integration
      console.log(`[OngoingCall] Android foreground call channel active for: ${params.callerName}`);
      return true;
    }
    return false;
  }

  /**
   * Updates state (mute status, reconnecting status, call duration) on Dynamic Island.
   */
  static async updateLiveActivity(
    isMuted: boolean,
    callStatus: 'active' | 'reconnecting' | 'on_hold' = 'active',
    durationSeconds: number = 0
  ): Promise<boolean> {
    if (!this.activeCallId) return false;

    if (this.isSupported && LiveActivityModule?.updateLiveActivity) {
      try {
        const res = await LiveActivityModule.updateLiveActivity(isMuted, callStatus, durationSeconds);
        return Boolean(res?.success);
      } catch (err) {
        console.warn('[LiveActivity] Failed to update iOS ActivityKit activity:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Ends and dismisses the Live Activity on Dynamic Island / Lock Screen.
   */
  static async endLiveActivity(): Promise<boolean> {
    this.activeCallId = null;

    if (this.isSupported && LiveActivityModule?.endLiveActivity) {
      try {
        const res = await LiveActivityModule.endLiveActivity();
        return Boolean(res?.success);
      } catch (err) {
        console.warn('[LiveActivity] Failed to end iOS ActivityKit activity:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Sync Dynamic Island / Live Activity state with backend telemetry & push registry.
   */
  static async syncDynamicIsland(payload: {
    activityId: string;
    type: string;
    mode: 'minimal' | 'compact' | 'expanded';
    title: string;
    pushToken?: string;
  }): Promise<boolean> {
    try {
      await apiClient.post('/api/v1/me/live-activities/sync', {
        ...payload,
        platform: Platform.OS,
      });
      return true;
    } catch {
      return false;
    }
  }
}
