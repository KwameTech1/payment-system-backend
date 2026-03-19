# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Full Express.js backend for Payout Operations Platform
- Prisma ORM with PostgreSQL — 6 models: User, Recipient, PayinTransaction, PayoutRequest, WebhookEvent, AuditLog
- JWT authentication with bcrypt password hashing and rate limiting
- Recipients module with enforced status transitions (pending → approved/rejected, approved → suspended)
- Payouts module: create, retry, status-sync; idempotency via client_reference UUID
- Fincra integration stub (real API code ready, commented out pending credentials)
- Webhook receiver with HMAC-SHA256 signature verification using `express.raw()`
- Reconciliation cron worker (every 5 min) for stuck payouts
- Audit log for all state-changing operations
- Seed script for 2 internal users

---

## [0.1.0] - 2026-03-19

### Added
- Initial project scaffold from backend-starter-template
