// Sample data for ?demo mode. Fictional names only: this repo is public.
export function demoValueRanges() {
  const d = new Date();
  const today = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
  const wedding = today + 351;
  const tasks = [
    ['12+ months', 'Discuss top 3 priorities with partner', 395, 'Not started', '', '', 'A 30-minute chat this week: it decides how the budget splits.'],
    ['12+ months', 'Set total budget and who\'s contributing', 390, 'In progress', 'Both', '', ''],
    ['12+ months', 'Draft guest list and headcount', 385, 'Done', 'Both', '', ''],
    ['12+ months', 'Tour and book venue', 365, 'Not started', 'Sharon', 'Shortlist: Barn A, Loft B', 'Top priority: it blocks caterer, rentals and hotel blocks.'],
    ['12+ months', 'Book officiant', 360, 'Not started', '', '', ''],
    ['9–12 months', 'Trim guest list (move extras to B-list)', 337, 'Not started', 'Claire', '', ''],
    ['9–12 months', 'Book photographer', 330, 'Not started', 'Claire', '', 'Fall Saturdays book about a year out.'],
    ['9–12 months', 'Book caterer (if not in-house)', 320, 'Not started', '', '', ''],
    ['9–12 months', 'Collect guest mailing addresses', 300, 'Not started', '', '', ''],
    ['9–12 months', 'Book Friday welcome dinner', 270, 'Not started', '', '', ''],
    ['6–9 months', 'Shop for and order attire', 250, 'Not started', 'Both', '', ''],
    ['6–9 months', 'Book Sunday café buyout', 240, 'Not started', '', '', ''],
    ['3–6 months', 'Order invitations and stationery', 150, 'Not started', '', '', ''],
    ['3–6 months', 'Bad-weather plan', 120, 'Not started', '', '', ''],
    ['1–2 months', 'Seating chart', 18, 'Not started', '', '', ''],
  ].map((t, i) => [t[0], t[1], t[2], wedding - t[2], '', t[3], t[4], t[5], t[6], `T${i + 1}`]);
  const first = ['Avery', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Drew', 'Jamie', 'Skyler', 'Rowan', 'Parker', 'Emerson', 'Hayden', 'Reese', 'Blake', 'Cameron', 'Dakota', 'Elliot'];
  const last = ['Brooks', 'Lee', 'Rivera', 'Kim', 'Patel', 'Nguyen', 'Chen', 'Adams'];
  const guests = Array.from({ length: 48 }, (_, i) => [i + 1, i % 6 === 5 ? 'B' : 'A', `${first[i % first.length]} ${last[i % last.length]}`, i % 3 === 0 ? 'Sharon' : 'Claire',
    ['College', 'Family', 'Work', 'Denver friends'][i % 4], '', i % 4 === 0 ? '123 Example St' : '', '', i < 5 ? 'Yes' : i === 5 ? 'No' : '', '', '', '', '']);
  // sample parties: a couple, a +1, and a same-surname pair left unlinked (shows as a suggestion)
  guests[1][2] = 'Jordan Lee (Avery)'; guests[0].push('Avery Brooks'); guests[1].push('Avery Brooks');
  guests[3][2] = 'Taylor Kim - Guest'; guests[2][2] = 'Taylor Kim'; guests[2].push('Taylor Kim'); guests[3].push('Taylor Kim');
  guests[3][3] = guests[2][3];
  guests[7][2] = 'Quinn Adams'; guests[10][2] = 'Skyler Adams'; guests[7][3] = 'Claire'; guests[10][3] = 'Claire';
  const vendors = [
    ['Friday', 'Welcome dinner (restaurant)', '', '', '', '', '', '', '', '', '', '', ''],
    ['Saturday', 'Venue', 'Example Barn', 'Alex', 'alex@example.com', 'Yes', 9000, 2500, 0, '', wedding - 60, 0.4167, 'Includes tables and chairs'],
    ['Saturday', 'Photographer', 'Example Studio', 'Pat', '', 'Pending', 4800, '', '', '', '', '', ''],
    ['Saturday', 'Caterer', '', '', '', '', '', '', '', '', '', '', ''],
    ['Saturday', 'Florist', '', '', '', '', '', '', '', '', '', '', ''],
    ['Saturday', 'Band / DJ', '', '', '', '', '', '', '', '', '', '', ''],
    ['All', 'Coordinator', '', '', '', '', '', '', '', '', '', '', ''],
    ['Sunday', 'Café buyout', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  const budget = [
    ['Venue & rentals', 0.25, '', 9000, 2500], ['Catering & bar', 0.25, '', 21000, ''], ['Photography & video', 0.12, '', 4800, ''],
    ['Attire & beauty', 0.07, '', '', 600], ['Flowers & decor', 0.08], ['Music / entertainment', 0.06], ['Rings', 0.03],
    ['Stationery & postage', 0.02], ['Cake & desserts', 0.02], ['Officiant & license', 0.01], ['Transportation', 0.02],
    ['Favors & gifts', 0.02], ['Tips', 0.02], ['Buffer / unexpected', 0.03], ['Day-of coordinator', 0.0225], ['Friday welcome dinner & drinks', 0.07], ['Sunday café buyout', 0.03],
    [], ['TOTAL'],
  ];
  const quotes = [
    ['Q1', 'Photographer', 'Example Studio', 'Booked', 4800, today - 10, today + 20, '8 hours, 2 shooters, online gallery', '8 hours', '30% deposit, rest 30 days before', 'Deposit non-refundable', '$400/hour overtime', 'pat@example.com', 'Solid value; overtime is pricey if the reception runs long.', ''],
    ['Q2', 'Photographer', 'Sample Photo Co', 'Shortlisted', 5600, today - 6, today + 9, '10 hours, 2 shooters, engagement session, album', '10 hours', '$1,000 deposit, rest 2 weeks before', 'Refundable until 6 months out', 'Travel fee $150', 'hello@example.com', 'Most complete package; includes the engagement shoot.', ''],
    ['Q3', 'Caterer', 'Demo Catering', 'New', 21000, today - 3, today + 30, 'Dinner buffet, staff, rentals', '100 guests', '25% deposit, 50% at 90 days, rest 2 weeks before', '50% refund until 90 days', '20% service fee not included', 'events@example.com', 'Priced for 100 guests: at 140 this is closer to $29k plus service fee.', ''],
  ];
  const payments = [
    ['Example Barn', 'Venue', 'Second installment', 3250, today + 20, 'Planned', '', '', ''],
    ['Example Barn', 'Venue', 'Final payment', 3250, wedding - 60, 'Planned', '', '', ''],
    ['Example Studio', 'Photographer', 'Deposit (30%)', 1440, today + 5, 'Planned', '', '', 'Q1'],
    ['Example Studio', 'Photographer', 'Balance', 3360, wedding - 30, 'Planned', '', '', 'Q1'],
  ];
  return [
    { values: [[wedding], [80000], [100], ['Denver']] },
    { values: tasks }, { values: budget }, { values: guests }, { values: vendors },
    { values: [[today - 1.3, 'T4', 'Tour and book venue', 'Claire', 'Called Example Barn: they have the date open, waiting on the contract.']] },
    { values: [[today - 2, 'Sharon', 'Got it', 'T3', 'Guest list is over the target.', "We're fine with ~140, the budget accounts for it."]] },
    { values: quotes }, { values: payments }, { values: [] },
  ];
}
