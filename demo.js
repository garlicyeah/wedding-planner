// Sample data for ?demo mode. Fictional names only: this repo is public.
export function demoValueRanges() {
  const d = new Date();
  const today = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
  const wedding = today + 351;
  const tasks = [
    ['12+ months', 'Discuss top 3 priorities with partner', 395, 'Not started', '', '', 'Do this before touring venues: it decides how the budget splits.'],
    ['12+ months', 'Set total budget and who\'s contributing', 390, 'In progress', 'Both', '', ''],
    ['12+ months', 'Draft guest list and headcount', 385, 'Done', 'Both', '', ''],
    ['12+ months', 'Tour and book venue', 365, 'Not started', 'Sharon', 'Shortlist: Barn A, Loft B', 'Most overdue, and it blocks caterer, rentals and hotel blocks. Pick venues that fit your real guest count.'],
    ['12+ months', 'Book officiant', 360, 'Not started', '', '', ''],
    ['12+ months', 'Hire planner or day-of coordinator (optional)', 355, 'Not started', '', '', ''],
    ['9–12 months', 'Book photographer', 330, 'Not started', 'Claire', '', 'Popular fall dates book 12+ months out. Start inquiries this week.'],
    ['9–12 months', 'Book caterer (if not in-house)', 320, 'Not started', '', '', ''],
    ['9–12 months', 'Book band / DJ', 310, 'Not started', '', '', ''],
    ['6–9 months', 'Shop for and order attire', 250, 'Not started', 'Both', '', ''],
    ['3–6 months', 'Order invitations and stationery', 150, 'Not started', '', '', ''],
    ['1–2 months', 'Seating chart', 18, 'Not started', '', '', ''],
  ].map((t, i) => [t[0], t[1], t[2], wedding - t[2], '', t[3], t[4], t[5], t[6], `T${i + 1}`]);
  const names = ['Avery Brooks', 'Jordan Lee', 'Sam Rivera', 'Taylor Kim', 'Morgan Patel', 'Casey Nguyen', 'Riley Chen', 'Quinn Adams', 'Drew Carter', 'Jamie Ortiz', 'Skyler Reed', 'Rowan Hayes', 'Parker Ellis', 'Emerson Gray', 'Hayden Cole', 'Reese Park'];
  const guests = names.map((n, i) => [i + 1, i % 5 === 4 ? 'B' : 'A', n, i % 2 ? 'Claire' : 'Sharon', ['College', 'Family', 'Work', 'Denver friends'][i % 4], '', '', '', i < 3 ? 'Yes' : i === 3 ? 'No' : '', '', '', '', '']);
  const vendors = [
    ['Saturday', 'Venue', 'Example Barn', 'Alex', 'alex@example.com', 'Pending', 9000, 0, 0, '', wedding - 60, 0.4167, 'Quote includes tables and chairs'],
    ['Saturday', 'Photographer', 'Example Studio', '', '', 'No', 4800, '', '', '', '', '', 'Holding the date until Friday'],
    ['Saturday', 'Caterer', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  const budget = [
    ['Venue & rentals', 0.25, '', 9000, ''], ['Catering & bar', 0.25, '', '', ''], ['Photography & video', 0.12, '', 4800, ''],
    ['Attire & beauty', 0.07, '', '', 600], ['Flowers & decor', 0.08], ['Music / entertainment', 0.06], ['Rings', 0.03],
    ['Stationery & postage', 0.02], ['Cake & desserts', 0.02], ['Officiant & license', 0.01], ['Transportation', 0.02],
    ['Favors & gifts', 0.02], ['Tips', 0.02], ['Buffer / unexpected', 0.03],
  ];
  return [
    { values: [[wedding], [80000], [100], ['Denver']] },
    { values: tasks },
    { values: budget },
    { values: guests },
    { values: vendors },
    { values: [[today - 1.3, 'T4', 'Tour and book venue', 'Claire', 'Called Example Barn: they have Nov 6 open, waiting on the contract.']] },
    { values: [[today - 2, 'Sharon', 'Got it', 'T3', 'Guest list is over the target.', "We're fine with ~140, the budget accounts for it."]] },
  ];
}
