// pages/hr/employees/create.tsx
import { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import { getImagePath } from '@/utils/helpers';

export default function EmployeeCreate() {
  const { t } = useTranslation();
  const { branches, departments, designations, documentTypes, shifts, attendancePolicies, generatedEmployeeId, globalSettings } = usePage().props as any;
  const isDemo = globalSettings?.is_demo;

  // Initialize required documents
  const initialDocuments = documentTypes && Array.isArray(documentTypes)
    ? documentTypes.filter((dt: any) => dt.is_required).map((dt: any) => ({
        document_type_id: dt.id.toString(),
        file: null,
        expiry_date: '',
        is_required: true,
      }))
    : [];

  // State
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    biometric_emp_id: '',
    email: '',
    password: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    branch_id: '',
    department_id: '',
    designation_id: '',
    shift_id: '',
    attendance_policy_id: '',
    date_of_joining: '',
    employment_type: 'Full-time',
    employee_status: 'active',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_number: '',
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    bank_identifier_code: '',
    bank_branch: '',
    tax_payer_id: '',
    salary: '',
    documents: initialDocuments
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  // Filter departments based on selected branch
  // const filteredDepartments = formData.branch_id
  //   ? departments.filter((dept: any) => dept.branch_id === parseInt(formData.branch_id))
  //   : departments;

  const filteredDepartments = formData.branch_id
    ? departments.filter((dept: any) => String(dept.branch_id) === String(formData.branch_id))
    : departments;

  // Filter designations based on selected department
  // const filteredDesignations = formData.department_id
  //   ? designations.filter((desig: any) => desig.department_id === parseInt(formData.department_id))
  //   : designations;

  const filteredDesignations = formData.department_id
    ? designations.filter((desig: any) => String(desig.department_id) === String(formData.department_id))
    : designations;

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Handle branch change - reset department and designation
    if (name === 'branch_id') {
      setFormData(prev => ({
        ...prev,
        branch_id: value,
        department_id: '',
        designation_id: ''
      }));
    }

    // Handle department change - reset designation
    if (name === 'department_id') {
      setFormData(prev => ({
        ...prev,
        department_id: value,
        designation_id: ''
      }));
    }
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));

      // Clear error
      if (errors['profile_image']) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors['profile_image'];
          return newErrors;
        });
      }
    }
  };

  const handleDocumentChange = (index: number, field: string, value: any) => {
    const updatedDocuments = [...formData.documents];
    updatedDocuments[index] = { ...updatedDocuments[index], [field]: value };
    setFormData(prev => ({ ...prev, documents: updatedDocuments }));

    // Clear error
    const errorKey = `documents.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const handleDocumentFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleDocumentChange(index, 'file', file);
    }
  };

  const addDocument = () => {
    setFormData(prev => ({
      ...prev,
      documents: [
        ...prev.documents,
        { document_type_id: '', file: null, expiry_date: '' }
      ]
    }));
  };

  const removeDocument = (index: number) => {
    const updatedDocuments = [...formData.documents];
    updatedDocuments.splice(index, 1);
    setFormData(prev => ({ ...prev, documents: updatedDocuments }));

    // Clear errors for this document
    const newErrors = { ...errors };
    Object.keys(newErrors).forEach(key => {
      if (key.startsWith(`documents.${index}.`)) {
        delete newErrors[key];
      }
    });
    setErrors(newErrors);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);

    // Create form data for submission
    const submitData = new FormData();

    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key !== 'documents') {
        if (value !== null && value !== undefined && value !== '') {
          submitData.append(key, value);
        }
      }
    });

    // Add profile image if selected
    if (profileImage) {
      submitData.append('profile_image', profileImage);
    }

    // Add documents
    formData.documents.forEach((doc: any, index: number) => {
      if (doc.document_type_id) {
        submitData.append(`documents[${index}][document_type_id]`, doc.document_type_id);
      }
      if (doc.file) {
        submitData.append(`documents[${index}][file]`, doc.file);
      }
      if (doc.expiry_date) {
        submitData.append(`documents[${index}][expiry_date]`, doc.expiry_date);
      }
    });

    if (!isDemo) setIsSubmitting(true);

    // Submit the form
    router.post(route('hr.employees.store'), submitData, {
      forceFormData: true,
      onSuccess: (page) => {
        if (!isDemo && page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        }
        if (!isDemo) router.get(route('hr.employees.index'));
      },
      onError: (errors) => {
        setErrors(errors);
        toast.error(t('Please correct the errors in the form'));
      },
      onFinish: () => setIsSubmitting(false),
    });
  };



  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!formData.name)             e.name = t('Full name is required');
      if (!formData.biometric_emp_id) e.biometric_emp_id = t('Employee code is required');
      if (!profileImage)              e.profile_image = t('Profile image is required');
      if (!formData.email)            e.email = t('Email is required');
      if (!formData.password)         e.password = t('Password is required');
      if (!formData.phone)            e.phone = t('Phone is required');
      if (!formData.date_of_birth)    e.date_of_birth = t('Date of birth is required');
      if (!formData.gender)           e.gender = t('Gender is required');
    }
    if (s === 1) {
      if (!formData.branch_id)       e.branch_id = t('Branch is required');
      if (!formData.department_id)   e.department_id = t('Department is required');
      if (!formData.designation_id)  e.designation_id = t('Designation is required');
      if (!formData.date_of_joining) e.date_of_joining = t('Date of joining is required');
      if (!formData.employment_type) e.employment_type = t('Employment type is required');
      if (!formData.employee_status) e.employee_status = t('Employee status is required');
    }
    if (s === 2) {
      if (!formData.address_line_1)                 e.address_line_1 = t('Address is required');
      if (!formData.city)                           e.city = t('City is required');
      if (!formData.state)                          e.state = t('State is required');
      if (!formData.country)                        e.country = t('Country is required');
      if (!formData.postal_code)                    e.postal_code = t('Postal/Zip code is required');

      if (!formData.emergency_contact_name)         e.emergency_contact_name = t('Emergency contact name is required');
      if (!formData.emergency_contact_relationship) e.emergency_contact_relationship = t('Relationship is required');
      if (!formData.emergency_contact_number)       e.emergency_contact_number = t('Emergency contact phone is required');
    }
    if (s === 3) {
      if (!formData.bank_name)           e.bank_name = t('Bank name is required');
      if (!formData.account_holder_name) e.account_holder_name = t('Account holder name is required');
      if (!formData.account_number)      e.account_number = t('Account number is required');
      if (!formData.bank_identifier_code) e.bank_identifier_code = t('BIC/SWIFT is required');
      if (!formData.bank_branch)         e.bank_branch = t('Bank branch is required');
      if (!formData.salary)              e.salary = t('Salary is required');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const STEP_FIELDS: Record<number, string[]> = {
    0: ['name', 'biometric_emp_id', 'profile_image', 'email', 'password', 'phone', 'date_of_birth', 'gender'],
    1: ['branch_id', 'department_id', 'designation_id', 'date_of_joining', 'employment_type', 'employee_status'],
    2: ['address_line_1', 'city', 'state', 'country', 'postal_code', 'emergency_contact_name', 'emergency_contact_relationship', 'emergency_contact_number'],
    3: ['bank_name', 'account_holder_name', 'account_number', 'bank_identifier_code', 'bank_branch', 'salary'],
  };
  const stepHasError = (i: number) => (STEP_FIELDS[i] || []).some(f => errors[f]);

  const STEPS = [
    { key: 'personal',   label: t('Personal') },
    { key: 'employment', label: t('Employment') },
    { key: 'contact',    label: t('Contact') },
    { key: 'banking',    label: t('Banking') },
    { key: 'documents',  label: t('Documents') },
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Employees'), href: route('hr.employees.index') },
    { title: t('Create Employee') }
  ];

  return (
    <PageTemplate
      title={t("Create Employee")}
      description={t("Add a new employee to your organization.")}
      url="/hr/employees/create"
      breadcrumbs={breadcrumbs}
      actions={[
        {
          label: t('Back'),
          icon: <ArrowLeft className="h-4 w-4 mr-2" />,
          variant: 'outline',
          onClick: () => router.get(route('hr.employees.index'))
        }
      ]}
    >
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">

        {/* Step Indicator */}
        <div className="flex items-center w-full">
          {STEPS.map((s, i) => {
            const done    = i < currentStep;
            const active  = i === currentStep;
            const hasErr  = stepHasError(i);
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                    hasErr ? 'bg-red-50 border-red-500 text-red-600' :
                    done   ? 'bg-primary border-primary text-white' :
                    active ? 'border-primary text-primary bg-white dark:bg-gray-900' :
                             'border-gray-300 dark:border-gray-600 text-gray-400 bg-white dark:bg-gray-900'
                  }`}>
                    {done && !hasErr ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${
                    hasErr ? 'text-red-600' :
                    active ? 'text-primary' :
                    done   ? 'text-gray-700 dark:text-gray-300' :
                             'text-gray-400 dark:text-gray-500'
                  }`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 transition-colors ${done && !hasErr ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Basic Information Card */}
        {currentStep === 0 && <Card>
          <CardHeader className='pb-2 border-b border-gray-300'>
            <CardTitle>{t('Basic Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" required>{t('Full Name')}</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={t('e.g. John Doe')}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_id">{t('Employee ID')}</Label>
                <Input
                  id="employee_id"
                  value={generatedEmployeeId}
                  readOnly
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">{t('Employee ID will be auto-generated')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="biometric_emp_id" required>{t('Employee Code')}</Label>
                <Input
                  id="biometric_emp_id"
                  required
                  value={formData.biometric_emp_id || ''}
                  onChange={(e) => handleChange('biometric_emp_id', e.target.value)}
                  placeholder={t('e.g. EMP001')}
                  className={errors.biometric_emp_id ? 'border-red-500' : ''}
                />
                <p className="text-sm text-muted-foreground">{t('This ID will be used to map employee with biometric device.')}</p>
                {errors.biometric_emp_id && <p className="text-red-500 text-xs">{errors.biometric_emp_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" required>{t('Email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder={t('e.g. john@example.com')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" required>{t('Password')}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder={t('Enter password')}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" required>{t('Phone Number')}</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder={t('e.g. +1 234 567 8900')}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" required>{t('Date of Birth')}</Label>
                <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                  <Input
                    id="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    className={`cursor-pointer ${errors.date_of_birth ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.date_of_birth && <p className="text-red-500 text-xs">{errors.date_of_birth}</p>}
              </div>

              <div className="space-y-2">
                <Label required>{t('Gender')}</Label>
                <RadioGroup
                  value={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="gender-male" />
                    <Label htmlFor="gender-male">{t('Male')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="gender-female" />
                    <Label htmlFor="gender-female">{t('Female')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="gender-other" />
                    <Label htmlFor="gender-other">{t('Other')}</Label>
                  </div>
                </RadioGroup>
                {errors.gender && <p className="text-red-500 text-xs">{errors.gender}</p>}
              </div>

              <div className="space-y-2">
                <Label required>{t('Profile Image')}</Label>
                <div className="flex flex-col gap-3">
                  <div className="border rounded-md p-4 flex items-center justify-center bg-muted/30 h-32">
                    {profileImagePreview ? (
                      <img
                        src={profileImagePreview}
                        alt="Profile Image"
                        className="max-h-full max-w-full object-contain rounded-full"
                      />
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center gap-2">
                        <div className="h-12 w-12 bg-muted flex items-center justify-center rounded-full border border-dashed">
                          <span className="font-semibold text-xs text-muted-foreground">{t('Image')}</span>
                        </div>
                        <span className="text-xs">{t('No image selected')}</span>
                      </div>
                    )}
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">{t('Max file size: 2MB')}</p>
                </div>
                {errors.profile_image && <p className="text-red-500 text-xs">{errors.profile_image}</p>}
              </div>
            </div>
          </CardContent>
        </Card>}

        {currentStep === 1 && <Card>
          <CardHeader className='pb-2 border-b border-gray-300'>
            <CardTitle>{t('Employment Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch_id" required>{t('Branch')}</Label>
                <Select
                  value={formData.branch_id}
                  required
                  onValueChange={(value) => handleChange('branch_id', value)}
                >
                  <SelectTrigger className={errors.branch_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select Branch')} />
                  </SelectTrigger>
                  <SelectContent searchable={true}>
                    {branches.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branch_id && <p className="text-red-500 text-xs">{errors.branch_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_id" required>{t('Department')}</Label>
                <Select
                  value={formData.department_id}
                  required
                  onValueChange={(value) => handleChange('department_id', value)}
                  disabled={!formData.branch_id}
                >
                  <SelectTrigger className={errors.department_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={formData.branch_id ? t('Select Department') : t('Select Branch First')} />
                  </SelectTrigger>
                  <SelectContent searchable={true}>
                    {filteredDepartments.map((department: any) => (
                      <SelectItem key={department.id} value={department.id.toString()}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department_id && <p className="text-red-500 text-xs">{errors.department_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation_id" required>{t('Designation')}</Label>
                <Select
                  value={formData.designation_id}
                  required
                  onValueChange={(value) => handleChange('designation_id', value)}
                  disabled={!formData.department_id}
                >
                  <SelectTrigger className={errors.designation_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={formData.department_id ? t('Select Designation') : t('Select Department First')} />
                  </SelectTrigger>
                  <SelectContent searchable={true}>
                    {filteredDesignations.map((designation: any) => (
                      <SelectItem key={designation.id} value={designation.id.toString()}>
                        {designation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.designation_id && <p className="text-red-500 text-xs">{errors.designation_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_joining" required>{t('Date of Joining')}</Label>
                <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                  <Input
                    id="date_of_joining"
                    type="date"
                    required
                    value={formData.date_of_joining}
                    onChange={(e) => handleChange('date_of_joining', e.target.value)}
                    className={`cursor-pointer ${errors.date_of_joining ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.date_of_joining && <p className="text-red-500 text-xs">{errors.date_of_joining}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employment_type" required>{t('Employment Type')}</Label>
                <Select
                  value={formData.employment_type}
                  required
                  onValueChange={(value) => handleChange('employment_type', value)}
                >
                  <SelectTrigger className={errors.employment_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select Employment Type')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">{t('Full-time')}</SelectItem>
                    <SelectItem value="Part-time">{t('Part-time')}</SelectItem>
                    <SelectItem value="Contract">{t('Contract')}</SelectItem>
                    <SelectItem value="Internship">{t('Internship')}</SelectItem>
                    <SelectItem value="Temporary">{t('Temporary')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.employment_type && <p className="text-red-500 text-xs">{errors.employment_type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_status" required>{t('Employee Status')}</Label>
                <Select
                  value={formData.employee_status}

                  onValueChange={(value) => handleChange('employee_status', value)}
                >
                  <SelectTrigger className={errors.employee_status ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select Employee Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('Active')}</SelectItem>
                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                    <SelectItem value="probation">{t('Probation')}</SelectItem>
                    <SelectItem value="terminated">{t('Terminated')}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.employee_status && <p className="text-red-500 text-xs">{errors.employee_status}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shift_id">{t('Shift')}</Label>
                <Select
                  value={formData.shift_id}
                  onValueChange={(value) => handleChange('shift_id', value)}
                >
                  <SelectTrigger className={errors.shift_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select Shift (Optional)')} />
                  </SelectTrigger>
                  <SelectContent searchable={true}>
                    {shifts?.map((shift: any) => (
                      <SelectItem key={shift.id} value={shift.id.toString()}>
                        {shift.name} ({shift.start_time} - {shift.end_time})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.shift_id && <p className="text-red-500 text-xs">{errors.shift_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance_policy_id">{t('Attendance Policy')}</Label>
                <Select
                  value={formData.attendance_policy_id}
                  onValueChange={(value) => handleChange('attendance_policy_id', value)}
                >
                  <SelectTrigger className={errors.attendance_policy_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={t('Select Attendance Policy (Optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    {attendancePolicies?.map((policy: any) => (
                      <SelectItem key={policy.id} value={policy.id.toString()}>
                        {policy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.attendance_policy_id && <p className="text-red-500 text-xs">{errors.attendance_policy_id}</p>}
              </div>
            </div>
          </CardContent>
        </Card>}

        {currentStep === 2 && <Card>
          <CardHeader className='pb-2 border-b border-gray-300'>
            <CardTitle>{t('Contact Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_line_1" required>{t('Address Line 1')}</Label>
                <Input
                  id="address_line_1"
                  required
                  value={formData.address_line_1}
                  onChange={(e) => handleChange('address_line_1', e.target.value)}
                  placeholder={t('e.g. 123 Main Street, Suite 100')}
                  className={errors.address_line_1 ? 'border-red-500' : ''}
                />
                {errors.address_line_1 && <p className="text-red-500 text-xs">{errors.address_line_1}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line_2">{t('Address Line 2')}</Label>
                <Input
                  id="address_line_2"
                  value={formData.address_line_2}
                  onChange={(e) => handleChange('address_line_2', e.target.value)}
                  placeholder={t('e.g. Apartment, Floor, Building')}
                  className={errors.address_line_2 ? 'border-red-500' : ''}
                />
                {errors.address_line_2 && <p className="text-red-500 text-xs">{errors.address_line_2}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" required>{t('City')}</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder={t('e.g. New York')}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && <p className="text-red-500 text-xs">{errors.city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state" required>{t('State/Province')}</Label>
                <Input
                  id="state"
                  required
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder={t('e.g. California')}
                  className={errors.state ? 'border-red-500' : ''}
                />
                {errors.state && <p className="text-red-500 text-xs">{errors.state}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" required>{t('Country')}</Label>
                <Input
                  id="country"
                  required
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder={t('e.g. United States')}
                  className={errors.country ? 'border-red-500' : ''}
                />
                {errors.country && <p className="text-red-500 text-xs">{errors.country}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code" required>{t('Postal/Zip Code')}</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => handleChange('postal_code', e.target.value)}
                  placeholder={t('e.g. 10001')}
                  className={errors.postal_code ? 'border-red-500' : ''}
                />
                {errors.postal_code && <p className="text-red-500 text-xs">{errors.postal_code}</p>}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">{t('Emergency Contact')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name" required>{t('Name')}</Label>
                  <Input
                    id="emergency_contact_name"
                    required
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleChange('emergency_contact_name', e.target.value)}
                    placeholder={t('e.g. Jane Doe')}
                    className={errors.emergency_contact_name ? 'border-red-500' : ''}
                  />
                  {errors.emergency_contact_name && <p className="text-red-500 text-xs">{errors.emergency_contact_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_relationship" required>{t('Relationship')}</Label>
                  <Input
                    id="emergency_contact_relationship"
                    required
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleChange('emergency_contact_relationship', e.target.value)}
                    placeholder={t('e.g. Spouse, Parent, Sibling')}
                    className={errors.emergency_contact_relationship ? 'border-red-500' : ''}
                  />
                  {errors.emergency_contact_relationship && <p className="text-red-500 text-xs">{errors.emergency_contact_relationship}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_number" required>{t('Phone Number')}</Label>
                  <Input
                    id="emergency_contact_number"
                    required
                    value={formData.emergency_contact_number}
                    onChange={(e) => handleChange('emergency_contact_number', e.target.value)}
                    placeholder={t('e.g. +1 234 567 8900')}
                    className={errors.emergency_contact_number ? 'border-red-500' : ''}
                  />
                  {errors.emergency_contact_number && <p className="text-red-500 text-xs">{errors.emergency_contact_number}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>}

        {currentStep === 3 && <Card>
          <CardHeader className='pb-2 border-b border-gray-300'>
            <CardTitle>{t('Banking Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name" required>{t('Bank Name')}</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  required
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder={t('e.g. Bank of America')}
                  className={errors.bank_name ? 'border-red-500' : ''}
                />
                {errors.bank_name && <p className="text-red-500 text-xs">{errors.bank_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder_name" required>{t('Account Holder Name')}</Label>
                <Input
                  id="account_holder_name"
                  required
                  value={formData.account_holder_name}
                  onChange={(e) => handleChange('account_holder_name', e.target.value)}
                  placeholder={t('e.g. John Doe')}
                  className={errors.account_holder_name ? 'border-red-500' : ''}
                />
                {errors.account_holder_name && <p className="text-red-500 text-xs">{errors.account_holder_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number" required>{t('Account Number')}</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  required
                  onChange={(e) => handleChange('account_number', e.target.value)}
                  placeholder={t('e.g. 1234567890')}
                  className={errors.account_number ? 'border-red-500' : ''}
                />
                {errors.account_number && <p className="text-red-500 text-xs">{errors.account_number}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_identifier_code" required>{t('Bank Identifier Code (BIC/SWIFT)')}</Label>
                <Input
                  id="bank_identifier_code"
                  required
                  value={formData.bank_identifier_code}
                  onChange={(e) => handleChange('bank_identifier_code', e.target.value)}
                  placeholder={t('e.g. BOFAUS3N')}
                  className={errors.bank_identifier_code ? 'border-red-500' : ''}
                />
                {errors.bank_identifier_code && <p className="text-red-500 text-xs">{errors.bank_identifier_code}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_branch" required>{t('Bank Branch')}</Label>
                <Input
                  id="bank_branch"
                  value={formData.bank_branch}
                  required
                  onChange={(e) => handleChange('bank_branch', e.target.value)}
                  placeholder={t('e.g. New York Main Branch')}
                  className={errors.bank_branch ? 'border-red-500' : ''}
                />
                {errors.bank_branch && <p className="text-red-500 text-xs">{errors.bank_branch}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_payer_id">{t('Tax Payer ID')}</Label>
                <Input
                  id="tax_payer_id"
                  value={formData.tax_payer_id}
                  onChange={(e) => handleChange('tax_payer_id', e.target.value)}
                  placeholder={t('e.g. 123-45-6789')}
                  className={errors.tax_payer_id ? 'border-red-500' : ''}
                />
                {errors.tax_payer_id && <p className="text-red-500 text-xs">{errors.tax_payer_id}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary" required>{t('Base Salary')}</Label>
                <Input
                  required
                  id="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => handleChange('salary', e.target.value)}
                  placeholder={t('e.g. 5000.00')}
                  className={errors.salary ? 'border-red-500' : ''}
                />
                {errors.salary && <p className="text-red-500 text-xs">{errors.salary}</p>}
              </div>
            </div>
          </CardContent>
        </Card>}

        {currentStep === 4 && <Card>
          <CardHeader className='pb-2 border-b border-gray-300'>
            <CardTitle>{t('Documents')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {formData.documents.map((document: any, index: number) => (
              <div key={index} className="border rounded-md p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">{t('Document')} #{index + 1}</h3>
                  {!document.is_required && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`document_type_${index}`}>{t('Document Type')} <span className="text-red-500">*</span></Label>
                    <Select
                      value={document.document_type_id}
                      onValueChange={(value) => handleDocumentChange(index, 'document_type_id', value)}
                    >
                      <SelectTrigger className={errors[`documents.${index}.document_type_id`] ? 'border-red-500' : ''}>
                        <SelectValue placeholder={t('Select Document Type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes
                          .filter((type: any) => {
                            if (type.id.toString() === document.document_type_id) return true;
                            return !formData.documents.some((d: any) => d.document_type_id === type.id.toString());
                          })
                          .map((type: any) => (
                            <SelectItem key={type.id} value={type.id.toString()}>
                              {type.name} {type.is_required && <span className="text-red-500">*</span>}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors[`documents.${index}.document_type_id`] && (
                      <p className="text-red-500 text-xs">{errors[`documents.${index}.document_type_id`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t('File')} <span className="text-red-500">*</span></Label>
                    <div className="flex flex-col gap-3">
                      <Input
                        type="file"
                        onChange={(e) => handleDocumentFileChange(index, e)}
                        className={errors[`documents.${index}.file`] ? 'border-red-500' : ''}
                      />
                       <p className="text-xs text-muted-foreground">{t('Max file size: 5MB')}</p>
                    </div>
                    {errors[`documents.${index}.file`] && (
                      <p className="text-red-500 text-xs">{errors[`documents.${index}.file`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`document_expiry_${index}`}>{t('Expiry Date')}</Label>
                    <div className="cursor-pointer" onClick={(e) => { const input = (e.currentTarget as HTMLElement).querySelector('input'); try { (input as any)?.showPicker?.(); } catch { input?.focus(); } }}>
                      <Input
                        id={`document_expiry_${index}`}
                        type="date"
                        value={document.expiry_date}
                        onChange={(e) => handleDocumentChange(index, 'expiry_date', e.target.value)}
                        className={`cursor-pointer ${errors[`documents.${index}.expiry_date`] ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {errors[`documents.${index}.expiry_date`] && (
                      <p className="text-red-500 text-xs">{errors[`documents.${index}.expiry_date`]}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addDocument}
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('Add Document')}
            </Button>
          </CardContent>
        </Card>}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          {currentStep != 0  ? <Button
            type="button"
            variant="outline"
            onClick={() => currentStep === 0 ? router.get(route('hr.employees.index')) : setCurrentStep(s => s - 1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('Back')}
          </Button>:<div></div>}
          {currentStep < STEPS.length - 1 ? (
            <Button type="button" onClick={() => {
              if (validateStep(currentStep)) setCurrentStep(s => s + 1);
            }}>
              {t('Next')}<ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit}>
              {t('Save')}
            </Button>
          )}
        </div>
      </form>
    </PageTemplate>
  );
}
