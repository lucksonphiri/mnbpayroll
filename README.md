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
