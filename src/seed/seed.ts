/**
 * Fictional seed dataset for demo mode (Parul University).
 * Timestamps are relative to seeding time so the demo always looks current:
 * one overdue checkout, pending requests to approve, an approved booking to
 * conflict with, and a resolved incident in history.
 */
import type {
  AuditEvent,
  Booking,
  DemoState,
  Incident,
  Resource,
  Training,
  User,
} from '@/types';
import { SEED_VERSION, MAX_ACTIVE_BOOKINGS_PER_USER } from '@/lib/config';

export const CURRENT_TRAININGS: Training[] = [
  {
    id: 'general-safety',
    name: 'General Safety Induction',
    summary: 'Campus-wide induction every borrower must complete once — emergency exits, first-aid points, safe handling basics.',
    module: [
      {
        heading: '1 · Emergency basics',
        points: [
          'Know the two nearest emergency exits of any lab you work in.',
          'First-aid kits: MKB-104 corridor, Library annex lobby, F-block concourse.',
          'Emergency campus number: 9089 (fictional). Report every hazard, however small.',
        ],
      },
      {
        heading: '2 · Handling shared equipment',
        points: [
          'Inspect items at handover and record the condition with a photo when asked.',
          'Never force a jammed component — turn the device off and report it.',
          'Keep food and drinks away from electronics and optics.',
        ],
      },
      {
        heading: '3 · Fair use',
        points: [
          'Return on time — other students may be waiting on a public waitlist.',
          'Report damage and delays honestly; the process is human, not punitive.',
          'Late or damaged items are handled by people, not automatic penalties.',
        ],
      },
    ],
  },
  {
    id: 'electronics-lab',
    name: 'Electronics Lab Training',
    summary: 'Required for bench electronics: soldering irons, test kits, thermal camera handling and ESD care.',
    module: [
      {
        heading: '1 · ESP and bench setup',
        points: [
          'Wear the anti-static wrist strap clipped to bench earth before touching boards.',
          'Unplug hardware before probing across any low-voltage rail.',
          'Never leave an energised bench unattended.',
        ],
      },
      {
        heading: '2 · Soldering practice',
        points: [
          'Use tweezers and lead-free 60/40 stations; keep tips tinned between joints.',
          'Ventilate: run the bench fume extractor for any session over 15 minutes.',
          'Report cold joints and burnt pads to the lab assistant at return.',
        ],
      },
      {
        heading: '3 · Care at checkout and return',
        points: [
          'Count probes, clamps and adapters against the kit checklist at handover.',
          'Log the initial condition of the kit (Good / Minor wear / Damaged).',
          'On return, note any measurement drift or missing accessory in the form.',
        ],
      },
    ],
  },
  {
    id: '3d-print',
    name: '3D Printer Basics',
    summary: 'Required for the fabrication bay: slicer profiles, first-layer checks and safe jam clearing.',
    module: [
      {
        heading: '1 · Slicing and setup',
        points: [
          'Use the shared PrusaSlicer profiles on the bay PC; do not override max print speeds.',
          'Level the bed and estimate filament needs BEFORE booking long jobs.',
          'Prints must run within a single booking window — split longer jobs.',
        ],
      },
      {
        heading: '2 · During a print',
        points: [
          'Stay for the first two layers and confirm adhesion before leaving.',
          'Watch for stringing or detached parts on hourly checks.',
        ],
      },
      {
        heading: '3 · Jam care and cleanup',
        points: [
          'Never force the extruder — cool the nozzle and ask lab staff for jam removal.',
          'Brush the plate and clear debris before your window ends.',
          'Log the final condition honestly; jams happen and the process is fair.',
        ],
      },
    ],
  },
];

const ALL_TRAININGS = ['general-safety', 'electronics-lab', '3d-print'];

function trainingDone(ts: string, id: string) {
  return { trainingId: id, completedAt: ts, simulated: false };
}

export const CURRENT_USERS: User[] = [
  {
    id: 'usr-aanya',
    name: 'Aanya Shah',
    role: 'student',
    title: 'Third-year · Electronics & Communication',
    department: 'School of Engineering',
    membershipVerified: true,
    trainings: [trainingDone(at(-12, 15), 'general-safety')],
    selectable: true,
  },
  {
    id: 'usr-meera',
    name: 'Dr. Meera Patel',
    role: 'owner',
    title: 'Associate Professor · Innovation Lab Lead',
    department: 'School of Engineering',
    membershipVerified: true,
    trainings: ALL_TRAININGS.map((id, i) => trainingDone(at(-90 + i, 11), id)),
    selectable: true,
  },
  {
    id: 'usr-admin',
    name: 'Campus Operations',
    role: 'admin',
    title: 'Facilities & Shared Resource Office',
    department: 'Administration',
    membershipVerified: true,
    trainings: ALL_TRAININGS.map((id, i) => trainingDone(at(-120 + i, 11), id)),
    selectable: true,
  },
  {
    id: 'usr-rohan',
    name: 'Rohan Kulkarni',
    role: 'student',
    title: 'Fourth-year · Robotics',
    department: 'School of Engineering',
    membershipVerified: true,
    trainings: [trainingDone(at(-16, 12), 'general-safety'), trainingDone(at(-14, 10), '3d-print')],
    selectable: true,
  },
  {
    id: 'usr-sana',
    name: 'Sana Iqbal',
    role: 'student',
    title: 'Second-year · Design',
    department: 'School of Design',
    membershipVerified: true,
    trainings: [trainingDone(at(-28, 11), 'general-safety'), trainingDone(at(-9, 14), 'electronics-lab')],
    selectable: true,
  },
  {
    id: 'usr-arjun',
    name: 'Prof. Arjun Mehta',
    role: 'owner',
    title: 'Assistant Professor · Electrical Engineering',
    department: 'School of Engineering',
    membershipVerified: true,
    trainings: ALL_TRAININGS.map((id, i) => trainingDone(at(-60 + i, 11), id)),
    selectable: true,
  },
];

function resource(r: Omit<Resource, 'createdAt' | 'updatedAt'>): Resource {
  const stamp = at(-25, 9);
  return { ...r, createdAt: stamp, updatedAt: stamp };
}

export const CURRENT_RESOURCES: Resource[] = [
  resource({
    id: 'res-electronics-kit',
    name: 'Electronics Testing Kit',
    model: 'Handheld DSO + bench multimeter bundle',
    category: 'Electronics',
    icon: 'CircuitBoard',
    description: 'Two-channel handheld oscilloscope, bench multimeter, probe set and breadboard bundle for circuit bring-up.',
    location: 'MKB-104 · Electronics Lab',
    ownerId: 'usr-meera',
    costPerHour: 40,
    status: 'available',
    eligibility: { requiresMembership: true, requiredTrainings: ['electronics-lab'] },
    usageRules: [
      'Count probes and clamps against the kit checklist at handover.',
      'Wear the ESD wrist strap for any board-level measurement.',
      'Report drift or missing accessories in the return notes.',
    ],
    safetyInstructions: [
      'Switch the circuit off before connecting or moving probes.',
      'Never measure mains voltage (230 V) with this kit — low-voltage lab circuits only.',
      'Check the multimeter range before every reading; a wrong range can blow the fuse or the meter.',
    ],
    limits: { maxDurationHours: 8, dailyLimitHours: 8, weeklyLimitHours: 20 },
  }),
  resource({
    id: 'res-dslr',
    name: 'DSLR Camera',
    model: 'Canon EOS 90D · 18–135mm kit lens',
    category: 'Photography',
    icon: 'Camera',
    description: 'EOS 90D body with kit lens, two charged batteries, 128 GB cards and a padded shoulder bag.',
    location: 'Media Resource Centre · Library annex',
    ownerId: 'usr-meera',
    costPerHour: 50,
    status: 'available',
    eligibility: { requiresMembership: true, requiredTrainings: [] },
    usageRules: [
      'Batteries travel charged by default — return them with at least 40%.',
      'Do not leave the camera in direct sun or lock bags unattended outdoors.',
      'Cards are wiped by media office staff after return, not by borrowers.',
    ],
    safetyInstructions: [
      'Keep the camera strap on your neck or wrist at all times.',
      'Never touch the sensor or lens glass; use only the blower and cloth in the bag.',
      'Keep away from water, sand and rain; stop and report if it gets wet.',
      'Change lenses indoors with the camera switched off.',
    ],
    limits: { maxDurationHours: 24, dailyLimitHours: 24, weeklyLimitHours: 40 },
  }),
  resource({
    id: 'res-3d-printer',
    name: '3D Printer',
    model: 'Prusa i3 MK4 · PLA/PETG bays',
    category: 'Fabrication',
    icon: 'Boxes',
    description: 'Open-frame FDM printer with PLA and PETG spools in the fabrication bay. Novice-friendly shared profiles.',
    location: 'Innovation Lab · F Block Level 1',
    ownerId: 'usr-meera',
    costPerHour: 120,
    status: 'maintenance',
    maintenanceNote: 'Nozzle replacement in progress — back in service on Friday.',
    eligibility: { requiresMembership: true, requiredTrainings: ['3d-print'] },
    usageRules: [
      'Stay for the first two layers of any print before leaving.',
      'Keep prints within a single booking window; split longer jobs.',
      'Never force the extruder — call lab staff for jam removal.',
    ],
    safetyInstructions: [
      'The nozzle reaches 250 °C and the bed 90 °C — never touch them while printing or cooling.',
      'Do not leave a print unattended for the first two layers; never leave the lab with the printer running.',
      'Keep hands out of the print area while the printer is moving.',
    ],
    limits: { maxDurationHours: 10, dailyLimitHours: 10, weeklyLimitHours: 24 },
  }),
  resource({
    id: 'res-meeting-room',
    name: 'Conference Room FM-201',
    model: '8-seat room · screen + speakerphone',
    category: 'Meeting Spaces',
    icon: 'Presentation',
    description: 'Bookable team room with an 8-seat table, wall screen and speakerphone. Priority for coursework teams.',
    location: 'F Block · Level 2',
    ownerId: 'usr-admin',
    costPerHour: 0,
    status: 'available',
    eligibility: { requiresMembership: true, requiredTrainings: [] },
    usageRules: [
      'Fair use: max 4 h per day per team.',
      'Maintain decorum: keep voices low, phones on silent, no loud music.',
      'No food or drinks other than water inside the room.',
      'Leave the room as you found it: chairs back, whiteboard erased, lights and screen off.',
      'Any member may book, but the room belongs to the whole campus — vacate on time for the next team.',
    ],
    limits: { maxDurationHours: 4, dailyLimitHours: 4, weeklyLimitHours: null },
  }),
  resource({
    id: 'res-projector',
    name: 'Portable Projector',
    model: 'Epson EB-X06 · 3600 lm',
    category: 'AV Equipment',
    icon: 'Projector',
    description: 'Compact projector with HDMI cable, remote and carry case for screenings and study sessions.',
    location: 'Media Resource Centre · Library annex',
    ownerId: 'usr-meera',
    costPerHour: 30,
    status: 'available',
    eligibility: { requiresMembership: true, requiredTrainings: [] },
    usageRules: [
      'Cool the lamp down 2 minutes before packing into the case.',
      'Cycle time is capped — the fan must not be unplugged while hot.',
      'Return the remote and HDMI cable inside the case.',
    ],
    limits: { maxDurationHours: 12, dailyLimitHours: 12, weeklyLimitHours: 30 },
  }),
  resource({
    id: 'res-thermal',
    name: 'Thermal Camera',
    model: 'FLIR ONE Pro · phone-mount',
    category: 'Electronics',
    icon: 'Thermometer',
    description: 'Clip-on thermal imaging camera for board heat maps, insulation audits and lab demos.',
    location: 'MKB-104 · Electronics Lab',
    ownerId: 'usr-arjun',
    costPerHour: 80,
    status: 'available',
    eligibility: { requiresMembership: true, requiredTrainings: ['electronics-lab'] },
    usageRules: [
      'Calibrate against the bench standard before capturing reports.',
      'Do not point at faces in recordings without consent.',
      'Return with the phone-clip secured and lens capped.',
    ],
    safetyInstructions: [
      'Never point the camera at the sun or a laser; it permanently damages the sensor.',
      'Keep the phone mount clipped firmly; a drop can crack the lens.',
      'Live circuits stay at low voltage only — no mains equipment.',
    ],
    limits: { maxDurationHours: 6, dailyLimitHours: 6, weeklyLimitHours: null },
  }),
  resource({
    id: 'res-soldering',
    name: 'Soldering Station',
    model: 'Weller WE1010 · twin bench',
    category: 'Electronics',
    icon: 'Zap',
    description: 'Twin bench soldering station with brass tip cleaner, fume extractor jack and precision tweezers.',
    location: 'MKB-104 · Electronics Lab',
    ownerId: 'usr-meera',
    costPerHour: 25,
    status: 'available',
    eligibility: { requiresMembership: true, requiredTrainings: ['electronics-lab'] },
    usageRules: [
      'Irons must rest in the holder — never on the bench.',
      'Run the fume extractor for any session over 15 minutes.',
      'Tin the tips before switching off and note worn tips at return.',
    ],
    safetyInstructions: [
      'The iron tip reaches 350 °C — always return it to the holder, never lay it on the bench.',
      'Switch on the fume extractor before you start; do not breathe solder fumes.',
      'Wear safety glasses; wash hands after soldering, before eating or drinking.',
      'Switch the station off and unplug it before leaving, even for a short break.',
    ],
    limits: { maxDurationHours: 8, dailyLimitHours: 6, weeklyLimitHours: 16 },
  }),
  resource({
    id: 'res-laptop',
    name: 'Laptop Kit',
    model: 'MacBook Pro 14" · USB-C dock + PSU',
    category: 'Computing',
    icon: 'Laptop',
    description: 'Laptop lending kit with dock, charger and sleeve for end-term capstone sprints. Free of charge.',
    location: 'IT Services Desk · Admin Block',
    ownerId: 'usr-admin',
    costPerHour: 0,
    status: 'available',
    eligibility: { requiresMembership: true, requiredTrainings: [] },
    usageRules: [
      'Install only freeware; laptops are reimaged each month.',
      'Keep the kit complete — dock and charger are one identifier tag.',
      'Sprints longer than a day must be renewed per daily limit.',
      'Return-scan at the desk records the final condition.',
    ],
    limits: { maxDurationHours: 48, dailyLimitHours: 24, weeklyLimitHours: null },
  }),
];

/* ----------------------------------------------------------- bookings */

function booking(b: Omit<Booking, 'requestedAt'> & { requestedAt?: string }): Booking {
  return { requestedAt: b.decidedAt ?? b.checkIn?.at ?? b.start, ...b } as Booking;
}

export const CURRENT_BOOKINGS: Booking[] = [
  // Pending request on the camera (owner queue has clean work to approve).
  booking({
    id: 'bk-101',
    resourceId: 'res-dslr',
    userId: 'usr-aanya',
    start: at(+1, 18),
    end: at(+1, 20, 30),
    purpose: 'Campus documentary shoot for the cultural society.',
    status: 'requested',
    requestedAt: ago(2),
  }),
  // Approved upcoming camera slot — committed, so overlapping requests waitlist.
  booking({
    id: 'bk-102',
    resourceId: 'res-dslr',
    userId: 'usr-sana',
    start: at(+1, 10),
    end: at(+1, 16),
    purpose: 'Product photography for the design club portfolio.',
    status: 'approved',
    requestedAt: ago(26),
    decidedAt: ago(3),
    decidedBy: 'usr-meera',
  }),
  // Overdue checkout on the laptop kit.
  booking({
    id: 'bk-103',
    resourceId: 'res-laptop',
    userId: 'usr-rohan',
    start: at(-3, 9),
    end: at(-1, 17),
    purpose: 'End-term capstone development sprint.',
    status: 'checked_out',
    requestedAt: at(-4, 9),
    decidedAt: at(-4, 11),
    decidedBy: 'usr-admin',
    checkIn: { at: at(-3, 9, 5), condition: 'good', notes: 'Full kit counted at the IT desk.' },
    checkInBy: 'usr-admin',
  }),
  booking({
    id: 'bk-104',
    resourceId: 'res-projector',
    userId: 'usr-rohan',
    start: at(+2, 17),
    end: at(+2, 20),
    purpose: 'Film screening night — hostel block.',
    status: 'approved',
    requestedAt: ago(30),
    decidedAt: ago(20),
    decidedBy: 'usr-meera',
  }),
  // History: a clean laptop return two weeks ago.
  booking({
    id: 'bk-105',
    resourceId: 'res-laptop',
    userId: 'usr-rohan',
    start: at(-14, 9),
    end: at(-13, 17),
    purpose: 'Placement test platform practice.',
    status: 'returned',
    requestedAt: at(-15, 9),
    decidedAt: at(-15, 11),
    decidedBy: 'usr-admin',
    checkIn: { at: at(-14, 9, 6), condition: 'good', notes: 'Dock tag matches the checkout sheet.' },
    checkInBy: 'usr-admin',
    returnReport: { at: at(-13, 17, 10), condition: 'good', notes: 'Kit complete; battery healthy.' },
    returnBy: 'usr-admin',
  }),
  // History: clean soldering session (shows Sana's electronics-lab clearance).
  booking({
    id: 'bk-106',
    resourceId: 'res-soldering',
    userId: 'usr-sana',
    start: at(-6, 13),
    end: at(-6, 17),
    purpose: 'Fixtures for the robot club — mid-term build.',
    status: 'returned',
    requestedAt: at(-7, 9),
    decidedAt: at(-7, 10),
    decidedBy: 'usr-meera',
    checkIn: { at: at(-6, 13, 4), condition: 'good', notes: 'Both irons verified at handover.' },
    checkInBy: 'usr-meera',
    returnReport: { at: at(-6, 17, 8), condition: 'good', notes: 'Tips tinned; bench tidy; extractor returned.' },
    returnBy: 'usr-meera',
  }),
  // History: 3D printer returned damaged — links to resolved incident inc-2.
  booking({
    id: 'bk-107',
    resourceId: 'res-3d-printer',
    userId: 'usr-rohan',
    start: at(-10, 14),
    end: at(-10, 22),
    purpose: 'Prototype enclosure for the agri-bot project.',
    status: 'returned',
    requestedAt: at(-11, 10),
    decidedAt: at(-11, 13),
    decidedBy: 'usr-meera',
    checkIn: { at: at(-10, 14, 4), condition: 'good', notes: 'Filament spool and plate verified.' },
    checkInBy: 'usr-meera',
    returnReport: {
      at: at(-10, 22, 6),
      condition: 'damaged',
      notes: 'Nozzle jam; a six-hour print stalled and filament hardened around the extruder.',
    },
    returnBy: 'usr-meera',
  }),
  // Approved meeting-room window (owner: admin) that bk-109 conflicts with.
  booking({
    id: 'bk-108',
    resourceId: 'res-meeting-room',
    userId: 'usr-meera',
    start: at(+2, 15),
    end: at(+2, 17),
    purpose: 'Innovation committee review — projects and budget.',
    status: 'approved',
    requestedAt: at(-1, 10),
    decidedAt: at(-1, 12),
    decidedBy: 'usr-admin',
  }),
  // Transparent waitlist demo: eligible but overlapping bk-108.
  booking({
    id: 'bk-109',
    resourceId: 'res-meeting-room',
    userId: 'usr-rohan',
    start: at(+2, 15, 30),
    end: at(+2, 17),
    purpose: 'Robot club sprint planning.',
    status: 'waitlisted',
    requestedAt: ago(20),
  }),
  // Rejected request with a required reason.
  booking({
    id: 'bk-110',
    resourceId: 'res-projector',
    userId: 'usr-aanya',
    start: at(-5, 14),
    end: at(-5, 18),
    purpose: 'Study group — semester revision marathon.',
    status: 'rejected',
    requestedAt: at(-6, 12),
    decidedAt: at(-5, 11),
    decidedBy: 'usr-meera',
    decisionReason:
      'Projector reserved for the faculty orientation that afternoon. Please rebook for another day.',
  }),
];

/* ----------------------------------------------------------- incidents */

export const CURRENT_INCIDENTS: Incident[] = [
  {
    id: 'inc-1',
    bookingId: 'bk-103',
    resourceId: 'res-laptop',
    category: 'delay',
    severity: 'medium',
    description:
      'Laptop kit is more than a day past its return window. Calls and chat messages to the borrower are unanswered.',
    reportedBy: 'usr-admin',
    reportedAt: ago(12),
    status: 'open',
  },
  {
    id: 'inc-2',
    bookingId: 'bk-107',
    resourceId: 'res-3d-printer',
    category: 'damage',
    severity: 'high',
    description:
      'Nozzle jam discovered at return; a six-hour print stalled midway and filament hardened around the extruder.',
    reportedBy: 'usr-meera',
    reportedAt: at(-10, 22, 30),
    status: 'resolved',
    resolutionNote:
      'Print settings were within policy; jam traced to a worn consumable nozzle. No penalty per fair-use policy — nozzle replaced from lab consumables.',
    resolvedBy: 'usr-meera',
    resolvedAt: at(-8, 15),
  },
];

/* ----------------------------------------------------------- audit */

let auditSeq = 0;
function ev(
  atIso: string,
  actor: string,
  action: string,
  entityType: AuditEvent['entityType'],
  entityId: string,
  summary: string,
  details?: string,
): AuditEvent {
  auditSeq += 1;
  return {
    id: `aud-${String(auditSeq).padStart(3, '0')}`,
    at: atIso,
    actor,
    action,
    entityType,
    entityId,
    summary,
    details,
  };
}

export const CURRENT_AUDIT: AuditEvent[] = [
  // Resource catalogue registration.
  ...(
    [
      ['res-electronics-kit', 'Electronics Testing Kit', 'MKB-104 shelf 2'],
      ['res-dslr', 'DSLR Camera', 'Media Resource Centre'],
      ['res-3d-printer', '3D Printer', 'Fabrication bay'],
      ['res-projector', 'Portable Projector', 'Media Resource Centre'],
      ['res-soldering', 'Soldering Station', 'Twin bench 3'],
    ] as const
  ).map(([id, name, place]) =>
    ev(at(-25, 9), 'usr-meera', 'resource.created', 'resource', id, `Registered “${name}” (${place}) to the shared catalogue.`),
  ).concat([
    ev(at(-25, 10), 'usr-admin', 'resource.created', 'resource', 'res-meeting-room', 'Registered “Conference Room FM-201” to the shared catalogue.'),
    ev(at(-25, 10), 'usr-admin', 'resource.created', 'resource', 'res-laptop', 'Registered “Laptop Kit” to the shared catalogue with the IT asset tag.'),
  ]),
  ev(at(-25, 9, 30), 'usr-arjun', 'resource.created', 'resource', 'res-thermal', 'Registered “Thermal Camera” (MKB-104 shelf 1) to the shared catalogue.'),
  // Training history.
  ev(at(-28, 11), 'usr-sana', 'training.completed', 'training', 'general-safety', 'Sana Iqbal completed General Safety Induction.', 'Verified at the Campus Operations induction desk.'),
  ev(at(-12, 15), 'usr-aanya', 'training.completed', 'training', 'general-safety', 'Aanya Shah completed General Safety Induction.', 'Verified at the Campus Operations induction desk.'),
  ev(at(-14, 10), 'usr-rohan', 'training.completed', 'training', '3d-print', 'Rohan Kulkarni completed 3D Printer Basics.', 'Lab session, certified by Dr. Meera Patel.'),
  ev(at(-9, 14), 'usr-sana', 'training.completed', 'training', 'electronics-lab', 'Sana Iqbal completed Electronics Lab Training.', 'Lab session, certified by Dr. Meera Patel.'),
  // Laptop kit history + overdue follow-up.
  ev(at(-15, 11), 'usr-admin', 'booking.approved', 'booking', 'bk-105', "Approved Rohan Kulkarni's laptop kit booking.", 'Verified availability and eligibility before approval.'),
  ev(at(-14, 9, 6), 'usr-admin', 'booking.checked_in', 'booking', 'bk-105', 'Checked in laptop kit to Rohan Kulkarni.', 'Initial condition: Good.'),
  ev(at(-13, 17, 10), 'usr-admin', 'booking.returned', 'booking', 'bk-105', 'Laptop kit returned by Rohan Kulkarni.', 'Final condition: Good.'),
  ev(at(-4, 11), 'usr-admin', 'booking.approved', 'booking', 'bk-103', "Approved Rohan Kulkarni's laptop kit booking.", 'Capstone sprint window.'),
  ev(at(-3, 9, 5), 'usr-admin', 'booking.checked_in', 'booking', 'bk-103', 'Checked in laptop kit to Rohan Kulkarni.', 'Initial condition: Good — kit counted at desk.'),
  ev(ago(12), 'usr-admin', 'incident.reported', 'incident', 'inc-1', 'Delay reported on the laptop kit checkout (bk-103).', 'Borrower unreachable; return window passed by more than a day.'),
  // 3D printer history + resolved damage incident.
  ev(at(-11, 13), 'usr-meera', 'booking.approved', 'booking', 'bk-107', "Approved Rohan Kulkarni's 3D printer booking."),
  ev(at(-10, 14, 4), 'usr-meera', 'booking.checked_in', 'booking', 'bk-107', 'Checked in the 3D printer to Rohan Kulkarni.', 'Initial condition: Good.'),
  ev(at(-10, 22, 6), 'usr-meera', 'booking.returned', 'booking', 'bk-107', '3D printer returned by Rohan Kulkarni.', 'Final condition: Damaged — nozzle jam, hardened filament.'),
  ev(at(-10, 22, 30), 'usr-meera', 'incident.reported', 'incident', 'inc-2', 'Damage reported on the 3D printer return (bk-107).', 'High severity — extruder suspected jammed.'),
  ev(at(-8, 15), 'usr-meera', 'incident.resolved', 'incident', 'inc-2', 'Resolved the 3D printer damage incident.', 'Worn consumable nozzle. No penalty per fair-use policy; human decision recorded by Dr. Meera Patel.'),
  // Soldering history.
  ev(at(-7, 10), 'usr-meera', 'booking.approved', 'booking', 'bk-106', "Approved Sana Iqbal's soldering station booking."),
  ev(at(-6, 13, 4), 'usr-meera', 'booking.checked_in', 'booking', 'bk-106', 'Checked in the soldering station to Sana Iqbal.', 'Initial condition: Good.'),
  ev(at(-6, 17, 8), 'usr-meera', 'booking.returned', 'booking', 'bk-106', 'Soldering station returned by Sana Iqbal.', 'Final condition: Good.'),
  // Rejected projector request.
  ev(at(-6, 12), 'usr-aanya', 'booking.requested', 'booking', 'bk-110', "Requested the portable projector for Nov revision session."),
  ev(at(-5, 11), 'usr-meera', 'booking.rejected', 'booking', 'bk-110', "Rejected Aanya Shah's projector request.", 'Reason: reserved for faculty orientation that afternoon.'),
  // Meeting-room double booking + waitlist.
  ev(at(-1, 12), 'usr-admin', 'booking.approved', 'booking', 'bk-108', "Approved Dr. Meera Patel's conference room booking.", 'Innovation committee window.'),
  ev(ago(20), 'usr-rohan', 'booking.waitlisted', 'booking', 'bk-109', "Rohan Kulkarni's conference room request entered the waitlist position 1.", 'Eligible request overlapping approved booking bk-108; FIFO queue with lower-recent-usage tie-breaker.'),
  // Live queue state judges will interact with.
  ev(ago(26), 'usr-sana', 'booking.requested', 'booking', 'bk-102', "Requested the DSLR camera for portfolio photography."),
  ev(ago(3), 'usr-meera', 'booking.approved', 'booking', 'bk-102', "Approved Sana Iqbal's camera booking.", 'Window clear of committed bookings at decision time.'),
  ev(ago(30), 'usr-rohan', 'booking.requested', 'booking', 'bk-104', "Requested the portable projector for the hostel screening."),
  ev(ago(20), 'usr-meera', 'booking.approved', 'booking', 'bk-104', "Approved Rohan Kulkarni's projector booking."),
  ev(ago(2), 'usr-aanya', 'booking.requested', 'booking', 'bk-101', "Requested the DSLR camera for the culture fest shoot."),
  // System trail.
  ev(at(-25, 8), 'system', 'system.seeded', 'system', 'demo', 'Demo dataset initialised with fictional figures and bookings.'),
  // Pages read the log in array order, so keep it chronological.
].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

/* ------------------------------------------------------------ assemble */

export function buildSeedState(): DemoState {
  return {
    version: SEED_VERSION,
    currentUserId: 'usr-aanya',
    users: CURRENT_USERS,
    trainings: CURRENT_TRAININGS,
    resources: CURRENT_RESOURCES,
    bookings: CURRENT_BOOKINGS,
    incidents: CURRENT_INCIDENTS,
    audit: CURRENT_AUDIT,
    maxActiveBookingsPerUser: MAX_ACTIVE_BOOKINGS_PER_USER,
  };
}

/* date helpers (local time anchors) */
function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function ago(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
}
