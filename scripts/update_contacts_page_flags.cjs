const fs = require('fs');

const filePath = 'CMS/src/app/(workspace)/contacts/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports if not present
if (!content.includes('CountrySelect')) {
  content = content.replace(
    'import { Input } from "@/components/ui/input";',
    'import { Input } from "@/components/ui/input";\nimport { CountrySelect } from "@/components/ui/country-select";\nimport { PhoneInput } from "@/components/ui/phone-input";\nimport { CountryFlag } from "@/components/ui/country-flag";'
  );
}

// 2. Replace Phone Number Input in modal
content = content.replace(
  /<div className="space-y-1">\s*<Label className="text-xs font-semibold">Phone Number<\/Label>\s*<Input\s*placeholder="e\.g\. \(163\) 2459 315"\s*value=\{form\.phone\}\s*onChange=\{\(e\) => setForm\(\{ \.\.\.form, phone: e\.target\.value \}\)\}\s*className="h-9 text-xs font-mono"\s*\/>\s*<\/div>/,
  `<div className="space-y-1">
              <Label className="text-xs font-semibold">Phone Number</Label>
              <PhoneInput
                placeholder="2459 315"
                value={form.phone}
                onChange={(val) => setForm({ ...form, phone: val })}
                defaultCountry="US"
              />
            </div>`
);

// 3. Replace Country Input in modal
content = content.replace(
  /<div className="space-y-1">\s*<Label className="text-xs font-semibold">Country<\/Label>\s*<Input\s*placeholder="e\.g\. Germany"\s*value=\{form\.country\}\s*onChange=\{\(e\) => setForm\(\{ \.\.\.form, country: e\.target\.value \}\)\}\s*className="h-9 text-xs"\s*\/>\s*<\/div>/,
  `<div className="space-y-1">
              <Label className="text-xs font-semibold">Country</Label>
              <CountrySelect
                value={form.country}
                onChange={(val) => setForm({ ...form, country: val })}
                placeholder="Select country"
              />
            </div>`
);

// 4. In contact table, add CountryFlag next to location
content = content.replace(
  /<TableCell className="text-xs">\s*<span className="flex items-center gap-1 text-muted-foreground">\s*<MapPin className="w-3 h-3 text-muted-foreground\/70" \/>\s*\{c\.location\}\s*<\/span>\s*<\/TableCell>/,
  `<TableCell className="text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          {c.country && <CountryFlag country={c.country} size="xs" />}
                          <MapPin className="w-3 h-3 text-muted-foreground/70" />
                          {c.location}
                        </span>
                      </TableCell>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated contacts/page.tsx with CountrySelect, PhoneInput, and CountryFlag!');
