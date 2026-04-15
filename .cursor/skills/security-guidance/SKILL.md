---
name: security-guidance
description: Security-first development guidelines for preventing vulnerabilities. Use when working on authentication, API endpoints, database queries, or when the user mentions "Security".
---

# Security-First Development

This skill provides guidance on building secure applications and identifying common vulnerabilities.

## 1. Input Validation & Sanitization
- **Trust No One**: Always validate and sanitize user input on the server side.
- **Type Safety**: Use Zod or similar for schema validation.
- **SQL Injection**: Always use parameterized queries (Prisma handles this natively).

## 2. Authentication & Authorization
- **Least Privilege**: Only grant the minimum permissions necessary for a task.
- **Session Safety**: Use secure, HttpOnly, and SameSite cookies.
- **RBAC**: Enforce Role-Based Access Control on every sensitive API route.

## 3. Data Protection
- **Encryption**: Sensitive data must be encrypted at rest and in transit (TLS).
- **Secrets Management**: Never commit API keys, passwords, or secrets to Git. Use `.env` files.
- **PII**: Handle Personally Identifiable Information with care and minimize storage.

## 4. Dependencies
- **Audit**: Regularly run `npm audit` or equivalent.
- **Minimalism**: Only use trusted, well-maintained libraries.

## 5. Security Checklist
- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] Proper error handling (don't leak stack traces to users)
- [ ] Secure communication (HTTPS)
- [ ] Authorization checks implemented
