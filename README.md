# MNB Payroll Management System

A consolidated Next.js 16 and Neon PostgreSQL payroll application.

## Included modules
Authentication, departments, positions, employees, salaries, allowances, deductions, payroll periods, payroll processing, payroll review and approval, payslips, payment status, reports, audit trail, and organisation settings.

## Setup
1. Copy `.env.example` to `.env.local`.
2. Add the Neon pooled `DATABASE_URL`, a strong `SESSION_SECRET`, and administrator values.
3. Run the original database schema, then `database/consolidation_migration.sql` in Neon SQL Editor.
4. Run `npm install`.
5. Run `npm run create-admin` once.
6. Run `npm run dev` for local use or `npm run build && npm start` for production.

## Security
Never commit `.env.local`. Change the temporary administrator password on first login. Only approved payroll runs can generate payslips or appear in payment processing.

## Navigation update

Departments and Job Positions are available from the **Human Resources** section of the dashboard sidebar:

- `/dashboard/departments`
- `/dashboard/positions`

Create at least one active department, then create an active job position under that department before registering employees.

## Role-based access upgrade

This version adds three operational roles:

- **Administrator** – full system access, user management, suspension/deletion, password reset, audit trail, settings and approval of edit requests.
- **HR Officer** – Departments, Job Positions and Employees only. HR can create records but existing records are locked unless the Administrator grants temporary edit access. HR cannot delete records.
- **Salaries Officer** – Salary Management, Allowances, Deductions, Payroll Processing, Payroll Review, Payslips and Payments only. Existing records are locked unless temporary edit access is approved. Salaries Officers cannot delete records.

New user accounts are created by the Administrator and always have `must_change_password = TRUE`, forcing a password change on initial login.

### Database upgrade

Run the following file against the existing PostgreSQL/Neon database before using the upgraded system:

```text
database/role_access_upgrade.sql
```

The migration renames the legacy `Human Resources` and `Accounts Officer` roles when present, creates the new role names, creates edit-approval tables and adds employee document storage.

### Employee document storage

Certificates, application letters, transcripts, contracts and other supported documents are stored directly in PostgreSQL as `BYTEA`. This avoids relying on the temporary Vercel filesystem. The default maximum upload size in the API is 10 MB per document.

### User administration

Open:

```text
/dashboard/users
```

Administrator actions include create user, suspend/activate, reset password and delete account. Account deletion is implemented as a safe soft-delete so historical audit records remain intact.

### Edit approval workflow

HR and Salaries Officers use:

```text
/dashboard/edit-access
```

to request correction permission. The Administrator approves requests from the same page. Approved access is temporary (24 hours by default) and all updates remain in the audit trail.
