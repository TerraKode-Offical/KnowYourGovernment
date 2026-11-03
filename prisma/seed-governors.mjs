import { PrismaClient } from '@prisma/client';
const p = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL } } });

// Snapshot of U.S. governors as of April 2026.
// VERIFY = governors that took office after Nov 2025 election or via succession.
// Re-verify this list at least once per year.
const GOVERNORS = [
  { state: "AL", name: "Kay Ivey",                party: "Republican", since: "2017-04-10", termEnds: "2027-01-01" },
  { state: "AK", name: "Mike Dunleavy",           party: "Republican", since: "2018-12-03", termEnds: "2026-12-01" },
  { state: "AZ", name: "Katie Hobbs",             party: "Democrat",   since: "2023-01-02", termEnds: "2027-01-01" },
  { state: "AR", name: "Sarah Huckabee Sanders",  party: "Republican", since: "2023-01-10", termEnds: "2027-01-10" },
  { state: "CA", name: "Gavin Newsom",            party: "Democrat",   since: "2019-01-07", termEnds: "2027-01-01" },
  { state: "CO", name: "Jared Polis",             party: "Democrat",   since: "2019-01-08", termEnds: "2027-01-12" },
  { state: "CT", name: "Ned Lamont",              party: "Democrat",   since: "2019-01-09", termEnds: "2027-01-06" },
  { state: "DE", name: "Matt Meyer",              party: "Democrat",   since: "2025-01-21", termEnds: "2029-01-15" },
  { state: "DC", name: "Muriel Bowser",           party: "Democrat",   since: "2015-01-02", termEnds: "2027-01-02" },
  { state: "FL", name: "Ron DeSantis",            party: "Republican", since: "2019-01-08", termEnds: "2027-01-05" },
  { state: "GA", name: "Brian Kemp",              party: "Republican", since: "2019-01-14", termEnds: "2027-01-11" },
  { state: "HI", name: "Josh Green",              party: "Democrat",   since: "2022-12-05", termEnds: "2026-12-07" },
  { state: "ID", name: "Brad Little",             party: "Republican", since: "2019-01-07", termEnds: "2027-01-04" },
  { state: "IL", name: "JB Pritzker",             party: "Democrat",   since: "2019-01-14", termEnds: "2027-01-11" },
  { state: "IN", name: "Mike Braun",              party: "Republican", since: "2025-01-13", termEnds: "2029-01-08" },
  { state: "IA", name: "Kim Reynolds",            party: "Republican", since: "2017-05-24", termEnds: "2027-01-15" },
  { state: "KS", name: "Laura Kelly",             party: "Democrat",   since: "2019-01-14", termEnds: "2027-01-11" },
  { state: "KY", name: "Andy Beshear",            party: "Democrat",   since: "2019-12-10", termEnds: "2027-12-14" },
  { state: "LA", name: "Jeff Landry",             party: "Republican", since: "2024-01-08", termEnds: "2028-01-10" },
  { state: "ME", name: "Janet Mills",             party: "Democrat",   since: "2019-01-02", termEnds: "2027-01-06" },
  { state: "MD", name: "Wes Moore",               party: "Democrat",   since: "2023-01-18", termEnds: "2027-01-20" },
  { state: "MA", name: "Maura Healey",            party: "Democrat",   since: "2023-01-05", termEnds: "2027-01-07" },
  { state: "MI", name: "Gretchen Whitmer",        party: "Democrat",   since: "2019-01-01", termEnds: "2027-01-01" },
  { state: "MN", name: "Tim Walz",                party: "Democrat",   since: "2019-01-07", termEnds: "2027-01-04" },
  { state: "MS", name: "Tate Reeves",             party: "Republican", since: "2020-01-14", termEnds: "2028-01-11" },
  { state: "MO", name: "Mike Kehoe",              party: "Republican", since: "2025-01-13", termEnds: "2029-01-08" },
  { state: "MT", name: "Greg Gianforte",          party: "Republican", since: "2021-01-04", termEnds: "2029-01-01" },
  { state: "NE", name: "Jim Pillen",              party: "Republican", since: "2023-01-05", termEnds: "2027-01-07" },
  { state: "NV", name: "Joe Lombardo",            party: "Republican", since: "2023-01-02", termEnds: "2027-01-04" },
  { state: "NH", name: "Kelly Ayotte",            party: "Republican", since: "2025-01-09", termEnds: "2027-01-07" },
  // VERIFY: Mikie Sherrill won NJ gov Nov 2025, took office Jan 2026.
  { state: "NJ", name: "Mikie Sherrill",          party: "Democrat",   since: "2026-01-20", termEnds: "2030-01-21" },
  { state: "NM", name: "Michelle Lujan Grisham",  party: "Democrat",   since: "2019-01-01", termEnds: "2027-01-01" },
  { state: "NY", name: "Kathy Hochul",            party: "Democrat",   since: "2021-08-24", termEnds: "2027-01-01" },
  { state: "NC", name: "Josh Stein",              party: "Democrat",   since: "2025-01-01", termEnds: "2029-01-01" },
  { state: "ND", name: "Kelly Armstrong",         party: "Republican", since: "2024-12-15", termEnds: "2028-12-15" },
  { state: "OH", name: "Mike DeWine",             party: "Republican", since: "2019-01-14", termEnds: "2027-01-11" },
  { state: "OK", name: "Kevin Stitt",             party: "Republican", since: "2019-01-14", termEnds: "2027-01-11" },
  { state: "OR", name: "Tina Kotek",              party: "Democrat",   since: "2023-01-09", termEnds: "2027-01-11" },
  { state: "PA", name: "Josh Shapiro",            party: "Democrat",   since: "2023-01-17", termEnds: "2027-01-19" },
  { state: "RI", name: "Dan McKee",               party: "Democrat",   since: "2021-03-02", termEnds: "2027-01-05" },
  { state: "SC", name: "Henry McMaster",          party: "Republican", since: "2017-01-24", termEnds: "2027-01-11" },
  { state: "SD", name: "Larry Rhoden",            party: "Republican", since: "2025-01-25", termEnds: "2027-01-04" },
  { state: "TN", name: "Bill Lee",                party: "Republican", since: "2019-01-19", termEnds: "2027-01-16" },
  { state: "TX", name: "Greg Abbott",             party: "Republican", since: "2015-01-20", termEnds: "2027-01-19" },
  { state: "UT", name: "Spencer Cox",             party: "Republican", since: "2021-01-04", termEnds: "2029-01-01" },
  { state: "VT", name: "Phil Scott",              party: "Republican", since: "2017-01-05", termEnds: "2027-01-07" },
  // VERIFY: Abigail Spanberger won VA gov Nov 2025.
  { state: "VA", name: "Abigail Spanberger",      party: "Democrat",   since: "2026-01-17", termEnds: "2030-01-18" },
  { state: "WA", name: "Bob Ferguson",            party: "Democrat",   since: "2025-01-15", termEnds: "2029-01-10" },
  { state: "WV", name: "Patrick Morrisey",        party: "Republican", since: "2025-01-13", termEnds: "2029-01-15" },
  { state: "WI", name: "Tony Evers",              party: "Democrat",   since: "2019-01-07", termEnds: "2027-01-04" },
  { state: "WY", name: "Mark Gordon",             party: "Republican", since: "2019-01-07", termEnds: "2027-01-04" },
];

async function run() {
  console.log('Seeding ' + GOVERNORS.length + ' governors...');
  let inserted = 0, updated = 0, skipped = 0;
  for (const g of GOVERNORS) {
    const state = await p.state.findUnique({ where: { abbreviation: g.state } });
    if (!state) { skipped++; console.log('  skip ' + g.state + ': state not found'); continue; }

    const existing = await p.candidate.findFirst({
      where: { stateId: state.id, officeType: 'GOVERNOR' },
      select: { id: true },
    });

    const data = {
      name: g.name,
      party: g.party,
      stateId: state.id,
      officeType: 'GOVERNOR',
      isIncumbent: true,
      incumbentSince: new Date(g.since),
      termEnds: new Date(g.termEnds),
      lastVerifiedAt: new Date(),
    };

    if (existing) {
      await p.candidate.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await p.candidate.create({ data });
      inserted++;
    }
  }
  console.log(`Done. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

  // Verify
  const total = await p.candidate.count({ where: { officeType: 'GOVERNOR', isIncumbent: true } });
  console.log('\nGovernor rows in DB: ' + total);
}

run().catch(e => { console.error('ERR:', e.message); console.error(e.stack); process.exit(1); }).finally(() => p.$disconnect());
