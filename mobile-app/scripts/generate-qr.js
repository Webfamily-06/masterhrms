const QRCode = require('qrcode');
const os = require('os');
const fs = require('fs');
const path = require('path');

const interfaces = os.networkInterfaces();
let localIp = '127.0.0.1';

// Prioritize Wi-Fi or LAN subnet (192.168.* or 10.*)
for (const name of Object.keys(interfaces)) {
  for (const iface of interfaces[name]) {
    if (iface.family === 'IPv4' && !iface.internal) {
      if (iface.address.startsWith('192.168.') || iface.address.startsWith('10.')) {
        localIp = iface.address;
        break;
      }
    }
  }
}

const expoUrl = `exp://${localIp}:8081`;

console.log('\n======================================================');
console.log('       MASTERHRMS MOBILE — EXPO GO CONNECTION');
console.log(`       Target URL: ${expoUrl}`);
console.log('======================================================\n');

QRCode.toString(expoUrl, { type: 'terminal', small: true }, (err, str) => {
  if (err) {
    console.error('Failed to generate terminal QR code:', err);
    return;
  }
  console.log(str);

  const qrSvgPath = path.join(__dirname, '..', 'expo-qr.svg');
  const qrPngPath = path.join(__dirname, '..', 'expo-qr.png');
  QRCode.toString(expoUrl, { type: 'svg' }, (svgErr, svgStr) => {
    if (!svgErr) {
      fs.writeFileSync(qrSvgPath, svgStr);
      console.log(`\nSVG QR Code file written to: ${qrSvgPath}`);
    }
  });
  QRCode.toFile(qrPngPath, expoUrl, { width: 350 }, (pngErr) => {
    if (!pngErr) {
      console.log(`PNG QR Code file written to: ${qrPngPath}`);
    }
  });
});
