declare module 'node-zklib' {
  class ZKLib {
    constructor(ip: string, port: number, timeout?: number, inPort?: number);
    createSocket(): Promise<void>;
    getInfo(): Promise<{ userCounts?: number; logCounts?: number; logCapacity?: number }>;
    getUsers(): Promise<{ data?: Array<{ uid: number; role: number; password: string; name: string; cardno: number; userId: string }> }>;
    getAttendances(): Promise<{ data?: Array<{ userSn: number; deviceUserId: string; recordTime: string; ip?: string }> }>;
    getRealTimeLogs(callback: (err: any, data: any) => void): Promise<void>;
    disconnect(): Promise<void>;
  }
  export default ZKLib;
}
