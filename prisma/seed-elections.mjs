import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } } });

// Nov 3, 2026 — U.S. general / midterm election day. Every state has a
// federal general election (US House) and many have Senate, gubernatorial,
// and state-legislative races. One row per state.
const GENERAL_ELECTION_DATE = new Date("2026-11-03T00:00:00.000Z");

// Major 2026 state PRIMARY dates. Primary schedules are set by each state.
// This list covers states where the date is well-established in advance.
// Not exhaustive — sync-elections will fill in others over time.
const PRIMARY_DATES = {
  TX: "2026-03-03", // Primary
  IL: "2026-03-17",
  OH: "2026-05-05",
  IN: "2026-05-05",
  NC: "2026-03-03",
  PA: "2026-05-19",
  OR: "2026-05-19",
  GA: "2026-05-19",
  KY: "2026-05-19",
  ID: "2026-05-19",
  NE: "2026-05-12",
  VA: "2026-06-16",
  ME: "2026-06-09",
  NM: "2026-06-02",
  IA: "2026-06-02",
  NJ: "2026-06-02",
  MT: "2026-06-02",
  SD: "2026-06-02",
  OK: "2026-06-23",
  UT: "2026-06-23",
  MD: "2026-06-23",
  CO: "2026-06-30",
  NY: "2026-06-23",
  TN: "2026-08-04",
  KS: "2026-08-04",
  MI: "2026-08-04",
  WA: "2026-08-04",
  MO: "2026-08-04",
  MN: "2026-08-11",
  CT: "2026-08-11",
  VT: "2026-08-11",
  WI: "2026-08-11",
  FL: "2026-08-18",
  AK: "2026-08-18",
  WY: "2026-08-18",
  AZ: "2026-08-04",
  MS: "2026-08-04",
  HI: "2026-08-08",
  MA: "2026-09-08",
  NH: "2026-09-08",
  RI: "2026-09-08",
  DE: "2026-09-08",
  CA: "2026-06-02",
  AL: "2026-06-02",
  AR: "2026-05-19",
  WV: "2026-05-12",
  NV: "2026-06-09",
  ND: "2026-06-09",
  LA: "2026-11-03", // Louisiana uses a jungle primary on general election day
  SC: "2026-06-09",
};

async function run() {
  // ── C5: seed 2026 GENERAL election for each jurisdiction ──────────────────
  console.log('=== C5: 2026 general + primary elections ===');
  const states = await p.state.findMany();
  console.log('  ' + states.length + ' jurisdictions to process');

  let generalsInserted = 0, primariesInserted = 0, generalsSkipped = 0;
  for (const s of states) {
    // General election — everyone gets one
    const existingGen = await p.election.findFirst({
      where: {
        stateId: s.id,
        electionType: 'GENERAL',
        date: GENERAL_ELECTION_DATE,
      },
    });
    if (!existingGen) {
      await p.election.create({
        data: {
          name: `${s.name} 2026 General Election`,
          date: GENERAL_ELECTION_DATE,
          electionType: 'GENERAL',
          stateId: s.id,
          description: 'U.S. House, one-third of U.S. Senate, and state offices on the ballot.',
        },
      });
      generalsInserted++;
    } else {
      generalsSkipped++;
    }

    // Primary election — only states in the PRIMARY_DATES list
    const primaryDateStr = PRIMARY_DATES[s.abbreviation];
    if (primaryDateStr) {
      const primaryDate = new Date(primaryDateStr + 'T00:00:00.000Z');
      const existingPri = await p.election.findFirst({
        where: {
          stateId: s.id,
          electionType: 'PRIMARY',
          date: primaryDate,
        },
      });
      if (!existingPri) {
        await p.election.create({
          data: {
            name: `${s.name} 2026 Primary Election`,
            date: primaryDate,
            electionType: 'PRIMARY',
            stateId: s.id,
            description: 'Party primary for federal and state offices.',
          },
        });
        primariesInserted++;
      }
    }
  }
  console.log('  Generals inserted: ' + generalsInserted + ' (skipped ' + generalsSkipped + ' already present)');
  console.log('  Primaries inserted: ' + primariesInserted);

  // ── C6: create ELECTION_DAY deadlines for every state that has VoterInfo ──
  console.log('\n=== C6: voter deadlines ===');

  // Ensure DC has a VoterInfo row
  const dcState = states.find(s => s.abbreviation === 'DC');
  if (dcState) {
    const dcVi = await p.voterInfo.findFirst({ where: { stateId: dcState.id } });
    if (!dcVi) {
      await p.voterInfo.create({
        data: {
          stateId: dcState.id,
          onlineRegistration: true,
          sameDayRegistration: true,
          stateElectionWebsite: 'https://dcboe.org',
          stateSOSName: 'DC Board of Elections',
        },
      });
      console.log('  Created VoterInfo row for DC');
    }
  }

  const voterInfos = await p.voterInfo.findMany({
    include: { state: { select: { abbreviation: true } } },
  });

  let deadlinesInserted = 0;
  for (const vi of voterInfos) {
    const general = await p.election.findFirst({
      where: { stateId: vi.stateId, electionType: 'GENERAL', date: GENERAL_ELECTION_DATE },
    });
    if (!general) continue;

    // ELECTION_DAY deadline — Nov 3 2026
    const existing = await p.voterInfoDeadline.findFirst({
      where: {
        voterInfoId: vi.id,
        electionId: general.id,
        deadlineType: 'ELECTION_DAY',
      },
    });
    if (!existing) {
      await p.voterInfoDeadline.create({
        data: {
          voterInfoId: vi.id,
          electionId: general.id,
          deadlineType: 'ELECTION_DAY',
          deadlineDate: GENERAL_ELECTION_DATE,
          notes: 'General election day',
        },
      });
      deadlinesInserted++;
    }

    // REGISTRATION deadline — if VoterInfo has a registrationDeadline set,
    // use it; otherwise use a default of 22 days before election.
    const regDate = vi.registrationDeadline ?? new Date('2026-10-12T00:00:00.000Z');
    const existingReg = await p.voterInfoDeadline.findFirst({
      where: {
        voterInfoId: vi.id,
        electionId: general.id,
        deadlineType: 'REGISTRATION',
      },
    });
    if (!existingReg) {
      await p.voterInfoDeadline.create({
        data: {
          voterInfoId: vi.id,
          electionId: general.id,
          deadlineType: 'REGISTRATION',
          deadlineDate: regDate,
          notes: vi.registrationDeadline
            ? null
            : 'Default: 22 days before election. Verify your state\'s actual deadline.',
        },
      });
      deadlinesInserted++;
    }

    // ABSENTEE_RETURN deadline if absenteeDeadline is known
    if (vi.absenteeDeadline) {
      const existingAbs = await p.voterInfoDeadline.findFirst({
        where: {
          voterInfoId: vi.id,
          electionId: general.id,
          deadlineType: 'ABSENTEE_RETURN',
        },
      });
      if (!existingAbs) {
        await p.voterInfoDeadline.create({
          data: {
            voterInfoId: vi.id,
            electionId: general.id,
            deadlineType: 'ABSENTEE_RETURN',
            deadlineDate: vi.absenteeDeadline,
          },
        });
        deadlinesInserted++;
      }
    }

    // EARLY_VOTING_START/END if known
    if (vi.earlyVotingStart) {
      const existing = await p.voterInfoDeadline.findFirst({
        where: { voterInfoId: vi.id, electionId: general.id, deadlineType: 'EARLY_VOTING_START' },
      });
      if (!existing) {
        await p.voterInfoDeadline.create({
          data: {
            voterInfoId: vi.id,
            electionId: general.id,
            deadlineType: 'EARLY_VOTING_START',
            deadlineDate: vi.earlyVotingStart,
          },
        });
        deadlinesInserted++;
      }
    }
    if (vi.earlyVotingEnd) {
      const existing = await p.voterInfoDeadline.findFirst({
        where: { voterInfoId: vi.id, electionId: general.id, deadlineType: 'EARLY_VOTING_END' },
      });
      if (!existing) {
        await p.voterInfoDeadline.create({
          data: {
            voterInfoId: vi.id,
            electionId: general.id,
            deadlineType: 'EARLY_VOTING_END',
            deadlineDate: vi.earlyVotingEnd,
          },
        });
        deadlinesInserted++;
      }
    }
  }
  console.log('  Deadlines inserted: ' + deadlinesInserted);

  // Verify
  const elecCount = await p.election.count({ where: { date: { gte: new Date() } } });
  const dlCount = await p.voterInfoDeadline.count({ where: { deadlineDate: { gte: new Date() } } });
  console.log('\n=== Verification ===');
  console.log('  Upcoming elections in DB: ' + elecCount);
  console.log('  Upcoming voter deadlines: ' + dlCount);
}

run().catch(e => { console.error('ERR:', e.message); console.error(e.stack); process.exit(1); }).finally(() => p.$disconnect());
