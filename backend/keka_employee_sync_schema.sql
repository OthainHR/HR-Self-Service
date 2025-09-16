-- Keka Employee Data Sync Schema
-- Stores all employee data from Keka API for centralized access

-- Create table for storing all employee data from Keka
CREATE TABLE IF NOT EXISTS keka_employees (
    id SERIAL PRIMARY KEY,
    keka_employee_id VARCHAR(100) UNIQUE NOT NULL,
    employee_number VARCHAR(100),
    first_name VARCHAR(255),
    middle_name VARCHAR(255),
    last_name VARCHAR(255),
    display_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    city VARCHAR(255),
    country_code VARCHAR(10),
    image_file_name VARCHAR(255),
    image_thumbs JSONB,
    job_title_identifier VARCHAR(100),
    job_title VARCHAR(255),
    secondary_job_title VARCHAR(255),
    reports_to_id VARCHAR(100),
    reports_to_first_name VARCHAR(255),
    reports_to_last_name VARCHAR(255),
    reports_to_email VARCHAR(255),
    l2_manager_id VARCHAR(100),
    l2_manager_first_name VARCHAR(255),
    l2_manager_last_name VARCHAR(255),
    l2_manager_email VARCHAR(255),
    dotted_line_manager_id VARCHAR(100),
    dotted_line_manager_first_name VARCHAR(255),
    dotted_line_manager_last_name VARCHAR(255),
    dotted_line_manager_email VARCHAR(255),
    contingent_type_id VARCHAR(100),
    contingent_type_name VARCHAR(255),
    time_type INTEGER,
    worker_type INTEGER,
    is_private BOOLEAN DEFAULT false,
    is_profile_complete BOOLEAN DEFAULT false,
    marital_status INTEGER,
    marriage_date TIMESTAMPTZ,
    gender INTEGER,
    joining_date TIMESTAMPTZ,
    total_experience_in_days INTEGER,
    professional_summary TEXT,
    date_of_birth TIMESTAMPTZ,
    resignation_submitted_date TIMESTAMPTZ,
    exit_date TIMESTAMPTZ,
    employment_status INTEGER,
    account_status INTEGER,
    invitation_status INTEGER,
    exit_status INTEGER,
    exit_type INTEGER,
    exit_reason TEXT,
    personal_email VARCHAR(255),
    work_phone VARCHAR(50),
    home_phone VARCHAR(50),
    mobile_phone VARCHAR(50),
    blood_group INTEGER,
    nationality VARCHAR(100),
    attendance_number VARCHAR(100),
    probation_end_date TIMESTAMPTZ,
    current_address JSONB,
    permanent_address JSONB,
    relations JSONB,
    education_details JSONB,
    experience_details JSONB,
    custom_fields JSONB,
    groups JSONB,
    leave_plan_identifier VARCHAR(100),
    leave_plan_title VARCHAR(255),
    holiday_calendar_id VARCHAR(100),
    band_info_identifier VARCHAR(100),
    band_info_title VARCHAR(255),
    pay_grade_identifier VARCHAR(100),
    pay_grade_title VARCHAR(255),
    shift_policy_identifier VARCHAR(100),
    shift_policy_title VARCHAR(255),
    weekly_off_policy_identifier VARCHAR(100),
    weekly_off_policy_title VARCHAR(255),
    capture_scheme_identifier VARCHAR(100),
    capture_scheme_title VARCHAR(255),
    tracking_policy_identifier VARCHAR(100),
    tracking_policy_title VARCHAR(255),
    expense_policy_identifier VARCHAR(100),
    expense_policy_title VARCHAR(255),
    overtime_policy_identifier VARCHAR(100),
    overtime_policy_title VARCHAR(255),
    raw_data JSONB NOT NULL, -- Store complete raw response for future use
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_time_type CHECK (time_type >= 0),
    CONSTRAINT chk_worker_type CHECK (worker_type >= 0),
    CONSTRAINT chk_marital_status CHECK (marital_status >= 0),
    CONSTRAINT chk_gender CHECK (gender >= 0),
    CONSTRAINT chk_employment_status CHECK (employment_status >= 0),
    CONSTRAINT chk_account_status CHECK (account_status >= 0),
    CONSTRAINT chk_invitation_status CHECK (invitation_status >= 0),
    CONSTRAINT chk_exit_status CHECK (exit_status >= 0),
    CONSTRAINT chk_exit_type CHECK (exit_type >= 0),
    CONSTRAINT chk_blood_group CHECK (blood_group >= 0)
);

-- Create table for employee leave balances (synced daily)
CREATE TABLE IF NOT EXISTS keka_employee_leave_balances (
    id SERIAL PRIMARY KEY,
    keka_employee_id VARCHAR(100) NOT NULL,
    leave_type VARCHAR(100) NOT NULL,
    total_allocated DECIMAL(10,2) DEFAULT 0,
    used DECIMAL(10,2) DEFAULT 0,
    remaining DECIMAL(10,2) DEFAULT 0,
    carry_forward DECIMAL(10,2) DEFAULT 0,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(keka_employee_id, leave_type),
    
    -- Foreign key constraint
    FOREIGN KEY (keka_employee_id) REFERENCES keka_employees(keka_employee_id) ON DELETE CASCADE
);

-- Create table for employee attendance records (synced daily)
CREATE TABLE IF NOT EXISTS keka_employee_attendance (
    id SERIAL PRIMARY KEY,
    keka_employee_id VARCHAR(100) NOT NULL,
    attendance_date DATE NOT NULL,
    status VARCHAR(50),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    break_hours DECIMAL(5,2),
    total_hours DECIMAL(5,2),
    overtime_hours DECIMAL(5,2),
    location VARCHAR(255),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(keka_employee_id, attendance_date),
    
    -- Foreign key constraint
    FOREIGN KEY (keka_employee_id) REFERENCES keka_employees(keka_employee_id) ON DELETE CASCADE
);

-- Create table for employee payslips (synced monthly)
CREATE TABLE IF NOT EXISTS keka_employee_payslips (
    id SERIAL PRIMARY KEY,
    keka_employee_id VARCHAR(100) NOT NULL,
    pay_period VARCHAR(100),
    start_date DATE,
    end_date DATE,
    gross_amount DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    loss_of_pay_days INTEGER DEFAULT 0,
    no_of_pay_days INTEGER DEFAULT 0,
    earnings JSONB,
    deductions JSONB,
    contributions JSONB,
    reimbursements JSONB,
    pay_slip_id VARCHAR(100),
    status VARCHAR(50),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(keka_employee_id, pay_slip_id),
    
    -- Foreign key constraint
    FOREIGN KEY (keka_employee_id) REFERENCES keka_employees(keka_employee_id) ON DELETE CASCADE
);

-- Create table for employee leave history (synced daily)
CREATE TABLE IF NOT EXISTS keka_employee_leave_history (
    id SERIAL PRIMARY KEY,
    keka_employee_id VARCHAR(100) NOT NULL,
    leave_request_id VARCHAR(100) NOT NULL,
    leave_type VARCHAR(100),
    from_date DATE,
    to_date DATE,
    days_count DECIMAL(5,2),
    reason TEXT,
    status VARCHAR(50),
    applied_date TIMESTAMPTZ,
    approved_date TIMESTAMPTZ,
    approved_by VARCHAR(255),
    comments TEXT,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(keka_employee_id, leave_request_id),
    
    -- Foreign key constraint
    FOREIGN KEY (keka_employee_id) REFERENCES keka_employees(keka_employee_id) ON DELETE CASCADE
);

-- Create table for holiday calendars (synced monthly)
CREATE TABLE IF NOT EXISTS keka_holiday_calendars (
    id SERIAL PRIMARY KEY,
    calendar_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    year INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(calendar_id, year)
);

-- Create table for company holidays (synced monthly)
CREATE TABLE IF NOT EXISTS keka_company_holidays (
    id SERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'company',
    is_optional BOOLEAN DEFAULT false,
    calendar_id VARCHAR(100),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(holiday_date, name, calendar_id),
    
    -- Foreign key constraint
    FOREIGN KEY (calendar_id) REFERENCES keka_holiday_calendars(calendar_id) ON DELETE CASCADE
);

-- Create table for sync status tracking
CREATE TABLE IF NOT EXISTS keka_sync_status (
    id SERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL, -- 'employees', 'leave_balances', 'attendance', 'leave_history', 'payslips', 'holidays', 'holiday_calendars'
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'in_progress'
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(sync_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_keka_employees_email ON keka_employees(email);
CREATE INDEX IF NOT EXISTS idx_keka_employees_employee_number ON keka_employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_keka_employees_display_name ON keka_employees(display_name);
CREATE INDEX IF NOT EXISTS idx_keka_employees_employment_status ON keka_employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_keka_employees_account_status ON keka_employees(account_status);
CREATE INDEX IF NOT EXISTS idx_keka_employees_last_synced ON keka_employees(last_synced_at);

CREATE INDEX IF NOT EXISTS idx_keka_employee_leave_balances_employee_id ON keka_employee_leave_balances(keka_employee_id);
CREATE INDEX IF NOT EXISTS idx_keka_employee_leave_balances_leave_type ON keka_employee_leave_balances(leave_type);

CREATE INDEX IF NOT EXISTS idx_keka_employee_attendance_employee_id ON keka_employee_attendance(keka_employee_id);
CREATE INDEX IF NOT EXISTS idx_keka_employee_attendance_date ON keka_employee_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_keka_employee_attendance_status ON keka_employee_attendance(status);

CREATE INDEX IF NOT EXISTS idx_keka_employee_payslips_employee_id ON keka_employee_payslips(keka_employee_id);
CREATE INDEX IF NOT EXISTS idx_keka_employee_payslips_start_date ON keka_employee_payslips(start_date);
CREATE INDEX IF NOT EXISTS idx_keka_employee_payslips_end_date ON keka_employee_payslips(end_date);

CREATE INDEX IF NOT EXISTS idx_keka_employee_leave_history_employee_id ON keka_employee_leave_history(keka_employee_id);
CREATE INDEX IF NOT EXISTS idx_keka_employee_leave_history_from_date ON keka_employee_leave_history(from_date);
CREATE INDEX IF NOT EXISTS idx_keka_employee_leave_history_status ON keka_employee_leave_history(status);

CREATE INDEX IF NOT EXISTS idx_keka_holiday_calendars_calendar_id ON keka_holiday_calendars(calendar_id);
CREATE INDEX IF NOT EXISTS idx_keka_holiday_calendars_year ON keka_holiday_calendars(year);
CREATE INDEX IF NOT EXISTS idx_keka_holiday_calendars_is_active ON keka_holiday_calendars(is_active);

CREATE INDEX IF NOT EXISTS idx_keka_company_holidays_date ON keka_company_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_keka_company_holidays_type ON keka_company_holidays(type);
CREATE INDEX IF NOT EXISTS idx_keka_company_holidays_calendar_id ON keka_company_holidays(calendar_id);

-- Create function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_keka_employees_updated_at 
    BEFORE UPDATE ON keka_employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_employee_leave_balances_updated_at 
    BEFORE UPDATE ON keka_employee_leave_balances 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_employee_attendance_updated_at 
    BEFORE UPDATE ON keka_employee_attendance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_employee_payslips_updated_at 
    BEFORE UPDATE ON keka_employee_payslips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_employee_leave_history_updated_at 
    BEFORE UPDATE ON keka_employee_leave_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_holiday_calendars_updated_at 
    BEFORE UPDATE ON keka_holiday_calendars 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_company_holidays_updated_at 
    BEFORE UPDATE ON keka_company_holidays 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_keka_sync_status_updated_at 
    BEFORE UPDATE ON keka_sync_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for employee summary
CREATE OR REPLACE VIEW keka_employee_summary AS
SELECT 
    keka_employee_id,
    email,
    display_name,
    first_name,
    last_name,
    job_title,
    employment_status,
    account_status,
    joining_date,
    last_synced_at
FROM keka_employees
WHERE account_status = 1 -- Active accounts only
ORDER BY display_name;

-- Create view for leave balance summary
CREATE OR REPLACE VIEW keka_leave_balance_summary AS
SELECT 
    e.email,
    e.display_name,
    lb.leave_type,
    lb.total_allocated,
    lb.used,
    lb.remaining,
    lb.last_synced_at
FROM keka_employees e
JOIN keka_employee_leave_balances lb ON e.keka_employee_id = lb.keka_employee_id
WHERE e.account_status = 1
ORDER BY e.display_name, lb.leave_type;

-- Add comments for documentation
COMMENT ON TABLE keka_employees IS 'Stores all employee data from Keka API for centralized access';
COMMENT ON TABLE keka_employee_leave_balances IS 'Stores employee leave balances synced from Keka';
COMMENT ON TABLE keka_employee_attendance IS 'Stores employee attendance records synced from Keka';
COMMENT ON TABLE keka_employee_payslips IS 'Stores employee payslips synced from Keka';
COMMENT ON TABLE keka_employee_leave_history IS 'Stores employee leave history synced from Keka';
COMMENT ON TABLE keka_holiday_calendars IS 'Stores holiday calendars synced from Keka';
COMMENT ON TABLE keka_company_holidays IS 'Stores company holidays synced from Keka';
COMMENT ON TABLE keka_sync_status IS 'Tracks sync status for different data types';

COMMENT ON COLUMN keka_employees.raw_data IS 'Complete raw response from Keka API for future use';
COMMENT ON COLUMN keka_employees.last_synced_at IS 'When this employee data was last synced from Keka';
COMMENT ON COLUMN keka_sync_status.sync_type IS 'Type of data being synced (employees, leave_balances, etc.)';
COMMENT ON COLUMN keka_sync_status.sync_status IS 'Status of the last sync operation';
