const fs = require('fs');
const file = 'src/components/navigation/portal-sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '  return (\r\n    {mobileOpen && (',
  '  return (\r\n    <>\r\n      {mobileOpen && ('
);
code = code.replace(
  '  return (\n    {mobileOpen && (',
  '  return (\n    <>\n      {mobileOpen && ('
);

code = code.replace(
  '      </SidebarFooter>\r\n    </Sidebar>\r\n  );',
  '      </SidebarFooter>\r\n    </Sidebar>\r\n    </>\r\n  );'
);
code = code.replace(
  '      </SidebarFooter>\n    </Sidebar>\n  );',
  '      </SidebarFooter>\n    </Sidebar>\n    </>\n  );'
);

fs.writeFileSync(file, code, 'utf8');
console.log('Fixed JSX fragment in PortalSidebar');

