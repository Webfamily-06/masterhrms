using System;
using System.Drawing;
using System.Windows.Forms;

namespace MasterHrmsDeviceManager
{
    public class ExtrasForm : Form
    {
        private readonly ZkDeviceClient _client;

        private static readonly Color ColorPrimary = Color.FromArgb(13, 110, 253);
        private static readonly Color ColorSlateDark = Color.FromArgb(15, 23, 42);
        private static readonly Color ColorSuccess = Color.FromArgb(22, 163, 74);
        private static readonly Color ColorBg = Color.FromArgb(248, 250, 252);

        private TextBox _txtServerUrl;
        private TextBox _txtParamKey;
        private TextBox _txtParamValue;
        private TextBox _txtOutput;

        public ExtrasForm(ZkDeviceClient client)
        {
            _client = client;
            Text = "Master HRMS — Diagnostics, Clock Sync & Raw Parameters";
            Size = new Size(760, 560);
            MinimumSize = new Size(740, 540);
            StartPosition = FormStartPosition.CenterParent;
            BackColor = ColorBg;
            Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);

            BuildLayout();
        }

        private void BuildLayout()
        {
            // ── Top Actions Bar: Device Info, Time Sync, Firewall Test ───────
            var grpQuick = new GroupBox
            {
                Text = "  Device Diagnostics, Clock Sync & Master HRMS Firewall Check  ",
                Location = new Point(16, 12),
                Size = new Size(712, 134),
                BackColor = Color.White,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold)
            };
            Controls.Add(grpQuick);

            var lblSrv = new Label
            {
                Text = "Master HRMS API Server URL:",
                Location = new Point(16, 32),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(100, 116, 139)
            };
            grpQuick.Controls.Add(lblSrv);

            _txtServerUrl = new TextBox
            {
                Location = new Point(16, 52),
                Size = new Size(496, 26),
                Text = MasterHrmsApiClient.DefaultServerBaseUrl,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Regular)
            };
            grpQuick.Controls.Add(_txtServerUrl);

            var btnTestServer = MakeBtn("Test Server / Firewall", ColorPrimary, Color.White, 520, 50, 174, 30);
            btnTestServer.Click += OnTestServerClick;
            grpQuick.Controls.Add(btnTestServer);

            var btnDevInfo = MakeBtn("Get Device Info", ColorSlateDark, Color.White, 16, 90, 162, 30);
            btnDevInfo.Click += OnGetDeviceInfoClick;
            grpQuick.Controls.Add(btnDevInfo);

            var btnGetTime = MakeBtn("Get Device Time", ColorSlateDark, Color.White, 188, 90, 162, 30);
            btnGetTime.Click += OnGetDeviceTimeClick;
            grpQuick.Controls.Add(btnGetTime);

            var btnSetTime = MakeBtn("Sync Device Time", ColorSuccess, Color.White, 360, 90, 162, 30);
            btnSetTime.Click += OnSetDeviceTimeClick;
            grpQuick.Controls.Add(btnSetTime);

            var btnClear = MakeBtn("Clear Output", Color.FromArgb(100, 116, 139), Color.White, 532, 90, 162, 30);
            btnClear.Click += (s, e) => _txtOutput.Clear();
            grpQuick.Controls.Add(btnClear);

            // ── Raw System Option Console (GetSysOption / SetSysOption) ──────
            var grpParams = new GroupBox
            {
                Text = "  Raw ZKTeco System Option Command (GetSysOption / SetSysOption)  ",
                Location = new Point(16, 156),
                Size = new Size(712, 96),
                BackColor = Color.White,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold)
            };
            Controls.Add(grpParams);

            grpParams.Controls.Add(new Label
            {
                Text = "Option Key (e.g., ICLOCKSVRURL, IclockSvrPort, ~SerialNumber, PushTableDesc)",
                Location = new Point(16, 28),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(100, 116, 139)
            });

            _txtParamKey = new TextBox
            {
                Location = new Point(16, 48),
                Size = new Size(240, 26),
                Text = "ICLOCKSVRURL",
                Font = new Font("Consolas", 9.5F, FontStyle.Regular)
            };
            grpParams.Controls.Add(_txtParamKey);

            grpParams.Controls.Add(new Label
            {
                Text = "Value (for Set Command)",
                Location = new Point(268, 28),
                AutoSize = true,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                ForeColor = Color.FromArgb(100, 116, 139)
            });

            _txtParamValue = new TextBox
            {
                Location = new Point(268, 48),
                Size = new Size(210, 26),
                Font = new Font("Consolas", 9.5F, FontStyle.Regular)
            };
            grpParams.Controls.Add(_txtParamValue);

            var btnGetParam = MakeBtn("Get Param", ColorPrimary, Color.White, 488, 46, 100, 30);
            btnGetParam.Click += OnGetParamClick;
            grpParams.Controls.Add(btnGetParam);

            var btnSetParam = MakeBtn("Set Param", ColorSuccess, Color.White, 594, 46, 100, 30);
            btnSetParam.Click += OnSetParamClick;
            grpParams.Controls.Add(btnSetParam);

            // ── Output Console ───────────────────────────────────────────────
            _txtOutput = new TextBox
            {
                Location = new Point(16, 264),
                Size = new Size(712, 240),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Both,
                BackColor = ColorSlateDark,
                ForeColor = Color.FromArgb(226, 232, 240),
                Font = new Font("Consolas", 9.5F, FontStyle.Regular),
                Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
            };
            Controls.Add(_txtOutput);

            AppendLog("Master HRMS Diagnostics Console ready." + (_client.IsConnected
                ? " Connected to " + _client.ConnectedIp + ":" + _client.ConnectedPort
                : " (No device connected — you can still test Master HRMS server/firewall connectivity.)"));
        }

        private Button MakeBtn(string text, Color bg, Color fg, int x, int y, int w, int h)
        {
            var btn = new Button
            {
                Text = text,
                Location = new Point(x, y),
                Size = new Size(w, h),
                BackColor = bg,
                ForeColor = fg,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
                Font = new Font("Segoe UI", 9F, FontStyle.Bold)
            };
            btn.FlatAppearance.BorderSize = 0;
            return btn;
        }

        private void AppendLog(string text)
        {
            _txtOutput.AppendText(string.Format("[{0}] {1}{2}{2}", DateTime.Now.ToString("HH:mm:ss"), text, Environment.NewLine));
        }

        private void OnTestServerClick(object sender, EventArgs e)
        {
            Cursor = Cursors.WaitCursor;
            try
            {
                string body, err;
                if (MasterHrmsApiClient.TestServerConnectivity(_txtServerUrl.Text, out body, out err))
                {
                    AppendLog("Command Executed Successfully\r\nMaster HRMS Cloud Server Reachable!\r\nResponse: " + body);
                }
                else
                {
                    AppendLog("ERROR: " + err);
                    MessageBox.Show(err, "Server Connectivity Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            finally
            {
                Cursor = Cursors.Default;
            }
        }

        private void OnGetDeviceInfoClick(object sender, EventArgs e)
        {
            if (!_client.IsConnected)
            {
                MessageBox.Show("Connect to a biometric device in the main window first.", "Not Connected", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            var info = _client.ReadHardwareInfo();
            AppendLog(
                "Command Executed Successfully\r\n" +
                "  Serial Number      : " + info.SerialNumber + "\r\n" +
                "  Firmware Version   : " + info.FirmwareVersion + "\r\n" +
                "  Device MAC Address : " + info.MacAddress + "\r\n" +
                "  Push Table Options : " + info.PushTableOptions + "\r\n" +
                "  Suffix Desc Options: " + info.SuffixDescOptions
            );
        }

        private void OnGetDeviceTimeClick(object sender, EventArgs e)
        {
            DateTime dt;
            string err;
            if (_client.GetDeviceTime(out dt, out err))
            {
                AppendLog("Command Executed Successfully\r\n  Device Time : " + dt.ToString("dd MMM yyyy HH:mm:ss"));
            }
            else
            {
                AppendLog("ERROR: " + err);
            }
        }

        private void OnSetDeviceTimeClick(object sender, EventArgs e)
        {
            string err;
            if (_client.SyncDeviceTimeToPc(out err))
            {
                AppendLog("Updated device time successfully to PC clock (" + DateTime.Now.ToString("dd MMM yyyy HH:mm:ss") + ").");
            }
            else
            {
                AppendLog("ERROR: " + err);
            }
        }

        private void OnGetParamClick(object sender, EventArgs e)
        {
            if (!_client.IsConnected)
            {
                MessageBox.Show("Connect to a biometric device first.", "Not Connected", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            string key = _txtParamKey.Text.Trim();
            if (string.IsNullOrEmpty(key))
            {
                MessageBox.Show("Please enter an option key.", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            string val = _client.GetSysOption(key);
            AppendLog("Command Executed Successfully\r\n  " + key + " = " + val);
        }

        private void OnSetParamClick(object sender, EventArgs e)
        {
            if (!_client.IsConnected)
            {
                MessageBox.Show("Connect to a biometric device first.", "Not Connected", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            string key = _txtParamKey.Text.Trim();
            if (string.IsNullOrEmpty(key))
            {
                MessageBox.Show("Please check Set command: Option key is required.", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            string err;
            if (_client.SetSysOption(key, _txtParamValue.Text.Trim(), out err))
            {
                AppendLog("Params Set Successfully: " + key + " = " + _txtParamValue.Text.Trim());
            }
            else
            {
                AppendLog("ERROR: " + err);
            }
        }
    }
}
