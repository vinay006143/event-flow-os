import type { Request } from 'express';
import mongoose from 'mongoose';
import { AuditLogModel } from './audit.model.js';
import { logger } from '../../config/logger.js';

export interface AuditEntryInput {
  actorId?: string | mongoose.Types.ObjectId;
  actorRole: 'admin' | 'staff' | 'system' | 'public';
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityReference?: string;
  result?: 'SUCCESS' | 'FAILURE';
  req?: Request;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(entry: AuditEntryInput): Promise<void> {
  try {
    await AuditLogModel.create({
      actorId: entry.actorId ? new mongoose.Types.ObjectId(entry.actorId) : undefined,
      actorRole: entry.actorRole,
      actorEmail: entry.actorEmail,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityReference: entry.entityReference,
      result: entry.result ?? 'SUCCESS',
      ipAddress: entry.req?.ip,
      userAgent: entry.req?.headers['user-agent'],
      metadata: entry.metadata,
    });
  } catch (err) {
    logger.error({ err, action: entry.action }, 'Failed to persist audit log');
  }
}
