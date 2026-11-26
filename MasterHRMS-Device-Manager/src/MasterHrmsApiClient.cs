using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Net;
using System.Text;

namespace MasterHrmsDeviceManager
{
    public class MasterHrmsApiClient
    {
        public static string DefaultServerBaseUrl
        {
            get
            {
                string configured = ConfigurationManager.AppSettings["MasterHrmsApiBaseUrl"];
                return string.IsNullOrWhiteSpace(configured) ? "https://api.masterhrms.com" : configured.TrimEnd('/');
            }
        }

        public static string DefaultAdmsUrl
        {
            get
            {
                string configured = ConfigurationManager.AppSettings["DefaultAdmsPushUrl"];
                return string.IsNullOrWhiteSpace(configured) ? "api.masterhrms.com" : configured.Trim();
            }
        }

        public static string DefaultAdmsPort
        {
            get
            {
                string configured = ConfigurationManager.AppSettings["DefaultAdmsPushPort"];
                return string.IsNullOrWhiteSpace(configured) ? "80" : configured.Trim();
            }
        }

        public static bool TestServerConnectivity(string baseUrl, out string responseBody, out string error)
        {
            responseBody = null;
            error = null;

            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

                string target = (string.IsNullOrWhiteSpace(baseUrl) ? DefaultServerBaseUrl : baseUrl.Trim().TrimEnd('/'))
                    + "/api/public/biometric/server-time";

                var request = (HttpWebRequest)WebRequest.Create(target);
                request.Method = "POST";
                request.ContentType = "application/json";
                request.Timeout = 8000;
                request.ReadWriteTimeout = 8000;

                byte[] payload = Encoding.UTF8.GetBytes("{\"client\":\"MasterHRMS-Device-Manager\"}");
                request.ContentLength = payload.Length;
                using (var reqStream = request.GetRequestStream())
                {
                    reqStream.Write(payload, 0, payload.Length);
                }

                using (var response = (HttpWebResponse)request.GetResponse())
                using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                {
                    responseBody = reader.ReadToEnd();
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch (WebException wex)
            {
                error = "Unable to reach Master HRMS server. Your firewall or network may be blocking outbound HTTPS.\n\nDetails: " + wex.Message;
                return false;
            }
            catch (Exception ex)
            {
                error = "Server connectivity test failed: " + ex.Message;
                return false;
            }
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "\\n").Replace("\t", "\\t");
        }

        public static bool PushSyncBundle(
            string baseUrl,
            string serialNumber,
            List<HardwareUserRecord> users,
            List<AttendanceLogRecord> logs,
            out string responseBody,
            out string error)
        {
            responseBody = null;
            error = null;

            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;

                string target = (string.IsNullOrWhiteSpace(baseUrl) ? DefaultServerBaseUrl : baseUrl.Trim().TrimEnd('/'))
                    + "/api/public/biometric/device-sync-bundle";

                var sb = new StringBuilder();
                sb.Append("{\"serialNumber\":\"").Append(EscapeJson(serialNumber)).Append("\",\"users\":[");

                if (users != null)
                {
                    for (int i = 0; i < users.Count; i++)
                    {
                        var u = users[i];
                        if (i > 0) sb.Append(",");
                        sb.Append("{")
                          .Append("\"biometricId\":\"").Append(EscapeJson(u.BiometricId)).Append("\",")
                          .Append("\"name\":\"").Append(EscapeJson(u.Name)).Append("\",")
                          .Append("\"cardNumber\":\"").Append(EscapeJson(u.CardNumber)).Append("\",")
                          .Append("\"fingerprintCount\":").Append(u.FingerprintCount).Append(",")
                          .Append("\"hasFace\":").Append(u.HasFace ? "true" : "false").Append(",")
                          .Append("\"hasCard\":").Append(u.HasCard ? "true" : "false").Append(",")
                          .Append("\"hasPassword\":").Append(u.HasPassword ? "true" : "false").Append(",")
                          .Append("\"privilege\":\"").Append(EscapeJson(u.Privilege)).Append("\",")
                          .Append("\"enabled\":").Append(u.Enabled ? "true" : "false")
                          .Append("}");
                    }
                }

                sb.Append("],\"logs\":[");

                if (logs != null)
                {
                    for (int i = 0; i < logs.Count; i++)
                    {
                        var l = logs[i];
                        if (i > 0) sb.Append(",");
                        sb.Append("{")
                          .Append("\"employeeCode\":\"").Append(EscapeJson(l.EmployeeCode)).Append("\",")
                          .Append("\"punchTime\":\"").Append(l.PunchTime.ToString("yyyy-MM-ddTHH:mm:ss+05:30")).Append("\",")
                          .Append("\"verificationMode\":\"").Append(EscapeJson(l.VerificationMode)).Append("\",")
                          .Append("\"punchType\":\"").Append(EscapeJson(l.PunchType)).Append("\"")
                          .Append("}");
                    }
                }

                sb.Append("]}");

                byte[] payload = Encoding.UTF8.GetBytes(sb.ToString());

                var request = (HttpWebRequest)WebRequest.Create(target);
                request.Method = "POST";
                request.ContentType = "application/json";
                request.Timeout = 60000;
                request.ReadWriteTimeout = 60000;
                request.ContentLength = payload.Length;

                using (var reqStream = request.GetRequestStream())
                {
                    reqStream.Write(payload, 0, payload.Length);
                }

                using (var response = (HttpWebResponse)request.GetResponse())
                using (var reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
                {
                    responseBody = reader.ReadToEnd();
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch (WebException wex)
            {
                string serverMsg = "";
                try
                {
                    if (wex.Response != null)
                    {
                        using (var r = new StreamReader(wex.Response.GetResponseStream(), Encoding.UTF8))
                            serverMsg = "\nServer Response: " + r.ReadToEnd();
                    }
                }
                catch { }
                error = "Failed to push data to Master HRMS: " + wex.Message + serverMsg;
                return false;
            }
            catch (Exception ex)
            {
                error = "Sync push failed: " + ex.Message;
                return false;
            }
        }
    }
}
