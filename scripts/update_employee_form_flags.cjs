const fs = require('fs');

const filePath = 'CMS/src/app/(workspace)/hr/employees/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports if not present
if (!content.includes('CountrySelect')) {
  content = content.replace(
    'import { COUNTRIES } from "@/lib/address/countries";',
    'import { COUNTRIES } from "@/lib/address/countries";\nimport { CountrySelect } from "@/components/ui/country-select";\nimport { PhoneInput } from "@/components/ui/phone-input";'
  );
}

// 2. Update Primary Phone input
content = content.replace(
  /<div className="space-y-1\.5">\s*<Label>Primary Phone<\/Label>\s*<Input\s*value=\{formData\.phone\}\s*onChange=\{\(e\) => updateField\("phone", e\.target\.value\)\}\s*placeholder="\+91 98765 43210"\s*\/>\s*<\/div>/,
  `<div className="space-y-1.5">
                  <Label>Primary Phone</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(val) => updateField("phone", val)}
                    defaultCountry="IN"
                    placeholder="98765 43210"
                  />
                </div>`
);

// 3. Update Country dropdown
const oldCountrySelectRegex = /<div className="space-y-1\.5">\s*<Label>Country<\/Label>\s*<Select\s*value=\{formData\.country\}[\s\S]*?<\/Select>\s*<\/div>/;
content = content.replace(
  oldCountrySelectRegex,
  `<div className="space-y-1.5">
                  <Label>Country</Label>
                  <CountrySelect
                    value={formData.country}
                    onValueChange={(val) => {
                      updateField("country", val);
                      updateField("state", "");
                      updateField("district", "");
                    }}
                    placeholder="Select Country"
                  />
                </div>`
);

// 4. Update Emergency Contact Phone
content = content.replace(
  /<div className="space-y-1\.5">\s*<Label>Emergency Contact Phone<\/Label>\s*<Input\s*value=\{formData\.emergencyContactPhone\}\s*onChange=\{\(e\) => updateField\("emergencyContactPhone", e\.target\.value\)\}\s*placeholder="\+91 98765 12345"\s*\/>\s*<\/div>/,
  `<div className="space-y-1.5">
                    <Label>Emergency Contact Phone</Label>
                    <PhoneInput
                      value={formData.emergencyContactPhone}
                      onChange={(val) => updateField("emergencyContactPhone", val)}
                      defaultCountry="IN"
                      placeholder="98765 12345"
                    />
                  </div>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated hr/employees/new/page.tsx with CountrySelect and PhoneInput!');
