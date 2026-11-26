using System;
using System.Collections.Generic;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using zkemkeeper;

namespace MasterHrmsDeviceManager
{
    public class HardwareUserRecord
    {
        public string BiometricId { get; set; }
        public string Name { get; set; }
        public string CardNumber { get; set; }
        public int FingerprintCount { get; set; }
        public bool HasFace { get; set; }
        public bool HasCard { get; set; }
        public bool HasPassword { get; set; }
        public string Privilege { get; set; }
        public bool Enabled { get; set; }

        public string AuthModesSummary
        {
            get
            {
                var modes = new List<string>();
                if (FingerprintCount > 0) modes.Add("Fingerprint (" + FingerprintCount + ")");
                if (HasFace) modes.Add("Face");
                if (HasCard) modes.Add("RFID Card");
                if (HasPassword) modes.Add("PIN");
                return modes.Count > 0 ? string.Join(", ", modes.ToArray()) : "Fingerprint";
            }
        }
    }

    public class AttendanceLogRecord
    {
        public string EmployeeCode { get; set; }
        public DateTime PunchTime { get; set; }
        public string VerificationMode { get; set; }
        public string PunchType { get; set; }
    }
    public class DeviceCommSettings
    {
        public string SerialNumber { get; set; }
        public string IpAddress { get; set; }
        public string NetMask { get; set; }
        public string Gateway { get; set; }
        public string Dns { get; set; }
        public string Dhcp { get; set; }
        public string TcpPort { get; set; }
        public string AdmsUrl { get; set; }
        public string AdmsPort { get; set; }
        public string EnableProxy { get; set; }
        public string ProxyIp { get; set; }
        public string ProxyPort { get; set; }
    }

    public class DeviceHardwareInfo
    {
        public string SerialNumber { get; set; }
        public string FirmwareVersion { get; set; }
        public string MacAddress { get; set; }
        public string PushTableOptions { get; set; }
        public string SuffixDescOptions { get; set; }
    }

    public class ZkDeviceClient
    {
        private CZKEMClass _zk;
        private const int MachineNumber = 1;

        public bool IsConnected { get; private set; }
        public string ConnectedIp { get; private set; }
        public int ConnectedPort { get; private set; }

        public bool TryInitialize(out string error)
        {
            error = null;
            if (_zk != null) return true;
            try
            {
                _zk = new CZKEMClass();
                return true;
            }
            catch (Exception ex)
            {
                error = "Unable to initialize ZKEM SDK (zkemkeeper.dll). Please click 'Register DLLs' first.\n\nDetails: " + ex.Message;
                return false;
            }
        }

        public bool Connect(string ipAddress, int port, out string error)
        {
            error = null;
            if (!TryInitialize(out error)) return false;

            try
            {
                if (IsConnected)
                {
                    _zk.Disconnect();
                    IsConnected = false;
                }

                bool ok = _zk.Connect_Net(ipAddress.Trim(), port);
                if (!ok)
                {
                    int errCode = 0;
                    _zk.GetLastError(ref errCode);
                    error = string.Format("Unable to connect to biometric device at {0}:{1} (SDK Error Code: {2}). Verify LAN IP, Port 4370, and cable.", ipAddress, port, errCode);
                    return false;
                }

                IsConnected = true;
                ConnectedIp = ipAddress.Trim();
                ConnectedPort = port;
                return true;
            }
            catch (Exception ex)
            {
                error = "Connection exception: " + ex.Message;
                return false;
            }
        }

        public void Disconnect()
        {
            try
            {
                if (_zk != null && IsConnected)
                {
                    _zk.Disconnect();
                }
            }
            catch { }
            finally
            {
                IsConnected = false;
            }
        }

        public string GetSysOption(string optionName)
        {
            if (!IsConnected || _zk == null) return string.Empty;
            string value = string.Empty;
            try
            {
                _zk.GetSysOption(MachineNumber, optionName, out value);
            }
            catch { }
            return value ?? string.Empty;
        }

        public bool SetSysOption(string optionName, string value, out string error)
        {
            error = null;
            if (!IsConnected || _zk == null)
            {
                error = "Device is not connected.";
                return false;
            }
            try
            {
                bool ok = _zk.SetSysOption(MachineNumber, optionName, value ?? string.Empty);
                if (!ok)
                {
                    int errCode = 0;
                    _zk.GetLastError(ref errCode);
                    error = string.Format("Failed to set '{0}' (Error Code: {1}).", optionName, errCode);
                }
                return ok;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        public DeviceCommSettings ReadCommSettings()
        {
            var settings = new DeviceCommSettings();
            if (!IsConnected || _zk == null) return settings;

            string sn = string.Empty;
            try { _zk.GetSerialNumber(MachineNumber, out sn); } catch { }
            settings.SerialNumber = sn ?? string.Empty;

            settings.IpAddress = GetSysOption("IPAddress");
            settings.NetMask = GetSysOption("NetMask");
            settings.Gateway = GetSysOption("GATEIPAddress");
            settings.Dns = GetSysOption("DNS");
            settings.Dhcp = GetSysOption("DHCP");
            settings.TcpPort = GetSysOption("TCPPort");
            settings.AdmsUrl = GetSysOption("ICLOCKSVRURL");
            settings.AdmsPort = GetSysOption("IclockSvrPort");
            settings.EnableProxy = GetSysOption("EnableProxyServer");
            settings.ProxyIp = GetSysOption("ProxyServerIP");
            settings.ProxyPort = GetSysOption("ProxyServerPort");
            return settings;
        }

        public bool UpdateCommSettings(string subnetMask, string gateway, string dns, string admsPort, string admsUrl, out string error)
        {
            error = null;
            if (!IsConnected || _zk == null)
            {
                error = "Please connect to the biometric device first.";
                return false;
            }

            try
            {
                if (!string.IsNullOrWhiteSpace(subnetMask))
                    _zk.SetSysOption(MachineNumber, "NetMask", subnetMask.Trim());

                if (!string.IsNullOrWhiteSpace(gateway))
                    _zk.SetSysOption(MachineNumber, "GATEIPAddress", gateway.Trim());

                if (!string.IsNullOrWhiteSpace(dns))
                    _zk.SetSysOption(MachineNumber, "DNS", dns.Trim());

                if (!string.IsNullOrWhiteSpace(admsPort))
                    _zk.SetSysOption(MachineNumber, "IclockSvrPort", admsPort.Trim());

                if (!string.IsNullOrWhiteSpace(admsUrl))
                    _zk.SetSysOption(MachineNumber, "ICLOCKSVRURL", admsUrl.Trim());

                return true;
            }
            catch (Exception ex)
            {
                error = "Failed while updating device settings: " + ex.Message;
                return false;
            }
        }

        public DeviceHardwareInfo ReadHardwareInfo()
        {
            var info = new DeviceHardwareInfo();
            if (!IsConnected || _zk == null) return info;

            string sn = string.Empty;
            string fw = string.Empty;
            string mac = string.Empty;

            try { _zk.GetSerialNumber(MachineNumber, out sn); } catch { }
            try { _zk.GetFirmwareVersion(MachineNumber, ref fw); } catch { }
            try { _zk.GetDeviceMAC(MachineNumber, ref mac); } catch { }

            info.SerialNumber = sn;
            info.FirmwareVersion = fw;
            info.MacAddress = mac;
            info.PushTableOptions = GetSysOption("PushTableDesc");
            info.SuffixDescOptions = GetSysOption("suffixDesc");
            return info;
        }

        public bool GetDeviceTime(out DateTime deviceTime, out string error)
        {
            deviceTime = DateTime.MinValue;
            error = null;
            if (!IsConnected || _zk == null)
            {
                error = "Device is not connected.";
                return false;
            }

            int year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
            bool ok = _zk.GetDeviceTime(MachineNumber, ref year, ref month, ref day, ref hour, ref minute, ref second);
            if (!ok)
            {
                error = "Unable to fetch device time.";
                return false;
            }

            try
            {
                deviceTime = new DateTime(year, month, day, hour, minute, second);
                return true;
            }
            catch
            {
                error = string.Format("Invalid device date/time returned ({0}-{1}-{2} {3}:{4}:{5}).", year, month, day, hour, minute, second);
                return false;
            }
        }

        public bool SyncDeviceTimeToPc(out string error)
        {
            error = null;
            if (!IsConnected || _zk == null)
            {
                error = "Device is not connected.";
                return false;
            }

            bool ok = _zk.SetDeviceTime(MachineNumber);
            if (!ok)
            {
                error = "Unable to update device time.";
            }
            return ok;
        }

        public bool RestartDevice(out string error)
        {
            error = null;
            if (!IsConnected || _zk == null)
            {
                error = "Device is not connected.";
                return false;
            }

            bool ok = _zk.RestartDevice(MachineNumber);
            if (!ok)
            {
                error = "Unable to restart device.";
            }
            else
            {
                IsConnected = false;
            }
            return ok;
        }

        public List<HardwareUserRecord> PullEnrolledUsers(out string error)
        {
            error = null;
            var users = new List<HardwareUserRecord>();
            if (!IsConnected || _zk == null)
            {
                error = "Device is not connected.";
                return users;
            }

            try
            {
                _zk.EnableDevice(MachineNumber, false);
                _zk.ReadAllUserID(MachineNumber);
                _zk.ReadAllTemplate(MachineNumber);

                string enrollNumber;
                string name;
                string password;
                int privilege;
                bool enabled;

                while (_zk.SSR_GetAllUserInfo(MachineNumber, out enrollNumber, out name, out password, out privilege, out enabled))
                {
                    if (string.IsNullOrWhiteSpace(enrollNumber)) continue;

                    string cardNo = string.Empty;
                    try { _zk.GetStrCardNumber(out cardNo); } catch { }
                    if (cardNo == "0") cardNo = string.Empty;

                    // Count enrolled fingerprints (0..9)
                    int fpCount = 0;
                    for (int f = 0; f < 10; f++)
                    {
                        string tmpData;
                        int tmpLen;
                        try
                        {
                            if (_zk.SSR_GetUserTmpStr(MachineNumber, enrollNumber, f, out tmpData, out tmpLen) && tmpLen > 0)
                            {
                                fpCount++;
                            }
                        }
                        catch { }
                    }

                    // Check enrolled face template (index 50)
                    bool hasFace = false;
                    try
                    {
                        string faceTmp = string.Empty;
                        int faceLen = 0;
                        if (_zk.GetUserFaceStr(MachineNumber, enrollNumber, 50, ref faceTmp, ref faceLen) && faceLen > 0)
                        {
                            hasFace = true;
                        }
                    }
                    catch { }

                    string cleanName = (name ?? string.Empty).Replace("\0", "").Trim();
                    string cleanPwd = (password ?? string.Empty).Replace("\0", "").Trim();
                    string cleanCard = (cardNo ?? string.Empty).Replace("\0", "").Trim();

                    users.Add(new HardwareUserRecord
                    {
                        BiometricId = enrollNumber.Trim(),
                        Name = string.IsNullOrEmpty(cleanName) ? ("User " + enrollNumber.Trim()) : cleanName,
                        CardNumber = cleanCard,
                        FingerprintCount = fpCount,
                        HasFace = hasFace,
                        HasCard = !string.IsNullOrEmpty(cleanCard),
                        HasPassword = !string.IsNullOrEmpty(cleanPwd),
                        Privilege = privilege >= 3 ? "Super Admin" : (privilege > 0 ? "Admin" : "User"),
                        Enabled = enabled
                    });
                }
            }
            catch (Exception ex)
            {
                error = "Failed to pull enrolled users: " + ex.Message;
            }
            finally
            {
                try { _zk.EnableDevice(MachineNumber, true); } catch { }
            }

            return users;
        }

        public List<AttendanceLogRecord> PullAttendanceLogs(out string error)
        {
            error = null;
            var logs = new List<AttendanceLogRecord>();
            if (!IsConnected || _zk == null)
            {
                error = "Device is not connected.";
                return logs;
            }

            try
            {
                _zk.EnableDevice(MachineNumber, false);
                if (!_zk.ReadGeneralLogData(MachineNumber))
                {
                    return logs;
                }

                string enrollNumber;
                int verifyMode, inOutMode, year, month, day, hour, minute, second;
                int workCode = 0;

                while (_zk.SSR_GetGeneralLogData(MachineNumber, out enrollNumber, out verifyMode, out inOutMode, out year, out month, out day, out hour, out minute, out second, ref workCode))
                {
                    if (string.IsNullOrWhiteSpace(enrollNumber)) continue;

                    DateTime punchDt;
                    try
                    {
                        punchDt = new DateTime(year, month, day, hour, minute, second);
                    }
                    catch
                    {
                        continue;
                    }

                    string vMode = "fingerprint";
                    if (verifyMode == 0 || verifyMode == 3) vMode = "pin";
                    else if (verifyMode == 2 || verifyMode == 4) vMode = "rfid";
                    else if (verifyMode == 15 || verifyMode == 25) vMode = "face";

                    string pType = "auto";
                    if (inOutMode == 0) pType = "check_in";
                    else if (inOutMode == 1) pType = "check_out";

                    logs.Add(new AttendanceLogRecord
                    {
                        EmployeeCode = enrollNumber.Trim(),
                        PunchTime = punchDt,
                        VerificationMode = vMode,
                        PunchType = pType
                    });
                }
            }
            catch (Exception ex)
            {
                error = "Failed to pull attendance logs: " + ex.Message;
            }
            finally
            {
                try { _zk.EnableDevice(MachineNumber, true); } catch { }
            }

            return logs;
        }

        public static bool RegisterSdkDlls(bool is64Bit, out string error)
        {
            error = null;
            try
            {
                string key = is64Bit ? "64BitRegistrationBatFile" : "32BitRegistrationBatFile";
                string relPath = ConfigurationManager.AppSettings[key] ?? (is64Bit ? @"dlls\64bit.bat" : @"dlls\32bit.bat");
                string fullPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, relPath);

                if (!File.Exists(fullPath))
                {
                    error = "Registration script not found: " + fullPath;
                    return false;
                }

                var psi = new ProcessStartInfo
                {
                    FileName = fullPath,
                    WorkingDirectory = Path.GetDirectoryName(fullPath),
                    Verb = "runas",
                    UseShellExecute = true
                };

                var proc = Process.Start(psi);
                if (proc != null) proc.WaitForExit();
                return true;
            }
            catch (Exception ex)
            {
                error = "Unable to register DLLs automatically. Please run dlls\\64bit.bat or dlls\\32bit.bat as Administrator.\n\nDetails: " + ex.Message;
                return false;
            }
        }
    }
}
