const fs = require('fs');

let s = fs.readFileSync('CMS/src/app/(workspace)/hr/employees/[id]/page.tsx', 'utf8');

const target = `                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAwardToDelete(award)}
                              className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                              title="Revoke Award"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>`.replace(/\r?\n/g, '\r\n');

const replacement = `                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    let downloadUrl = award.certificateUrl;
                                    if (!downloadUrl && award.id) {
                                      toast.info("Generating verified vector certificate...");
                                      const genRes = await api.post(\`/api/awards/\${award.id}/certificate/generate\`);
                                      downloadUrl = \`/api/awards/certificates/\${genRes.data?.data?.id}/download\`;
                                    }
                                    if (downloadUrl) {
                                      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
                                      const res = await fetch(downloadUrl, {
                                        headers: token ? { Authorization: \`Bearer \${token}\` } : {},
                                      });
                                      if (res.ok) {
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = \`certificate-\${award.certificateNo || award.id}.pdf\`;
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                        window.URL.revokeObjectURL(url);
                                        toast.success("Certificate downloaded.");
                                        return;
                                      }
                                    }
                                    throw new Error("Unable to download certificate.");
                                  } catch (e: any) {
                                    toast.error(e.message || "Failed to download certificate.");
                                  }
                                }}
                                className="h-7 text-[11px] gap-1 px-2 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title="Download Official Vector PDF Certificate"
                              >
                                <Download className="size-3" />
                                <span>PDF</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAwardToDelete(award)}
                                className="size-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Revoke Award"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>`.replace(/\r?\n/g, '\r\n');

if (s.includes(target)) {
  s = s.replace(target, replacement);
  fs.writeFileSync('CMS/src/app/(workspace)/hr/employees/[id]/page.tsx', s, 'utf8');
  console.log('Successfully updated CMS employee profile with download certificate button!');
} else {
  console.log('Target not found in CMS employee profile');
}

