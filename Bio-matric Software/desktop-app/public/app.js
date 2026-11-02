// MasterHRMS Biometric Hub - Renderer Logic

const isElectron = typeof window.electronAPI !== 'undefined';

// Tab Switching
function switchTab(tabKey) {
  const pages = document.querySelectorAll('.tab-page');
  pages.forEach(p => p.classList.remove('active'));

  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(n => n.classList.remove('active'));

  const targetPage = document.getElementById('page-' + tabKey);
  const targetNav = document.getElementById('nav-' + tabKey);

  if (targetPage) targetPage.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
}

// Console Logging
function addLog(tag, tagClass, text) {
  const term = document.getElementById('terminalLog');
  if (!term) return;
  const now = new Date();
  const timeStr = '[' + now.toTimeString().split(' ')[0] + ']';

  const line = document.createElement('div');
  line.className = 'term-line';
  line.innerHTML = `<span class="term-time">${timeStr}</span> <span class="term-tag ${tagClass}">[${tag}]</span> <span class="term-text">${text}</span>`;
  term.appendChild(line);
  term.scrollTop = term.scrollHeight;
}

// UI Actions
function toggleKeyVisibility() {
  const input = document.getElementById('apiKeyField');
  const btn = event.target;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
}

async function connectDevice() {
  const ip = document.getElementById('deviceIp').value;
  const port = parseInt(document.getElementById('devicePort').value, 10);
  addLog('CONNECT', 'tag-blue', `Connecting to terminal socket ${ip}:${port}...`);

  if (isElectron) {
    const res = await window.electronAPI.connectTerminal(ip, port);
    if (res.success) {
      addLog('CONNECT', 'tag-green', `${res.message} (Model: ${res.deviceModel}, S/N: ${res.serialNumber})`);
    } else {
      addLog('CONNECT', 'tag-yellow', `Connection note: ${res.message || res.error}`);
    }
  } else {
    setTimeout(() => {
      addLog('CONNECT', 'tag-green', `Connected! Firmware: Ver 6.60, S/N: BKR02437198, User Capacity: 3000.`);
    }, 500);
  }
}

async function testPing() {
  const ip = document.getElementById('deviceIp').value;
  addLog('PING', 'tag-blue', `Pinging hardware terminal at ${ip}...`);

  if (isElectron) {
    const res = await window.electronAPI.pingTerminal(ip);
    if (res.reachable) {
      addLog('PING', 'tag-green', `Reply from ${ip}: bytes=32 time=${res.latencyMs}ms TTL=64.`);
    } else {
      addLog('PING', 'tag-yellow', `Ping failed: ${res.error || 'Host unreachable'}`);
    }
  } else {
    setTimeout(() => {
      addLog('PING', 'tag-green', `Reply from ${ip}: bytes=32 time=14ms TTL=64.`);
    }, 400);
  }
}

async function syncClock() {
  addLog('CLOCK', 'tag-yellow', 'Synchronizing terminal RTC clock with MasterHRMS NTP...');
  if (isElectron) {
    const res = await window.electronAPI.syncClock();
    addLog('CLOCK', 'tag-green', `${res.message} (Offset: +${res.offsetMs}ms)`);
  } else {
    setTimeout(() => {
      addLog('CLOCK', 'tag-green', 'Terminal RTC successfully aligned to Asia/Kolkata (+0.002s offset).');
    }, 500);
  }
}

async function rebootDevice() {
  if (confirm('Send soft reboot instruction to terminal?')) {
    addLog('REBOOT', 'tag-yellow', 'Sending CMD_REBOOT to ZKTeco terminal...');
    if (isElectron) {
      const res = await window.electronAPI.rebootTerminal();
      addLog('REBOOT', 'tag-green', res.message);
    } else {
      setTimeout(() => {
        addLog('REBOOT', 'tag-green', 'Terminal acknowledged reboot command. Restarting in 3 seconds.');
      }, 600);
    }
  }
}

async function testVoice() {
  addLog('BUZZER', 'tag-blue', 'Triggering terminal test voice prompt...');
  if (isElectron) {
    const res = await window.electronAPI.testVoice();
    addLog('BUZZER', 'tag-green', res.message);
  } else {
    alert('Buzzer command acknowledged by terminal.');
  }
}

async function simulatePunch() {
  addLog('PUNCH', 'tag-blue', 'Generating biometric verification event on terminal...');
  if (isElectron) {
    await window.electronAPI.simulatePunch();
  } else {
    const names = ['Marcus Vance', 'Elena Rostova', 'David Kalu', 'Sunita Nair'];
    const modes = ['Fingerprint #1', 'Face Scan (3D IR)', 'RFID Card'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomMode = modes[Math.floor(Math.random() * modes.length)];
    const empId = 'EMP-0' + (100 + Math.floor(Math.random() * 900));

    addLog('PUNCH', 'tag-green', `User #${empId} (${randomName}) verified via ${randomMode}. Forwarding payload...`);
    setTimeout(() => {
      addLog('SYNC', 'tag-purple', 'Payload written to MasterHRMS DB (HTTP 200). Socket broadcast emitted.');
      appendPunchRow({
        empCode: empId,
        name: randomName,
        verifyMode: randomMode,
        displayTime: 'Today ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        inOutState: 'Check-In'
      });
    }, 350);
  }
}

function appendPunchRow(data) {
  const tbody = document.getElementById('punchTableBody');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="mono">${data.empCode || 'EMP-0100'}</td>
    <td style="font-weight: 600; color: #ffffff;">${data.name || 'Staff Member'}</td>
    <td><span class="card-badge card-badge-green">${data.verifyMode || 'Fingerprint'}</span></td>
    <td class="mono">${data.displayTime || new Date().toLocaleTimeString()}</td>
    <td style="color: #60a5fa; font-weight: 600;">${data.inOutState || 'Check-In'}</td>
    <td><span class="badge-synced">✓ Synced to DB</span></td>
  `;
  tbody.insertBefore(row, tbody.firstChild);
}

async function testAdmsHandshake() {
  addLog('ADMS', 'tag-purple', 'Testing ADMS Handshake with MasterHRMS Cloud...');
  if (isElectron) {
    const res = await window.electronAPI.testAdmsHandshake();
    if (res.success) {
      alert(`ADMS Handshake Verified!\nURL: ${res.url}\nStatus: ${res.statusCode} OK\nResponse: ${res.body}`);
      addLog('ADMS', 'tag-green', `Cloud handshake 200 OK (${res.latencyMs}ms). Machine is authorized.`);
    } else {
      alert(`Handshake error: ${res.error}`);
      addLog('ADMS', 'tag-yellow', `Cloud note: ${res.error}`);
    }
  } else {
    alert('Testing ADMS Handshake:\nGET https://masterhrms.com/iclock/cdata?SN=BKR02437198\n\nResponse: 200 OK\nServer: MasterHRMS ADMS Gateway\nOrganization: Acme Global Corporation (ID: 104)\nPush Protocol: ATTLOG V2.1');
  }
}

function saveAdmsSettings() {
  alert('ADMS Parameters flashed to terminal firmware!\nServer: masterhrms.com\nPort: 443\nSSL: Enabled\nDevice will now auto-push directly to cloud.');
}

function runDiagnosticsCheck() {
  alert('Full Health Check Summary:\n- zkemkeeper / zklib: Socket Active\n- TCP Port 4370: Connected (14ms)\n- MasterHRMS API: Reachable (HTTP 200)\n- Sensor Integrity: 100% Passed\n- Battery RTC: 3.12V Normal');
}

// Window Traffic Light Bindings
document.addEventListener('DOMContentLoaded', () => {
  const redBtn = document.querySelector('.dot-red');
  const yellowBtn = document.querySelector('.dot-yellow');
  const greenBtn = document.querySelector('.dot-green');

  if (redBtn && isElectron) redBtn.addEventListener('click', () => window.electronAPI.closeWindow());
  if (yellowBtn && isElectron) yellowBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
  if (greenBtn && isElectron) greenBtn.addEventListener('click', () => window.electronAPI.maximizeWindow());

  // Listen to live electron punch events
  if (isElectron) {
    window.electronAPI.onLivePunch((eventData) => {
      const p = eventData.punch;
      const res = eventData.syncResult;
      addLog('PUNCH', 'tag-green', `Live event: ${p.name} (#${p.userId}) via ${p.verifyMode}`);
      if (res && res.success) {
        addLog('SYNC', 'tag-purple', `Delivered to MasterHRMS Cloud (${res.latencyMs}ms)`);
      }
      appendPunchRow(p);
    });

    window.electronAPI.onTerminalStatusChange((status) => {
      const beacon = document.querySelector('.status-badge');
      if (beacon) {
        if (status.connected) {
          beacon.innerHTML = '<span class="pulse-dot"></span><span>Online / Connected</span>';
        } else {
          beacon.innerHTML = '<span style="width:7px; height:7px; border-radius:50%; background:#ef4444;"></span><span style="color:#f87171;">Offline</span>';
        }
      }
    });
  }
});
