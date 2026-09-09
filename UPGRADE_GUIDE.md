# MNB Payroll System Upgrade Guide

## 1. Database
Run `database/role_access_upgrade.sql` in your PostgreSQL/Neon SQL editor before starting the upgraded application.

The migration:
- Renames legacy roles to `HR Officer` and `Salaries Officer`.
- Adds/ensures Administrator, HR Officer and Salaries Officer roles.
- Adds edit-access approval tables.
- Adds employee document storage.
- Adds supporting user-account columns and indexes.

## 2. Install dependencies

```bash
npm install
```

## 3. Environment
Copy `.env.example` to `.env.local` and enter your real values. Do not commit `.env.local` to GitHub.

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4. Run locally

```bash
npm run dev
```

## 5. Role behaviour

### Administrator
- Full access to all HR, payroll and administration functions.
- Creates users and assigns roles.
- Suspends, activates, resets passwords and deletes user accounts.
- Approves/rejects edit-access requests.
- Can delete records where the database permits it.
- Can delete employee documents.

### HR Officer
- Sees Departments, Job Positions and Employees only.
- Can create HR records.
- Cannot delete HR records.
- Existing records are locked; corrections require approved temporary edit access.
- Can upload employee certificates, application letters, transcripts and related documents.
- Cannot access payroll or administration modules.

### Salaries Officer
- Sees Salary Management, Employee Allowances, Employee Deductions, Payroll Processing, Payroll Review, Payslips and Payments only.
- Can create/process payroll records.
- Cannot delete captured payroll records.
- Corrections to supported existing records require approved temporary edit access.
- Cannot access Human Resources or Administration modules.

## 6. Initial password
Every user created from `/dashboard/users` is marked `must_change_password = TRUE` and must change the temporary password on first login.

## 7. Edit requests
Users request corrections at `/dashboard/edit-access`. Administrators approve them from the same module. The default approval duration is 24 hours.

## 8. Employee documents
Open an employee profile and use the Employee Documents section. Files are stored in PostgreSQL so they persist on Vercel. The default maximum upload size is 10 MB per file.

## 9. Production deployment
Run `npm run build` locally after installing dependencies, then push to GitHub and deploy to Vercel. Add `DATABASE_URL` and `SESSION_SECRET` in Vercel Environment Variables.
