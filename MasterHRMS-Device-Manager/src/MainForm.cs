using System;
using System.Drawing;
using System.Windows.Forms;

namespace MasterHrmsDeviceManager
{
    public class MainForm : Form
    {
        private readonly ZkDeviceClient _client = new ZkDeviceClient();

        // Brand colors (Master HRMS Root Theme)
        private static readonly Color ColorPrimary = Color.FromArgb(13, 110, 253);     // #0d6efd
        private static readonly Color ColorSlateDark = Color.FromArgb(15, 23, 42);     // #0f172a
        private static readonly Color ColorSuccess = Color.FromArgb(22, 163, 74);      // #16a34a
        private static readonly Color ColorDanger = Color.FromArgb(225, 29, 72);       // #e11d48
        private static readonly Color ColorWarning = Color.FromArgb(245, 158, 11);     // #f59e0b
        private static readonly Color ColorBg = Color.FromArgb(248, 250, 252);         // #f8fafc
        private static readonly Color ColorBorder = Color.FromArgb(226, 232, 240);     // #e2e8f0
        private static readonly Color ColorMuted = Color.FromArgb(100, 116, 139);      // #64748b

        // Connection controls
        private TextBox _txtIp;
        private TextBox _txtPort;
        private Button _btnConnect;
        private Button _btnDisconnect;
        private Button _btnGetComm;
        private Button _btnRestart;
        private Button _btnExtras;
        private Label _lblStatusBadge;

        // Current Device Info (Read-only)
        private TextBox _txtCurSerial;
        private TextBox _txtCurSubnet;
        private TextBox _txtCurGateway;
        private TextBox _txtCurDns;
        private TextBox _txtCurAdmsPort;
        private TextBox _txtCurAdmsUrl;

        // Update Settings (Editable)
        private TextBox _txtNewSubnet;
        private TextBox _txtNewGateway;
        private TextBox _txtNewDns;
        private TextBox _txtNewAdmsPort;
        private TextBox _txtNewAdmsUrl;
        private Button _btnUpdate;

        // Status footer
        private Label _lblFooter;

        public MainForm()
        {
            Text = "Master HRMS — Biometric Device Manager";
            Size = new Size(880, 680);
            MinimumSize = new Size(860, 650);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = ColorBg;
            Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);

            BuildLayout();
            UpdateUiState();

            FormClosing += (s, e) => _client.Disconnect();
        }

        private void BuildLayout()
        {
            // ── Top Brand Header ─────────────────────────────────────────────
            var header = new Panel
            {
                Dock = DockStyle.Top,
                Height = 68,
                BackColor = ColorSlateDark,
                Padding = new Padding(20, 12, 20, 12)
            };

            var lblTitle = new Label
            {
                Text = "MASTER HRMS — BIOMETRIC DEVICE MANAGER",
                ForeColor = Color.White,
                Font = new Font("Segoe UI", 12.5F, FontStyle.Bold),
                AutoSize = true,
                Location = new Point(20, 12)
            };

            var lblSubtitle = new Label
            {
                Text = "ZKTeco / eSSL / Realtime ADMS Cloud Push Configurator & Diagnostics",
                ForeColor = Color.FromArgb(148, 163, 184),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular),
                AutoSize = true,
                Location = new Point(20, 38)
            };

            _lblStatusBadge = new Label
            {
                Text = "DISCONNECTED",
                ForeColor = Color.White,
                BackColor = Color.FromArgb(71, 85, 105),
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                TextAlign = ContentAlignment.MiddleCenter,
                Size = new Size(130, 28),
                Location = new Point(710, 20),
                Anchor = AnchorStyles.Top | AnchorStyles.Right
            };

            header.Controls.Add(lblTitle);
            header.Controls.Add(lblSubtitle);
            header.Controls.Add(_lblStatusBadge);
            Controls.Add(header);

            // ── Main Content Container ───────────────────────────────────────
            var content = new Panel
            {
                Dock = DockStyle.Fill,
                Padding = new Padding(20, 16, 20, 12),
                AutoScroll = true
            };
            Controls.Add(content);
            content.BringToFront();

            // ── Card 1: Connection & SDK Setup ───────────────────────────────
            var cardConn = CreateCard("1. Device Connection & SDK Registration", 16, 12, 825, 125);
            content.Controls.Add(cardConn);

            cardConn.Controls.Add(CreateFieldLabel("Device IP Address", 18, 36));
            _txtIp = new TextBox { Location = new Point(18, 56), Size = new Size(170, 26), Text = "192.168.1.201" };
            cardConn.Controls.Add(_txtIp);

            cardConn.Controls.Add(CreateFieldLabel("TCP Port", 200, 36));
            _txtPort = new TextBox { Location = new Point(200, 56), Size = new Size(76, 26), Text = "4370" };
            cardConn.Controls.Add(_txtPort);

            _btnConnect = CreateButton("Connect", ColorPrimary, Color.White, 290, 54, 98, 30);
            _btnConnect.Click += OnConnectClick;
            cardConn.Controls.Add(_btnConnect);

            _btnDisconnect = CreateButton("Disconnect", ColorDanger, Color.White, 396, 54, 102, 30);
            _btnDisconnect.Click += OnDisconnectClick;
            cardConn.Controls.Add(_btnDisconnect);

            _btnGetComm = CreateButton("Get Comm Info", ColorSlateDark, Color.White, 506, 54, 126, 30);
            _btnGetComm.Click += OnGetCommInfoClick;
            cardConn.Controls.Add(_btnGetComm);

            _btnExtras = CreateButton("Extras / Diagnostics", Color.FromArgb(2, 132, 199), Color.White, 640, 54, 166, 30);
            _btnExtras.Click += OnOpenExtrasClick;
            cardConn.Controls.Add(_btnExtras);

            // Second row inside Connection card: DLL registration + Restart
            var btnReg64 = CreateButton("Register 64-bit SDK DLLs", Color.White, ColorSlateDark, 18, 90, 180, 26);
            btnReg64.FlatAppearance.BorderColor = ColorBorder;
            btnReg64.FlatAppearance.BorderSize = 1;
            btnReg64.Click += (s, e) => RegisterDlls(true);
            cardConn.Controls.Add(btnReg64);

            var btnReg32 = CreateButton("Register 32-bit SDK DLLs", Color.White, ColorSlateDark, 206, 90, 180, 26);
            btnReg32.FlatAppearance.BorderColor = ColorBorder;
            btnReg32.FlatAppearance.BorderSize = 1;
            btnReg32.Click += (s, e) => RegisterDlls(false);
            cardConn.Controls.Add(btnReg32);

            var btnSyncUsersLogs = CreateButton("Pull Users, Modes & Logs", ColorSuccess, Color.White, 396, 90, 270, 26);
            btnSyncUsersLogs.Click += OnOpenSyncUsersLogsClick;
            cardConn.Controls.Add(btnSyncUsersLogs);

            _btnRestart = CreateButton("Restart Device", ColorWarning, Color.White, 676, 90, 130, 26);
            _btnRestart.Click += OnRestartClick;
            cardConn.Controls.Add(_btnRestart);

            // ── Card 2 (Left): Current Device Settings (Read-Only) ───────────
            var cardCurrent = CreateCard("2. Current Device Settings (Read from Hardware)", 16, 152, 402, 378);
            content.Controls.Add(cardCurrent);

            AddReadOnlyRow(cardCurrent, "Serial Number (SN)", 40, out _txtCurSerial, true);
            AddReadOnlyRow(cardCurrent, "Subnet Mask", 96, out _txtCurSubnet, false);
            AddReadOnlyRow(cardCurrent, "Default Gateway", 152, out _txtCurGateway, false);
            AddReadOnlyRow(cardCurrent, "DNS Server", 208, out _txtCurDns, false);
            AddReadOnlyRow(cardCurrent, "ADMS Cloud Server Port", 264, out _txtCurAdmsPort, false);
            AddReadOnlyRow(cardCurrent, "ADMS Cloud Push URL", 320, out _txtCurAdmsUrl, false);

            // ── Card 3 (Right): Update Settings to Master HRMS Cloud ─────────
            var cardUpdate = CreateCard("3. Configure Master HRMS ADMS Push", 434, 152, 407, 378);
            content.Controls.Add(cardUpdate);

            var btnPreset = CreateButton("Fill Master HRMS Cloud Preset", Color.FromArgb(239, 246, 255), ColorPrimary, 18, 36, 370, 28);
            btnPreset.FlatAppearance.BorderColor = ColorPrimary;
            btnPreset.FlatAppearance.BorderSize = 1;
            btnPreset.Click += OnFillPresetClick;
            cardUpdate.Controls.Add(btnPreset);

            AddEditableRow(cardUpdate, "Subnet Mask", 74, "255.255.255.0", out _txtNewSubnet);
            AddEditableRow(cardUpdate, "Default Gateway", 126, "192.168.1.1", out _txtNewGateway);
            AddEditableRow(cardUpdate, "DNS Server", 178, "8.8.8.8", out _txtNewDns);
            AddEditableRow(cardUpdate, "ADMS Server Port (443 for HTTPS, 80 for HTTP)", 230, MasterHrmsApiClient.DefaultAdmsPort, out _txtNewAdmsPort);
            AddEditableRow(cardUpdate, "Master HRMS ADMS Push URL", 282, MasterHrmsApiClient.DefaultAdmsUrl, out _txtNewAdmsUrl);

            _btnUpdate = CreateButton("Update Device Settings", ColorSuccess, Color.White, 18, 336, 370, 32);
            _btnUpdate.Click += OnUpdateSettingsClick;
            cardUpdate.Controls.Add(_btnUpdate);

            // ── Footer Status Strip ──────────────────────────────────────────
            var footer = new Panel
            {
                Dock = DockStyle.Bottom,
                Height = 32,
                BackColor = Color.White,
                Padding = new Padding(16, 6, 16, 6)
            };
            footer.Paint += (s, e) => e.Graphics.DrawLine(new Pen(ColorBorder), 0, 0, footer.Width, 0);

            _lblFooter = new Label
            {
                Text = "Ready. Enter your biometric terminal LAN IP and click Connect.",
                ForeColor = ColorMuted,
                AutoSize = true,
                Location = new Point(16, 7)
            };
            footer.Controls.Add(_lblFooter);
            Controls.Add(footer);
        }

        private GroupBox CreateCard(string title, int x, int y, int w, int h)
        {
            return new GroupBox
            {
                Text = "  " + title + "  ",
                Location = new Point(x, y),
                Size = new Size(w, h),
                BackColor = Color.White,
                ForeColor = ColorSlateDark,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Bold)
            };
        }

        private Label CreateFieldLabel(string text, int x, int y)
        {
            return new Label
            {
                Text = text,
                Location = new Point(x, y),
                AutoSize = true,
                ForeColor = ColorMuted,
                Font = new Font("Segoe UI", 8.5F, FontStyle.Regular)
            };
        }

        private Button CreateButton(string text, Color bg, Color fg, int x, int y, int w, int h)
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

        private void AddReadOnlyRow(Control parent, string label, int y, out TextBox textBox, bool withCopy)
        {
            parent.Controls.Add(CreateFieldLabel(label, 18, y));
            int width = withCopy ? 290 : 364;
            textBox = new TextBox
            {
                Location = new Point(18, y + 18),
                Size = new Size(width, 26),
                ReadOnly = true,
                BackColor = ColorBg,
                Font = new Font("Consolas", 9.5F, FontStyle.Regular)
            };
            parent.Controls.Add(textBox);

            if (withCopy)
            {
                var tbRef = textBox;
                var btnCopy = CreateButton("Copy", Color.White, ColorPrimary, 314, y + 17, 68, 26);
                btnCopy.FlatAppearance.BorderColor = ColorBorder;
                btnCopy.FlatAppearance.BorderSize = 1;
                btnCopy.Click += (s, e) =>
                {
                    if (!string.IsNullOrWhiteSpace(tbRef.Text))
                    {
                        Clipboard.SetText(tbRef.Text);
                        SetFooter("Copied Serial Number to clipboard: " + tbRef.Text);
                    }
                };
                parent.Controls.Add(btnCopy);
            }
        }

        private void AddEditableRow(Control parent, string label, int y, string defaultValue, out TextBox textBox)
        {
            parent.Controls.Add(CreateFieldLabel(label, 18, y));
            textBox = new TextBox
            {
                Location = new Point(18, y + 18),
                Size = new Size(370, 26),
                Text = defaultValue,
                Font = new Font("Segoe UI", 9.5F, FontStyle.Regular)
            };
            parent.Controls.Add(textBox);
        }

        private void UpdateUiState()
        {
            bool connected = _client.IsConnected;
            _btnConnect.Enabled = !connected;
            _btnDisconnect.Enabled = connected;
            _btnGetComm.Enabled = connected;
            _btnRestart.Enabled = connected;
            _btnUpdate.Enabled = connected;

            _lblStatusBadge.Text = connected ? "CONNECTED" : "DISCONNECTED";
            _lblStatusBadge.BackColor = connected ? ColorSuccess : Color.FromArgb(71, 85, 105);
        }

        private void SetFooter(string message)
        {
            _lblFooter.Text = message;
        }

        private void OnConnectClick(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_txtIp.Text))
            {
                MessageBox.Show("Please enter the biometric device IP address.", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            int port;
            if (!int.TryParse(_txtPort.Text.Trim(), out port) || port <= 0 || port > 65535)
            {
                MessageBox.Show("Please enter a valid TCP port number (default: 4370).", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            SetFooter("Connecting to " + _txtIp.Text.Trim() + ":" + port + " ...");
            Cursor = Cursors.WaitCursor;
            try
            {
                string err;
                if (_client.Connect(_txtIp.Text.Trim(), port, out err))
                {
                    UpdateUiState();
                    ReadAndDisplayCommSettings();
                    SetFooter("Connected to device at " + _client.ConnectedIp + ":" + _client.ConnectedPort);
                }
                else
                {
                    MessageBox.Show(err, "Device Connection Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    SetFooter("Connection failed.");
                }
            }
            finally
            {
                Cursor = Cursors.Default;
            }
        }

        private void OnDisconnectClick(object sender, EventArgs e)
        {
            _client.Disconnect();
            UpdateUiState();
            SetFooter("Disconnected from device.");
        }

        private void OnGetCommInfoClick(object sender, EventArgs e)
        {
            ReadAndDisplayCommSettings();
        }

        private void ReadAndDisplayCommSettings()
        {
            if (!_client.IsConnected) return;
            var s = _client.ReadCommSettings();
            _txtCurSerial.Text = s.SerialNumber;
            _txtCurSubnet.Text = s.NetMask;
            _txtCurGateway.Text = s.Gateway;
            _txtCurDns.Text = s.Dns;
            _txtCurAdmsPort.Text = s.AdmsPort;
            _txtCurAdmsUrl.Text = s.AdmsUrl;

            // Pre-populate network fields if present on device
            if (!string.IsNullOrWhiteSpace(s.NetMask)) _txtNewSubnet.Text = s.NetMask;
            if (!string.IsNullOrWhiteSpace(s.Gateway)) _txtNewGateway.Text = s.Gateway;
            if (!string.IsNullOrWhiteSpace(s.Dns)) _txtNewDns.Text = s.Dns;

            SetFooter("Loaded device communication info (SN: " + s.SerialNumber + ").");
        }

        private void OnFillPresetClick(object sender, EventArgs e)
        {
            _txtNewAdmsUrl.Text = MasterHrmsApiClient.DefaultAdmsUrl;
            _txtNewAdmsPort.Text = MasterHrmsApiClient.DefaultAdmsPort;
            if (string.IsNullOrWhiteSpace(_txtNewDns.Text)) _txtNewDns.Text = "8.8.8.8";
            if (string.IsNullOrWhiteSpace(_txtNewSubnet.Text)) _txtNewSubnet.Text = "255.255.255.0";
            SetFooter("Filled Master HRMS Cloud ADMS preset URL and port.");
        }

        private void OnUpdateSettingsClick(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(_txtNewGateway.Text))
            {
                MessageBox.Show("Please enter the network Gateway IP address.", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            if (string.IsNullOrWhiteSpace(_txtNewDns.Text))
            {
                MessageBox.Show("Please enter the DNS IP address (e.g., 8.8.8.8).", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            if (string.IsNullOrWhiteSpace(_txtNewAdmsPort.Text))
            {
                MessageBox.Show("Please enter the ADMS Server Port (e.g., 443 or 80).", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            if (string.IsNullOrWhiteSpace(_txtNewAdmsUrl.Text))
            {
                MessageBox.Show("Please enter the Master HRMS ADMS Push URL.", "Validation Failed", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            string err;
            if (_client.UpdateCommSettings(
                _txtNewSubnet.Text,
                _txtNewGateway.Text,
                _txtNewDns.Text,
                _txtNewAdmsPort.Text,
                _txtNewAdmsUrl.Text,
                out err))
            {
                ReadAndDisplayCommSettings();
                SetFooter("Device settings updated successfully. Restart the device to apply ADMS push.");
                MessageBox.Show(
                    "Successfully updated device settings!\n\nClick 'Restart Device' so the terminal reconnects to Master HRMS ADMS Push.",
                    "Master HRMS Device Manager",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            else
            {
                MessageBox.Show(err, "Update Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnRestartClick(object sender, EventArgs e)
        {
            var confirm = MessageBox.Show(
                "Restart the connected biometric device now?",
                "Confirm Device Restart",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (confirm != DialogResult.Yes) return;

            string err;
            if (_client.RestartDevice(out err))
            {
                UpdateUiState();
                SetFooter("Device restarted successfully.");
                MessageBox.Show("Device restarted successfully.", "Master HRMS Device Manager", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                MessageBox.Show(err, "Restart Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void RegisterDlls(bool is64Bit)
        {
            string err;
            if (ZkDeviceClient.RegisterSdkDlls(is64Bit, out err))
            {
                SetFooter((is64Bit ? "64-bit" : "32-bit") + " ZKTeco SDK DLL registration completed.");
                MessageBox.Show("SDK DLLs registered successfully.", "DLL Registration", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                MessageBox.Show(err, "DLL Registration Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnOpenExtrasClick(object sender, EventArgs e)
        {
            using (var extras = new ExtrasForm(_client))
            {
                extras.ShowDialog(this);
            }
        }

        private void OnOpenSyncUsersLogsClick(object sender, EventArgs e)
        {
            using (var dlg = new SyncUsersLogsForm(_client, _txtCurSerial.Text.Trim()))
            {
                dlg.ShowDialog(this);
            }
        }
    }
}
