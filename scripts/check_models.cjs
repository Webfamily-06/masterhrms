const fs = require('fs');
const prismaSchema = fs.readFileSync('server/prisma/schema.prisma', 'utf8');

function checkModel(name) {
  const re = new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`, 'm');
  const match = prismaSchema.match(re);
  if (match) {
    console.log(`=== MODEL ${name} ===`);
    const lines = match[0].split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//') && !l.startsWith('@@') && !l.startsWith('model') && l !== '}');
    console.log(lines.map(l => l.split(/\s+/)[0]).join(', '));
  } else {
    console.log(`Model ${name} NOT FOUND`);
  }
}

['Employee', 'Asset', 'PromotionRecord', 'Transfer', 'DisciplinaryWarning', 'EmployeeExit', 'Attendance', 'LeaveRequest', 'Payslip', 'TrainingTask', 'CourseEnrollment'].forEach(checkModel);

