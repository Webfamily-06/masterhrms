using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;

namespace MasterHrmsDeviceManager
{
    public class SyncUsersLogsForm : Form
    {
        private readonly ZkDeviceClient _client;
        private readonly string _serialNumber;

        private List<HardwareUserRecord> _users = new List<HardwareUserRecord>();
        private List<AttendanceLogRecord> _logs = new List<AttendanceLogRecord>();

        private static readonly Color ColorPrimary = Color.FromArgb(13, 110, 253);
        private static readonly Color ColorSlateDark = Color.FromArgb(15, 23, 42);
        private static readonly Color ColorSuccess = Color.FromArgb(22, 163, 74);
        private static readonly Color ColorBg = Color.FromArgb(248, 250, 252);

        private TextBox _txtServerUrl;
        private Label _lblSummary;
        private DataGridView _gridUsers;
        private DataGridView _gridLogs;
        private Button _btnPush;

        public SyncUsersLogsForm(ZkDeviceClient client, string serialNumber)
        {
            _client = client;
            _serialNumber = serialNumber ?? string.Empty;

            Text = "Master HRMS — Pull Enrolled Users, Auth Modes & Attendance Logs";
            Size = new Size(920, 640);
            MinimumSize = new Size(880, 580);
            StartPosition = FormStartPosition.CenterParent;
            BackColor = ColorBg;
            Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);

            BuildLayout();
        }

        private void BuildLayout()
        {
            // Top Toolbar
            var top = new Panel
            {
                Dock = DockStyle.Top,
                Height = 112,
                BackColor = Color.White,
                Padding = new Padding(16, 12, 16, 10)
            };
            Controls.Add(top);

            top.Controls.Add(new Label
            {
                Text = "Master HRMS Server URL (e.g. https://api.masterhrms.com or http://localhost:5000):",
                Location = new Point(16, 10),
                AutoSize = true,
                ForeColor = Color.FromArgb(100, 116, 139),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular)
            });

            _txtServerUrl = new TextBox
            {
                Location = new Point(16, 30),
                Size = new Size(420, 26),
                Text = MasterHrmsApiClient.DefaultServerBaseUrl
            };
            top.Controls.Add(_txtServerUrl);

            var lblSn = new Label
            {
                Text = "Device SN: " + (string.IsNullOrEmpty(_serialNumber) ? "(Not Read)" : _serialNumber),
                Location = new Point(450, 34),
                AutoSize = true,
                Font = new Font("Consolas", 9.5F, FontStyle.Bold),
                ForeColor = ColorSlateDark
            };
            top.Controls.Add(lblSn);

            var btnPullUsers = MakeBtn("1. Pull Users & Auth Modes", ColorPrimary, Color.White, 16, 68, 210, 32);
            btnPullUsers.Click += OnPullUsersClick;
            top.Controls.Add(btnPullUsers);

            var btnPullLogs = MakeBtn("2. Pull Attendance Logs", ColorSlateDark, Color.White, 236, 68, 195, 32);
            btnPullLogs.Click += OnPullLogsClick;
            top.Controls.Add(btnPullLogs);

            _btnPush = MakeBtn("3. Push Users & Logs to Master HRMS", ColorSuccess, Color.White, 441, 68, 280, 32);
            _btnPush.Click += OnPushToServerClick;
            top.Controls.Add(_btnPush);

            // Tabs for Users & Logs Grids
            var tabs = new TabControl
            {
                Dock = DockStyle.Fill,
                Padding = new Point(12, 6)
            };

            var tabUsers = new TabPage("Enrolled Hardware Users & Auth Modes");
            _gridUsers = CreateGrid();
            _gridUsers.Columns.Add("BiometricId", "User ID / PIN");
            _gridUsers.Columns.Add("Name", "Enrolled Name");
            _gridUsers.Columns.Add("AuthModes", "Auth Modes (FP / Face / Card / PIN)");
            _gridUsers.Columns.Add("CardNumber", "RFID Card No");
            _gridUsers.Columns.Add("Privilege", "Privilege");
            _gridUsers.Columns.Add("Enabled", "Status");
            tabUsers.Controls.Add(_gridUsers);
            tabs.TabPages.Add(tabUsers);

            var tabLogs = new TabPage("Downloaded Attendance Logs");
            _gridLogs = CreateGrid();
            _gridLogs.Columns.Add("EmployeeCode", "User ID / PIN");
            _gridLogs.Columns.Add("PunchTime", "Punch Timestamp");
            _gridLogs.Columns.Add("VerificationMode", "Verify Mode");
            _gridLogs.Columns.Add("PunchType", "Punch Type");
            tabLogs.Controls.Add(_gridLogs);
            tabs.TabPages.Add(tabLogs);

            Controls.Add(tabs);
            tabs.BringToFront();

            // Footer
            var footer = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 32,
                BackColor = Color.White,
                Padding = new Padding(16, 6, 16, 6)
            };
            _lblSummary = new Label
            {
                Text = "Click '1. Pull Users & Auth Modes' and '2. Pull Attendance Logs', then click '3. Push Users & Logs to Master HRMS'.",
                AutoSize = true,
                Location = new Point(16, 7),
                ForeColor = Color.FromArgb(71, 85, 105)
            };
            footer.Controls.Add(_lblSummary);
            Controls.Add(footer);
        }

        private DataGridView CreateGrid()
        {
            return new DataGridView
            {
                Dock = DockStyle.Fill,
                ReadOnly = true,
                AllowUserToAddRows = false,
                AllowUserToDeleteRows = false,
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                BackgroundColor = Color.White,
                BorderStyle = BorderStyle.None,
                RowHeadersVisible = false,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect
            };
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

        private void OnPullUsersClick(object sender, EventArgs e)
        {
            if (!_client.IsConnected)
            {
                MessageBox.Show("Connect to the biometric device in the main window first.", "Not Connected", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            Cursor = Cursors.WaitCursor;
            _lblSummary.Text = "Reading enrolled users, fingerprints, face templates, and RFID cards from device memory...";
            Application.DoEvents();
            try
            {
                string err;
                _users = _client.PullEnrolledUsers(out err);
                if (!string.IsNullOrEmpty(err))
                {
                    MessageBox.Show(err, "Pull Users Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                _gridUsers.Rows.Clear();
                foreach (var u in _users)
                {
                    _gridUsers.Rows.Add(u.BiometricId, u.Name, u.AuthModesSummary, u.CardNumber, u.Privilege, u.Enabled ? "Active" : "Disabled");
                }
                _lblSummary.Text = string.Format("Pulled {0} enrolled users from device. Ready to push to Master HRMS.", _users.Count);
            }
            finally
            {
                Cursor = Cursors.Default;
            }
        }

        private void OnPullLogsClick(object sender, EventArgs e)
        {
            if (!_client.IsConnected)
            {
                MessageBox.Show("Connect to the biometric device in the main window first.", "Not Connected", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            Cursor = Cursors.WaitCursor;
            _lblSummary.Text = "Downloading attendance punch logs from biometric terminal...";
            Application.DoEvents();
            try
            {
                string err;
                _logs = _client.PullAttendanceLogs(out err);
                if (!string.IsNullOrEmpty(err))
                {
                    MessageBox.Show(err, "Pull Logs Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                _gridLogs.Rows.Clear();
                // Show latest 500 in grid for speed; all logs are pushed
                int startIdx = Math.Max(0, _logs.Count - 500);
                for (int i = _logs.Count - 1; i >= startIdx; i--)
                {
                    var l = _logs[i];
                    _gridLogs.Rows.Add(l.EmployeeCode, l.PunchTime.ToString("yyyy-MM-dd HH:mm:ss"), l.VerificationMode, l.PunchType);
                }
                _lblSummary.Text = string.Format("Downloaded {0} attendance logs from device (showing latest {1}).", _logs.Count, Math.Min(500, _logs.Count));
            }
            finally
            {
                Cursor = Cursors.Default;
            }
        }

        private void OnPushToServerClick(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_serialNumber))
            {
                MessageBox.Show("Device Serial Number is empty. Click 'Get Comm Info' on the main screen first.", "Missing Serial Number", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            if (_users.Count == 0 && _logs.Count == 0)
            {
                MessageBox.Show("Please pull Users and/or Attendance Logs from the device first.", "Nothing to Push", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }

            Cursor = Cursors.WaitCursor;
            _lblSummary.Text = string.Format("Pushing {0} users and {1} logs to Master HRMS...", _users.Count, _logs.Count);
            Application.DoEvents();
            try
            {
                string body, err;
                if (MasterHrmsApiClient.PushSyncBundle(_txtServerUrl.Text, _serialNumber, _users, _logs, out body, out err))
                {
                    _lblSummary.Text = "Sync complete! " + body;
                    MessageBox.Show(
                        "Successfully pushed hardware users, auth modes, and attendance logs to Master HRMS!\n\n" +
                        "Open /tenant/biometric-sync → Employee Mapping to link or register unmatched users.\n\nServer Response:\n" + body,
                        "Master HRMS Sync Complete",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }
                else
                {
                    _lblSummary.Text = "Push failed.";
                    MessageBox.Show(err, "Push to Master HRMS Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            finally
            {
                Cursor = Cursors.Default;
            }
        }
    }
}
