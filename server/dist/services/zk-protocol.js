"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pullAttendanceLogsFromZkDevice = pullAttendanceLogsFromZkDevice;
const node_zklib_1 = __importDefault(require("node-zklib"));
/**
 * Connects directly to real ZKTeco / eSSL / Realtime Biometric Machine on IP:Port
 * and pulls real attendance records + device info using ZK Protocol.
 */
async function pullAttendanceLogsFromZkDevice(ip, port = 4370, timeoutMs = 10000) {
    const zk = new node_zklib_1.default(ip, port, timeoutMs, 4000);
    const records = [];
    let users = [];
    let info = undefined;
    try {
        // 1. Create socket connection
        await zk.createSocket();
        // 2. Fetch Device Info
        try {
            const devInfo = await zk.getInfo();
            if (devInfo) {
                info = {
                    userCount: devInfo.userCounts || 0,
                    logCount: devInfo.logCounts || 0,
                    logCapacity: devInfo.logCapacity || 0,
                };
            }
        }
        catch (e) {
            console.warn(`[ZK-LIB GET INFO]: ${e.message}`);
        }
        // 3. Fetch Enrolled Users
        try {
            const usersData = await zk.getUsers();
            if (usersData && Array.isArray(usersData.data)) {
                users = usersData.data;
            }
        }
        catch (e) {
            console.warn(`[ZK-LIB GET USERS]: ${e.message}`);
        }
        // 4. Fetch Attendance Punch Logs
        try {
            const attendances = await zk.getAttendances();
            if (attendances && Array.isArray(attendances.data)) {
                for (const item of attendances.data) {
                    const empCode = String(item.deviceUserId || item.userSn || "").trim();
                    const punchDate = item.recordTime ? new Date(item.recordTime) : new Date();
                    if (empCode && !isNaN(punchDate.getTime())) {
                        records.push({
                            employeeCode: empCode,
                            punchTime: punchDate,
                            verifyModeName: "fingerprint",
                            rawRecord: item,
                        });
                    }
                }
            }
        }
        catch (e) {
            console.warn(`[ZK-LIB GET ATTENDANCES]: ${e.message}`);
        }
        // 5. Disconnect socket cleanly
        try {
            await zk.disconnect();
        }
        catch { }
        return {
            success: true,
            records,
            users,
            info,
            message: `Successfully connected to machine at ${ip}:${port}. Retrieved ${records.length} logs and ${users.length} enrolled users.`,
        };
    }
    catch (err) {
        try {
            await zk.disconnect();
        }
        catch { }
        return {
            success: false,
            records: [],
            users: [],
            message: `Failed to connect to biometric hardware at ${ip}:${port}: ${err.message}`,
        };
    }
}
