const fs = require('fs');

let service = fs.readFileSync('server/src/services/award-certificate.service.ts', 'utf8');

const oldLookup = `    const cert = await db.employeeAwardCertificate.findFirst({
      where: { verificationCode: verificationCode.trim() },
    });`;

const newLookup = `    const trimmed = verificationCode.trim();
    const cert = await db.employeeAwardCertificate.findFirst({
      where: {
        OR: [
          { verificationCode: trimmed },
          { certificateNumber: trimmed }
        ]
      },
    });`;

if (service.includes(oldLookup)) {
  service = service.replace(oldLookup, newLookup);
  fs.writeFileSync('server/src/services/award-certificate.service.ts', service, 'utf8');
  console.log('Successfully updated verifyPublicly to support verificationCode AND certificateNumber');
} else {
  const oldCRLF = oldLookup.replace(/\n/g, '\r\n');
  const newCRLF = newLookup.replace(/\n/g, '\r\n');
  if (service.includes(oldCRLF)) {
    service = service.replace(oldCRLF, newCRLF);
    fs.writeFileSync('server/src/services/award-certificate.service.ts', service, 'utf8');
    console.log('Successfully updated verifyPublicly (CRLF) to support verificationCode AND certificateNumber');
  } else {
    console.error('Could not match oldLookup in award-certificate.service.ts');
  }
}

