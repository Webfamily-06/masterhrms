import WidgetKit
import SwiftUI
import ActivityKit

#if canImport(ActivityKit)
@available(iOS 16.1, *)
public struct CallLiveActivityWidget: Widget {
    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: CallActivityAttributes.self) { context in
            // Lock Screen / Notification Banner presentation
            LockScreenLiveActivityView(context: context)
                .activityBackgroundTint(Color(red: 15/255, green: 23/255, blue: 42/255))
                .activitySystemActionForegroundColor(Color.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded Presentation
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: context.attributes.callType == "video" ? "video.fill" : "phone.fill")
                            .font(.system(size: 20))
                            .foregroundColor(Color(red: 99/255, green: 102/255, blue: 241/255))
                            .padding(8)
                            .background(Color(red: 99/255, green: 102/255, blue: 241/255).opacity(0.2))
                            .clipShape(Circle())

                        VStack(alignment: .leading, spacing: 2) {
                            Text(context.attributes.isGroup ? (context.attributes.groupName ?? "Group Meeting") : context.attributes.callerName)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white)
                                .lineLimit(1)

                            Text(context.attributes.callType == "video" ? "MasterHRMS Video" : "MasterHRMS Audio")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Color(red: 148/255, green: 163/255, blue: 184/255))
                        }
                    }
                    .padding(.leading, 8)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(context.state.callStatus == "reconnecting" ? Color.orange : Color.green)
                                .frame(width: 8, height: 8)

                            Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                                .font(.system(size: 14, weight: .bold, design: .monospaced))
                                .foregroundColor(Color(red: 129/255, green: 140/255, blue: 248/255))
                        }

                        if context.state.isMuted {
                            HStack(spacing: 3) {
                                Image(systemName: "mic.slash.fill")
                                    .font(.system(size: 10))
                                    .foregroundColor(.red)
                                Text("Muted")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    .padding(.trailing, 8)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 12) {
                        Link(destination: URL(string: "masterhrms://call/\(context.attributes.callId)")!) {
                            HStack(spacing: 6) {
                                Image(systemName: "arrow.up.left.and.arrow.down.right")
                                    .font(.system(size: 12, weight: .bold))
                                Text("Open Call")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color(red: 99/255, green: 102/255, blue: 241/255).opacity(0.3))
                            .foregroundColor(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 4)
                }
            } compactLeading: {
                // Compact Leading: Indigo/Purple Icon
                Image(systemName: context.attributes.callType == "video" ? "video.fill" : "phone.fill")
                    .font(.system(size: 13))
                    .foregroundColor(Color(red: 99/255, green: 102/255, blue: 241/255))
                    .padding(.leading, 4)
            } compactTrailing: {
                // Compact Trailing: Live Duration
                Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(context.state.isMuted ? .red : Color(red: 129/255, green: 140/255, blue: 248/255))
                    .frame(width: 44)
            } minimal: {
                // Minimal: Phone Icon with status indicator
                Image(systemName: context.state.isMuted ? "mic.slash.fill" : "phone.fill")
                    .font(.system(size: 12))
                    .foregroundColor(context.state.isMuted ? .red : Color(red: 99/255, green: 102/255, blue: 241/255))
            }
        }
    }
}

// Lock screen card representation
@available(iOS 16.1, *)
struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<CallActivityAttributes>

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: context.attributes.callType == "video" ? "video.fill" : "phone.fill")
                .font(.system(size: 22))
                .foregroundColor(.white)
                .frame(width: 46, height: 46)
                .background(Color(red: 99/255, green: 102/255, blue: 241/255))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 3) {
                Text(context.attributes.isGroup ? (context.attributes.groupName ?? "Group Call") : context.attributes.callerName)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)

                Text(context.state.callStatus == "reconnecting" ? "Reconnecting..." : "Active MasterHRMS Call")
                    .font(.system(size: 12))
                    .foregroundColor(Color(red: 148/255, green: 163/255, blue: 184/255))
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(timerInterval: context.state.startDate...Date.distantFuture, countsDown: false)
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(red: 129/255, green: 140/255, blue: 248/255))

                if context.state.isMuted {
                    HStack(spacing: 4) {
                        Image(systemName: "mic.slash.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.red)
                        Text("Muted")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(.red)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(red: 15/255, green: 23/255, blue: 42/255))
    }
}
#endif
