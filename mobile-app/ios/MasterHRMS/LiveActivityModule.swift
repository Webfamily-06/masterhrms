import Foundation
import ActivityKit
import React

@objc(LiveActivityModule)
public class LiveActivityModule: NSObject {

    #if canImport(ActivityKit)
    private var currentActivity: Any? // Activity<CallActivityAttributes>?
    #endif

    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc
    public func startLiveActivity(
        _ callId: String,
        callerName: String,
        callType: String,
        isGroup: Bool,
        groupName: String?,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                resolve(["success": false, "reason": "Activities not enabled"])
                return
            }

            let attributes = CallActivityAttributes(
                callId: callId,
                callerName: callerName,
                callType: callType,
                isGroup: isGroup,
                groupName: groupName
            )

            let initialState = CallActivityAttributes.ContentState(
                callStatus: "active",
                isMuted: false,
                durationSeconds: 0,
                startDate: Date()
            )

            do {
                let activity = try Activity<CallActivityAttributes>.request(
                    attributes: attributes,
                    contentState: initialState,
                    pushType: nil
                )
                self.currentActivity = activity
                resolve(["success": true, "activityId": activity.id])
            } catch {
                resolve(["success": false, "error": error.localizedDescription])
            }
        } else {
            resolve(["success": false, "reason": "iOS version < 16.1"])
        }
        #else
        resolve(["success": false, "reason": "ActivityKit unavailable"])
        #endif
    }

    @objc
    public func updateLiveActivity(
        _ isMuted: Bool,
        callStatus: String,
        durationSeconds: Int,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            guard let activity = self.currentActivity as? Activity<CallActivityAttributes> else {
                resolve(["success": false, "reason": "No active activity"])
                return
            }

            let updatedState = CallActivityAttributes.ContentState(
                callStatus: callStatus,
                isMuted: isMuted,
                durationSeconds: durationSeconds,
                startDate: activity.contentState.startDate
            )

            Task {
                await activity.update(using: updatedState)
                resolve(["success": true])
            }
        } else {
            resolve(["success": false, "reason": "iOS version < 16.1"])
        }
        #else
        resolve(["success": false, "reason": "ActivityKit unavailable"])
        #endif
    }

    @objc
    public func endLiveActivity(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        #if canImport(ActivityKit)
        if #available(iOS 16.1, *) {
            guard let activity = self.currentActivity as? Activity<CallActivityAttributes> else {
                resolve(["success": true, "reason": "No activity to end"])
                return
            }

            Task {
                await activity.end(using: nil, dismissalPolicy: .immediate)
                self.currentActivity = nil
                resolve(["success": true])
            }
        } else {
            resolve(["success": false, "reason": "iOS version < 16.1"])
        }
        #else
        resolve(["success": false, "reason": "ActivityKit unavailable"])
        #endif
    }
}
