const fs = require('fs');
let content = fs.readFileSync('CMS/src/app/(workspace)/hr/employees/[id]/page.tsx', 'utf8');

const target1 = `                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAwardModalOpen(true)}
                        className="h-7 text-xs gap-1.5 font-medium"
                      >
                        <Plus className="size-3.5 text-primary" />
                        Award Employee
                      </Button>`.replace(/\r?\n/g, '\r\n');

const replacement1 = `                      <div className="flex items-center gap-2">
                        <Link
                          to="/hr/awards"
                          className="text-xs text-primary hover:underline font-medium flex items-center gap-1 mr-1"
                        >
                          Nomination Queue
                        </Link>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsAwardModalOpen(true)}
                          className="h-7 text-xs gap-1.5 font-medium"
                        >
                          <Plus className="size-3.5 text-primary" />
                          Award Employee
                        </Button>
                      </div>`.replace(/\r?\n/g, '\r\n');

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log('Replaced header action in CMS successfully');
} else {
  console.log('Target 1 not found');
}

const target2 = `                                  {award.certificateNo && (
                                    <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4">
                                      {award.certificateNo}
                                    </Badge>
                                  )}`.replace(/\r?\n/g, '\r\n');

const replacement2 = `                                  {award.certificateNo && (
                                    <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4">
                                      {award.certificateNo}
                                    </Badge>
                                  )}
                                  {award.nominationId && (
                                    <Badge variant="secondary" className="text-[9px] font-sans px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                      <CheckCircle2 className="size-2.5" /> Approved Nomination
                                    </Badge>
                                  )}`.replace(/\r?\n/g, '\r\n');

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log('Replaced badge in CMS successfully');
} else {
  console.log('Target 2 not found');
}

fs.writeFileSync('CMS/src/app/(workspace)/hr/employees/[id]/page.tsx', content, 'utf8');

