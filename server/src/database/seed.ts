import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../utils/crypto.js';
import { connectDatabase, disconnectDatabase } from '../database/connection.js';
import { UserModel } from '../modules/users/user.model.js';
import { getOrCreateEventConfig } from '../modules/event/event.service.js';
import { TicketTypeModel } from '../modules/ticket-types/ticket-type.model.js';
import { GateModel } from '../modules/gates/gate.model.js';
import { ScannerDeviceModel } from '../modules/devices/device.model.js';
import { PromoCodeModel } from '../modules/promo-codes/promo-code.model.js';

export async function seedInitialDeploymentData(): Promise<void> {
  // 1. Single Admin account bootstrap
  let admin = await UserModel.findOne({ role: 'admin' });
  if (!admin) {
    admin = await UserModel.create({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
      role: 'admin',
      status: 'ACTIVE',
      permissions: [],
    });
    logger.info({ email: admin.email }, 'Bootstrapped single Admin account');
  }

  // 2. Event configuration (Night of Devotion — Nirantaram Sanatanam)
  const eventConfig = await getOrCreateEventConfig();

  // 3. Ticket Categories (Regular & Premium)
  const existingTypes = await TicketTypeModel.countDocuments();
  let regularTypeId;
  let premiumTypeId;

  if (existingTypes === 0) {
    const created = await TicketTypeModel.insertMany([
      {
        code: 'REGULAR',
        name: 'Regular Pass (Theater Seating)',
        description:
          'Theater seating zone (1,500 capacity) with access to Bhajan Jamming, Live Devotional Performance, and Vigneswara Photo Zone.',
        price: 699,
        currency: 'INR',
        capacity: 1500,
        maxPerBooking: 10,
        isActive: true,
        displayOrder: 1,
        perks: [
          'Individual QR-verified entry pass',
          'Theater Seating Zone (170 ft × 110 ft)',
          'Main Entry & Regular Entrances access',
          'Vigneswara Photo Zone access',
        ],
        badgeColor: '#1D4ED8',
      },
      {
        code: 'PREMIUM',
        name: 'Premium Pass (VIP Zone)',
        description:
          'Exclusive VIP Zone round-table seating (500 capacity, 50 round tables near stage front) with dedicated VIP Gate entry and priority photo zones.',
        price: 1199,
        currency: 'INR',
        capacity: 500,
        maxPerBooking: 6,
        isActive: true,
        displayOrder: 2,
        perks: [
          'VIP Zone Round-Table Seating (Stage Front)',
          'Dedicated VIP Gate Express Entry',
          'Adiyogi & Siva Parvati Photo Zones',
          'Individual QR-verified entry pass',
        ],
        badgeColor: '#B45309',
      },
    ]);
    regularTypeId = created[0]?._id;
    premiumTypeId = created[1]?._id;
    logger.info('Seeded initial Regular & Premium ticket categories');
  } else {
    const reg = await TicketTypeModel.findOne({ code: 'REGULAR' });
    const prem = await TicketTypeModel.findOne({ code: 'PREMIUM' });
    regularTypeId = reg?._id;
    premiumTypeId = prem?._id;
  }

  // 4. Entry Gates
  let gateA = await GateModel.findOne({ code: 'GATE-A' });
  if (!gateA) {
    gateA = await GateModel.create({
      code: 'GATE-A',
      name: 'Gate A — Main General Entrance',
      description: 'A.V. Apparao Road main entry for all categories',
      allowedTicketTypeIds: [],
      isActive: true,
    });
  }

  let gateB = await GateModel.findOne({ code: 'GATE-B' });
  if (!gateB) {
    gateB = await GateModel.create({
      code: 'GATE-B',
      name: 'Gate B — Premium Express Entrance',
      description: 'Dedicated express lane for Premium Darshan passes',
      allowedTicketTypeIds: premiumTypeId ? [premiumTypeId] : [],
      isActive: true,
    });
  }

  // 5. Initial Staff Account (for pilot operations)
  const staffEmail = env.STAFF_EMAIL.toLowerCase();
  let staff = await UserModel.findOne({ email: staffEmail });
  if (!staff) {
    staff = await UserModel.create({
      name: 'Gate A Operator',
      email: staffEmail,
      mobile: '9876543210',
      passwordHash: await hashPassword(env.STAFF_PASSWORD),
      role: 'staff',
      status: 'ACTIVE',
      permissions: [
        'SCAN_TICKETS',
        'MANUAL_LOOKUP',
        'VIEW_RECENT_SCANS',
        'VIEW_ASSIGNED_GATES',
        'MANAGE_DEVICE_HEARTBEAT',
      ],
      assignedGateIds: [gateA._id, gateB._id],
      createdBy: admin._id,
    });
    logger.info({ email: staff.email }, 'Seeded initial gate staff operator');
  }

  // 6. Initial Scanner Device
  const devCode = 'SCAN-GATEA-01';
  const existingDev = await ScannerDeviceModel.findOne({ deviceCode: devCode });
  if (!existingDev) {
    await ScannerDeviceModel.create({
      deviceCode: devCode,
      name: 'Gate A Handheld #1',
      assignedGateId: gateA._id,
      assignedStaffId: staff._id,
      status: 'ACTIVE',
    });
  }

  // 7. Initial Promo Code
  const promoExists = await PromoCodeModel.findOne({ code: 'SANATANAM10' });
  if (!promoExists) {
    await PromoCodeModel.create({
      code: 'SANATANAM10',
      description: '10% early-devotee blessing discount (up to ₹150)',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minPurchaseAmount: 200,
      maxDiscountAmount: 150,
      totalUsageLimit: 500,
      perUserLimit: 2,
      applicableTicketTypeIds: regularTypeId && premiumTypeId ? [regularTypeId, premiumTypeId] : [],
      isActive: true,
    });
  }

  logger.info({ event: eventConfig.name }, 'EventFlow OS seed completed');
}

// Run when executed directly via `tsx src/database/seed.ts`
const isDirectRun = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isDirectRun) {
  connectDatabase()
    .then(() => seedInitialDeploymentData())
    .then(() => disconnectDatabase())
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ err }, 'Seed failed');
      process.exit(1);
    });
}
