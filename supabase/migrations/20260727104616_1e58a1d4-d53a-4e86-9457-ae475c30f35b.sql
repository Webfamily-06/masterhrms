
CREATE TYPE public.app_role AS ENUM ('super_admin', 'hr_admin', 'manager', 'employee');
CREATE TYPE public.employment_type AS ENUM ('full_time', 'part_time', 'contract', 'intern');
CREATE TYPE public.employee_status AS ENUM ('active', 'on_leave', 'terminated');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');
CREATE TYPE public.payroll_status AS ENUM ('draft', 'processing', 'paid');

CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id uuid, _tenant_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = _role); $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "tenants_select" ON public.tenants FOR SELECT TO authenticated
USING (id = public.current_tenant_id() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE TO authenticated
USING (public.has_tenant_role(auth.uid(), id, 'hr_admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR tenant_id = public.current_tenant_id() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR tenant_id = public.current_tenant_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dept_select" ON public.departments FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id());
CREATE POLICY "dept_manage" ON public.departments FOR ALL TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'))
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_code text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  position text,
  manager_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  joined_at date,
  employment_type public.employment_type NOT NULL DEFAULT 'full_time',
  status public.employee_status NOT NULL DEFAULT 'active',
  salary numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, employee_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER employees_updated_at BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "emp_select" ON public.employees FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id());
CREATE POLICY "emp_manage" ON public.employees FOR ALL TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'))
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  hours numeric(5,2) DEFAULT 0,
  status public.attendance_status NOT NULL DEFAULT 'present',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "att_select" ON public.attendance FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() AND (
  public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin')
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = attendance.employee_id AND e.user_id = auth.uid())
));
CREATE POLICY "att_insert" ON public.attendance FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.current_tenant_id() AND (
  public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin')
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = attendance.employee_id AND e.user_id = auth.uid())
));
CREATE POLICY "att_update" ON public.attendance FOR UPDATE TO authenticated
USING (tenant_id = public.current_tenant_id() AND (
  public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin')
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = attendance.employee_id AND e.user_id = auth.uid())
));
CREATE POLICY "att_delete" ON public.attendance FOR DELETE TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));

CREATE TABLE public.leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  days_per_year integer NOT NULL DEFAULT 0,
  color text DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_types TO authenticated;
GRANT ALL ON public.leave_types TO service_role;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lt_select" ON public.leave_types FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id());
CREATE POLICY "lt_manage" ON public.leave_types FOR ALL TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'))
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));

CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type_id uuid REFERENCES public.leave_types(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,2) NOT NULL DEFAULT 1,
  reason text,
  status public.leave_status NOT NULL DEFAULT 'pending',
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO authenticated;
GRANT ALL ON public.leave_requests TO service_role;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "lr_select" ON public.leave_requests FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() AND (
  public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'manager')
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = leave_requests.employee_id AND e.user_id = auth.uid())
));
CREATE POLICY "lr_insert" ON public.leave_requests FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.current_tenant_id() AND (
  public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin')
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = leave_requests.employee_id AND e.user_id = auth.uid())
));
CREATE POLICY "lr_update" ON public.leave_requests FOR UPDATE TO authenticated
USING (tenant_id = public.current_tenant_id() AND (
  public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin')
  OR public.has_tenant_role(auth.uid(), tenant_id, 'manager')
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = leave_requests.employee_id AND e.user_id = auth.uid())
));
CREATE POLICY "lr_delete" ON public.leave_requests FOR DELETE TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));

CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  status public.payroll_status NOT NULL DEFAULT 'draft',
  total_amount numeric(14,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (tenant_id, period_month, period_year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_runs TO authenticated;
GRANT ALL ON public.payroll_runs TO service_role;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_select" ON public.payroll_runs FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() AND public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));
CREATE POLICY "pr_manage" ON public.payroll_runs FOR ALL TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'))
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));

CREATE TABLE public.payslips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  payroll_run_id uuid REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  gross_salary numeric(12,2) NOT NULL DEFAULT 0,
  deductions numeric(12,2) NOT NULL DEFAULT 0,
  net_salary numeric(12,2) NOT NULL DEFAULT 0,
  breakdown jsonb DEFAULT '{}'::jsonb,
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payslips TO authenticated;
GRANT ALL ON public.payslips TO service_role;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_select" ON public.payslips FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id() AND (
  public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin')
  OR EXISTS (SELECT 1 FROM public.employees e WHERE e.id = payslips.employee_id AND e.user_id = auth.uid())
));
CREATE POLICY "ps_manage" ON public.payslips FOR ALL TO authenticated
USING (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'))
WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'hr_admin'));

CREATE OR REPLACE FUNCTION public.bootstrap_tenant(_name text, _slug text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tenant_id IS NOT NULL) THEN
    RAISE EXCEPTION 'User already belongs to a tenant';
  END IF;
  INSERT INTO public.tenants (name, slug) VALUES (_name, _slug) RETURNING id INTO new_tenant_id;
  UPDATE public.profiles SET tenant_id = new_tenant_id WHERE id = auth.uid();
  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (auth.uid(), new_tenant_id, 'hr_admin');
  INSERT INTO public.leave_types (tenant_id, name, days_per_year, color) VALUES
    (new_tenant_id, 'Annual Leave', 20, '#3b82f6'),
    (new_tenant_id, 'Sick Leave', 10, '#ef4444'),
    (new_tenant_id, 'Personal Leave', 5, '#8b5cf6');
  INSERT INTO public.departments (tenant_id, name) VALUES
    (new_tenant_id, 'Engineering'),
    (new_tenant_id, 'Human Resources'),
    (new_tenant_id, 'Sales');
  RETURN new_tenant_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.bootstrap_tenant(text, text) TO authenticated;
