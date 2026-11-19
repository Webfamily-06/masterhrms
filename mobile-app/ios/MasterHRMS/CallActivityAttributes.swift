import Foundation
import ActivityKit

#if canImport(ActivityKit)
@available(iOS 16.1, *)
public struct CallActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var callStatus: String       // "active" | "connecting" | "reconnecting" | "on_hold"
        public var isMuted: Bool
        public var durationSeconds: Int
        public var startDate: Date

        public init(callStatus: String, isMuted: Bool, durationSeconds: Int, startDate: Date = Date()) {
            self.callStatus = callStatus
            self.isMuted = isMuted
            self.durationSeconds = durationSeconds
            self.startDate = startDate
        }
    }

    public var callId: String
    public var callerName: String
    public var callType: String            // "audio" | "video"
    public var isGroup: Bool
    public var groupName: String?

    public init(callId: String, callerName: String, callType: String, isGroup: Bool, groupName: String? = nil) {
        self.callId = callId
        self.callerName = callerName
        self.callType = callType
        self.isGroup = isGroup
        self.groupName = groupName
    }
}
#endif
