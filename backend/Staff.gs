/**
 * Nikadi Guest House — Staff app backend (rooms, bills, stock, cleaning)
 * GENERATED from staff/logic.js + staff/bill.js + staff/backend-adapter.gs.txt by tools/build-staff.py. Do not edit by hand.
 * Add this as a second file (Staff.gs) next to Code.gs in the same Apps Script project.
 */

/* Nikadi Staff — shared business logic.
   The same file runs in two places:
     1. In the browser, for demo mode (data kept on this phone only).
     2. In Google Apps Script, where tools/build-staff.py copies it into backend/Staff.gs.
   It never touches a sheet or the browser directly: it only uses the small `db` object it is given. */

var DESK_TZ_MIN = 330; // India Standard Time, UTC+5:30 (no daylight saving)
var DESK_MAX_COMPANIONS = 9; // names of the other guests in a room (up to 10 people with the main guest)
var DESK_MAX_GUESTS = 20; // people allowed in one room (rooms normally sleep 3; extra mattresses let more stay)
/* Free things housekeeping gives every staying room each day from the 2nd day (water etc.). The Items sheet column
   "Free daily per room" overrides this when filled in. */
var DESK_DAILY_FREE = { 'Water bottle': 2 };
/* Housekeeping checklists: every line must be ticked (or an option picked) before "Done" / "Room ready" works.
   [key, label, options]: no options = a tick; with options = pick one. */
/* Lines with a 4th part are linen: "Put fresh" asks how many of each were changed (fresh ones come out of the clean store,
   the used ones go to "used, waiting for laundry"); "Kept the used ones" changes nothing in the linen count. */
var DESK_HK_FRESH = 'Put fresh', DESK_HK_KEPT = 'Kept the used ones (tidied)';
var DESK_HK_WATER = ['No water needed', '1 given', '2 given', '3 given', '4 given'];
var DESK_EXTRA_NOTE = 'Extra bedding and towels'; // extra linen given to a staying guest: written on the room, never on the bill
var DESK_HK_STAY = [['water', 'Water bottles', DESK_HK_WATER], ['towels', 'Towels', [DESK_HK_FRESH, DESK_HK_KEPT], { 'Towel': 2, 'Bath mat': 1 }], ['dental', 'Dental kit', ['Not needed', '1 given', '2 given', '3 given']],
  ['bathroom', 'Bathroom cleaned'], ['binRoom', 'Dustbin in the room checked'], ['binToilet', 'Dustbin in the toilet checked'], ['floor', 'Floor cleaned'],
  ['bedding', 'Bedsheet, pillow covers, blanket cover', [DESK_HK_FRESH, DESK_HK_KEPT], { 'Bedsheet (king size)': 1, 'Pillow cover': 2, 'Blanket cover (king size)': 1 }]];
var DESK_HK_OUT = [['water', 'Water bottles put in the room', DESK_HK_WATER], ['towels', 'Towels', [DESK_HK_FRESH, DESK_HK_KEPT], { 'Towel': 2, 'Bath mat': 1 }], ['kit', 'Used dental kit / toiletries removed'], ['bathroom', 'Bathroom cleaned'],
  ['binRoom', 'Dustbin in the room emptied'], ['binToilet', 'Dustbin in the toilet emptied'], ['floor', 'Floor cleaned'],
  ['bedding', 'Bedsheet, pillow covers, blanket cover', [DESK_HK_FRESH, DESK_HK_KEPT], { 'Bedsheet (king size)': 1, 'Pillow cover': 2, 'Blanket cover (king size)': 1 }]];
/* Linen (bedding and towels): counted in 4 places. [item, laundry price per piece ₹ (the owner sets the real prices in the app)] */
var DESK_LINEN_GROUPS = ['Mattresses', 'Pillows', 'Bedsheets', 'Blankets & bed covers', 'Towels & bath mats', 'Other'];
/* [item, laundry price ₹, folder, goes to the laundry (shown in laundry lists)] */
var DESK_LINEN = [['Mattress (king size)', 0, 'Mattresses', 0], ['Mattress (single)', 0, 'Mattresses', 0], ['Extra mattress (king size)', 0, 'Mattresses', 0], ['Extra mattress (single)', 0, 'Mattresses', 0],
  ['Pillow', 0, 'Pillows', 1], ['Pillow cover', 0, 'Pillows', 1],
  ['Bedsheet (king size)', 0, 'Bedsheets', 1], ['Bedsheet (single)', 0, 'Bedsheets', 1],
  ['Blanket (king size)', 0, 'Blankets & bed covers', 0], ['Blanket (single)', 0, 'Blankets & bed covers', 0], ['Blanket cover (king size)', 0, 'Blankets & bed covers', 1], ['Blanket cover (single)', 0, 'Blankets & bed covers', 1],
  ['Bed cover', 0, 'Blankets & bed covers', 1], ['Bed runner', 0, 'Blankets & bed covers', 1],
  ['Towel', 0, 'Towels & bath mats', 1], ['Hand towel', 0, 'Towels & bath mats', 1], ['Bath mat', 0, 'Towels & bath mats', 1]];
var DESK_LINEN_RENAME = { 'Bedsheet (double)': 'Bedsheet (king size)', 'Duvet': 'Blanket (king size)', 'Single duvet': 'Blanket (single)', 'Duvet cover': 'Blanket cover (king size)', 'Mattress': 'Mattress (king size)', 'Extra mattress': 'Extra mattress (single)',
  'Duvet (king size)': 'Blanket (king size)', 'Duvet (single)': 'Blanket (single)', 'Duvet cover (king size)': 'Blanket cover (king size)', 'Duvet cover (single)': 'Blanket cover (single)' };
var DESK_LINEN_GROUP_RENAME = { 'Duvets & bed covers': 'Blankets & bed covers' };
var DESK_LINEN_VERSION = '2'; // bump to run linenAll's one-time update again (renames, new default items, laundry flags)
var DESK_LINEN_PLACES = { store: 'Clean in store', rooms: 'In rooms', dirty: 'Used, waiting for laundry', laundry: 'At the laundry' };
/* Free stays (no charge): whose guest they are. Items given are still counted and taken from stock, at ₹0. */
var DESK_COMP_HOSTS = ['AGD Guest', "Prahlad's Guest", "Debarun's Guest"];
var DESK_FREE_WATER = 2; // free water bottles every room gets at check-in (taken from stock automatically)
var DESK_BILL_URL = 'https://www.nikadiguesthouse.com/bill/?id='; // the QR code on every bill opens this + the bill's secret id
var DESK_BILL_DELAY_HOURS = 12; // the bill is emailed automatically this long after check-out
var DESK_BILL_PREFIX = 'NGH';
/* Late check-out: check-out is by 9:00 AM. Prices for staying on (used in the check-out reminder and the bill).
   If a guest is still in the room at 9:30 AM on check-out day, the timer adds the first step (₹500) to the bill by itself.
   The front desk can change it to ₹1,000 / ₹1,500 or any amount, make it free, or remove it (no manager approval needed for this automatic line). */
var DESK_CHECKOUT_TIME = '09:00', DESK_LATE_GRACE = '09:30'; // check-out by 9:00; ₹500 goes on the bill only after 9:30 (30 minutes' grace)
var DESK_LATE_OUT = [{ till: '10:00', label: '10 AM', price: 500 }, { till: '11:00', label: '11 AM', price: 1000 }, { till: '12:00', label: '12 noon', price: 1500 }];
var DESK_LATE_ITEM = 'Late checkout', DESK_LATE_BY = 'Automatic';
/* Still in the room after 12 noon: the full room price for one more day is added by itself (the ₹500–₹1,500 late check-out line comes off). Editable and removable. */
var DESK_LATE_FULL_TIME = '12:00', DESK_LATE_FULL_ITEM = 'Late checkout (full day)', DESK_LATE_FULL_BY = 'Automatic (12 noon)';
/* Fine: added by the front desk for breaking the house rules the guest signed at check-in. Printed in red on the bill. No GST (a penalty, not a service). */
var DESK_FINE_ITEM = 'Fine', DESK_FINE_AMOUNT = 2000, DESK_FINE_TEXT = 'For violating the terms and conditions of Nikadi Guest House, signed by the guest';
/* WhatsApp (Meta WhatsApp Cloud API). Message wordings are approved by Meta as templates with these names. */
var DESK_WA = { welcome: 'nikadi_welcome', membership: 'nikadi_membership', booking: 'nikadi_booking_confirmed', bill: 'nikadi_bill', lang: 'en' };
/* Expenses: categories in groups. 'shop' fills the shop / payee automatically. 'stock' links the purchase to a stock item. */
var DESK_EXPENSE_CATS = [
  ['Utilities', [['Electricity bill', { shop: 'WBSEDCL (West Bengal State Electricity Distribution Co. Ltd., Govt. of West Bengal)' }], ['Drinking water purchase (jars)'], ['Water bill'], ['Gas cylinder (LPG)'], ['Internet / Wi-Fi'], ['Mobile recharge'], ['Generator / inverter fuel']]],
  ['Guest supplies', [['Water bottles', { stock: 'Water bottle' }], ['Dental kits', { stock: 'Dental kit' }], ['Soap'], ['Shampoo sachets'], ['Toilet tissue paper', { stock: 'Toilet roll' }], ['Mosquito repellent'], ['Towels'], ['Bedsheets / pillow covers'], ['Slippers'], ['Morning kit', { stock: 'Morning kit' }]]],
  ['Cleaning', [['Floor cleaning liquid'], ['Toilet cleaner'], ['Phenyl'], ['Broom'], ['Mop'], ['Bucket / mug'], ['Garbage bags'], ['Air freshener'], ['Detergent / washing powder'], ['Glass cleaner']]],
  ['Room items & repairs', [['Kettle'], ['Bulbs / electrical items'], ['Fan / AC repair'], ['Plumbing repair'], ['Furniture'], ['Mattress'], ['Painting / maintenance'], ['TV / remote / batteries']]],
  ['Staff', [['Staff salary'], ['Staff advance'], ['Staff food / tea']]],
  ['Other', [['Laundry service'], ['Stationery / printing'], ['Transport / fuel'], ['Pooja items / flowers'], ['Taxes / licence fees'], ['Bank charges'], ['Other']]]
];
var DESK_COMMISSION_TYPES = ['Driver', 'Broker', 'Agent', 'Other'];
var DESK_JOIN_URL = 'https://www.nikadiguesthouse.com/app/?join=1';
/* Old GPS log-in/log-out attendance (replaced by Wi-Fi attendance on 14 Nov 2026; kept so old records still read). */
var DESK_ATTEND_ROLES = [];
/* Wi-Fi attendance: everyone except the Owner. The first and last time the app is opened on the guest house Wi-Fi each day = entry and exit. */
var DESK_WIFI_ROLES = ['Manager', 'Receptionist', 'Staff'];
var DESK_ATTEND_RADIUS = 200; // metres from the guest house that count as "At the guest house" (plus the reading's own accuracy) // invoice numbers: NGH/26-27/0001 (restarts every financial year, 1 April)
/* Government codes for things sold to rooms. Used when the Items sheet has no code of its own.
   [HSN/SAC, GST %, unit, name printed on the bill] */
var DESK_HSN = {
  'Water bottle': ['2201', 5, 'Btl', 'Packaged drinking water (1 L)'],
  'Dental kit': ['3306', 5, 'Nos', 'Dental kit'],
  'Extra mattress': ['996311', 5, 'Nos', 'Extra mattress'],
  'Late checkout': ['996311', 5, 'Nos', 'Late check-out'],
  'Late checkout (full day)': ['996311', 5, 'Day', 'Late check-out after 12 noon (full day)'],
  'Fine': ['', 0, 'Nos', 'Fine'],
  'Laundry': ['999712', 5, 'Pcs', 'Laundry'],
  _default: ['996311', 5, 'Nos', '']
};
var DESK_POLICY = {
  advancePct: 50,      // advance needed to confirm a booking
  freeCancelDays: 3,   // cancel at least this many days before check-in = full refund of the advance
  text: 'To confirm a booking we need an advance of 50% of the total room price. Cancel 3 or more days before check-in and we refund the full advance. ' +
    'Cancellations less than 3 days before check-in, on the day of arrival, or no-shows are not refunded, and the advance cannot be moved to another date.'
};

var DESK_SCHEMA = {
  rooms: { sheet: 'Rooms', cols: [['room', 'Room', 'n'], ['type', 'Room type'], ['beds', 'Beds'], ['rate', 'Usual rate per night (₹)', 'n'],
    ['status', 'Status'], ['stay', 'Current stay ID'], ['updated', 'Updated', 't'], ['by', 'Updated by']] },
  stays: { sheet: 'Stays', cols: [['id', 'Stay ID'], ['room', 'Room', 'n'], ['guest', 'Guest name'], ['phone', 'Phone', 's'], ['guests', 'Guests', 'n'],
    ['checkin', 'Check-in date', 'd'], ['checkout', 'Check-out date', 'd'], ['nights', 'Nights', 'n'], ['rate', 'Agreed rate per night (₹)', 'n'],
    ['rateNote', 'Rate note'], ['status', 'Status'], ['roomTotal', 'Room total (₹)', 'n'], ['extras', 'Extras (₹)', 'n'], ['paid', 'Paid (₹)', 'n'],
    ['balance', 'Balance (₹)', 'n'], ['notes', 'Notes'], ['inBy', 'Checked in by'], ['inAt', 'Checked in at', 't'], ['outBy', 'Checked out by'], ['outAt', 'Checked out at', 't'],
    ['booking', 'Booking ID'], ['email', 'Email'], ['gstin', 'Guest GSTIN', 's'], ['company', 'Company / billing name'], ['bill', 'Bill no.'], ['title', 'Title (Mr./Ms./Mrs./Dr.)'], ['address', 'Guest address'], ['companions', 'Other guests in the room'], ['comp', 'Free stay: guest of'], ['compRef', 'Free stay: reference'], ['waOk', 'WhatsApp messages OK (guest agreed)'], ['waOffers', 'WhatsApp offers OK (guest agreed)']] },
  bookings: { sheet: 'Bookings', cols: [['id', 'Booking ID'], ['status', 'Status'], ['source', 'Source'], ['guest', 'Guest name'], ['phone', 'Phone', 's'], ['email', 'Email'],
    ['guests', 'Guests', 'n'], ['roomsNeeded', 'Rooms needed', 'n'], ['roomType', 'Room preference'], ['rooms', 'Room numbers', 's'], ['checkin', 'Check-in date', 'd'],
    ['checkout', 'Check-out date', 'd'], ['nights', 'Nights', 'n'], ['rate', 'Rate per room per night (₹)', 'n'], ['total', 'Total (₹)', 'n'],
    ['advanceDue', 'Advance required, 50% (₹)', 'n'], ['advancePaid', 'Advance paid (₹)', 'n'], ['refunded', 'Refunded (₹)', 'n'], ['notes', 'Notes'],
    ['created', 'Created', 't'], ['createdBy', 'Created by'], ['confirmedBy', 'Confirmed by'], ['confirmedAt', 'Confirmed at', 't'],
    ['closedBy', 'Closed by'], ['closedAt', 'Closed at', 't'], ['closeNote', 'Cancellation / closing note'], ['advanceSet', 'Advance agreed (₹, blank = 50%)', 'n'], ['comp', 'Free stay (whose guest)'], ['compRef', 'Free stay reference'], ['waOk', 'WhatsApp messages OK (guest agreed)']] },
  charges: { sheet: 'Room charges', cols: [['id', 'ID'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['item', 'Item'], ['qty', 'Qty', 'n'],
    ['price', 'Unit price (₹)', 'n'], ['total', 'Total (₹)', 'n'], ['free', 'Free'], ['note', 'Note'], ['by', 'Added by'], ['removed', 'Removed']] },
  payments: { sheet: 'Payments', cols: [['id', 'ID'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['amount', 'Amount (₹)', 'n'],
    ['method', 'Method'], ['note', 'Note'], ['by', 'Taken by'], ['booking', 'Booking ID'], ['ref', 'Reference no.', 's'], ['voided', 'Voided']] },
  requests: { sheet: 'Approval requests', cols: [['id', 'Request ID'], ['at', 'Date', 't'], ['by', 'Requested by'], ['type', 'Type'], ['summary', 'What'],
    ['reason', 'Reason'], ['status', 'Status'], ['decidedBy', 'Decided by'], ['decidedAt', 'Decided at', 't'], ['decisionNote', 'Decision note'], ['payload', 'Details (system)', 's']] },
  items: { sheet: 'Items', cols: [['item', 'Item'], ['price', 'Price (₹)', 'n'], ['track', 'Track stock'], ['stock', 'In stock', 'n'], ['low', 'Warn below', 'n'], ['active', 'Active'], ['sell', 'Sold to rooms'], ['hsn', 'HSN / SAC code', 's'], ['gst', 'GST %', 'n'], ['daily', 'Free daily per room', 's']] },
  service: { sheet: 'Housekeeping log', lazy: true, cols: [['id', 'ID'], ['date', 'Date', 'd'], ['room', 'Room', 'n'], ['stay', 'Stay ID'], ['items', 'Given'], ['by', 'Done by'], ['at', 'Time', 't'], ['charges', 'Charge IDs (system)', 's'], ['undone', 'Undone']] },
  bills: { sheet: 'Bills', cols: [['id', 'Bill link ID', 's'], ['no', 'Invoice no.'], ['at', 'Date', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['guest', 'Guest name'],
    ['phone', 'Phone', 's'], ['email', 'Email'], ['total', 'Total (₹)', 'n'], ['by', 'Made by'], ['sent', 'Emailed'], ['data', 'Bill (system)', 's'], ['sendAt', 'Email at', 't'], ['status', 'Email status'], ['pdf', 'PDF saved'], ['edited', 'Last changed'], ['wa', 'WhatsApp']] },
  expenses: { sheet: 'Expenses', lazy: true, cols: [['id', 'ID'], ['date', 'Date', 'd'], ['group', 'Group'], ['category', 'Category'], ['item', 'What was bought / paid for'], ['qty', 'Qty', 'n'],
    ['amount', 'Amount (₹)', 'n'], ['method', 'Paid by'], ['ref', 'Transaction / bill no.', 's'], ['shop', 'Shop / payee'], ['note', 'Note'], ['photos', 'Bill photos (Drive file IDs)', 's'],
    ['stockItem', 'Added to stock: item'], ['stockQty', 'Added to stock: qty', 'n'], ['by', 'Entered by'], ['at', 'Entered at', 't'], ['edited', 'Last changed'], ['removed', 'Removed'],
    ['gstin', 'Supplier GSTIN', 's'], ['billNo', 'Supplier bill no.', 's'], ['taxable', 'Taxable value (₹)', 'n'], ['cgst', 'CGST (₹)', 'n'], ['sgst', 'SGST (₹)', 'n'], ['igst', 'IGST (₹)', 'n'], ['gstBy', 'GST details: how entered']] },
  commissions: { sheet: 'Commission', lazy: true, cols: [['id', 'ID'], ['date', 'Date', 'd'], ['name', 'Name'], ['type', 'Driver / broker'], ['phone', 'Phone', 's'], ['vehicle', 'Vehicle no.'],
    ['guest', 'For guest'], ['room', 'Room / booking', 's'], ['amount', 'Amount (₹)', 'n'], ['method', 'Paid by'], ['ref', 'Transaction no.', 's'], ['note', 'Note'],
    ['by', 'Entered by'], ['at', 'Entered at', 't'], ['edited', 'Last changed'], ['removed', 'Removed']] },
  guestids: { sheet: 'Guest ID copies', lazy: true, cols: [['id', 'ID'], ['at', 'Saved at', 't'], ['stay', 'Stay ID'], ['room', 'Room', 'n'], ['guest', 'Guest name'], ['kind', 'Page'], ['slot', 'Box', 'n'],
    ['label', 'What'], ['file', 'Photo (Drive file ID)', 's'], ['by', 'Saved by'], ['removed', 'Removed'], ['folder', 'In stay folder (system)', 's']] },
  archive: { sheet: 'Drive records (system)', lazy: true, hidden: true, cols: [['stay', 'Stay ID'], ['cin', 'Check-in (filed under)', 's'], ['folder', 'Stay folder (Drive ID)', 's'], ['details', 'Stay details file', 's'],
    ['key', 'Details version (system)', 's'], ['bill', 'Bill file', 's'], ['billAt', 'Bill PDF saved', 's'], ['notes', 'Night notes (system)', 's'], ['dirty', 'To update', 's'], ['at', 'Last saved', 't'], ['error', 'Last error']] },
  regs: { sheet: 'Guest registrations', lazy: true, cols: [['id', 'ID'], ['at', 'Received', 't'], ['name', 'Guest'], ['phone', 'Phone', 's'], ['email', 'Email'], ['checkin', 'Check-in', 'd'], ['checkout', 'Check-out', 'd'], ['booking', 'Booking'], ['status', 'Status'], ['seenBy', 'Seen by'], ['data', 'Card (all fields)', 's']] },
  wa: { sheet: 'WhatsApp messages', lazy: true, cols: [['id', 'ID'], ['at', 'Made', 't'], ['sendAt', 'Send at', 't'], ['to', 'To', 's'], ['name', 'Guest'], ['kind', 'Message'], ['ref', 'Stay / booking'], ['status', 'Status'], ['info', 'Details']] },
  wachats: { sheet: 'WhatsApp chats', lazy: true, cols: [['phone', 'Phone', 's'], ['name', 'Name on WhatsApp'], ['first', 'First message', 't'], ['last', 'Last message', 't'],
    ['lastText', 'Last message text'], ['unread', 'Unread', 'n'], ['important', 'Important (why)'], ['proof', 'Payment screenshot (Drive file ID)', 's'], ['proofType', 'Screenshot type', 's'], ['proofAt', 'Screenshot at', 't'],
    ['readBy', 'Last read by'], ['readAt', 'Last read at', 't'], ['lastIn', 'Last message from guest', 't'], ['optout', 'Said STOP (no automatic messages)']] },
  wamsgs: { sheet: 'WhatsApp inbox', lazy: true, cols: [['at', 'Time', 't'], ['phone', 'Phone', 's'], ['dir', 'From'], ['text', 'Message'], ['file', 'Photo / file (Drive file ID)', 's'], ['type', 'Type', 's'], ['wamid', 'WhatsApp ID (system)', 's']] },
  billpdfs: { sheet: 'Bill PDFs (system)', hidden: true, cols: [['bill', 'Bill link ID', 's'], ['part', 'Part', 'n'], ['data', 'PDF (system)', 's']] },
  linen: { sheet: 'Linen', cols: [['item', 'Item'], ['price', 'Laundry price per piece (₹)', 'n'], ['store', 'Clean in store', 'n'], ['rooms', 'In rooms', 'n'], ['dirty', 'Used, waiting for laundry', 'n'],
    ['laundry', 'At the laundry', 'n'], ['low', 'Warn when clean below', 'n'], ['active', 'Active'], ['group', 'Group'], ['wash', 'Goes to the laundry']] },
  laundry: { sheet: 'Laundry', cols: [['id', 'Laundry ID'], ['at', 'Listed at', 't'], ['by', 'Listed by'], ['status', 'Status'], ['items', 'Given to laundry', 's'], ['outBy', 'Given out (approved) by'],
    ['outAt', 'Given out at', 't'], ['returns', 'Returns (system)', 's'], ['back', 'Received back', 's'], ['short', 'Still at laundry / missing', 's'], ['total', 'Bill (₹)', 'n'],
    ['prices', 'Prices used (system)', 's'], ['paid', 'Paid'], ['note', 'Note'], ['edited', 'Changes after approval'], ['drive', 'Drive record (file ID)', 's'], ['dkey', 'Drive record version (system)', 's']] },
  linenlog: { sheet: 'Linen log', lazy: true, cols: [['at', 'Time', 't'], ['item', 'Item'], ['qty', 'Qty', 'n'], ['from', 'From'], ['to', 'To'], ['reason', 'Reason'], ['room', 'Room'], ['by', 'By']] },
  stocklog: { sheet: 'Stock log', cols: [['at', 'Date', 't'], ['item', 'Item'], ['change', 'Change', 'n'], ['left', 'Left', 'n'], ['reason', 'Reason'], ['room', 'Room'], ['by', 'By']] },
  staff: { sheet: 'Staff', cols: [['name', 'Name'], ['pin', 'PIN', 's'], ['role', 'Role'], ['active', 'Active']] },
  sessions: { sheet: 'Staff sessions', hidden: true, cols: [['token', 'Token', 's'], ['name', 'Name'], ['role', 'Role'], ['expires', 'Expires', 't']] },
  ownbills: { sheet: 'Owner bills (private)', lazy: true, hidden: true, cols: [['id', 'ID'], ['at', 'Saved at', 't'], ['by', 'Saved by'], ['no', 'Bill no.'], ['guest', 'Billed to'],
    ['total', 'Total (₹)', 'n'], ['data', 'Bill data (system)'], ['drive', 'Google Drive file (ID)', 's'], ['removed', 'Removed']] },
  attendance: { sheet: 'Staff attendance', lazy: true, cols: [['id', 'ID'], ['name', 'Name'], ['role', 'Role'], ['inAt', 'Logged in', 't'], ['inPlace', 'Log-in place'],
    ['inLat', 'Log-in latitude', 'n'], ['inLng', 'Log-in longitude', 'n'], ['inAcc', 'Log-in accuracy (m)', 'n'], ['inDevice', 'Log-in device'],
    ['outAt', 'Logged out', 't'], ['outPlace', 'Log-out place'], ['outLat', 'Log-out latitude', 'n'], ['outLng', 'Log-out longitude', 'n'], ['outAcc', 'Log-out accuracy (m)', 'n'],
    ['outDevice', 'Log-out device'], ['outHow', 'How it ended'], ['lastSeen', 'Last active', 't'], ['session', 'Session (system)', 's']] },
  wifi: { sheet: 'Wi-Fi attendance', lazy: true, cols: [['date', 'Date', 'd'], ['name', 'Name'], ['role', 'Role'], ['first', 'Entry (first app open on Wi-Fi)', 't'],
    ['last', 'Exit (last app open on Wi-Fi)', 't'], ['opens', 'App opens on Wi-Fi', 'n'], ['device', 'Device'], ['lastDevice', 'Last device'],
    ['exitSet', 'Exit chosen by owner', 't'], ['exitBy', 'Exit chosen by'], ['recent', 'Recent app opens (system)', 's'], ['logs', 'Log-ins / log-outs (system)', 's']] },
  summary: { sheet: 'Monthly totals (old records)', lazy: true, cols: [['month', 'Month', 's'], ['rooms', 'Room sales (₹)', 'n'], ['extras', 'Extras (₹)', 'n'], ['nights', 'Room nights', 'n'],
    ['stays', 'Stays', 'n'], ['guests', 'Guests', 'n'], ['collected', 'Collected (₹)', 'n'], ['refunds', 'Refunded (₹)', 'n'], ['byMethod', 'By payment method (system)', 's'], ['items', 'Items (system)', 's']] },
  visits: { sheet: 'Website visits', lazy: true, cols: [['id', 'Visit'], ['day', 'Date', 'd'], ['at', 'Came', 't'], ['last', 'Last seen', 't'], ['vid', 'Visitor (anonymous)', 's'], ['isNew', 'First time'],
    ['pages', 'Pages seen', 'n'], ['secs', 'Seconds on the site', 'n'], ['entry', 'First page'], ['paths', 'Pages (system)', 's'], ['ref', 'Came from'], ['dev', 'Device'], ['tz', 'Time zone'], ['lang', 'Language'],
    ['member', 'Signed-in member'], ['ev', 'Taps (system)', 's']] },
  visitdays: { sheet: 'Website visits by day (old)', lazy: true, cols: [['date', 'Date', 'd'], ['visits', 'Visits', 'n'], ['visitors', 'Visitors', 'n'], ['fresh', 'First-time visitors', 'n'], ['pages', 'Pages seen', 'n'],
    ['secs', 'Seconds on the site', 'n'], ['mobile', 'On a phone', 'n'], ['data', 'Details (system)', 's']] },
  /* employee profiles and their documents: owner only. Photos and scans live in Google Drive (Nikadi Staff Records), not in this table. */
  employees: { sheet: 'Employees (private)', lazy: true, hidden: true, cols: [['id', 'Employee ID'], ['name', 'Name'], ['job', 'Designation'], ['director', 'Director', 's'], ['status', 'Status'],
    ['joined', 'Date of joining', 'd'], ['left', 'Date of leaving', 'd'], ['dob', 'Date of birth', 'd'], ['gender', 'Gender'], ['blood', 'Blood group'], ['father', "Father's / husband's name"], ['phone', 'Phone', 's'], ['email', 'Email'],
    ['address', 'Home address'], ['emName', 'Emergency contact'], ['emRel', 'Relation'], ['emPhone', 'Emergency phone', 's'], ['salary', 'Monthly salary (₹)', 'n'], ['salaryNote', 'Salary note'],
    ['accName', 'Account holder'], ['bank', 'Bank'], ['branch', 'Branch'], ['accNo', 'Account no.', 's'], ['ifsc', 'IFSC', 's'], ['upi', 'UPI ID', 's'],
    ['aadhaar', 'Aadhaar no.', 's'], ['pan', 'PAN', 's'], ['voter', 'Voter ID no.', 's'], ['uan', 'PF UAN', 's'], ['esic', 'ESI no.', 's'],
    ['prevWork', 'Previous work'], ['notes', 'Notes'], ['added', 'Added', 't'], ['by', 'Added by'], ['edited', 'Last change'], ['removed', 'Deleted']] },
  empdocs: { sheet: 'Employee documents (private)', lazy: true, hidden: true, cols: [['id', 'ID'], ['emp', 'Employee ID'], ['kind', 'Document'], ['label', 'Label'], ['file', 'File (Drive ID)', 's'],
    ['at', 'Added', 't'], ['by', 'Added by'], ['removed', 'Removed']] },
  payroll: { sheet: 'Salaries (private)', lazy: true, hidden: true, cols: [['id', 'ID'], ['month', 'Month'], ['emp', 'Employee ID'], ['name', 'Name'], ['job', 'Designation'], ['rate', 'Monthly rate (₹)', 'n'],
    ['days', 'Days in month', 'n'], ['lop', 'Unpaid days', 'n'], ['paidDays', 'Paid days', 'n'], ['basic', 'Basic (₹)', 'n'], ['extra', 'Other earnings (₹)', 'n'], ['extraNote', 'Other earnings for'], ['gross', 'Gross (₹)', 'n'],
    ['pt', 'Profession tax (₹)', 'n'], ['ptAuto', 'PT by slab'], ['pf', 'PF (₹)', 'n'], ['esi', 'ESI (₹)', 'n'], ['tds', 'TDS (₹)', 'n'], ['adv', 'Advance recovered (₹)', 'n'], ['otherDed', 'Other deduction (₹)', 'n'], ['otherNote', 'Other deduction for'],
    ['ded', 'Total deductions (₹)', 'n'], ['net', 'Net pay (₹)', 'n'], ['mode', 'Paid by'], ['paidOn', 'Paid on', 'd'], ['ref', 'Payment reference'], ['slipNo', 'Payslip no.'], ['status', 'Status'], ['finalOn', 'Finalised'],
    ['by', 'Made by'], ['at', 'Made', 't'], ['edited', 'Last change'], ['removed', 'Deleted']] },
  config: { sheet: 'Staff app settings', lazy: true, hidden: true, cols: [['key', 'Setting'], ['value', 'Value', 's']] }
};

/* Room price by the date of each night. Same table as /pricing.js (website) and backend/Code.gs: change all three together.
   The bill's "usual" tariff is this price, so offer months never print the standard ₹5,000 / ₹4,500. */
var DESK_RATE_PERIODS = [
  { from: '2000-01-01', to: '2026-12-23', double: 3500, twin: 3000 },
  { from: '2026-12-24', to: '2027-05-05', double: 5000, twin: 4500 },
  { from: '2027-05-06', to: '9999-12-31', double: 3500, twin: 3000 }
];
function deskRateOn(type, ymd) {
  /* Fridays and Saturdays in offer months cost 500 more a night (busy days in Mayapur). */
  var up = 0; if (/^\d{4}-\d\d-\d\d/.test(String(ymd || ''))) { var pp = String(ymd).split('-'), wd = new Date(Date.UTC(+pp[0], +pp[1] - 1, +pp[2])).getUTCDay(); if (wd === 5 || wd === 6) up = 500; }
  var k = /large/i.test(String(type || '')) ? 'double' : /twin/i.test(String(type || '')) ? 'twin' : 'double';
  for (var i = 0; i < DESK_RATE_PERIODS.length; i++) if (ymd >= DESK_RATE_PERIODS[i].from && ymd <= DESK_RATE_PERIODS[i].to) return DESK_RATE_PERIODS[i][k] + (DESK_RATE_PERIODS[i].double < 5000 ? up : 0);
  var last = DESK_RATE_PERIODS[DESK_RATE_PERIODS.length - 1]; return last[k] + (last.double < 5000 ? up : 0);
}

var DESK_DEFAULTS = {
  rooms: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (n) {
    var twin = n === 1 || n === 5, big = n === 10 || n === 11;
    return { room: n, type: twin ? 'Deluxe Twin' : big ? 'Large Twin' : 'Deluxe Double', beds: twin || big ? '2 single beds' : 'King bed',
      rate: twin ? 4500 : 5000, status: 'Ready', stay: '', updated: '', by: '' };
  }),
  items: [
    { item: 'Water bottle', price: 20, track: 'Yes', stock: 0, low: 24, active: 'Yes', sell: 'Yes', hsn: '2201', gst: 5 },
    { item: 'Dental kit', price: 30, track: 'Yes', stock: 0, low: 10, active: 'Yes', sell: 'Yes', hsn: '3306', gst: 5 },
    { item: 'Extra mattress', price: 500, track: 'No', stock: 0, low: 0, active: 'Yes', sell: 'Yes', hsn: '996311', gst: 5 },
    { item: 'Late checkout', price: 1500, track: 'No', stock: 0, low: 0, active: 'Yes', sell: 'Yes', hsn: '996311', gst: 5 },
    { item: 'Morning kit (free)', price: 0, track: 'Yes', stock: 0, low: 20, active: 'Yes', sell: 'No' },
    { item: 'Toilet roll', price: 0, track: 'Yes', stock: 0, low: 20, active: 'Yes', sell: 'No' }
  ],
  staff: [
    { name: 'Owner', pin: '1111', role: 'Owner', active: 'Yes' },
    { name: 'Reception', pin: '2222', role: 'Receptionist', active: 'Yes' }
  ]
};

function deskCore(db, hooks) {
  hooks = hooks || {};
  var METHODS = ['Cash', 'UPI', 'Bank transfer', 'Card'];
  var FROM_ADV = 'From advance'; // internal: moves a booking advance onto a room bill at check-in (not new money)
  var ROLES = ['Owner', 'Manager', 'Receptionist', 'Staff', 'Laundry'];
  var LAUNDRY_OK = ['login', 'logout', 'state', 'presence', 'beat', 'laundry', 'laundryList', 'laundryReturn', 'laundryCancel']; // all the laundry team can use
  var curAction = '';

  function fail(code) { throw new Error(code); }
  function ist(ms) { return new Date((ms == null ? Date.now() : ms) + DESK_TZ_MIN * 60000); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = ist(); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function stamp() { var d = ist(); return today() + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }
  function addDays(ymd, n) { var p = ymd.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function dayNum(ymd) { var p = String(ymd).split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5; }
  function nightsBetween(a, b) { return Math.max(1, Math.round(dayNum(b) - dayNum(a))); }
  function isYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(dayNum(s)); }
  function id(prefix) { return prefix + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function text(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 120); }
  function money(v) { var n = Math.round(Number(v)); return isFinite(n) && n >= 0 && n <= 10000000 ? n : NaN; }
  function yes(v) { return String(v).toLowerCase() === 'yes'; }
  /* Phone numbers: Indian mobiles are kept as 10 digits (as before); any other country is kept as its full
     international number in digits (country code first, e.g. 447700900123). "+44 7700 900123" or "0044…" both work. */
  function phoneNorm(p) {
    var s = String(p || '').trim(), d = s.replace(/\D/g, '');
    if (!d) return '';
    var intl = /^(\+|00)/.test(s);
    if (intl && s.charAt(0) === '0') d = d.slice(2);
    if (intl) { if (d.indexOf('91') === 0 && /^[6-9]\d{9}$/.test(d.slice(2))) return d.slice(2); return d.length >= 8 && d.length <= 15 && d.indexOf('91') !== 0 ? d : null; }
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
    if (/^[6-9]\d{9}$/.test(d)) return d;
    return d.length >= 11 && d.length <= 15 && d.charAt(0) !== '0' && d.indexOf('91') !== 0 ? d : null;
  }
  function phoneOk(p) { var d = phoneNorm(p); if (d === null) fail('invalid_phone'); return d; }
  function find(t, key, val) { var a = db.all(t); for (var i = 0; i < a.length; i++) if (String(a[i][key]) === String(val)) return a[i]; return null; }
  function room(n) { return find('rooms', 'room', n) || fail('no_room'); }
  function stay(sid) { return find('stays', 'id', sid) || fail('no_stay'); }
  function item(name) { var it = find('items', 'item', name); if (!it || !yes(it.active)) fail('no_item'); return it; }
  function sellable(it) { return it.sell !== 'No'; }
  function roomList(str) { return String(str || '').split(/[^\d]+/).filter(Boolean).map(Number); }
  function overlaps(a1, a2, b1, b2) { return dayNum(a1) < dayNum(b2) && dayNum(b1) < dayNum(a2); }
  /* What already holds this room between `from` and `to`? (in-house stays and confirmed bookings) */
  function roomClash(roomNo, from, to, skip) {
    skip = skip || {};
    var st = db.all('stays').filter(function (x) { return x.status === 'In house' && Number(x.room) === Number(roomNo) && x.id !== skip.stay && overlaps(x.checkin, x.checkout, from, to); })[0];
    if (st) return { kind: 'stay', guest: st.guest, from: st.checkin, to: st.checkout };
    var bk = db.all('bookings').filter(function (b) { return b.status === 'Confirmed' && b.id !== skip.booking && roomList(b.rooms).indexOf(Number(roomNo)) >= 0 && overlaps(b.checkin, b.checkout, from, to); })[0];
    if (bk) return { kind: 'booking', guest: bk.guest, from: bk.checkin, to: bk.checkout, id: bk.id };
    return null;
  }
  function clashFail(roomNo, c) { var e = new Error('room_booked'); e.detail = { room: roomNo, guest: c.guest, from: c.from, to: c.to }; throw e; }
  function bookingPays(bid) { return db.all('payments').filter(function (p) { return p.booking === bid && !p.stay && p.method !== FROM_ADV && !p.voided; }); }
  function recomputeBooking(b) {
    var nights = nightsBetween(b.checkin, b.checkout), rooms = Math.max(1, Number(b.roomsNeeded || 1));
    var total = b.comp ? 0 : nights * rooms * Number(b.rate || 0);
    var pays = bookingPays(b.id);
    var paid = pays.filter(function (p) { return Number(p.amount) > 0; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
    var refunded = -pays.filter(function (p) { return Number(p.amount) < 0; }).reduce(function (a, p) { return a + Number(p.amount); }, 0);
    db.set('bookings', b, { nights: nights, total: total, advanceDue: b.comp ? 0 : Number(b.advanceSet) > 0 ? Number(b.advanceSet) : Math.ceil(total * DESK_POLICY.advancePct / 100), advancePaid: paid, refunded: refunded });
  }
  function daysBefore(b) { return Math.round(dayNum(b.checkin) - dayNum(today())); }
  function bookingView(b, me) {
    var mgr = isMgr(me);
    var v = { id: b.id, status: b.status, source: b.source, guest: mgr ? b.guest : String(b.guest || '').split(/\s+/)[0], guests: b.guests, roomsNeeded: b.roomsNeeded,
      roomType: b.roomType, rooms: roomList(b.rooms), checkin: b.checkin, checkout: b.checkout, nights: b.nights, created: b.created, createdBy: b.createdBy,
      confirmedBy: b.confirmedBy, confirmedAt: b.confirmedAt, closedBy: b.closedBy, closedAt: b.closedAt, closeNote: b.closeNote, daysBefore: daysBefore(b), waOk: b.waOk === 'Yes', comp: b.comp || '', compRef: b.compRef || '' };
    if (mgr) {
      v.phone = b.phone; v.email = b.email; v.rate = b.rate; v.total = b.total; v.advanceDue = b.advanceDue; v.advanceSet = Number(b.advanceSet) > 0; v.advancePaid = b.advancePaid; v.refunded = b.refunded; v.notes = b.notes;
      v.payments = bookingPays(b.id).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, ref: p.ref, note: p.note, by: p.by }; }).reverse();
      if (b.status === 'Checked in') { var bu = checkinUndoList(b, true); v.undoIn = checkinUndoBlock(bu) || 'ok'; v.undoInRooms = bu.list.map(function (x) { return Number(x.room); }).sort(function (a, c) { return a - c; }); }
      if (b.status === 'No-show' && stmtKey(b)) v.stmtUrl = DESK_STMT_URL + stmtKey(b);
      v.refundable = b.status === 'Confirmed' && daysBefore(b) >= DESK_POLICY.freeCancelDays ? Number(b.advancePaid || 0) - Number(b.refunded || 0) : 0;
    }
    return v;
  }
  function isMgr(me) { return me.role === 'Owner' || me.role === 'Manager' || me.role === 'Receptionist'; } // front desk: sees money
  function needMgr(me) { if (!isMgr(me)) fail('not_allowed'); }
  function canApprove(me) { return me.role === 'Owner' || me.role === 'Manager'; }
  function needApprover(me) { if (!canApprove(me)) fail('not_allowed'); }
  function who(me, req) { return req && req._for ? me.name + ' (approved for ' + req._for + ')' : me.name; }
  /* Receptionists cannot change money that is already recorded: the change becomes a request a Manager or the Owner approves. */
  function gate(me, type, req, summary) {
    if (me.role !== 'Receptionist') return null;
    var reason = text(req.reason, 200);
    if (!reason) fail('reason_required');
    var payload = {};
    Object.keys(req).forEach(function (k) { if (k !== 'token' && k !== 'action' && k.charAt(0) !== '_') payload[k] = req[k]; });
    var r = db.add('requests', { id: id('R'), at: stamp(), by: me.name, type: type, summary: text(summary, 300), reason: reason, status: 'Pending',
      decidedBy: '', decidedAt: '', decisionNote: '', payload: JSON.stringify(payload) });
    return { requested: true, request: { id: r.id, summary: r.summary } };
  }
  function needOwner(me) { if (me.role !== 'Owner') fail('not_allowed'); }

  /* ---- sessions ---- */
  function auth(req) {
    var t = String(req.token || '');
    if (!t) fail('not_logged_in');
    var s = find('sessions', 'token', t);
    if (!s) fail('not_logged_in');
    if (s.expires < stamp()) fail('session_expired');
    var person = find('staff', 'name', s.name);
    if (!person || !yes(person.active) || person.role !== s.role) fail('not_logged_in');
    var me = { name: s.name, role: s.role };
    if (me.role === 'Laundry' && curAction && LAUNDRY_OK.indexOf(curAction) < 0) fail('not_allowed');
    if (!req._noSeen) seen(me, t);
    return me;
  }

  /* ---- stock ---- */
  function moveStock(it, change, reason, roomNo, by) {
    if (!yes(it.track) || !change) return;
    var left = Number(it.stock || 0) + change;
    db.set('items', it, { stock: left });
    db.add('stocklog', { at: stamp(), item: it.item, change: change, left: left, reason: reason, room: roomNo || '', by: by });
  }

  /* every room gets free water at check-in: take it out of stock (no charge) */
  /* Free water at check-in: shown on the room's item list as free (not on the guest's bill) and taken from stock. */
  function freeWater(roomNo, by, sid) {
    if (!(DESK_FREE_WATER > 0)) return;
    var it = find('items', 'item', 'Water bottle');
    if (sid) db.add('charges', { id: id('C'), at: stamp(), stay: sid, room: roomNo, item: 'Water bottle', qty: DESK_FREE_WATER, price: 0, total: 0, free: 'Yes', note: 'Check-in', by: by, removed: '' });
    if (it && yes(it.track)) moveStock(it, -DESK_FREE_WATER, 'Free at check-in (' + DESK_FREE_WATER + ' per room)', roomNo, by);
  }
  /* Free welcome kit: staff choose Morning kit or Dental kit (or none) at check-in or later. One free line on the room, taken from stock. */
  var KITS = { 'Morning kit': ['Morning kit (free)', 'Morning kit'], 'Dental kit': ['Dental kit'] };
  function kitCharges(sid) { return chargesOf(sid).filter(function (c) { return c.note === 'Welcome kit'; }); }
  function giveKit(s, kind, qty, by) {
    if (kind && !KITS[kind]) fail('no_item');
    qty = Math.round(Number(qty) || Number(s.guests) || 1); if (!(qty >= 1 && qty <= 20)) fail('bad_qty');
    kitCharges(s.id).forEach(function (c) {
      db.set('charges', c, { removed: 'Kit changed by ' + by + ' ' + stamp() });
      var it0 = find('items', 'item', c.item); if (it0) moveStock(it0, Number(c.qty), 'Kit changed', s.room, by);
    });
    if (!kind) return;
    var it = null; KITS[kind].some(function (n) { it = find('items', 'item', n); return it; });
    db.add('charges', { id: id('C'), at: stamp(), stay: s.id, room: s.room, item: it ? it.item : kind, qty: qty, price: 0, total: 0, free: 'Yes', note: 'Welcome kit', by: by, removed: '' });
    if (it) moveStock(it, -qty, 'Free welcome kit', s.room, by);
  }
  function hkCheck(list, got) {
    got = got || {}; var out = [];
    list.forEach(function (l) {
      var v = got[l[0]];
      if (l[2]) {
        if (l[2].indexOf(v) < 0) fail('hk_checklist');
        var n = l[3] && v === DESK_HK_FRESH ? linenCounts(got['linen_' + l[0]]) : null;
        out.push(l[1] + ': ' + v.toLowerCase() + (n ? ' (' + linenText(n) + ')' : ''));
      } else { if (v !== true) fail('hk_checklist'); out.push(l[1]); }
    });
    return out;
  }
  /* linen changed by housekeeping: fresh ones from the clean store into the room, the used ones out to "used, waiting for laundry" */
  function hkLinen(list, got, roomNo, by) {
    got = got || {};
    list.forEach(function (l) {
      if (!l[3] || got[l[0]] !== DESK_HK_FRESH) return;
      var n = linenCounts(got['linen_' + l[0]]);
      Object.keys(n).forEach(function (k) { var it = linenItem(k); if (!it) return; linenMove(it, n[k], 'store', 'rooms', 'Fresh put in the room', roomNo, by); linenMove(it, n[k], 'rooms', 'dirty', 'Used one taken out of the room', roomNo, by); });
    });
  }
  /* ---- daily housekeeping checklist ---- */
  function dailyFree() {
    var out = [];
    db.all('items').forEach(function (it) {
      if (!yes(it.active)) return;
      var raw = String(it.daily == null ? '' : it.daily).trim();
      var q = raw !== '' && !isNaN(Number(raw)) ? Number(raw) : DESK_DAILY_FREE[it.item] || 0;
      if (q > 0) out.push({ item: it.item, qty: q });
    });
    return out;
  }
  function serviceDue(s) { return s && s.status === 'In house' && s.checkin < today() && s.checkout > today(); }
  function serviceOf(sid, d) { return db.all('service').filter(function (x) { return x.stay === sid && x.date === (d || today()) && !x.undone; })[0] || null; }
  function serviceView(s) {
    if (!serviceDue(s)) return null;
    var x = serviceOf(s.id), day = nightsBetween(s.checkin, today()) + 1;
    return { due: true, day: day, of: Number(s.nights), items: dailyFree(), done: x ? { by: x.by, at: x.at, items: x.items } : null };
  }

  /* ---- bills ---- */
  function chargesOf(sid) { return db.all('charges').filter(function (c) { return c.stay === sid && !c.removed; }); }
  function paymentsOf(sid) { return db.all('payments').filter(function (p) { return p.stay === sid && !p.voided; }); }
  function recompute(s) {
    var extras = chargesOf(s.id).reduce(function (a, c) { return a + (c.free === 'Yes' ? 0 : Number(c.total || 0)); }, 0);
    var paid = paymentsOf(s.id).reduce(function (a, p) { return a + Number(p.amount || 0); }, 0);
    var roomTotal = s.comp ? 0 : Number(s.nights || 0) * Number(s.rate || 0);
    if (s.comp) extras = 0;
    db.set('stays', s, { roomTotal: roomTotal, extras: extras, paid: paid, balance: roomTotal + extras - paid });
    archiveMark(s.id);
  }

  /* After a checked-out stay is corrected (rate, nights, items, payments): only a Manager or the Owner may do it,
     and the change flows into member points and the bill (which is re-made; the staff app saves a fresh PDF). */
  function lockedOut(me, s) { if (s.status === 'Checked out' && !canApprove(me)) fail('bill_locked'); }
  function afterChange(s, me, rt0) {
    if (s.status !== 'Checked out') return;
    var delta = null;
    if (hooks.onStayChange && Number(rt0) !== Number(s.roomTotal)) {
      try { delta = hooks.onStayChange({ id: s.id, phone: s.phone, room: s.room, nights: Number(s.nights), checkin: s.checkin, checkout: s.checkout, roomTotal: Number(s.roomTotal), before: Number(rt0) }); } catch (e) { delta = null; }
    }
    var row = billOfStay(s.id);
    if (!row) return;
    var old = JSON.parse(row.data), mem = old.member;
    if (mem && delta && delta.points) { mem.earned = Number(mem.earned || 0) + delta.points; if (delta.balance != null) mem.balance = delta.balance; }
    if (mem) { var r0 = find('rooms', 'room', s.room); mem.saved = r0 && Number(r0.rate) > Number(s.rate) ? (Number(r0.rate) - Number(s.rate)) * Number(s.nights) : 0; }
    saveBill(s, me, mem, true);
    pdfClear(row.id); db.set('bills', row, { pdf: '' }); // the old PDF is out of date
  }

  function memberOf(phone) { if (!hooks.memberInfo || !phone) return null; try { return hooks.memberInfo(String(phone)); } catch (e) { return null; } }
  /* other guests' names: kept as one cell, "Name; Name; …" (never more names than people in the room, max 9) */
  function companionsIn(v, guests) {
    var list = (Array.isArray(v) ? v : String(v || '').split(/[;\n]/)).map(function (x) { return text(x, 80); }).filter(Boolean);
    return list.slice(0, Math.min(DESK_MAX_COMPANIONS, Math.max(0, Number(guests || 1) - 1))).join('; ');
  }
  function companionsOut(v) { return String(v || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean); }
  function stayView(s, me) {
    var mgr = isMgr(me);
    var v = { id: s.id, room: s.room, guest: s.guest, guests: s.guests, waOk: s.waOk === 'Yes', waOffers: s.waOffers === 'Yes', checkin: s.checkin, checkout: s.checkout, nights: s.nights, status: s.status,
      leavesToday: s.status === 'In house' && s.checkout <= today(), inBy: s.inBy, inAt: s.inAt, outBy: s.outBy, outAt: s.outAt };
    v.charges = chargesOf(s.id).map(function (c) {
      var o = { id: c.id, at: c.at, item: c.item, qty: c.qty, free: c.free === 'Yes', note: c.note, by: c.by, auto: autoLate(c), deskEdit: deskEdit(c) };
      if (mgr) { o.price = c.price; o.total = c.total; }
      return o;
    }).reverse();
    var kc = kitCharges(s.id)[0]; v.kit = kc ? { kind: /dental/i.test(kc.item) ? 'Dental kit' : 'Morning kit', qty: Number(kc.qty), by: kc.by } : null;
    if (s.comp) { v.comp = s.comp; v.compRef = s.compRef || ''; }
    v.service = serviceView(s);
    var mem = s.status === 'In house' ? memberOf(s.phone) : null;
    if (mem) v.member = { name: mem.name, tier: mem.tier, tierKey: mem.tierKey, discount: mem.discount, onsite: mem.onsite, email: mgr ? mem.email || '' : '' };
    if (mgr) {
      v.phone = s.phone; v.rate = s.rate; v.rateNote = s.rateNote; v.notes = s.notes; v.email = s.email || ''; v.companions = companionsOut(s.companions); v.gstin = s.gstin || ''; v.company = s.company || ''; v.bill = s.bill || ''; v.title = s.title || '';
      v.roomTotal = s.roomTotal; v.extras = s.extras; v.paid = s.paid; v.balance = s.balance;
      v.payments = paymentsOf(s.id).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, note: p.note, by: p.by, ref: p.ref }; }).reverse();
      v.booking = s.booking;
      if (s.status === 'Checked out') { var ub = undoBlock(s); v.undo = ub === 'undo_too_late' ? '' : ub || 'ok'; }
      if (s.status === 'In house') { var cu = checkinUndoList(s, false); v.undoIn = checkinUndoBlock(cu) || 'ok'; v.undoInRooms = cu.list.map(function (x) { return Number(x.room); }).sort(function (a, c) { return a - c; }); }
      v.ids = idCount(db.all('guestids').filter(function (x) { return x.stay === s.id && !x.removed; }));
      var ar = find('archive', 'stay', s.id); if (canApprove(me) && ar && ar.folder) v.drive = 'https://drive.google.com/drive/folders/' + ar.folder;
      v.advancePays = s.booking ? bookingPays(s.booking).filter(function (p) { return Number(p.amount) > 0; }).map(function (p) { return { id: p.id, at: p.at, amount: p.amount, method: p.method, ref: p.ref, note: 'Advance · booking ' + s.booking }; }) : [];
    } else {
      v.guest = String(s.guest || '').split(/\s+/)[0];
    }
    return v;
  }

  /* ---- GST bills ---- */
  function fyOf(ymd) { var y = +ymd.slice(0, 4), m = +ymd.slice(5, 7), a = m >= 4 ? y : y - 1; return String(a).slice(2) + '-' + String(a + 1).slice(2); }
  function newBillNo() {
    var pre = DESK_BILL_PREFIX + '/' + fyOf(today()) + '/', n = Number(cfgGet('billMax ' + pre)) || 0; // highest number already moved to the archive
    db.all('bills').forEach(function (b) { if (String(b.no).indexOf(pre) === 0) n = Math.max(n, Number(String(b.no).slice(pre.length)) || 0); });
    var x = String(n + 1); while (x.length < 4) x = '0' + x;
    return pre + x;
  }
  function newBillId() {
    if (hooks.newId) return hooks.newId();
    var a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', o = '';
    for (var i = 0; i < 22; i++) o += a.charAt(Math.floor(Math.random() * a.length));
    return o;
  }
  function itemMeta(name) {
    var it = find('items', 'item', name), f = DESK_HSN[name] || DESK_HSN._default;
    return { hsn: (it && String(it.hsn || '').trim()) || f[0], gst: it && it.gst !== '' && it.gst != null && Number(it.gst) > 0 ? Number(it.gst) : f[1], unit: f[2], label: f[3] || name };
  }
  function billOfStay(sid) { var a = db.all('bills').filter(function (b) { return b.stay === sid; }); return a[a.length - 1] || (db.findOld ? db.findOld('bills', sid, 'stay') : null); }
  function prettyPhone(p) { p = String(p || ''); return p.length === 10 ? '+91 ' + p.slice(0, 5) + ' ' + p.slice(5) : p ? '+' + p : p; }
  /* Everything printed on the bill, frozen at the time it is made. */
  function billData(s, me, old) {
    var r = find('rooms', 'room', s.room) || {}, rate = Number(s.rate || 0), nights = Number(s.nights || 0);
    /* usual price = the dated room price for the nights of this stay (offer price in offer months) */
    var usual = Number(r.rate || 0);
    if (r.type && isYmd(String(s.checkin || '')) && nights > 0) { var ut = 0; for (var ni = 0; ni < nights; ni++) ut += deskRateOn(r.type, addDays(String(s.checkin), ni)); usual = Math.round(ut / nights); }
    var tariff = usual > rate ? usual : rate, discounts = [];
    if (usual > rate) {
      var mem = memberOf(s.phone), pct = Math.round((usual - rate) / usual * 100), note = String(s.rateNote || '');
      var custom = note && !/^Booking /.test(note) && !/member rate$/i.test(note);
      var label = mem && Number(mem.discount) === pct && !custom ? mem.tier + ' member discount (' + pct + '%)' : custom ? note + ' (' + pct + '%)' : 'Discount (' + pct + '%)';
      discounts.push({ label: label, note: 'On room tariff of ₹' + (usual * nights).toLocaleString('en-IN'), amount: (usual - rate) * nights });
    }
    var items = [], byKey = {};
    chargesOf(s.id).forEach(function (c) {
      if (c.free === 'Yes' || !(Number(c.total) > 0)) return; // free things (like the 2 waters) are not printed
      var k = c.item + '|' + c.price;
      if (c.item === DESK_FINE_ITEM) k += '|' + c.id; // every fine on its own line, with its reason
      if (!byKey[k]) { var m = itemMeta(c.item); byKey[k] = { label: m.label, hsn: m.hsn, gst: m.gst, unit: m.unit, qty: 0, rate: Number(c.price) }; items.push(byKey[k]);
        if (c.item === DESK_FINE_ITEM) { byKey[k].fine = true; byKey[k].note = DESK_FINE_TEXT + (c.note ? ': ' + c.note : ''); } }
      byKey[k].qty += Number(c.qty || 0);
    });
    var payments = [], refunds = [];
    paymentsOf(s.id).forEach(function (p) {
      var amt = Number(p.amount || 0);
      if (amt < 0) { refunds.push({ date: p.at, method: p.method, ref: p.ref, amount: -amt }); return; }
      if (p.method === FROM_ADV) {
        var orig = bookingPays(s.booking).filter(function (x) { return Number(x.amount) > 0; });
        var sumOrig = orig.reduce(function (a, x) { return a + Number(x.amount); }, 0);
        if (orig.length && sumOrig === amt) orig.forEach(function (x) { payments.push({ date: x.at, label: 'Advance · booking ' + s.booking, method: x.method, ref: x.ref, amount: Number(x.amount) }); });
        else payments.push({ date: (orig[0] || p).at, label: 'Advance (share for this room) · booking ' + s.booking, method: orig[0] ? orig[0].method : 'Advance', ref: orig[0] ? orig[0].ref : '', amount: amt });
        return;
      }
      payments.push({ date: p.at, label: p.note || 'Payment received', method: p.method, ref: p.ref, amount: amt });
    });
    return { no: old ? old.no : '', id: old ? old.id : '', date: old ? old.date : today(), booking: s.booking || '',
      guest: { name: s.guest, title: s.title || '', address: s.address || '', phone: prettyPhone(s.phone), email: s.email || '', gstin: s.gstin || '', company: s.company || '' },
      room: { no: s.room, type: (r.type || '') + (r.beds ? ' (' + r.beds + ')' : '') }, checkin: s.checkin, checkout: s.checkout, inAt: s.inAt, outAt: s.outAt,
      nights: nights, guests: Number(s.guests || 1), tariff: tariff, discounts: discounts, items: items, payments: payments, refunds: refunds,
      member: old ? old.member : null, staff: s.outBy || (me && me.name) || '' };
  }
  function billTotal(d) {
    var t = d.tariff * d.nights;
    d.discounts.forEach(function (x) { t -= x.amount; });
    d.items.forEach(function (x) { t += x.qty * x.rate; });
    return t;
  }
  function plusHours(st, h) { // 'yyyy-MM-dd HH:mm' + hours (plain clock arithmetic, India time)
    var m = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(String(st)); if (!m) return stamp();
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + h * 3600000);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
  }
  function saveBill(s, me, member, edited) {
    var row = billOfStay(s.id), old = row ? JSON.parse(row.data) : null;
    var d = billData(s, me, old);
    if (member) d.member = member;
    if (!row) {
      d.no = newBillNo(); d.id = newBillId();
      row = db.add('bills', { id: d.id, no: d.no, at: stamp(), stay: s.id, room: s.room, guest: s.guest, phone: s.phone, email: s.email || '', total: billTotal(d), by: me.name, sent: '', data: JSON.stringify(d),
        sendAt: plusHours(s.outAt || stamp(), DESK_BILL_DELAY_HOURS), status: s.email ? 'Scheduled' : 'No email', pdf: '', edited: '', wa: !s.phone ? 'No phone' : s.waOk === 'Yes' ? 'Waiting' : 'No WhatsApp consent' });
      db.set('stays', s, { bill: d.no });
    } else {
      var p = { guest: s.guest, email: s.email || '', total: billTotal(d), data: JSON.stringify(d) };
      if (edited) p.edited = stamp() + ' · ' + me.name;
      if (row.status === 'No email' && s.email) { p.status = 'Scheduled'; if (row.sendAt < stamp()) p.sendAt = stamp(); }
      if (row.status === 'Scheduled' && !s.email) p.status = 'No email';
      db.set('bills', row, p);
    }
    d.url = DESK_BILL_URL + d.id;
    archiveMark(s.id);
    return { row: row, data: d };
  }
  /* The PDF is made by the staff app (it looks exactly like the bill) and kept here until it is emailed. */
  var PDF_PART = 45000;
  function pdfParts(id) { return db.all('billpdfs').filter(function (x) { return x.bill === id && x.data; }).sort(function (a, b) { return a.part - b.part; }); }
  function pdfOf(id) { var p = pdfParts(id); return p.length ? p.map(function (x) { return x.data; }).join('') : null; }
  function pdfClear(id) { pdfParts(id).forEach(function (x) { db.set('billpdfs', x, { data: '' }); }); }
  function pdfOk(pdf) { return typeof pdf === 'string' && pdf.length > 100 && pdf.length < 9000000 && /^[A-Za-z0-9+\/=]+$/.test(pdf); }
  function pdfStore(b, pdf) {
    if (!pdfOk(pdf)) fail('bad_pdf');
    pdfClear(b.row.id);
    for (var i = 0, n = 0; i < pdf.length; i += PDF_PART, n++) db.add('billpdfs', { bill: b.row.id, part: n, data: pdf.slice(i, i + PDF_PART) });
    db.set('bills', b.row, { pdf: stamp() });
    archiveMark(b.row.stay);
  }
  function sendBill(b, to, pdf) {
    if (!hooks.sendBill) fail('email_unavailable');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) fail('invalid_email');
    if (pdf != null && !pdfOk(pdf)) fail('bad_pdf');
    hooks.sendBill(b.data, to, pdf || null);
    db.set('bills', b.row, { sent: stamp() + ' → ' + to, status: 'Sent' });
  }
  /* Emails every bill whose time has come. Runs on its own (timer) and also when the app is used. */
  /* ---- WhatsApp ---- */
  function waReady() { try { return !!(hooks.waReady && hooks.waReady()); } catch (e) { return false; } }
  /* WhatsApp rules: we only start a conversation with guests who agreed (ticked at check-in / booking), never after they said STOP,
     and only while the owner has automatic messages switched on (Settings). */
  function waAutoOn() { return cfgGet('waAuto') === 'on'; }
  function waBotOn() { return cfgGet('waBot') === 'on'; }
  var DESK_WA_DAY_MAX = 40; // safety: at most this many messages we start (templates) per day, and 2 per guest per day
  function waOptedOut(phone) { var c = find('wachats', 'phone', waPhone(phone)); return !!(c && c.optout); }
  function consent(v) { return v === true || v === 'Yes' ? 'Yes' : 'No'; }
  function first(n) { return String(n || '').trim().split(/\s+/)[0] || 'Guest'; }
  function dd(ymd) { var p = String(ymd || '').slice(0, 10).split('-'); return p.length < 3 ? '' : +p[2] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+p[1] - 1] + ' ' + p[0]; }
  function rupees(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
  /* the guest gets a chat in the WhatsApp screen as soon as we write to them (check-in, booking, bill), even if they never wrote first */
  function waEnsureChat(phone, name) {
    var ph = waPhone(phone); if (!ph || ph.length < 8) return null;
    var c = find('wachats', 'phone', ph);
    if (!c) c = db.add('wachats', { phone: ph, name: text(name, 60), first: stamp(), last: stamp(), lastIn: '', lastText: '', unread: 0, important: '', proof: '', proofType: '', proofAt: '', readBy: '', readAt: '' });
    else if (!c.name && name) db.set('wachats', c, { name: text(name, 60) });
    return c;
  }
  function waQueue(kind, phone, name, ref, at) {
    if (!phone || String(phone).length < 8) return;
    waEnsureChat(phone, name);
    if (db.all('wa').some(function (m) { return m.kind === kind && m.ref === ref && m.status !== 'Failed'; })) return; // once per stay / booking
    db.add('wa', { id: id('W'), at: stamp(), sendAt: at || stamp(), to: String(phone), name: name, kind: kind, ref: ref, status: 'Waiting', info: '' });
  }
  function welcomeMsgs(s) {
    if (!s.phone || s.waOk !== 'Yes') return;
    waQueue('welcome', s.phone, s.guest, s.id);
    if (s.waOffers === 'Yes' && firstVisit(s) && !memberOf(s.phone)) waQueue('membership', s.phone, s.guest, s.id, plusHours(stamp(), 0.05)); // first stay with us, not yet a member
  }
  function firstVisit(s) { return !db.all('stays').some(function (x) { return x.id !== s.id && x.status !== 'Reversed' && x.phone === s.phone && x.checkin <= s.checkin; }); }
  function waParams(m) {
    if (m.kind === 'welcome' || m.kind === 'membership') {
      var s = find('stays', 'id', m.ref); if (!s) throw new Error('stay_gone');
      return m.kind === 'welcome' ? [first(s.guest), String(s.room), dd(s.checkin), dd(s.checkout)] : [first(s.guest)]; // join link is the template's button
    }
    if (m.kind === 'booking') {
      var b = find('bookings', 'id', m.ref); if (!b) throw new Error('booking_gone');
      var rooms = String(b.rooms || '').split(',').filter(function (x) { return x.trim(); }).length || Number(b.roomsNeeded || 1);
      return [first(b.guest), b.id, String(rooms), dd(b.checkin), dd(b.checkout), rupees(Number(b.advancePaid || 0) - Number(b.refunded || 0))];
    }
    throw new Error('bad_kind');
  }
  /* Messages the owner / a manager sends by hand from the guest house WhatsApp (one tap in the staff app opens WhatsApp with the text ready).
     Same wording as the approved templates; links are written out because a typed message has no buttons and no PDF. */
  var DESK_WA_SITE = 'https://www.nikadiguesthouse.com';
  function sd(ymd) { return dd(ymd).replace(/ \d{4}$/, ''); } // 17 Nov (short, for WhatsApp)
  /* "Dear Mr. Das" / "Dear Mr./Mrs. Das": title from the check-in form when we have it, and the last name */
  function salute(name, title) {
    var parts = String(name || '').replace(/[^A-Za-z\u0900-\u0D7F .'-]/g, ' ').trim().split(/\s+/).filter(function (w) { return w && !/^(mr|mrs|ms|miss|dr|shri|sri|smt)\.?$/i.test(w); });
    var last = parts.length ? parts[parts.length - 1] : '';
    last = last ? last.charAt(0).toUpperCase() + last.slice(1) : '';
    var t = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'].indexOf(String(title || '')) >= 0 ? title : 'Mr./Mrs.';
    return last ? 'Dear ' + t + ' ' + last : 'Dear Sir/Ma\'am';
  }
  /* WhatsApp links can turn some emoji into "?" (seen on WhatsApp for computers): keep only symbols that always show */
  function waSafe(t) {
    return String(t).replace(/\u2B50\uFE0F?/g, '★').replace(/\uD83D\uDECF\uFE0F?/g, '•').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]\uFE0F?/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/ {2,}/g, ' ').replace(/ ([,.!:])/g, '$1').trim();
  }
  function waHandText(kind, p, link) {
    if (kind === 'welcome') return p[0] + ', Hare Krishna! Welcome to Nikadi Guest House!\nYour room is ' + p[1] + ', from ' + p[2] + ' to ' + p[3] + '. Check-out is by 9:00 AM.\nFor anything you need, just reply here or call +91 75011 01137.\n🌐 ' + DESK_WA_SITE;
    if (kind === 'membership') return p[0] + ', Hare Krishna! Thank you for choosing Nikadi Guest House.\nJoin the free Nikadi Membership and get 100 welcome points:\n⭐ Silver (on joining): 5% off every stay, 1 point per ₹100, birthday points\n⭐ Gold (15 nights in 2 years): 10% off, 1.5 points per ₹100, early check-in\n⭐ Platinum (40 nights in 2 years): 15% off, 2 points per ₹100, late check-out till 11 AM, free room upgrade, free dental kit\n⭐ Platinum Plus (100 nights, kept for 10 years): 20% off, 4 points per ₹100, late check-out till 12 noon, free extra mattress, festival booking priority\nJoin before you check out and this stay counts too. Join in one minute: ' + DESK_WA_SITE + '/app/?join=1';
    if (kind === 'booking') return p[0] + ', Hare Krishna! Your booking ' + p[1] + ' at Nikadi Guest House is confirmed: ' + p[2] + ' room(s), ' + p[3] + ' to ' + p[4] + '. Advance received: ' + p[5] + '.\nCheck-in from 11:00 AM, check-out by 9:00 AM. Cancel 3 or more days before check-in for a full refund; after that the advance is not refundable.\n📍 How to reach us: Bhaktisiddhanta Saraswati Marg, opposite ISKCON Gate No. 4, Mayapur. Reception is on the first floor: enter at the left corner of the building and take the stairs up, near the Mahaprabhu photo. Google Maps: https://maps.google.com/?cid=4814848157732686064\nQuestions: +91 75011 01137.';
    if (kind === 'bill') return p[0] + ', thank you so much for staying with us at Nikadi Guest House. Your bill ' + p[1] + ': total ' + p[2] + ' (incl. GST), ' + p[3] + '.\n🧾 See or download your bill: ' + link + '\nWe hope your time in Sri Dham Mayapur was peaceful and full of blessings, and we will be happy to welcome you again.\n⭐ Enjoyed your stay? A short Google review helps other devotees find us: https://g.page/r/CfDIGanjxtFCEAE/review';
    throw new Error('bad_kind');
  }
  function billParams(row) {
    var d = JSON.parse(row.data), B = typeof NikadiBill !== 'undefined' ? NikadiBill : null, c = B ? B.compute(d) : null;
    var total = c ? c.total : Number(row.total || 0), due = c ? c.due : 0;
    return [B ? B.greetName(d.guest) : first(d.guest.name), d.no, rupees(total), Math.abs(due) < 0.5 ? 'paid in full' : due > 0 ? 'balance due ' + rupees(due) : 'refund due ' + rupees(-due)];
  }
  function waHandList() {
    if (waAutoOn()) return [];
    var out = [];
    db.all('wa').forEach(function (m) {
      if (m.status !== 'Waiting' || waOptedOut(m.to)) return;
      try { out.push({ id: m.id, type: 'wa', kind: m.kind, name: m.name, phone: waPhone(m.to), at: m.at, ref: m.ref, text: waHandText(m.kind, waParams(m)) }); } catch (e) {}
    });
    db.all('bills').forEach(function (b) {
      if (b.wa !== 'Waiting' || /^(Stopped|On hold)/.test(String(b.status || '')) || !b.phone || waOptedOut(b.phone)) return;
      try { out.push({ id: b.id, type: 'bill', kind: 'bill', name: b.guest, phone: waPhone(b.phone), at: b.at, ref: b.no, text: waHandText('bill', billParams(b), DESK_BILL_URL + b.id) }); } catch (e) {}
    });
    return out.sort(function (a, b) { return String(a.at) < String(b.at) ? -1 : 1; });
  }
  /* ===== Ready WhatsApp messages (front desk sends them by hand, one tap each) =====
     Two folders: "Welcome & check-in" (arriving bookings + guests in house) and "Check-out, bill & review" (leaving today + left in the last 3 days).
     Every guest gets 4-5 messages written with their name; the app opens WhatsApp with the text ready. */
  var DESK_WA_REVIEW = 'https://g.page/r/CfDIGanjxtFCEAE/review', DESK_WA_MAPS = 'https://maps.google.com/?cid=4814848157732686064';
  function waKitMsgs(folder, o) {
    var n = o.first, out = [];
    function add(kind, label, text) { out.push({ kind: kind, label: label, text: text }); }
    if (folder === 'in') {
      if (o.booking) add('booking', 'Booking confirmed', waHandText('booking', [n, o.booking.id, String(o.rooms), dd(o.checkin), dd(o.checkout), rupees(o.advance)]));
      if (o.booking) add('reg', 'Registration form', n + ', Hare Krishna! Please fill our guest registration form before arrival, so check-in takes only a minute: ' + DESK_WA_SITE + '/#guest-registration');
      add('directions', 'How to reach us', n + ', Hare Krishna! Here is how to reach Nikadi Guest House:\n📍 Bhaktisiddhanta Saraswati Marg, opposite ISKCON Gate No. 4 (Namahatta Bhavan), Mayapur. Look for our lit NIKADI GUEST HOUSE sign.\nEnter at the left corner of the building, beside the picture of Sri Chaitanya Mahaprabhu, and take the stairs up to our first-floor reception.\nGoogle Maps: ' + DESK_WA_MAPS + '\nCall us any time: +91 75011 01137.');
      if (o.room) add('welcome', 'Welcome', waHandText('welcome', [n, String(o.room), dd(o.checkin), dd(o.checkout)]));
      if (o.room) add('care', 'Anything you need?', n + ', Hare Krishna! We hope you are comfortable in room ' + o.room + '.\nIf you need anything, like fresh towels, drinking water, an extra blanket or help with a car, just reply here or call reception on +91 75011 01137. We are happy to help.');
      if (!o.member) add('membership', 'Membership invite', waHandText('membership', [n]));
    } else {
      if (o.leaving) add('checkout', 'Check-out reminder', n + ', Hare Krishna! A gentle reminder from Nikadi Guest House: check-out is by 9:00 AM on ' + dd(o.checkout) + '.\nIf you would like a late check-out, please reply here and we will check if the room is available:\n' +
        DESK_LATE_OUT.map(function (x) { return 'Till ' + x.label + ': ' + rupees(x.price); }).join('\n') + '\nAfter 12 noon: full room price for one more day.\nIf you are still in the room after 9:30 AM, ' + rupees(DESK_LATE_OUT[0].price) + ' late check-out is added to your bill. Thank you!');
      if (o.bill) add('bill', 'Bill + review', waHandText('bill', [n].concat(o.bill.params.slice(1)), o.bill.link));
      if (o.bill) add('billonly', 'Bill only', n + ', your bill ' + o.bill.params[1] + ' from Nikadi Guest House: total ' + o.bill.params[2] + ' (incl. GST), ' + o.bill.params[3] + '.\n🧾 See or download it here: ' + o.bill.link + '\nThank you for staying with us 🙏');
      add('review', 'Thank you + Google review', n + ', Hare Krishna! Thank you so much for staying with us at Nikadi Guest House. It was a joy to have you.\n⭐ If you enjoyed your stay, a short Google review helps other devotees find us: ' + DESK_WA_REVIEW + '\nWhenever the Dham calls you back, we will be happy to welcome you again.');
      add('again', o.member ? 'Come again (member)' : 'Come again + membership', n + ', Hare Krishna! We hope you reached home safely.\nWhenever you come back to Sri Dham Mayapur, message us here for the best rate.' + (o.member ? ' As a Nikadi member you get your member discount and points on every stay.' : ' Join the free Nikadi Membership for 5–20% off every stay: ' + DESK_WA_SITE + '/app/?join=1') + '\nNikadi Guest House · +91 75011 01137');
    }
    return out;
  }
  /* Enquiries: rooms + prices for the guest's dates, the 50% advance and the "advance received" reply */
  var DESK_UPI = 'nikadiguesthouse@axisbank', DESK_PAY_LINK = 'https://www.nikadiguesthouse.com/#booking';
  var DESK_TYPE_INFO = { 'Deluxe Double': ['Deluxe Double', 'king bed, up to 2 adults'], 'Deluxe Twin': ['Deluxe Twin', '2 single beds, up to 2 adults'], 'Large Twin': ['Large Twin', '2 single beds, more space, up to 3 adults'] };
  function roomTypeKey(t) { t = String(t || ''); return /large/i.test(t) ? 'Large Twin' : /twin/i.test(t) ? 'Deluxe Twin' : /double|king/i.test(t) ? 'Deluxe Double' : ''; }
  /* ---- Tonight's late price ----
     After 6 pm, if 6 or more rooms are still empty for tonight, tonight's night (only) is quoted at 3,000 (Deluxe Double, Large Twin) and 2,500 (Deluxe Twin),
     on the website, in the staff app's availability and new bookings, and in WhatsApp quotes. Tomorrow night is the normal price again.
     Only while an offer price is running (not in the full-price season). Stays and bookings already made keep the price they were given. */
  var DEAL_AFTER = 18, DEAL_ROOMS = 6, DEAL_PRICE = { double: 3000, twin: 2500 }, dealMemo = null, dealBusy = false;
  function tonightDeal() {
    var t = today(), now = Date.now();
    if (dealMemo && dealMemo.day === t && dealMemo.pm === (ist().getUTCHours() >= DEAL_AFTER) && now - dealMemo.at < 15 * 60000) return dealMemo.deal; // the empty rooms are counted again every 15 minutes (and at 6 pm sharp)
    if (dealBusy) return null;
    var deal = null;
    if (ist().getUTCHours() >= DEAL_AFTER) {
      var offer = false; DESK_RATE_PERIODS.forEach(function (p) { if (t >= p.from && t <= p.to && p.double < 5000) offer = true; });
      if (offer) { dealBusy = true; try { var free = 0; api.availability({ _internal: true, checkin: t, checkout: addDays(t, 1) }).types.forEach(function (x) { free += Number(x.free) || 0; }); if (free >= DEAL_ROOMS) deal = { date: t, double: DEAL_PRICE.double, twin: DEAL_PRICE.twin }; } catch (e) { deal = null; } dealBusy = false; }
    }
    dealMemo = { day: t, at: now, pm: ist().getUTCHours() >= DEAL_AFTER, deal: deal }; return deal;
  }
  function rateNow(type, ymd) { var r = deskRateOn(type, ymd); if (ymd !== today()) return r; var d = tonightDeal(); return d ? Math.min(r, d[/large/i.test(String(type || '')) ? 'double' : /twin/i.test(String(type || '')) ? 'twin' : 'double']) : r; }
  /* The no-show statement lives online, like a bill: www.nikadiguesthouse.com/bill/?s=<secret key>. The key is made when the booking is marked
     as a no-show (or the first time the desk asks for the link) and kept in the settings, so the link in the WhatsApp message always works. */
  var DESK_STMT_URL = DESK_BILL_URL.replace('?id=', '?s=');
  function stmtKeys() { var m = {}; try { m = JSON.parse(cfgGet('stmtKeys') || '{}') || {}; } catch (e) { m = {}; } return m; }
  function stmtKey(b, make) {
    var m = stmtKeys(); if (m[b.id] || !make) return m[b.id] || '';
    var k = ''; while (k.length < 22) k += Math.random().toString(36).slice(2); k = k.slice(0, 22).toUpperCase();
    m[b.id] = k; cfgSet('stmtKeys', JSON.stringify(m)); return k;
  }
  function stmtData(b) {
    return { no: b.id, date: today(), closed: String(b.closedAt || '').slice(0, 10), guest: { name: b.guest, phone: b.phone ? '+91 ' + String(waPhone(b.phone)).slice(-10) : '', email: b.email || '' },
      checkin: b.checkin, checkout: b.checkout, nights: Number(b.nights), rooms: roomList(b.rooms), roomType: b.roomType, guests: Number(b.guests), rate: Number(b.rate || 0), total: Number(b.total || 0),
      paid: Number(b.advancePaid || 0), refunded: Number(b.refunded || 0), policy: DESK_POLICY.text,
      payments: bookingPays(b.id).map(function (p) { return { date: String(p.at).slice(0, 10), method: p.method, ref: p.ref, amount: Number(p.amount) }; }) };
  }
  /* WhatsApp text for a no-show: what was booked, what was paid, what was still due, and that the advance is kept under the policy */
  function noShowText(b, sal) {
    var paid = Number(b.advancePaid || 0), back = Number(b.refunded || 0), kept = Math.max(0, paid - back), total = Number(b.total || 0), bal = Math.max(0, total - paid), n = roomList(b.rooms).length || Number(b.roomsNeeded || 1);
    return sal + ', Hare Krishna! We kept ' + (n > 1 ? n + ' rooms' : 'your room') + ' ready at Nikadi Guest House for your booking ' + b.id + ' (' + dd(b.checkin) + ' to ' + dd(b.checkout) + '), but you did not arrive on the check-in day, so the booking has been closed as a no-show.\n\n' +
      'Booking statement\nBooking total: ' + rupees(total) + '\nAdvance received: ' + rupees(paid) + (back > 0 ? '\nRefunded to you: ' + rupees(back) : '') + '\nBalance that was due at check-in: ' + rupees(bal) + ' (no longer payable)\n\n' +
      (kept > 0 ? 'As per our cancellation policy, shared when you booked, the advance of ' + rupees(kept) + ' is not refundable for a no-show and cannot be moved to another date.\n' : '') +
      (stmtKey(b) ? '📄 See or download your booking statement: ' + DESK_STMT_URL + stmtKey(b) + '\n' : '') + 'We hope to welcome you in Sri Dham Mayapur another time: for a new booking, just message us here.\nNikadi Guest House · +91 75011 01137';
  }
  function quoteOf(type, ci, co, rooms) { var tot = 0, d = ci; for (var i = 0; i < nightsBetween(ci, co) && i < 60; i++) { tot += rateNow(type, d); d = addDays(d, 1); } return tot * Math.max(1, rooms || 1); }
  function enqMsgs(o) {
    var n = o.first || 'Dear Sir/Ma\'am', out = [];
    function add(kind, label, text) { out.push({ kind: kind, label: label, text: text }); }
    add('hello', 'Hello + ask dates', n + ', Hare Krishna! Thank you for contacting Nikadi Guest House, opposite ISKCON Gate No. 4, Mayapur.\nPlease send your check-in date, number of nights, number of guests and rooms, and we will reply with the available rooms and today\'s best price.\nRoom photos: ' + DESK_WA_SITE + '/#rooms');
    if (o.ci && o.co) {
      var nights = nightsBetween(o.ci, o.co), rooms = Math.max(1, o.rooms || 1), when = dd(o.ci) + ' to ' + dd(o.co) + ' · ' + nights + ' night' + (nights > 1 ? 's' : '') + ' · ' + rooms + ' room' + (rooms > 1 ? 's' : '');
      var av = api.availability({ _internal: true, checkin: o.ci, checkout: o.co }), lines = [], best = null, want = roomTypeKey(o.type);
      ['Deluxe Double', 'Deluxe Twin', 'Large Twin'].forEach(function (k) {
        var t = av.types.filter(function (x) { return x.type === k; })[0]; if (!t || t.free < rooms) return;
        var tot = quoteOf(k, o.ci, o.co, rooms), info = DESK_TYPE_INFO[k];
        lines.push('🛏️ ' + info[0] + ' (' + info[1] + '): ' + rupees(tot) + ' total · ' + rupees(Math.round(tot / nights / rooms)) + ' a night' + (t.free <= 2 ? ' · only ' + t.free + ' left' : ''));
        if (!best || k === want) best = { type: k, total: tot };
      });
      if (lines.length) add('rooms', 'Available rooms & price', n + ', Hare Krishna! Rooms available for ' + when + ':\n' + lines.join('\n') + '\nAll rooms are air-conditioned, with private bathroom, geyser, Wi-Fi and TV. Prices include GST. Check-in from 11:00 AM, check-out by 9:00 AM.\nShall we hold a room for you?');
      else add('full', 'Sorry, we are full', n + ', Hare Krishna! Sorry, we are fully booked for ' + when + '. If your dates can change a little, tell us and we will check again. Thank you!');
      if (best) {
        var adv = Math.round(best.total / 2);
        add('advance', 'Ask for 50% advance', n + ', Hare Krishna! To hold your ' + DESK_TYPE_INFO[best.type][0] + ' for ' + when + ', please pay the 50% advance of ' + rupees(adv) + ' (total ' + rupees(best.total) + '). The balance is paid at check-in.\n💳 UPI ID: ' + DESK_UPI + ' (Nikadi Guest House)\nOr scan our QR code here: ' + DESK_PAY_LINK + '\nPlease send the payment screenshot in this chat and we will confirm your booking right away.\nCancellation: 3 or more days before check-in, full refund of the advance.');
        add('paid', 'Advance received', n + ', Hare Krishna! Thank you, we have received your advance' + (adv ? ' of ' + rupees(adv) : '') + '. We are confirming your booking now and will send the confirmation with all the details in a moment.');
      }
    }
    add('reg', 'Registration form', n + ', Hare Krishna! Please fill our guest registration form before arrival, so check-in takes only a minute: ' + DESK_WA_SITE + '/#guest-registration');
    add('policy', 'Check-in & cancellation', n + ', Hare Krishna! Check-in from 11:00 AM, check-out by 9:00 AM. Please bring a photo ID for every guest.\nA 50% advance holds the room; the balance is paid at check-in.\nCancellation: cancel 3 or more days before check-in for a full refund of the advance; after that the advance is not refundable.\nFull details: ' + DESK_WA_SITE + '/#cancellation');
    return out;
  }
  function noPayText(b, sal) {
    return sal + ', Hare Krishna! We hope you are keeping well. We were happily holding booking ' + b.id + ' at Nikadi Guest House for ' + dd(b.checkin) + ' to ' + dd(b.checkout) + ' for you. ' +
      'As we have not received the advance or a reply from you, we have released the room, so this booking now stands cancelled.\n' +
      'No worries at all, plans change! Whenever you wish to come to Sri Dham Mayapur, just message us here and we will gladly book again for you at our best rate.\n' +
      'With warm wishes, Nikadi Guest House · opposite ISKCON Gate No. 4 · +91 75011 01137';
  }
  /* Pending booking: the full "advance pending" message with rooms, dates, total and the advance to pay */
  function advPendingText(b, sal) {
    var nights = nightsBetween(b.checkin, b.checkout), rooms = Math.max(1, Number(b.roomsNeeded || 1)), list = roomList(b.rooms);
    var type = roomTypeKey(b.roomType) || (list.length ? roomTypeKey((find('rooms', 'room', Number(list[0])) || {}).type) : '') || 'Deluxe Double';
    var total = Number(b.total) > 0 ? Number(b.total) : Number(b.rate) > 0 ? Number(b.rate) * nights * rooms : quoteOf(type, b.checkin, b.checkout, rooms);
    var due = Math.max(0, (Number(b.advanceDue) > 0 ? Number(b.advanceDue) : Math.ceil(total / 2)) - Number(b.advancePaid || 0));
    return sal + ', Hare Krishna! Thank you for choosing Nikadi Guest House. Your booking details:\n' +
      'Booking no.: ' + b.id + '\n' +
      (list.length ? 'Room' + (list.length > 1 ? 's' : '') + ': ' + list.join(', ') + ' (' + DESK_TYPE_INFO[type][0] + ')' : 'Room: ' + rooms + ' × ' + DESK_TYPE_INFO[type][0]) + '\n' +
      'Check-in: ' + dd(b.checkin) + ', from 11:00 AM\nCheck-out: ' + dd(b.checkout) + ', by 9:00 AM\n' +
      'Guests: ' + (b.guests || 2) + ' · ' + nights + ' night' + (nights > 1 ? 's' : '') + '\n' +
      'Total: ' + rupees(total) + (Number(b.advancePaid) > 0 ? '\nAdvance already received: ' + rupees(b.advancePaid) : '') + '\n\n' +
      'To confirm your booking, please pay the advance of ' + rupees(due) + '. The balance is paid at check-in.\n' +
      'UPI ID: ' + DESK_UPI + ' (Nikadi Guest House)\nQR code: ' + DESK_PAY_LINK + '\n' +
      'Please send the payment screenshot in this chat. Your room is held for you once the advance is received.\n' +
      'Cancellation: 3 or more days before check-in, full refund of the advance.';
  }
  /* General enquiry replies: no name or dates needed, send to anyone */
  function genMsgs() {
    var G = 'Dear Sir/Ma\'am, Hare Krishna!', t = today(), out = [];
    function add(kind, label, text) { out.push({ kind: kind, label: label, text: waSafe(text) }); }
    add('ghello', 'Thank you for contacting us', G + ' Thank you for contacting Nikadi Guest House, opposite ISKCON Gate No. 4, Mayapur. How can we help you?');
    add('gdates', 'Please share your dates', G + ' Please share your check-in date, check-out date, number of guests and rooms needed, and we will reply with the available rooms and today\'s best price.');
    add('gfind', 'How to find us', G + ' Here is how to reach Nikadi Guest House:\nBhaktisiddhanta Saraswati Marg, opposite ISKCON Gate No. 4 (Namahatta Bhavan), Mayapur. Look for our lit NIKADI GUEST HOUSE sign.\nEnter at the left corner of the building, beside the picture of Sri Chaitanya Mahaprabhu, and take the stairs up to our first-floor reception.\nGoogle Maps: ' + DESK_WA_MAPS + '\nCall us any time: +91 75011 01137.');
    add('grooms', 'Our rooms & prices', G + ' Our air-conditioned rooms (private bathroom with geyser, Wi-Fi and TV):\n• Deluxe Double (king bed, up to 2 adults): ' + rupees(rateNow('Deluxe Double', t)) + ' a night\n• Deluxe Twin (2 single beds, up to 2 adults): ' + rupees(rateNow('Deluxe Twin', t)) + ' a night\n• Large Twin (2 single beds, more space, up to 3 adults): ' + rupees(rateNow('Large Twin', t)) + ' a night\nPrices include GST and can change by date. Send us your dates for the exact price.');
    add('gphotos', 'Photos & website', G + ' You can see our rooms and photos here: ' + DESK_WA_SITE + '/#rooms');
    add('gpay', 'Advance & payment', G + ' To confirm a booking we take a 50% advance; the balance is paid at check-in.\nUPI ID: ' + DESK_UPI + ' (Nikadi Guest House)\nQR code: ' + DESK_PAY_LINK + '\nPlease send the payment screenshot in this chat.');
    add('grules', 'Check-in & house rules', G + ' Check-in from 11:00 AM, check-out by 9:00 AM. Please bring a photo ID for every guest.\nNikadi is a pure vegetarian home: no smoking, tobacco or alcohol. Quiet hours 10 PM to 6 AM. Rooms only; Govinda\'s and prasadam halls are a short walk away.');
    add('gcancel', 'Cancellation policy', G + ' Cancel 3 or more days before check-in for a full refund of the advance. After that, the advance is not refundable. Full details: ' + DESK_WA_SITE + '/#cancellation');
    add('gcall', 'We will call you back', G + ' Thank you for your message. Our reception will call you back shortly. You can also call us on +91 75011 01137.');
    add('gthanks', 'Thank you, see you soon', G + ' Thank you for choosing Nikadi Guest House. We look forward to welcoming you in Sri Dham Mayapur!');
    return out;
  }
  function waKitList(light) {
    var mem = function (ph) { return light ? false : !!memberOf(ph); };
    var t = today(), sent = {}, folders = { in: [], out: [] };
    db.all('wa').forEach(function (m) { if (/^hand:/.test(m.kind) && m.status === 'Sent') sent[m.ref + '|' + m.kind.slice(5)] = m.info; });
    function ok(phone, waOk) { return phone && waOk !== 'No' && !waOptedOut(phone); }
    function push(folder, key, o) {
      var msgs = waKitMsgs(folder, o).map(function (m) { m.text = waSafe(m.text); m.sent = sent[key + '|' + m.kind] || ''; return m; });
      var done = sent[key + '|done' + folder] || '';
      folders[folder].push({ key: key, name: o.name, phone: waPhone(o.phone), room: o.room || '', sub: o.sub, msgs: msgs, done: done, todo: !done && msgs.some(function (m) { return !m.sent && (m.kind === 'welcome' || m.kind === 'bill' || m.kind === 'booking'); }) });
    }
    db.all('bookings').forEach(function (b) {
      if (b.status !== 'Confirmed' || !ok(b.phone, b.waOk) || b.checkin > addDays(t, 3) || b.checkout < t) return;
      var rooms = String(b.rooms || '').split(',').filter(function (x) { return x.trim(); }).length || Number(b.roomsNeeded || 1);
      push('in', b.id, { name: b.guest, first: salute(b.guest), phone: b.phone, checkin: b.checkin, checkout: b.checkout, rooms: rooms, advance: Number(b.advancePaid || 0) - Number(b.refunded || 0), booking: b,
        sub: 'Booking ' + b.id + ' · arrives ' + dd(b.checkin), member: mem(b.phone) });
    });
    folders.enq = [];
    db.all('bookings').forEach(function (b) {
      if (b.status !== 'Pending' || !b.phone || waOptedOut(b.phone) || b.checkout < t) return;
      var msgs = light ? [{ kind: 'advance' }] : enqMsgs({ first: salute(b.guest), ci: b.checkin, co: b.checkout, rooms: Number(b.roomsNeeded || 1), type: b.roomType }).filter(function (m) { return m.kind !== 'hello'; });
      if (!light) msgs.unshift({ kind: 'advpending', label: 'Advance pending: confirm booking', text: advPendingText(b, salute(b.guest)) });
      if (!light) msgs.push({ kind: 'nopay', label: 'No advance received: booking released', text: noPayText(b, salute(b.guest)) });
      msgs.forEach(function (m) { if (m.text) m.text = waSafe(m.text); m.sent = sent[b.id + '|' + m.kind] || ''; });
      var done = sent[b.id + '|doneenq'] || '';
      folders.enq.push({ key: b.id, name: b.guest, phone: waPhone(b.phone), room: '', sub: 'Pending booking ' + b.id + ' · ' + dd(b.checkin) + ' to ' + dd(b.checkout) + ' · ' + (b.source || ''), msgs: msgs, booking: b.id, done: done,
        todo: !done && !msgs.some(function (m) { return m.sent; }) });
    });
    /* Cancelled in the last 7 days: the cancellation message with the refund details */
    db.all('bookings').forEach(function (b) {
      if (b.status !== 'Cancelled' || !b.phone || waOptedOut(b.phone) || String(b.closedAt || '').slice(0, 10) < addDays(t, -7)) return;
      var sal = salute(b.guest), paid = Number(b.advancePaid || 0), back = Number(b.refunded || 0), kept = Math.max(0, paid - back);
      var msgs = light ? [] : (paid > 0 ? [] : [{ kind: 'nopay', label: 'Cancelled: no advance or reply', text: noPayText(b, sal) }]).concat([
        { kind: 'cancelled', label: paid > 0 ? 'Booking cancelled' : 'Cancelled at the guest\'s request', text: sal + ', Hare Krishna! As requested, your booking ' + b.id + ' at Nikadi Guest House for ' + dd(b.checkin) + ' to ' + dd(b.checkout) + ' has been cancelled.' +
          (back > 0 ? '\nWe have refunded ' + rupees(back) + ' to you. It can take a few working days to reach your account.' : '') +
          (kept > 0 ? '\nAs per our cancellation policy, ' + rupees(kept) + ' of the advance is not refundable.' : '') +
          '\nWe hope to welcome you in Sri Dham Mayapur another time. For a new booking, just message us here.' },
        { kind: 'cancelagain', label: 'Book again another time', text: sal + ', Hare Krishna! Whenever you plan your next visit to Sri Dham Mayapur, message us here and we will give you our best rate. Nikadi Guest House, opposite ISKCON Gate No. 4 · +91 75011 01137' }

      ]);
      msgs.forEach(function (m) { m.text = waSafe(m.text); m.sent = sent[b.id + '|' + m.kind] || ''; });
      folders.enq.push({ done: sent[b.id + '|doneenq'] || '', key: b.id, name: b.guest, phone: waPhone(b.phone), room: '', sub: 'Cancelled ' + dd(String(b.closedAt).slice(0, 10)) + ' · booking ' + b.id + ' · ' + dd(b.checkin) + ' to ' + dd(b.checkout), msgs: msgs, booking: b.id, cancelled: true,
        todo: !msgs.some(function (m) { return m.sent; }) && !light });
    });
    /* No-show in the last 14 days: the message that tells the guest the booking is closed and the advance is kept, with the figures */
    db.all('bookings').forEach(function (b) {
      if (b.status !== 'No-show' || !b.phone || waOptedOut(b.phone) || String(b.closedAt || '').slice(0, 10) < addDays(t, -14)) return;
      var sal = salute(b.guest);
      var msgs = light ? [] : [{ kind: 'noshow', label: 'No-show: booking closed, advance not refundable', text: noShowText(b, sal) },
        { kind: 'cancelagain', label: 'Book again another time', text: sal + ', Hare Krishna! Whenever you plan your next visit to Sri Dham Mayapur, message us here and we will give you our best rate. Nikadi Guest House, opposite ISKCON Gate No. 4 · +91 75011 01137' }];
      msgs.forEach(function (m) { m.text = waSafe(m.text); m.sent = sent[b.id + '|' + m.kind] || ''; });
      folders.enq.push({ done: sent[b.id + '|doneenq'] || '', key: b.id, name: b.guest, phone: waPhone(b.phone), room: '', sub: 'No-show ' + dd(String(b.closedAt).slice(0, 10)) + ' · booking ' + b.id + ' · ' + dd(b.checkin) + ' to ' + dd(b.checkout), msgs: msgs, booking: b.id, cancelled: true,
        todo: !msgs.some(function (m) { return m.sent; }) && !light });
    });
    folders.enq.reverse();
    db.all('stays').forEach(function (s) {
      if (!ok(s.phone, s.waOk)) return;
      if (s.status !== 'In house' && s.status !== 'Checked out') return;
      var member;
      if (s.status === 'In house') {
        member = mem(s.phone);
        push('in', s.id, { name: s.guest, first: salute(s.guest, s.title), phone: s.phone, room: s.room, checkin: s.checkin, checkout: s.checkout, member: member, sub: 'Room ' + s.room + ' · ' + dd(s.checkin) + ' to ' + dd(s.checkout) });
        if (s.checkout <= addDays(t, 1)) push('out', s.id, { name: s.guest, first: salute(s.guest, s.title), phone: s.phone, room: s.room, checkout: s.checkout, leaving: true, member: member, sub: 'Room ' + s.room + ' · leaves ' + dd(s.checkout) });
      } else if (s.status === 'Checked out' && String(s.outAt || s.checkout).slice(0, 10) >= addDays(t, -3)) {
        member = mem(s.phone);
        var b = billOfStay(s.id), bill = b ? { params: billParams(b), link: DESK_BILL_URL + b.id } : null;
        push('out', s.id, { name: s.guest, first: salute(s.guest, s.title), phone: s.phone, room: s.room, checkout: s.checkout, bill: bill, member: member, sub: 'Room ' + s.room + ' · left ' + dd(String(s.outAt || s.checkout).slice(0, 10)) });
      }
    });
    folders.out.reverse();
    folders.out = folders.out.filter(function (g) { return !g.done; }); // guests marked Done leave the list
    folders.enq = folders.enq.filter(function (g) { return !g.done; });
    if (!light) folders.gen = genMsgs();
    return folders;
  }
  function waKitCount() { var f = waKitList(true); return ['in', 'out', 'enq'].reduce(function (n, k) { return n + f[k].filter(function (g) { return g.todo; }).length; }, 0); }
  function waHandCount() {
    if (waAutoOn()) return 0;
    return db.all('wa').filter(function (m) { return m.status === 'Waiting'; }).length + db.all('bills').filter(function (b) { return b.wa === 'Waiting' && b.phone && !/^(Stopped|On hold)/.test(String(b.status || '')); }).length;
  }
  function waSentToday(phone) {
    var t = today(), n = 0, mine = 0, ph = phone ? waPhone(phone) : '';
    db.all('wa').forEach(function (x) { if (x.status === 'Sent' && String(x.info || '').slice(0, 10) === t) { n++; if (ph && waPhone(x.to) === ph) mine++; } });
    db.all('bills').forEach(function (b) { if (/^Sent/.test(b.wa || '') && String(b.wa).slice(5, 15) === t) { n++; if (ph && waPhone(b.phone) === ph) mine++; } });
    return { all: n, mine: mine };
  }
  function waSendOne(m) {
    if (waOptedOut(m.to)) { db.set('wa', m, { status: 'Not sent', info: 'Guest said STOP' }); return; }
    var cnt = waSentToday(m.to);
    if (cnt.all >= DESK_WA_DAY_MAX || cnt.mine >= 2) { db.set('wa', m, { status: 'Not sent', info: 'Daily safety limit' }); return; }
    if (hooks.claim && !hooks.claim('wa-' + m.id)) return; // another run is already sending this one: never send twice
    try {
      var id1 = hooks.waSend(DESK_WA[m.kind], m.to, waParams(m), null, null);
      db.set('wa', m, { status: 'Sent', info: stamp() + (id1 ? ' · ' + String(id1).slice(-12) : '') });
    } catch (e) { db.set('wa', m, { status: 'Failed', info: String(e && e.message || e).slice(0, 120) }); raiseAlert('WhatsApp ' + m.kind + ' message not sent', 'To ' + m.to + ' (' + (m.name || '') + '): ' + String(e && e.message || e)); }
  }
  function raiseAlert(subject, detail) { if (/template|132001|does not exist|not approved/i.test(String(detail))) return; if (hooks.alert) try { hooks.alert(subject, detail); } catch (e) {} } // template still waiting for Meta: not an error to report
  function waBill(row) { return waBillWith(row, pdfOf(row.id)); }
  function waBillWith(row, pdf) {
    var d = JSON.parse(row.data), params = billParams(row);
    if (waOptedOut(row.phone)) throw new Error('wa_opted_out');
    waEnsureChat(row.phone, d.guest && d.guest.name);
    var mid = hooks.waSend(DESK_WA.bill, String(row.phone), params, pdf, 'Nikadi-Bill-' + String(d.no).replace(/[^A-Za-z0-9-]+/g, '-') + '.pdf', DESK_BILL_URL + row.id);
    db.set('bills', row, { wa: 'Sent ' + stamp() });
    return mid;
  }
  /* Sends everything that is due: bill emails + WhatsApp bills (12 h after check-out) and WhatsApp welcome / membership / booking messages. */
  function sendDue(waOnly) {
    var now = stamp(), out = [], ready = waReady();
    if (!waOnly) db.all('bills').forEach(function (row) {
      if (!row.sendAt || row.sendAt > now) return;
      if (row.status === 'Scheduled' && row.email) {
        var d = JSON.parse(row.data); d.url = DESK_BILL_URL + row.id;
        try { sendBill({ row: row, data: d }, row.email, pdfOf(row.id)); out.push(row.no); }
        catch (e) { db.set('bills', row, { status: 'Failed: ' + String(e && e.message || e).slice(0, 60) }); raiseAlert('Bill email not sent: ' + row.no, row.guest + ' · ' + row.email + '\n' + String(e && e.message || e)); }
      }
      if (row.wa === 'Waiting' && !/^Stopped/.test(row.status || '')) {
        if (!waAutoOn()) { if (plusHours(row.sendAt, 72) < now) db.set('bills', row, { wa: 'Not sent (automatic WhatsApp paused)' }); }
        else if (!ready) db.set('bills', row, { wa: 'Not sent (WhatsApp not connected)' });
        else if (waSentToday(row.phone).all >= DESK_WA_DAY_MAX || waSentToday(row.phone).mine >= 2) { /* safety limit: try again tomorrow */ }
        else if (hooks.claim && !hooks.claim('billwa-' + row.id + '-' + String(row.sendAt).replace(/\D/g, ''))) { /* another run is sending it */ }
        else { try { waBill(row); out.push(row.no + ' (WhatsApp)'); } catch (e) { db.set('bills', row, { wa: 'Failed: ' + String(e && e.message || e).slice(0, 60) }); raiseAlert('WhatsApp bill not sent: ' + row.no, row.guest + ' · ' + row.phone + '\n' + String(e && e.message || e)); } }
      }
      if (row.pdf && row.status !== 'Scheduled' && row.wa !== 'Waiting' && (billArchived(row) || plusHours(row.pdf, 72) < now)) { pdfClear(row.id); db.set('bills', row, { pdf: '' }); }
    });
    db.all('wa').forEach(function (m) {
      if (m.status !== 'Waiting' || m.sendAt > now) return;
      if (!waAutoOn()) { if (plusHours(m.sendAt, 72) < now) db.set('wa', m, { status: 'Not sent', info: 'Not sent by hand within 3 days' }); return; }
      if (plusHours(m.sendAt, 24) < now) { db.set('wa', m, { status: 'Not sent', info: 'Too old to send' }); return; }
      if (!ready) { db.set('wa', m, { status: 'Not sent', info: 'WhatsApp not connected' }); return; }
      waSendOne(m); out.push(m.kind + ' → ' + m.to);
    });
    return out;
  }
  /* ================= Google Drive records =================
     Every stay is filed for good in Drive: Nikadi Guest House Records / 2026 / 11 November / 17 Nov 2026 / Room 3 · Guest · 5 nights
     with "Stay details" (PDF: dates, room, who gave the room, items, payments), the bill PDF and the ID copies.
     The other nights of the stay (18, 19, 20, 21 Nov) only get a short link back to the check-in day folder.
     Changes are marked here and saved to Drive by the 15-minute timer (hooks.archive). */
  function archiveMark(sid) {
    if (!sid) return;
    var a = find('archive', 'stay', sid);
    if (!a) db.add('archive', { stay: sid, cin: '', folder: '', details: '', key: '', bill: '', billAt: '', notes: '', dirty: stamp(), at: '', error: '' });
    else if (!a.dirty) db.set('archive', a, { dirty: stamp() });
  }
  function billArchived(row) { var a = find('archive', 'stay', row.stay); return !!(a && a.billAt && a.billAt === String(row.pdf)); }
  function hx(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tm(t) { t = String(t || ''); return t ? dd(t) + (t.length > 10 ? ', ' + t.slice(11, 16) : '') : ''; }
  function stayRecord(s) {
    var r0 = find('rooms', 'room', s.room) || {}, b = billOfStay(s.id), ch = chargesOf(s.id), pays = paymentsOf(s.id).slice();
    if (s.booking) bookingPays(s.booking).forEach(function (p) { if (Number(p.amount) > 0) pays.unshift({ at: p.at, amount: p.amount, method: p.method, ref: p.ref, by: p.by, note: 'Advance · booking ' + s.booking }); });
    var ids = db.all('guestids').filter(function (x) { return x.stay === s.id && !x.removed; });
    var row = function (k, v) { return v === '' || v == null ? '' : '<tr><th>' + hx(k) + '</th><td>' + hx(v) + '</td></tr>'; };
    var body = '<h1>Nikadi Guest House · Stay record</h1><p class="s">Room ' + hx(s.room) + ' · ' + hx(s.guest) + ' · ' + hx(s.status) + '</p>' +
      '<table>' + row('Room', s.room + (r0.type ? ' · ' + r0.type : '')) + row('Guest', [s.title, s.guest].filter(Boolean).join(' ')) + row('Phone', s.phone) + row('Email', s.email) + row('Address', s.address) +
      row('Company / GSTIN', [s.company, s.gstin].filter(Boolean).join(' · ')) + row('Guests in room', s.guests) + row('Other guests', companionsOut(s.companions).join(', ')) +
      row('Check-in', dd(s.checkin) + (s.inAt ? ' · arrived ' + tm(s.inAt) : '')) + row('Room given by', s.inBy) +
      row(s.status === 'Checked out' ? 'Check-out' : 'Check-out (planned)', dd(s.checkout) + (s.outAt ? ' · left ' + tm(s.outAt) : '')) + row('Checked out by', s.outBy) +
      row('Nights', s.nights) + row('Rate per night', rupees(s.rate) + (s.rateNote ? ' · ' + s.rateNote : '')) + row('From booking', s.booking) + row('Bill no.', b ? b.no : '') +
      row('ID copies', ids.length ? idCount(ids) + (idCount(ids) === 1 ? ' ID' : ' IDs') + ' saved in this folder (' + ids.map(function (x) { return x.label; }).join(', ') + ')' : 'None saved') + row('Notes', s.notes) + '</table>' +
      '<h2>Items given</h2>' + (ch.length ? '<table class="l"><tr><th>When</th><th>Item</th><th>Qty</th><th>Amount</th><th>By</th></tr>' + ch.map(function (c) {
        return '<tr><td>' + hx(tm(c.at)) + '</td><td>' + hx(c.item) + (c.free === 'Yes' ? ' (free' + (c.note ? ', ' + hx(c.note) : '') + ')' : '') + '</td><td>' + hx(c.qty) + '</td><td>' + (c.free === 'Yes' ? '₹0' : hx(rupees(c.total))) + '</td><td>' + hx(c.by) + '</td></tr>';
      }).join('') + '</table>' : '<p>None</p>') +
      '<h2>Payments</h2>' + (pays.length ? '<table class="l"><tr><th>When</th><th>Amount</th><th>Method</th><th>Ref. no.</th><th>Taken by</th></tr>' + pays.map(function (p) {
        return '<tr><td>' + hx(tm(p.at)) + '</td><td>' + (Number(p.amount) < 0 ? 'Refund ' + hx(rupees(-p.amount)) : hx(rupees(p.amount))) + '</td><td>' + hx(p.method) + (p.note ? ' · ' + hx(p.note) : '') + '</td><td>' + hx(p.ref) + '</td><td>' + hx(p.by) + '</td></tr>';
      }).join('') + '</table>' : '<p>None</p>') +
      '<table class="t">' + row('Room total', rupees(s.roomTotal)) + row('Extras', rupees(s.extras)) + row('Paid', rupees(s.paid)) + row(Number(s.balance) < 0 ? 'Refund due' : 'Balance due', rupees(Math.abs(Number(s.balance) || 0))) + '</table>';
    var html = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:10.5pt;color:#222;margin:28px}h1{font-size:16pt;margin:0}h2{font-size:12pt;margin:18px 0 6px}.s{color:#666;margin:4px 0 14px}' +
      'table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #ddd;vertical-align:top}th{width:32%;color:#555;font-weight:normal}.l th{width:auto;background:#f3f1ec}.t{margin-top:14px;width:50%}</style></head><body>' +
      body + '<p class="s" style="margin-top:20px">Saved by the Nikadi Staff app on ' + hx(tm(stamp())) + '.</p></body></html>';
    var nights = [], n = Number(s.nights) || nightsBetween(s.checkin, s.checkout);
    for (var i = 1; i < n; i++) nights.push({ date: addDays(s.checkin, i), name: 'Room ' + s.room + ' · ' + s.guest + ' · night ' + (i + 1) + ' of ' + n + ' → bill, IDs and details saved in ' + dd(s.checkin) });
    return { id: s.id, room: s.room, guest: s.guest, checkin: s.checkin, checkout: s.checkout, nights: n, status: s.status,
      folderName: 'Room ' + s.room + ' · ' + s.guest + ' · ' + n + (n > 1 ? ' nights' : ' night') + (s.status === 'Checked out' ? '' : ' (staying)'),
      html: html, key: body.length + ':' + hash(body), notes: nights };
  }
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return String(h); }
  /* the stay's Drive folder (made now if it does not exist yet), for the ID copies */
  function stayFolder(s) {
    if (!hooks.stayFolder) return '';
    archiveMark(s.id);
    var a = find('archive', 'stay', s.id);
    if (a.folder && a.cin === s.checkin) return a.folder;
    var f = hooks.stayFolder(stayRecord(s), a.folder || '');
    db.set('archive', a, { folder: f, cin: s.checkin });
    return f;
  }
  function archiveRun(limit) {
    if (!hooks.archive) return [];
    var list = db.all('archive');
    if (!list.length) db.all('stays').forEach(function (s) { archiveMark(s.id); }); // first run: file every stay we already have
    var done = [];
    db.all('archive').filter(function (a) { return a.dirty; }).sort(function (x, y) { return x.dirty < y.dirty ? -1 : 1; }).slice(0, limit || 8).forEach(function (a) {
      var mark = a.dirty, s = find('stays', 'id', a.stay);
      if (!s) { db.set('archive', a, { dirty: '' }); return; }
      try {
        var rec = stayRecord(s), b = billOfStay(s.id);
        rec.billPdf = b && b.pdf && String(b.pdf) !== String(a.billAt) ? pdfOf(b.id) : null;
        rec.billName = b ? 'Bill ' + String(b.no).replace(/\//g, '-') + '.pdf' : '';
        rec.ids = db.all('guestids').filter(function (x) { return x.stay === s.id && !x.removed && x.file; });
        var out = hooks.archive(rec, { folder: a.folder, cin: a.cin, details: a.details, key: a.key, bill: a.bill, notes: a.notes ? JSON.parse(a.notes) : {} });
        rec.ids.forEach(function (x) { if (x.folder !== out.folder) db.set('guestids', x, { folder: out.folder }); });
        var p = { folder: out.folder, cin: s.checkin, details: out.details, key: rec.key, bill: out.bill || a.bill, notes: JSON.stringify(out.notes || {}), at: stamp(), error: '' };
        if (rec.billPdf) p.billAt = String(b.pdf);
        var now = find('archive', 'stay', s.id); if (now && now.dirty === mark) p.dirty = '';
        db.set('archive', a, p); done.push(s.id);
      } catch (e) { db.set('archive', a, { error: stamp() + ' ' + String(e && e.message || e).slice(0, 120) }); }
    });
    return done;
  }

  function billInfo(s, b) {
    if (!b) return null;
    return { stay: s.id, no: b.data.no, id: b.data.id, url: b.data.url, sent: b.row.sent, email: s.email || '', phone: s.phone, gstin: s.gstin || '', company: s.company || '', title: s.title || '',
      address: s.address || '', name: s.guest, status: b.row.status || '', sendAt: b.row.sendAt || '', hasPdf: !!b.row.pdf, edited: b.row.edited || '', wa: b.row.wa || '', data: b.data };
  }
  function billFields(s, req) {
    var p = {};
    if (req.email != null) { p.email = text(req.email, 80); if (p.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) fail('invalid_email'); }
    if (req.gstin != null) { p.gstin = text(req.gstin, 15).toUpperCase(); if (p.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(p.gstin)) fail('invalid_gstin'); }
    if (req.company != null) p.company = text(req.company, 80);
    if (req.address != null) p.address = text(req.address, 160);
    if (req.name != null) { p.guest = text(req.name, 80); if (!p.guest) fail('name_required'); }
    if (req.title != null) { p.title = String(req.title); if (['', 'Mr.', 'Ms.', 'Mrs.', 'Dr.'].indexOf(p.title) < 0) fail('bad_title'); }
    if (Object.keys(p).length) db.set('stays', s, p);
    return Object.keys(p).length > 0;
  }
  function checkedOut(req) { var s = stay(req.id); if (s.status !== 'Checked out') fail('not_checked_out'); return s; }

  /* ---- staff attendance (log-in / log-out with location) ---- */
  function cfgGet(k) { var r = find('config', 'key', k); return r ? r.value : ''; }
  function cfgSet(k, v) { var r = find('config', 'key', k); if (r) db.set('config', r, { value: String(v) }); else db.add('config', { key: k, value: String(v) }); }
  function home() { var v = String(cfgGet('home') || '').split(','); return v.length >= 2 && !isNaN(+v[0]) && !isNaN(+v[1]) && v[0] !== '' ? { lat: +v[0], lng: +v[1], radius: +(v[2] || DESK_ATTEND_RADIUS) } : null; }
  function metres(a, b) {
    var R = 6371000, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(2 * R * Math.asin(Math.sqrt(x)));
  }
  function readLoc(req) {
    var l = req.loc || {}, lat = Number(l.lat), lng = Number(l.lng), acc = Math.round(Number(l.acc) || 0);
    var dev = text(req.device, 80);
    if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) || (lat === 0 && lng === 0)) {
      var why = { denied: 'Location blocked', unavailable: 'Location not available', timeout: 'Location timed out' }[String(req.locErr || '')] || 'No location';
      return { place: why, lat: '', lng: '', acc: '', device: dev };
    }
    var h = home(), place;
    if (!h) place = 'Location saved (guest house spot not set)';
    else { var m = metres(h, { lat: lat, lng: lng }); place = m <= h.radius + Math.min(acc, 1500) ? 'At the guest house' : (m >= 1000 ? (m / 1000).toFixed(1) + ' km' : m + ' m') + ' away'; }
    return { place: place, lat: lat, lng: lng, acc: acc, device: dev };
  }
  function tokenKey(t) { return String(t || '').slice(-14); }
  function openEntries(name) { return db.all('attendance').filter(function (a) { return a.name === name && !a.outAt; }); }
  function closeEntry(a, how, at, loc) {
    var p = { outAt: at || a.lastSeen || a.inAt, outHow: how };
    if (loc) { p.outPlace = loc.place; p.outLat = loc.lat; p.outLng = loc.lng; p.outAcc = loc.acc; p.outDevice = loc.device; }
    db.set('attendance', a, p);
  }
  function workdayEnd() { var d = ist(Date.now() + (ist().getUTCHours() < 4 ? 0 : 864e5)); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' 04:00'; }
  function seen(me, token) { // keeps "last active" so a forgotten log-out still shows when they stopped
    if (DESK_ATTEND_ROLES.indexOf(me.role) < 0) return;
    try {
      var k = tokenKey(token), a = db.all('attendance').filter(function (x) { return x.session === k && !x.outAt; })[0];
      if (a && (!a.lastSeen || plusHours(a.lastSeen, 0.17) < stamp())) db.set('attendance', a, { lastSeen: stamp() });
    } catch (e) {}
  }

  var api = {};

  api.login = function (req) {
    var fails = Number(db.kvGet('pin_fails') || 0);
    if (fails >= 10) fail('too_many_attempts');
    var pin = String(req.pin || '').replace(/\D/g, '');
    var person = db.all('staff').filter(function (p) { return yes(p.active) && String(p.pin) === pin && pin.length >= 4; })[0];
    if (!person) { db.kvSet('pin_fails', String(fails + 1), 900); fail('wrong_pin'); }
    if (ROLES.indexOf(person.role) < 0) fail('bad_role');
    var token = id('T') + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    var d = ist(Date.now() + 30 * 864e5), attend = DESK_ATTEND_ROLES.indexOf(person.role) >= 0;
    db.add('sessions', { token: token, name: person.name, role: person.role,
      expires: attend ? workdayEnd() : d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' 00:00' });
    var where = null;
    if (attend) {
      openEntries(person.name).forEach(function (a) { closeEntry(a, 'No log-out (closed at next log-in)'); });
      var L = readLoc(req);
      db.add('attendance', { id: id('A'), name: person.name, role: person.role, inAt: stamp(), inPlace: L.place, inLat: L.lat, inLng: L.lng, inAcc: L.acc, inDevice: L.device,
        outAt: '', outPlace: '', outLat: '', outLng: '', outAcc: '', outDevice: '', outHow: '', lastSeen: stamp(), session: tokenKey(token) });
      where = L.place;
    }
    return { token: token, me: { name: person.name, role: person.role }, attendance: where };
  };

  api.logout = function (req) {
    var s = find('sessions', 'token', req.token);
    if (s && DESK_ATTEND_ROLES.indexOf(s.role) >= 0) {
      var k = tokenKey(req.token), L = readLoc(req);
      db.all('attendance').filter(function (a) { return a.session === k && !a.outAt; }).forEach(function (a) { closeEntry(a, 'Logged out', stamp(), L); });
    }
    if (s) db.set('sessions', s, { expires: '2000-01-01 00:00' });
    return {};
  };

  api.state = function (req) {
    var me = auth(req), mgr = isMgr(me), t = today();
    if (me.role === 'Laundry') return { me: me, today: t, now: stamp(), rooms: [], items: [], toBuy: [], stocklog: [], arrivals: [], hk: { stay: [], out: [] }, methods: METHODS, pending: 0, approvals: 0, myRequests: 0, waNew: 0,
      laundryNew: db.all('laundry').filter(function (x) { return x.status === 'At laundry' || x.status === 'Part returned'; }).length };
    var stays = {};
    db.all('stays').forEach(function (s) { if (s.status === 'In house') stays[s.id] = s; });
    var arriving = {};
    db.all('bookings').forEach(function (b) {
      if (b.status === 'Confirmed' && b.checkin <= t && b.checkout > t) roomList(b.rooms).forEach(function (n) { arriving[n] = b; });
    });
    var rooms = db.all('rooms').map(function (r) {
      var o = { room: r.room, type: r.type, beds: r.beds, status: r.status, updated: r.updated, by: r.by };
      var ab = arriving[r.room];
      if (ab && !(r.stay && stays[r.stay])) o.arriving = { id: ab.id, guest: mgr ? ab.guest : String(ab.guest || '').split(/\s+/)[0], late: ab.checkin < t, comp: ab.comp || '' };
      if (mgr) o.rate = r.type ? rateNow(r.type, t) : r.rate;
      var s = r.stay && stays[r.stay];
      if (s) {
        o.stay = { id: s.id, guest: mgr ? s.guest : String(s.guest || '').split(/\s+/)[0], guests: s.guests, checkin: s.checkin, checkout: s.checkout,
          leavesToday: s.checkout <= t, comp: s.comp || '' };
        if (mgr) o.stay.balance = s.balance;
        var sv = serviceView(s); if (sv) o.service = { day: sv.day, of: sv.of, done: sv.done ? { by: sv.done.by, at: sv.done.at } : null };
      }
      return o;
    }).sort(function (a, b) { return a.room - b.room; });
    var items = db.all('items').filter(function (i) { return yes(i.active); }).map(function (i) {
      var df = dailyFree().filter(function (d) { return d.item === i.item; })[0];
      var o = { item: i.item, track: yes(i.track), stock: i.stock, low: i.low, sell: sellable(i) };
      o.daily = df ? df.qty : 0;
      if (mgr) o.price = i.price;
      return o;
    });
    var bks = db.all('bookings');
    var reqs = db.all('requests');
    me.canApprove = canApprove(me);
    var out = { me: me, today: t, now: stamp(), hk: { stay: DESK_HK_STAY, out: DESK_HK_OUT }, compHosts: DESK_COMP_HOSTS, lateOut: DESK_LATE_OUT, fine: { item: DESK_FINE_ITEM, amount: DESK_FINE_AMOUNT, text: DESK_FINE_TEXT }, rooms: rooms, items: items, methods: METHODS, policy: DESK_POLICY,
      pinWarn: pinWarnings(me),
      approvals: canApprove(me) ? reqs.filter(function (r) { return r.status === 'Pending'; }).length : 0,
      backToReady: true, waAuto: waAutoOn(), waConsent: true, waToSend: mgr ? waKitCount() : 0,
      laundryNew: mgr ? db.all('laundry').filter(function (x) { return x.status === 'Waiting for approval' || x.status === 'Return to check'; }).length : 0,
      myRequests: me.role === 'Receptionist' ? reqs.filter(function (r) { return r.status === 'Pending' && r.by === me.name; }).length : 0,
      stocklog: db.all('stocklog').slice(-15).reverse(),
      linen: linenAll().filter(function (i) { return yes(i.active); }).map(function (i) { return linenView(i, me); }), linenGroups: DESK_LINEN_GROUPS,
      toBuy: items.filter(function (i) { return i.track && Number(i.stock) < Number(i.low); }).map(function (i) { return { item: i.item, stock: i.stock, low: i.low, buy: Math.max(1, Number(i.low) * 2 - Number(i.stock)) }; }),
      pending: bks.filter(function (b) { return b.status === 'Pending'; }).length,
      dummy: dummyGet(),
      regNew: mgr ? db.all('regs').filter(function (r) { return r.status === 'New'; }).length : 0,
      waNew: mgr ? db.all('wachats').filter(function (c) { return Number(c.unread) > 0 || c.important; }).length : 0,
      arrivals: bks.filter(function (b) { return b.status === 'Confirmed' && b.checkin <= t; }).map(function (b) { return bookingView(b, me); }) };
    if (mgr) {
      var pays = db.all('payments').filter(function (p) { return String(p.at).slice(0, 10) === t && p.method !== FROM_ADV && !p.voided; });
      var byMethod = {};
      METHODS.forEach(function (m) { byMethod[m] = 0; });
      pays.forEach(function (p) { byMethod[p.method] = (byMethod[p.method] || 0) + Number(p.amount || 0); });
      var inHouse = Object.keys(stays).map(function (k) { return stays[k]; });
      out.summary = {
        collected: pays.reduce(function (a, p) { return a + Number(p.amount || 0); }, 0), byMethod: byMethod,
        outstanding: inHouse.reduce(function (a, s) { return a + Math.max(0, Number(s.balance || 0)); }, 0),
        guests: inHouse.reduce(function (a, s) { return a + Number(s.guests || 0); }, 0)
      };
      out.recent = db.all('stays').filter(function (s) { return s.status === 'Checked out'; }).slice(-15).reverse().map(function (s) {
        return { id: s.id, room: s.room, guest: s.guest, checkin: s.checkin, checkout: s.checkout, roomTotal: s.roomTotal, extras: s.extras, paid: s.paid, balance: s.balance };
      });
    }
    return out;
  };

  /* Is this phone number a Nikadi member? (shows the level, member rates and perks at check-in) */
  api.member = function (req) {
    auth(req);
    var ph = phoneNorm(req.phone);
    if (!ph) return { member: null };
    return { member: memberOf(ph) };
  };

  api.stay = function (req) {
    var me = auth(req);
    return { stay: stayView(stay(req.id), me) };
  };

  api.checkIn = function (req) {
    var me = auth(req); needMgr(me);
    var r = room(req.room);
    if (r.status !== 'Ready') fail(r.status === 'Occupied' ? 'room_occupied' : 'room_not_clean');
    var guest = text(req.guest, 80); if (!guest) fail('name_required');
    var guests = Math.round(Number(req.guests)); if (!(guests >= 1 && guests <= DESK_MAX_GUESTS)) fail('max_guests');
    var cin = String(req.checkin || today()), cout = String(req.checkout || '');
    if (!isYmd(cin) || !isYmd(cout)) fail('bad_dates');
    if (dayNum(cout) <= dayNum(cin)) fail('bad_dates');
    var comp = req.comp ? String(req.comp) : '';
    if (comp && DESK_COMP_HOSTS.indexOf(comp) < 0) fail('comp_host');
    var rate = comp ? 0 : money(req.rate); if (!comp && !(rate > 0)) fail('rate_required');
    var adv = comp || req.advance === '' || req.advance == null ? 0 : money(req.advance); if (isNaN(adv)) fail('invalid_amount');
    var clash = roomClash(r.room, cin, cout); if (clash) clashFail(r.room, clash);
    var s = db.add('stays', { id: id('S'), room: r.room, guest: guest, phone: phoneOk(req.phone), guests: guests, checkin: cin, checkout: cout,
      nights: nightsBetween(cin, cout), rate: rate, rateNote: text(req.rateNote, 160), status: 'In house', roomTotal: 0, extras: 0, paid: 0, balance: 0,
      notes: text(req.notes, 300), inBy: me.name, inAt: stamp(), outBy: '', outAt: '', booking: '', companions: companionsIn(req.companions, guests), comp: comp, compRef: comp ? text(req.compRef, 120) : '',
      waOk: consent(req.waOk), waOffers: consent(req.waOk) === 'Yes' ? consent(req.waOffers) : 'No' });
    if (adv > 0) {
      if (METHODS.indexOf(req.method) < 0) fail('method_required');
      db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: r.room, amount: adv, method: req.method, note: 'Paid at check-in', by: me.name, booking: '', ref: text(req.ref, 40) });
    }
    recompute(s);
    db.set('rooms', r, { status: 'Occupied', stay: s.id, updated: stamp(), by: me.name });
    freeWater(r.room, me.name, s.id);
    if (req.kit && KITS[req.kit]) giveKit(s, req.kit, req.kitQty || guests, me.name);
    welcomeMsgs(s);
    return { stay: stayView(s, me) };
  };

  api.updateStay = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id), rt0 = s.roomTotal;
    lockedOut(me, s);
    var p = {};
    if (req.guest != null) { p.guest = text(req.guest, 80); if (!p.guest) fail('name_required'); }
    if (req.phone != null) p.phone = phoneOk(req.phone);
    if (req.guests != null) { p.guests = Math.round(Number(req.guests)); if (!(p.guests >= 1 && p.guests <= DESK_MAX_GUESTS)) fail('max_guests'); }
    if (req.rate != null && !s.comp) { p.rate = money(req.rate); if (!(p.rate > 0)) fail('rate_required'); }
    if (req.compRef != null && s.comp) p.compRef = text(req.compRef, 120);
    if (req.rateNote != null) p.rateNote = text(req.rateNote, 160);
    if (req.notes != null) p.notes = text(req.notes, 300);
    var askedNow = false;
    if (req.waOk != null) { p.waOk = consent(req.waOk); askedNow = p.waOk === 'Yes' && s.waOk !== 'Yes'; if (p.waOk !== 'Yes') p.waOffers = 'No'; }
    if (req.waOffers != null && (p.waOk || s.waOk) === 'Yes') p.waOffers = consent(req.waOffers);
    if (req.companions != null) p.companions = companionsIn(req.companions, p.guests != null ? p.guests : s.guests);
    var cin = req.checkin != null ? String(req.checkin) : s.checkin, cout = req.checkout != null ? String(req.checkout) : s.checkout;
    if (!isYmd(cin) || !isYmd(cout) || dayNum(cout) <= dayNum(cin)) fail('bad_dates');
    p.checkin = cin; p.checkout = cout; p.nights = nightsBetween(cin, cout);
    if (p.rate != null && Number(p.rate) !== Number(s.rate)) {
      var g0 = gate(me, 'updateStay', req, 'Room ' + s.room + ' · ' + s.guest + ': change rate from ₹' + s.rate + ' to ₹' + p.rate + ' per night');
      if (g0) return g0;
    }
    var targetRoom = req.room != null ? Number(req.room) : Number(s.room);
    if (s.status === 'Checked out' && cout !== s.checkout && dayNum(cout) > dayNum(today())) fail('checkout_future');
    if (s.status === 'In house' || (s.status === 'Checked out' && (cin !== s.checkin || cout !== s.checkout))) { var cl = roomClash(targetRoom, cin, cout, { stay: s.id, booking: s.booking }); if (cl) clashFail(targetRoom, cl); }
    if (req.room != null && Number(req.room) !== Number(s.room)) {
      if (s.status !== 'In house') fail('not_in_house');
      var to = room(req.room); if (to.status !== 'Ready') fail(to.status === 'Occupied' ? 'room_occupied' : 'room_not_clean');
      var from = room(s.room);
      db.set('rooms', from, { status: req.fromReady ? 'Ready' : 'Needs cleaning', stay: '', updated: stamp(), by: me.name }); // "back to ready": the old room was not used
      db.set('rooms', to, { status: 'Occupied', stay: s.id, updated: stamp(), by: me.name });
      p.room = to.room;
      p.notes = text((p.notes != null ? p.notes : s.notes) + ' · Moved from room ' + from.room + ' on ' + today(), 300);
    }
    db.set('stays', s, p);
    recompute(s);
    afterChange(s, me, rt0);
    if (askedNow && s.status === 'In house') welcomeMsgs(s); // the guest agreed later: welcome now
    return { stay: stayView(s, me) };
  };

  api.kit = function (req) {
    var me = auth(req), s = stay(req.id);
    if (s.status !== 'In house') fail('not_in_house');
    giveKit(s, req.kit || '', req.qty, me.name);
    recompute(s);
    return { stay: stayView(s, me) };
  };

  api.charge = function (req) {
    var me = auth(req), mgr = isMgr(me), r, s;
    if (req.id) { // add to a guest who already checked out (bill correction)
      s = stay(req.id); if (s.status !== 'Checked out') fail('room_not_occupied'); needApprover(me); r = { room: s.room };
    } else {
      r = room(req.room);
      if (r.status !== 'Occupied' || !r.stay) fail('room_not_occupied');
      s = stay(r.stay);
    }
    var it = item(req.item);
    var free = !!req.free || !!s.comp;
    if (!sellable(it) && !free) fail('no_item'); // free-only items (morning kit…) can still be given free
    var qty = Math.round(Number(req.qty || 1)); if (!(qty >= 1 && qty <= 50)) fail('bad_qty');
    var price = Number(it.price || 0), tot = null;
    if (mgr && req.price != null && req.price !== '') { price = money(req.price); if (isNaN(price)) fail('invalid_amount'); }
    if (mgr && req.total != null && req.total !== '' && !free) { // what the guest actually paid for all of them (e.g. ₹30 for 2 bottles)
      tot = money(req.total); if (isNaN(tot)) fail('invalid_amount'); price = Math.round(tot / qty * 100) / 100;
    }
    var note = text(req.note, 120);
    if (mgr && price !== Number(it.price) && !free) note = text((note ? note + ' · ' : '') + 'Price changed from ₹' + it.price, 160);
    var c = db.add('charges', { id: id('C'), at: stamp(), stay: s.id, room: r.room, item: it.item, qty: qty, price: free ? 0 : price,
      total: free ? 0 : tot != null ? tot : price * qty, free: free ? 'Yes' : 'No', note: note, by: me.name, removed: '' });
    moveStock(it, -qty, free ? 'Free to room' : (req.id ? 'Added to bill after check-out' : 'Charged to room'), r.room, me.name);
    recompute(s);
    afterChange(s, me, s.roomTotal);
    return { stay: req.id ? stayView(s, me) : undefined, added: { item: it.item, qty: qty, room: r.room, free: free, total: mgr ? c.total : undefined }, stock: yes(it.track) ? it.stock : null };
  };

  api.editCharge = function (req) {
    var me = auth(req); needMgr(me);
    var c = find('charges', 'id', req.id) || fail('no_charge');
    if (c.removed) fail('no_charge');
    var s = stay(c.stay), it = find('items', 'item', c.item);
    lockedOut(me, s);
    var back = req.remove && req.refundAmount ? money(req.refundAmount) : 0;
    if (isNaN(back)) fail('invalid_amount');
    if (back > 0) {
      if (back > Number(s.paid || 0)) fail('refund_too_much');
      if (METHODS.indexOf(req.method) < 0) fail('method_required');
      if ((req.method === 'UPI' || req.method === 'Bank transfer') && !text(req.ref, 40)) fail('ref_required');
    }
    var g = deskEdit(c) && s.status === 'In house' && !(back > 0) ? null : gate(me, 'editCharge', req, 'Room ' + c.room + ' · ' + c.item + ' × ' + c.qty + ' (₹' + c.total + '): ' +
      (req.remove ? 'remove from the bill' + (back > 0 ? ' and refund ₹' + back + ' by ' + req.method : '') : 'change to ' + req.qty + (req.free ? ' (free)' : req.total != null && req.total !== '' ? ' for ₹' + req.total + ' in total' : ' × ₹' + req.price)));
    if (g) return g;
    if (req.remove) {
      db.set('charges', c, { removed: 'Removed by ' + who(me, req) + ' ' + stamp() + (req.reason ? ' · ' + text(req.reason, 120) : '') });
      if (it) moveStock(it, Number(c.qty), 'Charge removed', c.room, me.name);
      if (c.note === DESK_EXTRA_NOTE) { var li = linenItem(c.item); if (li) linenMove(li, Number(c.qty), 'rooms', 'store', 'Extra removed from the room list', c.room, me.name); }
      if (back > 0) db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: -back, method: req.method, note: 'Refund: ' + c.item + ' removed' + (req.reason ? ' · ' + text(req.reason, 100) : ''),
        by: who(me, req), booking: s.booking || '', ref: text(req.ref, 40), voided: '' });
    } else {
      var qty = Math.round(Number(req.qty)); if (!(qty >= 1 && qty <= 50)) fail('bad_qty');
      var free = !!req.free, tot2 = null;
      var price = free ? 0 : money(req.price); if (isNaN(price)) fail('invalid_amount');
      if (!free && req.total != null && req.total !== '') { tot2 = money(req.total); if (isNaN(tot2)) fail('invalid_amount'); price = Math.round(tot2 / qty * 100) / 100; }
      if (it && qty !== Number(c.qty)) moveStock(it, Number(c.qty) - qty, 'Charge corrected', c.room, me.name);
      db.set('charges', c, { qty: qty, price: price, total: free ? 0 : tot2 != null ? tot2 : price * qty, free: free ? 'Yes' : 'No',
        note: text((c.note ? c.note + ' · ' : '') + 'Edited by ' + who(me, req) + (req.reason ? ': ' + text(req.reason, 80) : ''), 200) });
    }
    recompute(s);
    afterChange(s, me, s.roomTotal);
    return { stay: stayView(s, me) };
  };

  api.pay = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    if (s.comp) fail('comp_no_money');
    lockedOut(me, s);
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: amt, method: req.method, note: text(req.note, 120) || (s.status === 'Checked out' ? 'Paid after check-out' : ''), by: me.name, booking: s.booking || '', ref: text(req.ref, 40) });
    recompute(s);
    afterChange(s, me, s.roomTotal);
    return { stay: stayView(s, me) };
  };

  /* Give money back to a guest from a room bill (overpaid, item cancelled, …). Receptionists: needs approval. */
  api.refund = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    lockedOut(me, s);
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (amt > Number(s.paid || 0)) fail('refund_too_much');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    if (!text(req.reason, 200)) fail('reason_required');
    var g = gate(me, 'refund', req, 'Room ' + s.room + ' · ' + s.guest + ': refund ₹' + amt + ' by ' + req.method + (ref ? ' (' + ref + ')' : ''));
    if (g) return g;
    db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: s.room, amount: -amt, method: req.method, note: 'Refund: ' + text(req.reason, 120), by: who(me, req), booking: s.booking || '', ref: ref, voided: '' });
    recompute(s);
    afterChange(s, me, s.roomTotal);
    return { stay: stayView(s, me) };
  };

  /* ---- Wi-Fi attendance ---- */
  function wifiList() { try { return JSON.parse(cfgGet('wifi') || '[]'); } catch (e) { return []; } }
  function otherNets() { try { return JSON.parse(cfgGet('otherNets') || '[]'); } catch (e) { return []; } }
  function cleanIp(v) { v = String(v || '').trim(); return /^[0-9a-fA-F:.]{3,45}$/.test(v) ? v : ''; }
  function wifiRecent(w) { try { var a = JSON.parse(w.recent || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function wifiLogs(w) { try { var a = JSON.parse(w.logs || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  /* last 3 log-ins / log-outs on the guest house PC that day (on any device if there were none on the PC), newest first */
  function lastLogs(w, ev) {
    var all = wifiLogs(w).filter(function (x) { return x.ev === ev; }), pc = all.filter(function (x) { return isDesk(x.dev); });
    return (pc.length ? pc : all).slice(-3).reverse().map(function (x) { return { at: x.at, dev: (ev === 'login' ? 'Logged in · ' : 'Logged out · ') + (x.dev || '') }; });
  }
  function isDesk(dev) { return /PC|Mac/.test(String(dev || '')); } // the guest house desktop / laptop (not a phone)
  /* The owner picks the real exit from the person's last 3 records that day: app opens on the guest house desktop
     and the work they entered (check-ins, check-outs, payments, items, housekeeping, expenses, ID copies…), newest first. */
  var EXIT_SOURCES = [['charges', 'Added ', function (x) { return x.qty + ' × ' + x.item + ' · room ' + x.room; }], ['payments', 'Payment ', function (x) { return '₹' + x.amount + ' · ' + (x.room ? 'room ' + x.room : 'booking'); }],
    ['service', 'Housekeeping ', function (x) { return 'room ' + x.room; }], ['stocklog', 'Stock ', function (x) { return x.item + ' ' + x.change; }], ['expenses', 'Expense ', function (x) { return x.item || x.category; }],
    ['guestids', 'ID copy ', function (x) { return 'room ' + x.room; }], ['requests', 'Request ', function (x) { return x.type; }]];
  function exitChoices(w) {
    var day = String(w.date), who = w.name, out = [];
    function add(at, what) { at = String(at || ''); if (at.slice(0, 10) === day && (!w.first || at >= w.first)) out.push({ at: at, dev: what }); }
    wifiRecent(w).forEach(function (x) { add(x.at, 'App opened · ' + (x.dev || '')); });
    if (w.last) add(w.last, 'Last app open · ' + (w.lastDevice || ''));
    db.all('stays').forEach(function (x) { if (x.inBy === who) add(x.inAt, 'Checked in room ' + x.room); if (x.outBy === who) add(x.outAt, 'Checked out room ' + x.room); });
    EXIT_SOURCES.forEach(function (src) { try { db.all(src[0]).forEach(function (x) { if (x.by === who && !x.removed) add(x.at, src[1] + src[2](x)); }); } catch (e) {} });
    out.sort(function (a, b) { return a.at < b.at ? 1 : a.at > b.at ? -1 : 0; });
    var seen = {}, pick = [];
    out.forEach(function (c) { if (!seen[c.at] && pick.length < 3) { seen[c.at] = 1; pick.push(c); } });
    return pick;
  }
  /* Called by the app each time it is opened / comes back to the screen (and every 10 minutes while open). */
  api.presence = function (req) {
    var me = auth(req);
    if (DESK_WIFI_ROLES.indexOf(me.role) < 0) return { counted: false };
    var ip = cleanIp(req.ip), dev = text(req.device, 80);
    if (!ip) return { counted: false, atHouse: false };
    if (wifiList().indexOf(ip) < 0) { // remember other networks briefly, so the owner can add a new guest house IP if it changes
      var o = otherNets().filter(function (x) { return !(x.ip === ip && x.name === me.name); });
      o.unshift({ ip: ip, name: me.name, at: stamp() }); cfgSet('otherNets', JSON.stringify(o.slice(0, 12)));
      return { counted: false, atHouse: false };
    }
    var d = today(), row = db.all('wifi').filter(function (w) { return w.date === d && w.name === me.name; })[0];
    var now = stamp(), rec = row ? wifiRecent(row) : [];
    if (rec.length && rec[rec.length - 1].at === now) rec[rec.length - 1].dev = dev; else rec.push({ at: now, dev: dev });
    rec = JSON.stringify(rec.slice(-15));
    var ev = req.ev === 'login' || req.ev === 'logout' ? req.ev : '', logs = row ? wifiLogs(row) : [];
    if (ev) logs.push({ at: now, ev: ev, dev: dev });
    logs = JSON.stringify(logs.slice(-30));
    if (!row) db.add('wifi', { date: d, name: me.name, role: me.role, first: now, last: now, opens: 1, device: dev, lastDevice: dev, exitSet: '', exitBy: '', recent: rec, logs: logs });
    else db.set('wifi', row, ev ? { last: now, opens: Number(row.opens || 0) + 1, lastDevice: dev, recent: rec, logs: logs } : { last: now, opens: Number(row.opens || 0) + 1, lastDevice: dev, recent: rec });
    return { counted: true, atHouse: true };
  };
  /* Housekeeping checklist: rooms with guests staying (2nd day onwards) and the free things to give today. Everyone can see it. */
  api.housekeeping = function (req) {
    var me = auth(req), list = [];
    db.all('rooms').forEach(function (r) {
      if (r.status !== 'Occupied' || !r.stay) return;
      var s = find('stays', 'id', r.stay); if (!s) return;
      var sv = serviceView(s);
      list.push({ room: r.room, type: r.type, guest: String(s.guest || '').split(/\s+/)[0], guests: Number(s.guests), checkin: s.checkin, checkout: s.checkout,
        due: !!sv, day: sv ? sv.day : 1, of: Number(s.nights), items: sv ? sv.items : [], done: sv && sv.done ? sv.done : null, firstDay: s.checkin >= today(), leaves: s.checkout <= today() });
    });
    list.sort(function (a, b) { return a.room - b.room; });
    return { date: today(), rooms: list, daily: dailyFree() };
  };
  /* Housekeeping done for a room today: gives the free items (they show on the room as free, stock goes down). */
  api.serviceDone = function (req) {
    var me = auth(req), r = room(req.room);
    if (r.status !== 'Occupied' || !r.stay) fail('room_not_occupied');
    var s = stay(r.stay);
    if (!serviceDue(s)) fail('no_service_today');
    if (serviceOf(s.id)) fail('already_done');
    if (req.check && req.check.water === true) req.check.water = '2 given'; // an app not yet updated still sends a plain tick
    var checks = hkCheck(DESK_HK_STAY, req.check);
    hkLinen(DESK_HK_STAY, req.check, r.room, me.name);
    var day = nightsBetween(s.checkin, today()) + 1, ids = [], given = [];
    var dk = parseInt(req.check.dental, 10) || 0, extra = dk ? [{ item: 'Dental kit', qty: dk }] : [];
    var wq = parseInt(req.check.water, 10) || 0; // how many bottles were really given (0 = guest did not need water): only these leave the stock
    if (wq) extra.unshift({ item: 'Water bottle', qty: wq });
    dailyFree().filter(function (d) { return d.item !== 'Water bottle'; }).concat(extra).forEach(function (d) {
      var it = find('items', 'item', d.item), cid = id('C');
      db.add('charges', { id: cid, at: stamp(), stay: s.id, room: r.room, item: d.item, qty: d.qty, price: 0, total: 0, free: 'Yes', note: 'Daily housekeeping (day ' + day + ')', by: me.name, removed: '' });
      if (it && yes(it.track)) moveStock(it, -d.qty, 'Free daily housekeeping', r.room, me.name);
      ids.push(cid); given.push(d.qty + ' × ' + d.item);
    });
    db.add('service', { id: id('H'), date: today(), room: r.room, stay: s.id, items: (given.join(', ') || 'Room serviced') + ' · Checked: ' + checks.join(', '), by: me.name, at: stamp(), charges: ids.join(','), undone: '' });
    recompute(s);
    return api.housekeeping(req);
  };
  /* ---- Extra bedding and towels for a staying guest (everyone, housekeeping included) ----
     An extra towel, hand towel, bath mat, bedsheet, pillow, pillow cover or blanket (not a mattress, which is charged): taken from the clean store into that room,
     written on the room's list as free, and never printed on the bill. Taking one back, or the guest checking out, returns it
     (things that get washed go to the laundry pile, the rest back to the store). */
  function extrasOf(sid) { return chargesOf(sid).filter(function (c) { return c.note === DESK_EXTRA_NOTE; }); }
  function extraBack(c, by, why, clean) {
    var it = linenItem(c.item);
    if (it) linenMove(it, Number(c.qty), 'rooms', clean || it.wash === 'No' ? 'store' : 'dirty', why, c.room, by);
    db.set('charges', c, { removed: why + ' · ' + by + ' ' + stamp() });
  }
  api.linenExtra = function (req) {
    var me = auth(req);
    if (req.back) { // take one back from the room
      var c = find('charges', 'id', String(req.back)); if (!c || c.removed || c.note !== DESK_EXTRA_NOTE) fail('no_charge');
      extraBack(c, me.name, req.unused ? 'Taken back unused' : 'Taken back from the room', !!req.unused);
    } else if (req.room != null && req.items) {
      var r = room(req.room); if (r.status !== 'Occupied' || !r.stay) fail('room_not_occupied');
      var s = stay(r.stay), n = linenCounts(req.items);
      if (!linenSum(n)) fail('bad_qty');
      Object.keys(n).forEach(function (k) { if (n[k] > 20 || /mattress/i.test(k)) fail('bad_qty'); }); // an extra mattress is charged: it goes through Add item, never through this free list
      Object.keys(n).forEach(function (k) {
        linenMove(linenItem(k), n[k], 'store', 'rooms', 'Extra for the guest', r.room, me.name);
        db.add('charges', { id: id('C'), at: stamp(), stay: s.id, room: r.room, item: k, qty: n[k], price: 0, total: 0, free: 'Yes', note: DESK_EXTRA_NOTE, by: me.name, removed: '' });
      });
    }
    var rooms = [];
    db.all('rooms').forEach(function (r) {
      if (r.status !== 'Occupied' || !r.stay) return;
      var s = find('stays', 'id', r.stay); if (!s) return;
      rooms.push({ room: r.room, guest: String(s.guest || '').split(/\s+/)[0], given: extrasOf(s.id).map(function (c) { return { id: c.id, item: c.item, qty: Number(c.qty), by: c.by, at: c.at }; }) });
    });
    rooms.sort(function (a, b) { return a.room - b.room; });
    return { rooms: rooms, items: linenAll().filter(function (i) { return yes(i.active) && !/mattress/i.test(i.item); }).map(function (i) { return { item: i.item, group: i.group || 'Other', store: Number(i.store || 0) }; }) };
  };
  /* Undo a mistaken "done" (the same person the same day, or a manager / owner). Puts the items back in stock. */
  api.serviceUndo = function (req) {
    var me = auth(req), r = room(req.room);
    var s = r.stay ? stay(r.stay) : fail('room_not_occupied'), x = serviceOf(s.id) || fail('not_done');
    if (x.by !== me.name && !isMgr(me)) fail('not_allowed');
    String(x.charges || '').split(',').filter(Boolean).forEach(function (cid) {
      var c = find('charges', 'id', cid); if (!c || c.removed) return;
      var it = find('items', 'item', c.item);
      db.set('charges', c, { removed: 'Undone by ' + me.name + ' · ' + stamp() });
      if (it && yes(it.track)) moveStock(it, Number(c.qty), 'Housekeeping undone', r.room, me.name);
    });
    db.set('service', x, { undone: stamp() + ' · ' + me.name });
    recompute(s);
    return api.housekeeping(req);
  };

  /* ================= Expenses and commission (front desk: Owner, Manager, Receptionist) =================
     Reception can add entries and fix their own entries the same day; a Manager or the Owner can change or remove any entry. */
  function catInfo(name) {
    for (var g = 0; g < DESK_EXPENSE_CATS.length; g++) for (var i = 0; i < DESK_EXPENSE_CATS[g][1].length; i++) {
      var c = DESK_EXPENSE_CATS[g][1][i]; if (c[0] === name) return { group: DESK_EXPENSE_CATS[g][0], opts: c[1] || {} };
    }
    return null;
  }
  function monthRange(req) { var m = /^\d{4}-\d\d$/.test(String(req.month || '')) ? req.month : today().slice(0, 7); return { month: m, from: m + '-01', to: m + '-31' }; }
  function canFix(me, row) { return canApprove(me) || (row.by === me.name && String(row.at).slice(0, 10) === today()); }
  function expView(e) {
    return { id: e.id, date: e.date, group: e.group, category: e.category, item: e.item, qty: Number(e.qty || 0), amount: Number(e.amount || 0), method: e.method, ref: e.ref, shop: e.shop, note: e.note,
      photos: String(e.photos || '').split(',').filter(Boolean).length, stockItem: e.stockItem, stockQty: Number(e.stockQty || 0), by: e.by, at: e.at, edited: e.edited };
  }
  api.expenses = function (req) {
    var me = auth(req); needMgr(me);
    var r = monthRange(req), list = db.all('expenses').filter(function (e) { return !e.removed && e.date >= r.from && e.date <= r.to; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.at < b.at ? 1 : -1); });
    var shops = {}; db.all('expenses').forEach(function (e) { if (e.shop) shops[e.shop] = 1; });
    return { month: r.month, list: list.map(expView), cats: DESK_EXPENSE_CATS, methods: METHODS, shops: Object.keys(shops).slice(0, 80),
      stockItems: db.all('items').filter(function (i) { return yes(i.active) && yes(i.track); }).map(function (i) { return i.item; }), canApprove: canApprove(me), me: me.name };
  };
  api.expenseSave = function (req) {
    var me = auth(req); needMgr(me);
    var old = req.id ? find('expenses', 'id', req.id) || fail('not_found') : null;
    if (old && (old.removed || !canFix(me, old))) fail('not_allowed');
    var date = isYmd(req.date) ? req.date : today(); if (date > today()) fail('date_future');
    var info = catInfo(String(req.category || '')) || fail('category_required');
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var p = { date: date, group: info.group, category: req.category, item: text(req.item, 120) || req.category, qty: Math.max(0, Math.round(Number(req.qty) || 0)), amount: amt,
      method: req.method, ref: text(req.ref, 40), shop: text(req.shop, 120) || info.opts.shop || '', note: text(req.note, 300) };
    /* bill photos: keep the ones still listed, add new uploads (max 4) */
    var keep = old ? String(old.photos || '').split(',').filter(Boolean).filter(function (fid) { return (req.keepPhotos || []).indexOf(fid) >= 0; }) : [];
    (req.photos || []).slice(0, 4).forEach(function (ph, i) {
      if (!hooks.savePhoto) fail('photos_unavailable');
      if (!/^[A-Za-z0-9+\/=]+$/.test(String(ph.data || '')) || String(ph.data).length > 4000000) fail('bad_photo');
      keep.push(hooks.savePhoto(ph.data, date + ' ' + p.category + ' ' + (i + 1) + '.jpg', date.slice(0, 7)));
    });
    p.photos = keep.slice(0, 6).join(',');
    /* add to stock (only when the entry is first saved, so stock is not counted twice) */
    if (!old && req.stockItem) {
      var it = find('items', 'item', req.stockItem) || fail('no_item'), q = Math.round(Number(req.stockQty) || 0);
      if (q > 0) { moveStock(it, q, 'Bought (expense ' + p.category + ')', '', me.name); p.stockItem = it.item; p.stockQty = q; }
    }
    if (old) { p.edited = stamp() + ' · ' + me.name; db.set('expenses', old, p); return { expense: expView(old) }; }
    p.id = id('E'); p.by = me.name; p.at = stamp(); p.removed = ''; if (!p.stockItem) { p.stockItem = ''; p.stockQty = 0; } p.edited = '';
    return { expense: expView(db.add('expenses', p)) };
  };
  api.expenseRemove = function (req) {
    var me = auth(req); needMgr(me);
    var e = find('expenses', 'id', req.id) || fail('not_found');
    if (e.removed || !canFix(me, e)) fail('not_allowed');
    if (e.stockItem && Number(e.stockQty) > 0) { var it = find('items', 'item', e.stockItem); if (it) moveStock(it, -Number(e.stockQty), 'Expense removed', '', me.name); }
    db.set('expenses', e, { removed: stamp() + ' · ' + me.name });
    return {};
  };
  /* GST details from the supplier's bill (for input credit). Entered on the admin page: typed in, or read from the bill photo and then checked. Owner and Manager. */
  api.expenseGst = function (req) {
    var me = auth(req); if (!canApprove(me)) fail('not_allowed');
    var e = find('expenses', 'id', req.id) || fail('not_found'); if (e.removed) fail('not_found');
    var g = String(req.gstin || '').toUpperCase().replace(/\s/g, ''); if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(g)) fail('bad_gstin');
    function amt(v) { v = Math.round((Number(v) || 0) * 100) / 100; if (v < 0 || v > 1e8) fail('invalid_amount'); return v; }
    var p = { gstin: g, billNo: text(req.billNo, 40), taxable: amt(req.taxable), cgst: amt(req.cgst), sgst: amt(req.sgst), igst: amt(req.igst) };
    if (p.cgst + p.sgst + p.igst > Number(e.amount || 0) + 1) fail('gst_too_big');
    p.gstBy = (req.auto ? 'Read from the bill photo, not checked yet' : 'Checked by ' + me.name) + ' · ' + stamp();
    if (req.clear) p = { gstin: '', billNo: '', taxable: 0, cgst: 0, sgst: 0, igst: 0, gstBy: '' };
    db.set('expenses', e, p);
    return { id: e.id, gstin: p.gstin, billNo: p.billNo, taxable: p.taxable, cgst: p.cgst, sgst: p.sgst, igst: p.igst, gstBy: p.gstBy };
  };
  api.expensePhoto = function (req) {
    var me = auth(req); needMgr(me);
    var e = find('expenses', 'id', req.id) || fail('not_found');
    var ids = String(e.photos || '').split(',').filter(Boolean);
    if (!hooks.getPhoto) fail('photos_unavailable');
    return { photos: ids.map(function (fid) { return { id: fid, data: hooks.getPhoto(fid) }; }) };
  };
  /* ================= Guest ID copies (front desk) =================
     The cropped, straightened ID photos for each stay are kept in Google Drive ("Nikadi Guest IDs" / month), listed in the 'Guest ID copies' sheet.
     Page 'id': 3 people × front/back (Aadhaar / driving licence size). Page 'pp': passport front, passport back, visa. */
  var ID_SLOTS = { id: ['Person 1 · front', 'Person 1 · back', 'Person 2 · front', 'Person 2 · back', 'Person 3 · front', 'Person 3 · back'],
    pp: ['Passport · front (photo page)', 'Passport · back (last page)', 'Visa'] };
  function idsOf(sid) { return db.all('guestids').filter(function (x) { return x.stay === sid && !x.removed; }); }
  /* one person's ID = front + back (or passport + visa), so count IDs, not photos */
  function idCount(rows) {
    var seen = {};
    rows.forEach(function (x) { seen[x.kind === 'pp' ? 'pp' : 'id' + Math.floor(Number(x.slot) / 2)] = 1; });
    return Object.keys(seen).length;
  }
  function idView(x) { return { id: x.id, kind: x.kind, slot: Number(x.slot), label: x.label, by: x.by, at: x.at }; }
  function idStayView(s) { return { id: s.id, room: s.room, guest: s.guest, guests: s.guests, checkin: s.checkin, checkout: s.checkout, status: s.status, ids: idCount(idsOf(s.id)) }; }
  api.idStays = function (req) {
    var me = auth(req); needMgr(me);
    var since = addDays(today(), -45), q = String(req.q || '').toLowerCase().trim();
    var list = db.all('stays').filter(function (s) {
      if (q) return (String(s.guest).toLowerCase().indexOf(q) >= 0 || String(s.phone).indexOf(q) >= 0 || String(s.room) === q);
      return s.status === 'In house' || (s.checkout >= since);
    }).filter(function (s) { return s.status !== 'Reversed';
    }).sort(function (a, b) { return (a.status === 'In house') !== (b.status === 'In house') ? (a.status === 'In house' ? -1 : 1) : a.status === 'In house' ? Number(a.room) - Number(b.room) : (a.checkout < b.checkout ? 1 : -1); });
    return { list: list.slice(0, 80).map(idStayView), slots: ID_SLOTS };
  };
  api.idList = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.stay);
    return { stay: idStayView(s), list: idsOf(s.id).map(idView), slots: ID_SLOTS };
  };
  api.idGet = function (req) {
    var me = auth(req); needMgr(me);
    var x = find('guestids', 'id', req.id) || fail('not_found');
    if (x.removed) fail('not_found');
    if (!hooks.getPhoto) fail('photos_unavailable');
    return { id: x.id, data: hooks.getPhoto(x.file) };
  };
  api.idSave = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.stay), kind = ID_SLOTS[req.kind] ? req.kind : fail('bad_kind'), slot = Math.round(Number(req.slot));
    if (!(slot >= 0 && slot < ID_SLOTS[kind].length)) fail('bad_slot');
    if (!hooks.savePhoto) fail('photos_unavailable');
    var data = String(req.data || '').replace(/^data:image\/\w+;base64,/, '');
    if (!/^[A-Za-z0-9+\/=]+$/.test(data) || data.length > 4000000) fail('bad_photo');
    var day = today(), label = ID_SLOTS[kind][slot];
    var folder = '';
    try { folder = stayFolder(s); } catch (e) { folder = ''; }
    var file = hooks.savePhoto(data, 'ID · ' + label.replace(/[^\w ()]+/g, ' ').replace(/\s+/g, ' ') + ' · ' + String(s.guest).replace(/[^\w .-]+/g, '') + '.jpg', day.slice(0, 7), 'Nikadi Guest IDs', folder);
    idsOf(s.id).forEach(function (x) { if (x.kind === kind && Number(x.slot) === slot) { db.set('guestids', x, { removed: 'Replaced ' + stamp() + ' · ' + me.name }); if (hooks.trashFile) try { hooks.trashFile(x.file); } catch (e) {} } });
    var row = db.add('guestids', { id: id('G'), at: stamp(), stay: s.id, room: s.room, guest: s.guest, kind: kind, slot: slot, label: label, file: file, by: me.name, removed: '', folder: folder });
    archiveMark(s.id);
    return { saved: idView(row), list: idsOf(s.id).map(idView) };
  };
  api.idRemove = function (req) {
    var me = auth(req); needMgr(me);
    var x = find('guestids', 'id', req.id) || fail('not_found');
    if (!x.removed) { db.set('guestids', x, { removed: stamp() + ' · ' + me.name }); if (hooks.trashFile) try { hooks.trashFile(x.file); } catch (e) {} archiveMark(x.stay); }
    return { list: idsOf(x.stay).map(idView) };
  };
  function comView(c) {
    return { id: c.id, date: c.date, name: c.name, type: c.type, phone: c.phone, vehicle: c.vehicle, guest: c.guest, room: c.room, amount: Number(c.amount || 0), method: c.method, ref: c.ref, note: c.note, by: c.by, at: c.at, edited: c.edited };
  }
  api.commissions = function (req) {
    var me = auth(req); needMgr(me);
    var r = monthRange(req), all = db.all('commissions').filter(function (c) { return !c.removed; });
    var list = all.filter(function (c) { return c.date >= r.from && c.date <= r.to; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.at < b.at ? 1 : -1); });
    var people = {}; all.forEach(function (c) { var k = c.phone || c.name; var p = people[k] || (people[k] = { name: c.name, type: c.type, phone: c.phone, vehicle: c.vehicle, total: 0, times: 0, last: '' }); p.total += Number(c.amount || 0); p.times++; if (c.date > p.last) { p.last = c.date; p.name = c.name; p.type = c.type; p.vehicle = c.vehicle || p.vehicle; } });
    return { month: r.month, list: list.map(comView), people: Object.keys(people).map(function (k) { return people[k]; }).sort(function (a, b) { return b.last < a.last ? -1 : 1; }),
      types: DESK_COMMISSION_TYPES, methods: METHODS, canApprove: canApprove(me), me: me.name };
  };
  api.commissionSave = function (req) {
    var me = auth(req); needMgr(me);
    var old = req.id ? find('commissions', 'id', req.id) || fail('not_found') : null;
    if (old && (old.removed || !canFix(me, old))) fail('not_allowed');
    var name = text(req.name, 80); if (!name) fail('name_required');
    var phone = phoneOk(req.phone); if (!phone) fail('phone_required');
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var date = isYmd(req.date) ? req.date : today(); if (date > today()) fail('date_future');
    var p = { date: date, name: name, type: DESK_COMMISSION_TYPES.indexOf(req.type) >= 0 ? req.type : 'Other', phone: phone, vehicle: text(req.vehicle, 20).toUpperCase(),
      guest: text(req.guest, 80), room: text(req.room, 40), amount: amt, method: req.method, ref: text(req.ref, 40), note: text(req.note, 300) };
    if (old) { p.edited = stamp() + ' · ' + me.name; db.set('commissions', old, p); return { commission: comView(old) }; }
    p.id = id('K'); p.by = me.name; p.at = stamp(); p.edited = ''; p.removed = '';
    return { commission: comView(db.add('commissions', p)) };
  };
  api.commissionRemove = function (req) {
    var me = auth(req); needMgr(me);
    var c = find('commissions', 'id', req.id) || fail('not_found');
    if (c.removed || !canFix(me, c)) fail('not_allowed');
    db.set('commissions', c, { removed: stamp() + ' · ' + me.name });
    return {};
  };

  /* Owner: WhatsApp connection. The access token is kept in the script's private settings and never sent back to the app. */
  api.waStatus = function (req) {
    var me = auth(req); needOwner(me);
    var info = hooks.waInfo ? hooks.waInfo() : {};
    return { connected: waReady(), phoneId: info.phoneId || '', hasToken: !!info.hasToken, templates: DESK_WA,
      recent: db.all('wa').slice(-25).reverse().map(function (m) { return { at: m.at, to: m.to, name: m.name, kind: m.kind, status: m.status, info: m.info }; }),
      bills: db.all('bills').slice(-10).reverse().map(function (b) { return { no: b.no, guest: b.guest, wa: b.wa || '' }; }) };
  };
  api.waSave = function (req) {
    var me = auth(req); needOwner(me);
    if (!hooks.waSave) fail('not_available');
    hooks.waSave({ phoneId: text(req.phoneId, 40), token: req.waToken ? String(req.waToken).trim() : null, clear: !!req.clear });
    return api.waStatus(req);
  };
  api.waTest = function (req) {
    var me = auth(req); needOwner(me);
    if (!waReady()) fail('wa_not_connected');
    var to = phoneOk(req.phone); if (!to) fail('phone_required');
    var mid = hooks.waSend('hello_world', to, [], null, null, null, 'en_US');
    return { sent: true, id: mid };
  };

  /* Owner only: entry and exit per person per day. */
  api.attendance = function (req) {
    var me = auth(req); needOwner(me);
    var from = isYmd(req.from) ? req.from : addDays(today(), -6), to = isYmd(req.to) ? req.to : today(), soon = plusHours(stamp(), -0.25);
    var rows = db.all('wifi').filter(function (w) { return w.date >= from && w.date <= to && (!req.name || w.name === req.name); })
      .map(function (w) { return { date: w.date, name: w.name, role: w.role, first: w.first, last: w.exitSet || w.last, autoLast: w.last, exitSet: w.exitSet || '', exitBy: w.exitBy || '', choices: exitChoices(w),
        outs: lastLogs(w, 'logout'), ins: lastLogs(w, 'login'),
        opens: Number(w.opens || 0), device: w.device, lastDevice: w.lastDevice, now: !w.exitSet && w.date === today() && w.last >= soon }; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.first < b.first ? -1 : 1); });
    var people = db.all('staff').filter(function (p) { return DESK_WIFI_ROLES.indexOf(p.role) >= 0; }).map(function (p) { return { name: p.name, role: p.role, active: yes(p.active) }; });
    return { from: from, to: to, rows: rows, people: people, wifi: wifiList(), others: otherNets().filter(function (x) { return wifiList().indexOf(x.ip) < 0; }) };
  };
  /* Live: every open copy of the app sends a small "still open" signal each minute. The owner sees if the app is open on the guest house PC. */
  function liveList() { try { var a = JSON.parse(db.kvGet('live') || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  api.beat = function (req) {
    var me = auth(Object.assign({}, req, { _noSeen: true })), dev = text(req.device, 80), now = Date.now();
    var a = liveList().filter(function (x) { return now - x.t < 600000 && !(x.name === me.name && x.dev === dev); });
    a.push({ name: me.name, role: me.role, dev: dev, wifi: !!req.wifi, shown: !!req.shown, t: now, at: stamp() });
    db.kvSet('live', JSON.stringify(a.slice(-30)), 21600);
    if (req.wifi && isDesk(dev)) db.kvSet('pclast', JSON.stringify({ name: me.name, dev: dev, at: stamp() }), 21600);
    return { ok: true };
  };
  api.live = function (req) {
    var me = auth(req); needOwner(me);
    var now = Date.now(), all = liveList().filter(function (x) { return now - x.t < 150000; });
    var pc = all.filter(function (x) { return x.wifi && isDesk(x.dev); }).map(function (x) { return { name: x.name, role: x.role, dev: x.dev, shown: x.shown, ago: Math.round((now - x.t) / 1000) }; });
    var last = null; try { last = JSON.parse(db.kvGet('pclast') || 'null'); } catch (e) {}
    return { pc: pc, last: last, others: all.filter(function (x) { return !(x.wifi && isDesk(x.dev)) && x.name !== me.name; }).map(function (x) { return { name: x.name, role: x.role, dev: x.dev, wifi: x.wifi, ago: Math.round((now - x.t) / 1000) }; }) };
  };

  /* Owner: who changed what (new server only: every change is written in the database's change log) */
  api.changeLog = function (req) {
    var me = auth(req); needOwner(me);
    if (!hooks.changeLog) fail('changelog_unavailable');
    var rows = hooks.changeLog({ lim: 80, before: req.before ? Number(req.before) : null, who: req.who ? text(req.who, 60) : null }) || [];
    var names = {}; Object.keys(DESK_SCHEMA).forEach(function (t) { names[t] = DESK_SCHEMA[t].sheet; });
    return { rows: rows.map(function (r) { return { id: r.id, at: r.at, who: r.who || '', action: r.action || '', tab: names[r.tbl] || String(r.tbl || '').replace(/^sheet:/, ''), tbl: r.tbl, after: r.after, before: r.before }; }),
      people: db.all('staff').map(function (p) { return p.name; }) };
  };

  /* Owner: choose the real exit time for a person's day (one of their last 3 app opens on the desk computer), or go back to automatic. */
  api.attendanceExit = function (req) {
    var me = auth(req); needOwner(me);
    var w = db.all('wifi').filter(function (x) { return x.date === req.date && x.name === req.name; })[0] || fail('not_found');
    var at = String(req.at || '');
    if (at && !exitChoices(w).concat(wifiLogs(w)).some(function (c) { return c.at === at; }) && at !== w.first) fail('bad_time');
    if (at && at < w.first) fail('bad_time');
    db.set('wifi', w, { exitSet: at, exitBy: at ? me.name + ' · ' + stamp() : '' });
    return { ok: true };
  };
  /* Owner: save / remove the guest house Wi-Fi (its internet address). */
  api.attendanceWifi = function (req) {
    var me = auth(req); needOwner(me);
    var ip = cleanIp(req.ip); if (!ip) fail('bad_network');
    var list = wifiList().filter(function (x) { return x !== ip; });
    if (!req.remove) list.unshift(ip);
    cfgSet('wifi', JSON.stringify(list.slice(0, 6)));
    return { wifi: list.slice(0, 6) };
  };

  /* Add or correct the transaction / reference number of a payment (no money changes). After check-out: Manager / Owner only. */
  api.paymentRef = function (req) {
    var me = auth(req); needMgr(me);
    var p = find('payments', 'id', req.id) || fail('no_payment');
    if (p.voided || p.method === FROM_ADV) fail('no_payment');
    var stays = p.stay ? [stay(p.stay)] : db.all('stays').filter(function (x) { return p.booking && x.booking === p.booking; });
    stays.forEach(function (x) { lockedOut(me, x); });
    db.set('payments', p, { ref: text(req.ref, 40) });
    stays.forEach(function (x) { afterChange(x, me, x.roomTotal); });
    if (p.stay) return { stay: stayView(stays[0], me) };
    var b = find('bookings', 'id', p.booking); return b ? { booking: bookingView(b, me) } : {};
  };

  /* Cancel a payment that was entered by mistake (wrong amount, entered twice). It stays visible in the sheet as voided. */
  api.voidPayment = function (req) {
    var me = auth(req); needMgr(me);
    var p = find('payments', 'id', req.id) || fail('no_payment');
    if (p.voided || p.method === FROM_ADV) fail('no_payment');
    if (!text(req.reason, 200)) fail('reason_required');
    if (p.stay) lockedOut(me, stay(p.stay));
    var g = gate(me, 'voidPayment', req, (p.stay ? 'Room ' + p.room : 'Booking ' + p.booking) + ': cancel ' + (Number(p.amount) < 0 ? 'refund' : 'payment') + ' of ₹' + Math.abs(p.amount) + ' (' + p.method + (p.ref ? ' ' + p.ref : '') + ', ' + p.at + ', by ' + p.by + ')');
    if (g) return g;
    db.set('payments', p, { voided: 'Voided by ' + who(me, req) + ' ' + stamp() + ': ' + text(req.reason, 120) });
    if (p.stay) { var s = stay(p.stay); recompute(s); afterChange(s, me, s.roomTotal); return { stay: stayView(s, me) }; }
    var b = find('bookings', 'id', p.booking); if (b) { recomputeBooking(b); return { booking: bookingView(b, me) }; }
    return {};
  };

  /* change the amount of a recorded payment (the old entry is kept as voided, a corrected one is added) */
  api.payAmount = function (req) {
    var me = auth(req); needMgr(me);
    var p = find('payments', 'id', req.id) || fail('no_payment');
    if (p.voided || p.method === FROM_ADV) fail('no_payment');
    var neg = Number(p.amount) < 0, a = money(req.amount); if (!(a > 0)) fail('invalid_amount');
    if (a === Math.abs(Number(p.amount))) fail('same_amount');
    if (!text(req.reason, 200)) fail('reason_required');
    if (p.stay) lockedOut(me, stay(p.stay));
    var g = gate(me, 'payAmount', req, (p.stay ? 'Room ' + p.room : 'Booking ' + p.booking) + ': change ' + (neg ? 'refund' : 'payment') + ' of ₹' + Math.abs(p.amount) + ' to ₹' + a + ' (' + p.method + (p.ref ? ' ' + p.ref : '') + ', ' + p.at + ')');
    if (g) return g;
    db.set('payments', p, { voided: 'Corrected to ₹' + a + ' by ' + who(me, req) + ' ' + stamp() + ': ' + text(req.reason, 120) });
    db.add('payments', { id: id('P'), at: p.at, stay: p.stay, room: p.room, amount: neg ? -a : a, method: p.method, note: text((p.note ? p.note + ' · ' : '') + 'corrected from ₹' + Math.abs(p.amount), 120), by: p.by, booking: p.booking, ref: p.ref });
    if (p.stay) { var s = stay(p.stay); recompute(s); afterChange(s, me, s.roomTotal); return { stay: stayView(s, me) }; }
    var b = find('bookings', 'id', p.booking);
    if (b) { recomputeBooking(b); db.all('stays').forEach(function (x) { if (x.booking === b.id) recompute(x); }); return { booking: bookingView(b, me) }; }
    return {};
  };

  api.checkOut = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    if (s.status !== 'In house') fail('not_in_house');
    var nights = Math.round(Number(req.nights)); if (!(nights >= 1 && nights <= 365)) fail('bad_nights');
    if (me.role === 'Receptionist' && nights < Math.max(1, Math.round(dayNum(today()) - dayNum(s.checkin)))) fail('ask_manager_nights');
    db.set('stays', s, { nights: nights, checkout: addDays(s.checkin, nights), status: 'Checked out', outBy: me.name, outAt: stamp() });
    recompute(s);
    var r = find('rooms', 'room', s.room);
    if (r && r.stay === s.id) db.set('rooms', r, { status: 'Needs cleaning', stay: '', updated: stamp(), by: me.name });
    extrasOf(s.id).forEach(function (c) { var li = linenItem(c.item); if (li) linenMove(li, Number(c.qty), 'rooms', li.wash === 'No' ? 'store' : 'dirty', 'Guest checked out (extra given during the stay)', s.room, me.name); db.set('charges', c, { note: DESK_EXTRA_NOTE + ' (returned at check-out)' }); });
    if (s.comp) return { stay: stayView(s, me), member: null, bill: null, comp: true }; // free stay: no bill, no points
    var member = null, memBefore = memberOf(s.phone);
    if (hooks.onCheckout && s.phone) {
      try { member = hooks.onCheckout({ id: s.id, phone: s.phone, guest: s.guest, room: s.room, nights: nights, roomTotal: Number(s.roomTotal || 0), checkin: s.checkin, checkout: s.checkout }); } catch (e) { member = null; }
    }
    billFields(s, req);
    if (!s.email && memBefore && memBefore.email) db.set('stays', s, { email: memBefore.email });
    var bm = memBefore ? { level: memBefore.tier, earned: member ? member.points : null, balance: member ? member.balance : memBefore.points } : null;
    if (bm) { var r0 = find('rooms', 'room', s.room); if (r0 && Number(r0.rate) > Number(s.rate)) bm.saved = (Number(r0.rate) - Number(s.rate)) * nights; }
    var b = saveBill(s, me, bm); // emailed automatically DESK_BILL_DELAY_HOURS after check-out
    /* the check-out was reversed earlier: same invoice number, dated today, sending switched back on */
    if (/^On hold/.test(String(b.row.status || ''))) {
      pdfClear(b.row.id);
      db.set('bills', b.row, { at: stamp(), status: s.email ? 'Scheduled' : 'No email', sendAt: plusHours(stamp(), DESK_BILL_DELAY_HOURS), wa: !s.phone ? 'No phone' : s.waOk === 'Yes' ? 'Waiting' : 'No WhatsApp consent', pdf: '' });
    }
    return { stay: stayView(s, me), member: member, bill: billInfo(s, b), emailed: '' };
  };

  /* A guest was checked out by mistake and is still staying. Manager / Owner reverse it at once; a receptionist's
     reverse goes to them as a request. The stay is In house again, the room Occupied, the bill is put on hold
     (nothing is emailed or sent; the same invoice number is used at the real check-out) and the member points
     given for the stay are taken back until then. Possible within DESK_UNDO_DAYS of the check-out. */
  var DESK_UNDO_DAYS = 7;
  function undoBlock(s) {
    if (s.status !== 'Checked out') return 'not_checked_out';
    if (s.outAt && plusHours(s.outAt, DESK_UNDO_DAYS * 24) < stamp()) return 'undo_too_late';
    var r = find('rooms', 'room', s.room);
    if (!r) return 'no_room';
    if (r.stay && r.stay !== s.id) return 'room_taken';
    if (db.all('stays').some(function (x) { return x.id !== s.id && Number(x.room) === Number(s.room) && x.status === 'In house'; })) return 'room_taken';
    return '';
  }
  /* ---- Reverse a check-in made by mistake (e.g. an advance booking checked in before the guest came) ----
     From a room, or from the booking. A booking's rooms always go back together: every room becomes Ready again, the booking is Confirmed again
     (its advance stays on the booking), and the free welcome items go back to stock. The mistaken stays are kept as "Reversed" for the record.
     Not allowed once money has been taken in the room or anything has been put on the bill: those must be corrected first. */
  function checkinUndoList(sOrB, isBooking) {
    var b = isBooking ? sOrB : (sOrB.booking ? find('bookings', 'id', sOrB.booking) : null);
    var list = b ? db.all('stays').filter(function (x) { return x.booking === b.id && x.status === 'In house'; }) : [sOrB];
    return { b: b, list: list };
  }
  function checkinUndoBlock(u) {
    if (!u.list.length || u.list.some(function (x) { return x.status !== 'In house'; })) return 'not_in_house';
    if (u.b && u.b.status !== 'Checked in') return 'not_checked_in';
    if (u.b && db.all('stays').some(function (x) { return x.booking === u.b.id && x.status === 'Checked out'; })) return 'undo_some_left';
    if (u.list.some(function (x) { return paymentsOf(x.id).some(function (p) { return p.method !== FROM_ADV; }); })) return 'undo_has_money';
    if (u.list.some(function (x) { return chargesOf(x.id).some(function (c) { return c.free !== 'Yes'; }); })) return 'undo_has_items';
    return '';
  }
  api.undoCheckin = function (req) {
    var me = auth(req); needMgr(me);
    var u = req.booking ? checkinUndoList(find('bookings', 'id', String(req.booking)) || fail('no_booking'), true) : checkinUndoList(stay(req.id), false);
    var why = checkinUndoBlock(u); if (why) fail(why);
    var reason = text(req.reason, 200); if (!reason) fail('reason_required');
    var rooms = u.list.map(function (x) { return Number(x.room); }).sort(function (a, c) { return a - c; });
    var g = gate(me, 'undoCheckin', req, (u.b ? 'Booking ' + u.b.id + ' · ' + u.b.guest : u.list[0].guest) + ': reverse the check-in, room ' + rooms.join(', ') + ' back to Ready');
    if (g) return g;
    var by = who(me, req), mark = 'Check-in reversed by ' + by + ' ' + stamp();
    u.list.forEach(function (x) {
      chargesOf(x.id).forEach(function (c) { // only free lines can be here: water, welcome kit, extra bedding
        var it = find('items', 'item', c.item); if (it) moveStock(it, Number(c.qty), 'Check-in reversed', x.room, me.name);
        if (c.note === DESK_EXTRA_NOTE) { var li = linenItem(c.item); if (li) linenMove(li, Number(c.qty), 'rooms', 'store', 'Check-in reversed', x.room, me.name); }
        db.set('charges', c, { removed: mark });
      });
      paymentsOf(x.id).forEach(function (p) { db.set('payments', p, { voided: mark }); }); // only the advance carried over from the booking: it stays on the booking
      db.all('wa').forEach(function (m) { if (m.ref === x.id && m.status === 'Waiting') db.set('wa', m, { status: 'Cancelled', info: 'Check-in reversed' }); });
      db.set('stays', x, { status: 'Reversed', booking: '', outBy: me.name, outAt: stamp(), roomTotal: 0, extras: 0, paid: 0, balance: 0,
        notes: text((x.notes ? x.notes + ' · ' : '') + mark + (u.b ? ' (booking ' + u.b.id + ')' : '') + ': ' + reason, 1000) });
      var r = find('rooms', 'room', x.room); if (r && r.stay === x.id) db.set('rooms', r, { status: 'Ready', stay: '', updated: stamp(), by: me.name });
    });
    if (u.b) { db.set('bookings', u.b, { status: 'Confirmed', closedBy: '', closedAt: '', closeNote: '', notes: text((u.b.notes ? u.b.notes + ' · ' : '') + mark + ': ' + reason, 1000) }); recomputeBooking(u.b); }
    return { rooms: rooms, booking: u.b ? bookingView(u.b, me) : null };
  };
  api.undoCheckout = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id), why = undoBlock(s);
    if (why) fail(why);
    var until = isYmd(req.checkout) ? req.checkout : (s.checkout > today() ? s.checkout : addDays(today(), 1));
    if (until < today()) fail('bad_checkout_date');
    var nights = Math.round(dayNum(until) - dayNum(s.checkin));
    if (!(nights >= 1 && nights <= 365)) fail('bad_nights');
    var clash = db.all('bookings').filter(function (b) { return b.status === 'Confirmed' && roomList(b.rooms).indexOf(Number(s.room)) >= 0 && overlaps(b.checkin, b.checkout, today(), until); })[0];
    if (clash) fail('room_booked');
    var reason = text(req.reason, 200); if (!reason) fail('reason_required');
    var g = gate(me, 'undoCheckout', req, 'Room ' + s.room + ' · ' + s.guest + ': reverse the check-out (guest is still staying, now leaving ' + until + ')');
    if (g) return g;
    var rt0 = Number(s.roomTotal || 0);
    var note = 'Check-out by ' + (s.outBy || '?') + ' at ' + (s.outAt || '?') + ' reversed by ' + who(me, req) + ' ' + stamp() + ': ' + reason;
    db.set('stays', s, { status: 'In house', nights: nights, checkout: until, outBy: '', outAt: '', notes: text((s.notes ? s.notes + ' · ' : '') + note, 1000) });
    recompute(s);
    db.set('rooms', find('rooms', 'room', s.room), { status: 'Occupied', stay: s.id, updated: stamp(), by: me.name });
    if (s.phone && rt0 > 0) {
      try {
        if (hooks.onCheckoutUndo) hooks.onCheckoutUndo({ id: s.id, phone: s.phone, room: s.room, roomTotal: rt0, checkin: s.checkin });
        else if (hooks.onStayChange) hooks.onStayChange({ id: s.id, phone: s.phone, room: s.room, nights: 0, checkin: s.checkin, checkout: s.checkin, roomTotal: 0, before: rt0 });
      } catch (e) {}
    }
    var row = billOfStay(s.id);
    if (row) {
      pdfClear(row.id);
      db.set('bills', row, { status: 'On hold · check-out reversed', wa: row.wa === 'Waiting' ? 'On hold' : row.wa, pdf: '', edited: stamp() + ' · ' + me.name + ' · check-out reversed' });
    }
    archiveMark(s.id);
    return { stay: stayView(s, me) };
  };

  /* Bills. Front desk can see, download, WhatsApp and email them; only a Manager or the Owner can change them. */
  api.bill = function (req) {
    var me = auth(req); needMgr(me);
    var s = checkedOut(req), keys = ['name', 'title', 'address', 'email', 'company', 'gstin'], change = {};
    keys.forEach(function (k) { if (req[k] != null) change[k] = req[k]; });
    if (Object.keys(change).length) needApprover(me);
    var edited = billFields(s, change);
    var b = saveBill(s, me, null, edited);
    return { bill: billInfo(s, b) };
  };
  /* The staff app uploads the PDF once at check-out; after that only a Manager or the Owner can replace it (after a change). */
  api.billPdf = function (req) {
    var me = auth(req); needMgr(me);
    var s = checkedOut(req), b = saveBill(s, me, null);
    if (b.row.pdf && !canApprove(me)) fail('not_allowed');
    if (b.row.status === 'Sent' && !canApprove(me)) fail('not_allowed');
    pdfStore(b, req.pdf);
    return { bill: billInfo(s, b) };
  };
  /* Manager / Owner: email now, stop the automatic email, or switch it back on. */
  api.billSchedule = function (req) {
    var me = auth(req); needApprover(me);
    var s = checkedOut(req), b = saveBill(s, me, null), what = String(req.what || '');
    if (what === 'stop') db.set('bills', b.row, { status: 'Stopped by ' + me.name, wa: b.row.wa === 'Waiting' ? 'Stopped' : b.row.wa });
    else if (what === 'resume') { if (!s.email && !s.phone) fail('invalid_email'); db.set('bills', b.row, { status: s.email ? 'Scheduled' : 'No email', wa: b.row.wa === 'Stopped' ? 'Waiting' : b.row.wa, sendAt: b.row.sendAt > stamp() ? b.row.sendAt : stamp() }); }
    else if (what === 'now') sendBill(b, String(s.email || ''), req.pdf || pdfOf(b.row.id));
    else fail('bad_request');
    return { bill: billInfo(s, b) };
  };
  api.billSend = function (req) {
    var me = auth(req); needMgr(me);
    var s = checkedOut(req);
    if (req.email != null && String(req.email).trim() !== String(s.email || '')) { needApprover(me); billFields(s, { email: req.email }); }
    var b = saveBill(s, me, null);
    sendBill(b, String(s.email || ''), req.pdf || pdfOf(b.row.id));
    return { bill: billInfo(s, b), emailed: s.email };
  };
  /* "Send on WhatsApp" in the bill panel: sends the PDF bill straight to the guest from +91 75011 01137 (no need to attach anything). */
  api.billWhatsApp = function (req) {
    var me = auth(req); needMgr(me);
    if (!waReady()) fail('wa_not_connected');
    if (!waAutoOn()) fail('wa_paused'); // sent by hand from this phone instead (the app opens WhatsApp with the text and the bill link)
    var s = checkedOut(req), b = saveBill(s, me, null);
    var ph = phoneOk(req.phone || s.phone || ''); if (!ph) fail('phone_required');
    if (s.waOk !== 'Yes') { if (!req.agreed) fail('wa_no_consent'); db.set('stays', s, { waOk: 'Yes' }); } // reception asked the guest just now
    if (waOptedOut(ph)) fail('wa_opted_out');
    var pdf = req.pdf || pdfOf(b.row.id); if (!pdf) fail('no_pdf');
    var row = b.row, keep = row.phone;
    row.phone = ph;
    try { waBillWith(row, pdf); }
    catch (e) { row.phone = keep; var m = String(e && e.message || e); throw new Error(/template|132001|does not exist|not approved|Template/i.test(m) ? 'wa_template_pending' : /^[a-z_]+$/.test(m) ? m : 'wa_send_failed'); }
    row.phone = keep;
    db.set('bills', row, { wa: 'Sent ' + stamp() + ' by ' + me.name });
    return { bill: billInfo(s, b), sentTo: ph };
  };
  /* Runs the automatic emails (called by a timer in Google, and when the app is used). */
  api.driveInfo = function (req) {
    var me = auth(req); needMgr(me);
    var a = find('archive', 'stay', req.stay);
    return { folder: a && a.folder ? a.folder : '', at: a ? a.at : '', waiting: !!(a && a.dirty) };
  };
  /* ================= Keeping the app fast for years =================
     Once a day (night timer) records older than the cut-off are MOVED (never deleted) to the archive Sheet
     "Nikadi Records Archive", same tab names. Whole months only, so the yearly report stays exact: before a month
     leaves, its totals are added to "Monthly totals (old records)". Old bills still open from their QR code. */
  var KEEP_MONTHS = 13, KEEP_MONTHS_FAST = 3, KEEP_MONTHS_BILLS = 4; // bills: 4 months (the full bill stays in the archive and opens from its QR code)
  // money records: 13 months · stock log, WhatsApp inbox, sessions: 3 months
  function monthsBack(n) { var y = +today().slice(0, 4), m = +today().slice(5, 7) - n; while (m < 1) { m += 12; y--; } return y + '-' + pad(m) + '-01'; }
  function archivePlan() {
    var cut = monthsBack(KEEP_MONTHS), cutFast = monthsBack(KEEP_MONTHS_FAST), cutBills = monthsBack(KEEP_MONTHS_BILLS), now = stamp();
    function before(v, c) { v = String(v || ''); return !!v && v.slice(0, 10) < (c || cut); }
    var inHouse = {}; db.all('stays').forEach(function (x) { if (x.status === 'In house') inHouse[x.id] = 1; });
    var oldStay = {}; db.all('stays').forEach(function (x) { if (x.status === 'Checked out' && before(x.checkout)) oldStay[x.id] = 1; });
    var openBk = { Pending: 1, Confirmed: 1 };
    return {
      cut: cut,
      stays: function (x) { return !!oldStay[x.id]; },
      charges: function (x) { return before(x.at) && !inHouse[x.stay]; },
      payments: function (x) { return before(x.at) && !inHouse[x.stay]; },
      bookings: function (x) { return !openBk[x.status] && before(x.checkout); },
      bills: function (x) { return before(x.at, cutBills) && !inHouse[x.stay] && x.wa !== 'Waiting' && x.status !== 'Scheduled' && !/^On hold/.test(String(x.status || '')); },
      requests: function (x) { return x.status !== 'Pending' && before(x.at); },
      service: function (x) { return before(x.date); },
      expenses: function (x) { return before(x.date); },
      commissions: function (x) { return before(x.date); },
      guestids: function (x) { return before(x.at) && !inHouse[x.stay]; },
      archive: function (x) { return !!oldStay[x.stay]; },
      wa: function (x) { return x.status !== 'Waiting' && before(x.at); },
      wifi: function (x) { return before(x.date); },
      attendance: function (x) { return before(x.inAt); },
      stocklog: function (x) { return before(x.at, cutFast); },
      wamsgs: function (x) { return before(x.at, cutFast); },
      sessions: function (x) { return String(x.expires || '') < now && before(x.expires, cutFast); }
    };
  }
  /* add the totals of the records that are leaving to "Monthly totals" (per month, added to what is already there) */
  function summarize(moving) {
    var add = {};
    function mo(k) { return add[k] || (add[k] = { rooms: 0, extras: 0, nights: 0, stays: 0, guests: 0, collected: 0, refunds: 0, byMethod: {}, items: {} }); }
    (moving.stays || []).forEach(function (st) { var m = mo(String(st.checkout).slice(0, 7)); m.rooms += Number(st.roomTotal || 0); m.extras += Number(st.extras || 0); m.nights += Number(st.nights || 0); m.stays++; m.guests += Number(st.guests || 0); });
    (moving.charges || []).forEach(function (c) {
      if (c.removed) return; var it = mo(String(c.at).slice(0, 7)).items, k = c.item; it[k] = it[k] || { qty: 0, free: 0, amount: 0 };
      if (c.free === 'Yes') it[k].free += Number(c.qty || 0); else { it[k].qty += Number(c.qty || 0); it[k].amount += Number(c.total || 0); }
    });
    (moving.payments || []).forEach(function (p) {
      if (p.voided || p.method === FROM_ADV || !p.at) return; var m = mo(String(p.at).slice(0, 7)), a = Number(p.amount || 0);
      if (a >= 0) m.collected += a; else m.refunds += -a; m.byMethod[p.method] = (m.byMethod[p.method] || 0) + a;
    });
    Object.keys(add).sort().forEach(function (k) {
      var a = add[k], row = find('summary', 'month', k), o = row ? { rooms: +row.rooms, extras: +row.extras, nights: +row.nights, stays: +row.stays, guests: +row.guests, collected: +row.collected, refunds: +row.refunds,
        byMethod: jsonOr(row.byMethod, {}), items: jsonOr(row.items, {}) } : { rooms: 0, extras: 0, nights: 0, stays: 0, guests: 0, collected: 0, refunds: 0, byMethod: {}, items: {} };
      ['rooms', 'extras', 'nights', 'stays', 'guests', 'collected', 'refunds'].forEach(function (f) { o[f] += a[f]; });
      Object.keys(a.byMethod).forEach(function (m) { o.byMethod[m] = (o.byMethod[m] || 0) + a.byMethod[m]; });
      Object.keys(a.items).forEach(function (i) { var t = o.items[i] = o.items[i] || { qty: 0, free: 0, amount: 0 }; t.qty += a.items[i].qty; t.free += a.items[i].free; t.amount += a.items[i].amount; });
      var rec = { rooms: o.rooms, extras: o.extras, nights: o.nights, stays: o.stays, guests: o.guests, collected: o.collected, refunds: o.refunds, byMethod: JSON.stringify(o.byMethod), items: JSON.stringify(o.items) };
      if (row) db.set('summary', row, rec); else db.add('summary', Object.assign({ month: k }, rec));
    });
  }
  function jsonOr(v, d) { try { return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function archiveOld() {
    if (!db.moveOut) return { moved: {} };
    var plan = archivePlan(), moving = {}, moved = {};
    Object.keys(plan).forEach(function (t) { if (t === 'cut') return; var a = db.all(t).filter(plan[t]); if (a.length) moving[t] = a; });
    if (!Object.keys(moving).length) return { moved: {}, cut: plan.cut };
    (moving.bills || []).forEach(function (b) { // remember the highest invoice number of each year, so numbering carries on
      var m = /^(.*\/)(\d+)$/.exec(String(b.no)); if (!m) return;
      if (Number(m[2]) > (Number(cfgGet('billMax ' + m[1])) || 0)) cfgSet('billMax ' + m[1], m[2]);
    });
    summarize(moving); // totals first: if anything fails after this, the records are still in the main Sheet (nothing lost)
    Object.keys(moving).forEach(function (t) { db.moveOut(t, moving[t]); moved[t] = moving[t].length; });
    return { moved: moved, cut: plan.cut };
  }
  api._archiveOld = function (opt) {
    var d = today();
    if (!(opt && opt.force) && cfgGet('lastArchive') === d) return { skipped: true };
    var r = archiveOld(); cfgSet('lastArchive', d); return r;
  };

  /* Timer (every 10 minutes): guests still in the room after 9:30 AM on check-out day get ₹500 late check-out on the bill, once.
     Never added again for that stay, even if the front desk removed it. Free stays (comp) get nothing; Platinum members get it free (their perk). */
  function lateCheckoutRun() {
    var t = today(), now = stamp(), hm = now.slice(11), out = [];
    if (hm < DESK_LATE_GRACE) return out;
    var it = find('items', 'item', DESK_LATE_ITEM), full = hm >= DESK_LATE_FULL_TIME;
    db.all('stays').forEach(function (s) {
      if (s.status !== 'In house' || s.checkout !== t || s.comp) return;
      var mine = db.all('charges').filter(function (c) { return c.stay === s.id; });
      if (full) { // after 12 noon: one more day at the room price
        if (mine.some(function (c) { return c.item === DESK_LATE_FULL_ITEM; })) return; // already on (or taken off) the bill
        mine.forEach(function (c) { if (c.item === DESK_LATE_ITEM && !c.removed) db.set('charges', c, { removed: 'Replaced by the full-day charge at 12 noon ' + now }); });
        var rate = Number(s.rate || 0); if (!(rate > 0)) return;
        db.add('charges', { id: id('C'), at: now, stay: s.id, room: s.room, item: DESK_LATE_FULL_ITEM, qty: 1, price: rate, total: rate, free: 'No',
          note: 'Added automatically, still in the room after 12 noon · full room price for one more day', by: DESK_LATE_FULL_BY, removed: '' });
        recompute(s); out.push({ room: s.room, stay: s.id, price: rate, full: true });
        return;
      }
      if (!it || !yes(it.active)) return;
      if (mine.some(function (c) { return c.item === DESK_LATE_FULL_ITEM; })) return;
      /* 9:30 → ₹500, 10:00 → ₹1,000, 11:00 → ₹1,500. Platinum: free till 11 AM; Platinum Plus: free till 12 noon. */
      var step = hm >= DESK_LATE_OUT[1].till ? 2 : hm >= DESK_LATE_OUT[0].till ? 1 : 0, tier = DESK_LATE_OUT[step];
      var mem = memberOf(s.phone), key = mem && mem.tierKey, perk = key === 'plus' || (key === 'platinum' && step < 2);
      var price = perk ? 0 : tier.price;
      var note = 'Till ' + tier.label + ' · added automatically, still in the room' + (perk ? ' · free for ' + mem.tier + ' member' : '');
      var have = mine.filter(function (c) { return c.item === DESK_LATE_ITEM; });
      if (!have.length) {
        db.add('charges', { id: id('C'), at: now, stay: s.id, room: s.room, item: DESK_LATE_ITEM, qty: 1, price: price, total: price, free: perk ? 'Yes' : 'No', note: note, by: DESK_LATE_BY, removed: '' });
      } else {
        var c0 = have[have.length - 1];
        // only move up a line the timer made itself and nobody has changed or removed since
        if (have.length > 1 || c0.removed || c0.by !== DESK_LATE_BY || /Edited by/.test(String(c0.note || '')) || lateStep(c0) >= step) return;
        db.set('charges', c0, { price: price, total: price, qty: 1, free: perk ? 'Yes' : 'No', note: note, at: now });
      }
      recompute(s);
      out.push({ room: s.room, stay: s.id, price: price });
    });
    return out;
  }
  /* Late check-out lines and fines: the front desk changes the amount to what the guest actually paid, no manager approval needed (every change is logged). */
  function lateStep(c) { var n = String(c.note || ''); for (var i = DESK_LATE_OUT.length - 1; i >= 0; i--) if (n.indexOf('Till ' + DESK_LATE_OUT[i].label + ' ') === 0) return i; return 99; }
  function deskEdit(c) { return c && (c.item === DESK_LATE_ITEM || c.item === DESK_LATE_FULL_ITEM || c.item === DESK_FINE_ITEM); }
  function autoLate(c) { return c && ((c.item === DESK_LATE_ITEM && c.by === DESK_LATE_BY) || (c.item === DESK_LATE_FULL_ITEM && c.by === DESK_LATE_FULL_BY)); }
  /* Fine on a guest's room bill (default ₹2,000). Front desk adds it with a reason; it can be changed or removed like any bill item. */
  api.fine = function (req) {
    var me = auth(req); needMgr(me);
    var s = stay(req.id);
    if (s.status !== 'In house') { needApprover(me); lockedOut(me, s); }
    var amt = req.amount == null || req.amount === '' ? DESK_FINE_AMOUNT : money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    var why = text(req.reason, 160); if (!why) fail('reason_required');
    var rt0 = s.roomTotal;
    db.add('charges', { id: id('C'), at: stamp(), stay: s.id, room: s.room, item: DESK_FINE_ITEM, qty: 1, price: amt, total: amt, free: 'No', note: why, by: me.name, removed: '' });
    recompute(s);
    afterChange(s, me, rt0);
    return { stay: stayView(s, me) };
  };

  api._lateCheckout = function () { return lateCheckoutRun(); };

  api._sendDue = function (opt) { var late = []; try { late = lateCheckoutRun(); } catch (e) { if (String(e && e.message) === '__NK_WAIT__') throw e; } var arch = opt && opt.archive ? archiveRun(opt.limit || 8) : [], lf = []; if (opt && opt.archive) try { lf = laundryFileRun(4); } catch (e) { if (String(e && e.message) === '__NK_WAIT__') throw e; } return { sent: sendDue(opt && opt.waOnly), archived: arch, laundry: lf, late: late }; };
  /* Recent bills for the front desk list. */
  api.bills = function (req) {
    var me = auth(req); needMgr(me);
    return { bills: db.all('bills').slice(-60).reverse().map(function (b) { return { no: b.no, at: b.at, stay: b.stay, room: b.room, guest: b.guest, total: b.total, sent: b.sent, status: b.status || '', sendAt: b.sendAt || '', url: DESK_BILL_URL + b.id }; }) };
  };
  /* Public: the QR code / link on a bill. Only the secret bill id opens it. */
  /* ================= Owner's own bills (Owner only) =================
     Any bill the owner writes by hand: every field can be changed, nothing is sent from the guest house number,
     and it is kept only if the owner saves it (in the app, and if asked also as a PDF in Google Drive). */
  api.ownBills = function (req) {
    var me = auth(req); needOwner(me);
    var last = '', pre = DESK_BILL_PREFIX + '/' + fyOf(today()) + '/';
    db.all('bills').forEach(function (b) { if (String(b.no).indexOf(pre) === 0) last = b.no; });
    return { list: db.all('ownbills').filter(function (x) { return !x.removed; }).map(function (x) { return { id: x.id, at: x.at, by: x.by, no: x.no, guest: x.guest, total: Number(x.total || 0), drive: x.drive ? 'https://drive.google.com/file/d/' + x.drive + '/view' : '' }; }).reverse(),
      prefix: pre, lastNo: last, canDrive: !!hooks.ownBillFile };
  };
  api.ownBillGet = function (req) {
    var me = auth(req); needOwner(me);
    var x = find('ownbills', 'id', req.id); if (!x || x.removed) fail('no_bill');
    return { id: x.id, data: JSON.parse(x.data), drive: x.drive ? 'https://drive.google.com/file/d/' + x.drive + '/view' : '' };
  };
  api.ownBillSave = function (req) {
    var me = auth(req); needOwner(me);
    var d = req.data; if (!d || typeof d !== 'object') fail('no_bill');
    if (!String(d.no || '').trim()) fail('bill_no_required');
    var json = JSON.stringify(d); if (json.length > 45000) fail('too_big');
    var total = typeof NikadiBill !== 'undefined' ? NikadiBill.compute(d).total : 0, who = d.guest ? (d.guest.company || d.guest.name || '') : '';
    var x = req.id ? find('ownbills', 'id', req.id) : null, driveId = x ? x.drive : '';
    if (req.drive) {
      if (!hooks.ownBillFile) fail('drive_unavailable');
      if (!req.pdf) fail('no_pdf');
      if (driveId && hooks.trashFile) try { hooks.trashFile(driveId); } catch (e) {}
      driveId = hooks.ownBillFile(req.pdf, 'Bill ' + String(d.no).replace(/[\/]+/g, '-') + ' · ' + text(who, 60) + '.pdf', String(d.date || today()).slice(0, 7));
    }
    var row = { at: stamp(), by: me.name, no: text(d.no, 40), guest: text(who, 80), total: total, data: json, drive: driveId || '' };
    if (x && !x.removed) db.set('ownbills', x, row); else x = db.add('ownbills', Object.assign({ id: id('O'), removed: '' }, row));
    return { id: x.id, drive: driveId ? 'https://drive.google.com/file/d/' + driveId + '/view' : '' };
  };
  api.ownBillDelete = function (req) {
    var me = auth(req); needOwner(me);
    var x = find('ownbills', 'id', req.id); if (!x) fail('no_bill');
    db.set('ownbills', x, { removed: stamp() + ' · ' + me.name });
    return {};
  };

  /* Front desk: the online statement link for a no-show booking (made now if this booking has none yet) */
  api.noShowLink = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'No-show') fail('booking_closed');
    return { url: DESK_STMT_URL + stmtKey(b, true), booking: bookingView(b, me) };
  };
  /* Public: the guest opens the statement link. Only the secret key opens it, and only while the booking is a no-show. */
  api.statementView = function (req) {
    var key = String(req.id || '');
    if (!/^[A-Z0-9]{20,40}$/.test(key)) fail('no_bill');
    var m = stmtKeys(), bid = Object.keys(m).filter(function (k) { return m[k] === key; })[0];
    var b = bid ? find('bookings', 'id', bid) : null;
    if (!b || b.status !== 'No-show') fail('no_bill');
    return { statement: stmtData(b) };
  };
  api.billView = function (req) {
    var key = String(req.id || '');
    if (!/^[A-Za-z0-9]{12,40}$/.test(key)) fail('no_bill');
    var b = find('bills', 'id', key);
    if (!b && db.findOld) b = db.findOld('bills', key); // older bills live in the archive Sheet
    if (!b) fail('no_bill');
    var d = JSON.parse(b.data); d.id = b.id;
    return { bill: d };
  };

  api.roomStatus = function (req) {
    var me = auth(req), r = room(req.room);
    if (req.status === 'Ready') { if (r.status !== 'Needs cleaning') fail('bad_status'); }
    else if (req.status === 'Needs cleaning') { if (r.status !== 'Ready') fail('bad_status'); }
    else fail('bad_status');
    if (req.status === 'Ready' && req.asIs) { // "Back to ready": the room was not used, nothing to clean (front desk only)
      needMgr(me);
      db.add('service', { id: id('H'), date: today(), room: r.room, stay: '', items: 'Back to ready without cleaning (room not used)' + (req.note ? ' · ' + text(req.note, 120) : ''), by: me.name, at: stamp(), charges: '', undone: '' });
    } else if (req.status === 'Ready') {
      if (req.check && req.check.water === true) req.check.water = '2 given'; // an app not yet updated still sends a plain tick
      var checks = hkCheck(DESK_HK_OUT, req.check);
      hkLinen(DESK_HK_OUT, req.check, r.room, me.name);
      db.add('service', { id: id('H'), date: today(), room: r.room, stay: '', items: 'Check-out cleaning · ' + checks.join(', '), by: me.name, at: stamp(), charges: '', undone: '' });
    }
    db.set('rooms', r, { status: req.status, updated: stamp(), by: me.name });
    return {};
  };

  api.stock = function (req) {
    var me = auth(req), it = item(req.item);
    if (!yes(it.track)) fail('not_tracked');
    var qty = Math.round(Number(req.qty));
    if (req.mode === 'add') { needMgr(me); if (!(qty >= 1 && qty <= 100000)) fail('bad_qty'); moveStock(it, qty, text(req.note, 80) || 'Stock added', '', me.name); }
    else if (req.mode === 'take') { if (!(qty >= 1 && qty <= 500)) fail('bad_qty'); moveStock(it, -qty, text(req.note, 80) || 'Taken out', text(req.room, 10), me.name); }
    else if (req.mode === 'count') { needMgr(me); if (!(qty >= 0 && qty <= 100000)) fail('bad_qty'); var diff = qty - Number(it.stock || 0);
      if (diff) moveStock(it, diff, 'Counted: ' + qty, '', me.name); }
    else fail('bad_mode');
    return { stock: it.stock };
  };

  /* ================= Linen and laundry =================
     Linen is counted in 4 places: clean in store · in rooms · used (waiting for laundry) · at the laundry.
     1. The laundry person (or reception) lists what goes to the laundry → reception / a manager counts it and approves → it leaves.
     2. The laundry brings things back and lists them → reception / a manager counts and approves → they go back to the clean store.
     Every step keeps who and when; the bill = pieces received back × the price per piece. After approval only a Manager or the Owner
     can change a list (reception sends a change request). Each laundry list is also saved in Google Drive, folder "Laundry". */
  function linenAll() {
    var a = db.all('linen');
    if (!a.length || a.some(function (i) { return !i.group || !i.wash; }) || cfgGet('linenVersion') !== DESK_LINEN_VERSION) { // first use, or a newer default list: sizes, groups, names, laundry flags
      var has = function (n) { return a.some(function (j) { return j.item === n; }); };
      a.forEach(function (i) {
        var nn = DESK_LINEN_RENAME[i.item]; if (nn && !has(nn)) db.set('linen', i, { item: nn });
        if (DESK_LINEN_GROUP_RENAME[i.group]) db.set('linen', i, { group: DESK_LINEN_GROUP_RENAME[i.group] });
      });
      var fresh = cfgGet('linenVersion') !== DESK_LINEN_VERSION;
      DESK_LINEN.forEach(function (l) {
        var it = null; a.forEach(function (j) { if (j.item === l[0]) it = j; });
        if (!it) { if (fresh || !a.length) db.add('linen', { item: l[0], price: l[1], store: 0, rooms: 0, dirty: 0, laundry: 0, low: 0, active: 'Yes', group: l[2], wash: l[3] ? 'Yes' : 'No' }); }
        else {
          var p = {}; if (!it.group) p.group = l[2];
          if (!it.wash || fresh) p.wash = l[3] ? 'Yes' : 'No';
          if (Object.keys(p).length) db.set('linen', it, p);
        }
      });
      db.all('linen').forEach(function (i) { var p = {}; if (!i.group) p.group = 'Other'; if (!i.wash) p.wash = 'Yes'; if (Object.keys(p).length) db.set('linen', i, p); });
      if (fresh) cfgSet('linenVersion', DESK_LINEN_VERSION);
    }
    var ord = function (n) { for (var k = 0; k < DESK_LINEN.length; k++) if (DESK_LINEN[k][0] === n) return k; return 999; };
    return db.all('linen').slice().sort(function (x, y) { var gx = DESK_LINEN_GROUPS.indexOf(x.group), gy = DESK_LINEN_GROUPS.indexOf(y.group); return ((gx < 0 ? 99 : gx) - (gy < 0 ? 99 : gy)) || (ord(x.item) - ord(y.item)); });
  }
  function linenItem(name) { var a = linenAll(); for (var i = 0; i < a.length; i++) if (a[i].item === name) return a[i]; return null; }
  function linenCounts(o) { // {item: qty} → only real linen items, whole numbers 1…500
    var out = {}; o = o && typeof o === 'object' ? o : {};
    Object.keys(o).forEach(function (k) { var q = Math.round(Number(o[k]) || 0); if (q > 0 && q <= 500 && linenItem(k)) out[k] = q; });
    return out;
  }
  function linenText(n) { return Object.keys(n).map(function (k) { return n[k] + ' × ' + k; }).join(', ') || 'nothing'; }
  function linenSum(n) { return Object.keys(n || {}).reduce(function (a, k) { return a + Number(n[k] || 0); }, 0); }
  /* qty pieces from one place to another (from/to: store, rooms, dirty, laundry, or '' for new / thrown away). Never below 0. */
  function linenMove(it, qty, from, to, reason, roomNo, by) {
    qty = Math.round(Number(qty) || 0); if (!qty) return;
    var p = {};
    if (DESK_LINEN_PLACES[from]) p[from] = Math.max(0, Number(it[from] || 0) - qty);
    if (DESK_LINEN_PLACES[to]) p[to] = Number(it[to] || 0) + qty;
    db.set('linen', it, p);
    db.add('linenlog', { at: stamp(), item: it.item, qty: qty, from: DESK_LINEN_PLACES[from] || from || 'New', to: DESK_LINEN_PLACES[to] || to || 'Removed', reason: text(reason, 120), room: roomNo || '', by: by });
  }
  function linenView(it, me) {
    var o = { item: it.item, group: it.group || 'Other', wash: it.wash !== 'No', store: Number(it.store || 0), rooms: Number(it.rooms || 0), dirty: Number(it.dirty || 0), laundry: Number(it.laundry || 0), low: Number(it.low || 0), active: yes(it.active) };
    o.total = o.store + o.rooms + o.dirty + o.laundry;
    if (me.role !== 'Staff') o.price = Number(it.price || 0);
    if (me.role === 'Laundry') return { item: o.item, group: o.group, wash: o.wash, laundry: o.laundry, price: o.price, active: o.active }; // the laundry sees only what is with them, never the guest house's own counts
    return o;
  }
  function jget(v, d) { try { var x = JSON.parse(v || ''); return x == null ? d : x; } catch (e) { return d; } }
  function laundryCalc(x) { // received back, still out, bill
    var given = jget(x.items, {}), rets = jget(x.returns, []), prices = jget(x.prices, {}), back = {}, short = {}, total = 0;
    rets.forEach(function (r) { if (!r.okAt) return; Object.keys(r.got || {}).forEach(function (k) { back[k] = (back[k] || 0) + Number(r.got[k] || 0); }); });
    Object.keys(given).forEach(function (k) { var d = Number(given[k]) - Number(back[k] || 0); if (d > 0) short[k] = d; });
    Object.keys(back).forEach(function (k) { total += Number(back[k]) * Number(prices[k] != null ? prices[k] : (linenItem(k) || {}).price || 0); });
    var open = rets.some(function (r) { return !r.okAt; });
    var status = !x.outAt ? 'Waiting for approval' : open ? 'Return to check' : !linenSum(back) ? 'At laundry' : linenSum(short) ? 'Part returned' : 'Returned';
    return { back: back, short: short, total: Math.round(total), status: status };
  }
  function laundrySave(x, extra) {
    var c = laundryCalc(Object.assign({}, x, extra || {}));
    db.set('laundry', x, Object.assign({}, extra || {}, { back: JSON.stringify(c.back), short: JSON.stringify(c.short), total: c.total, status: x.status === 'Cancelled' ? 'Cancelled' : c.status }));
  }
  function laundryView(x, me) {
    var v = { id: x.id, at: x.at, by: x.by, status: x.status, items: jget(x.items, {}), outBy: x.outBy, outAt: x.outAt, returns: jget(x.returns, []), back: jget(x.back, {}), short: jget(x.short, {}),
      note: x.note, edited: x.edited, paid: x.paid, drive: x.drive ? 'https://drive.google.com/file/d/' + x.drive + '/view' : '' };
    if (me.role !== 'Staff') { v.total = Number(x.total || 0); v.prices = jget(x.prices, {}); }
    return v;
  }
  function laundryRow(id0) { var x = find('laundry', 'id', id0) || fail('not_found'); if (x.status === 'Cancelled') fail('not_found'); return x; }
  function canLaundry(me) { return isMgr(me) || me.role === 'Laundry' || me.role === 'Staff'; }

  api.laundry = function (req) {
    var me = auth(req); if (!canLaundry(me)) fail('not_allowed');
    var m = /^\d{4}-\d\d$/.test(String(req.month || '')) ? req.month : today().slice(0, 7);
    var all = db.all('laundry').filter(function (x) { return x.status !== 'Cancelled'; });
    var open = all.filter(function (x) { return x.status !== 'Returned'; });
    var month = all.filter(function (x) { return x.status === 'Returned' && String(x.outAt || x.at).slice(0, 7) === m; });
    var list = open.concat(month.filter(function (x) { return open.indexOf(x) < 0; })).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var inMonth = all.filter(function (x) { return String(x.outAt || x.at).slice(0, 7) === m; });
    var out = { month: m, linen: linenAll().filter(function (i) { return yes(i.active) && (i.wash !== 'No' || Number(i.laundry || 0) > 0 || Number(i.dirty || 0) > 0); }).map(function (i) { return linenView(i, me); }), places: DESK_LINEN_PLACES, groups: DESK_LINEN_GROUPS,
      removed: canApprove(me) ? linenAll().filter(function (i) { return i.active === 'No'; }).map(function (i) { return linenView(i, me); }) : [],
      list: list.map(function (x) { return laundryView(x, me); }),
      log: isMgr(me) ? db.all('linenlog').slice(-30).reverse() : [] };
    if (me.role !== 'Staff') out.bill = { total: inMonth.reduce(function (a, x) { return a + Number(x.total || 0); }, 0),
      unpaid: all.filter(function (x) { return !x.paid && Number(x.total) > 0; }).reduce(function (a, x) { return a + Number(x.total || 0); }, 0),
      lists: inMonth.length, pieces: inMonth.reduce(function (a, x) { return a + linenSum(jget(x.items, {})); }, 0) };
    out.can = { approve: isMgr(me), edit: canApprove(me), request: me.role === 'Receptionist', list: me.role !== 'Staff', setup: canApprove(me), pay: canApprove(me) };
    return out;
  };
  /* a new list of what goes to the laundry (or a change before it is approved) */
  api.laundryList = function (req) {
    var me = auth(req); if (!isMgr(me) && me.role !== 'Laundry') fail('not_allowed');
    var n = linenCounts(req.items); if (!linenSum(n)) fail('laundry_empty');
    var x = req.id ? laundryRow(req.id) : null;
    if (x && x.outAt) fail('laundry_approved');
    if (x && x.by !== me.name && !isMgr(me)) fail('not_allowed');
    var p = { items: JSON.stringify(n), note: text(req.note, 200) };
    if (!x) x = db.add('laundry', Object.assign({ id: id('L'), at: stamp(), by: me.name, status: 'Waiting for approval', outBy: '', outAt: '', returns: '[]', back: '{}', short: '{}', total: 0, prices: '{}', paid: '', edited: '', drive: '', dkey: '' }, p));
    else db.set('laundry', x, p);
    if (req.give && isMgr(me)) return api.laundryGive({ token: req.token, id: x.id, items: n });
    laundrySave(x);
    return { item: laundryView(x, me) };
  };
  /* reception / manager counted the pile: it leaves with the laundry (used → at the laundry) */
  api.laundryGive = function (req) {
    var me = auth(req); needMgr(me);
    var x = laundryRow(req.id); if (x.outAt) fail('laundry_approved');
    var n = req.items ? linenCounts(req.items) : jget(x.items, {}); if (!linenSum(n)) fail('laundry_empty');
    var prices = {};
    Object.keys(n).forEach(function (k) {
      var it = linenItem(k); prices[k] = Number(it.price || 0);
      var q = n[k], fromDirty = Math.min(q, Number(it.dirty || 0)); // usually from the used pile; anything more was taken straight from the rooms / store
      if (fromDirty) linenMove(it, fromDirty, 'dirty', 'laundry', 'Given to laundry ' + x.id, '', me.name);
      var rest = q - fromDirty, fromRooms = Math.min(rest, Number(it.rooms || 0));
      if (fromRooms) linenMove(it, fromRooms, 'rooms', 'laundry', 'Given to laundry ' + x.id + ' (straight from the rooms)', '', me.name);
      if (rest - fromRooms) linenMove(it, rest - fromRooms, 'store', 'laundry', 'Given to laundry ' + x.id + ' (from the store)', '', me.name);
    });
    var was = jget(x.items, {}), diff = JSON.stringify(was) !== JSON.stringify(n) ? ' (listed: ' + linenText(was) + ')' : '';
    laundrySave(x, { items: JSON.stringify(n), prices: JSON.stringify(prices), outBy: me.name, outAt: stamp(), note: text((x.note ? x.note + ' · ' : '') + (diff ? 'Counted at hand-over' + diff : ''), 300) });
    return { item: laundryView(x, me) };
  };
  /* the laundry brings things back: they list what they brought (reception checks it next) */
  api.laundryReturn = function (req) {
    var me = auth(req); if (!isMgr(me) && me.role !== 'Laundry') fail('not_allowed');
    var x = laundryRow(req.id); if (!x.outAt) fail('laundry_not_out');
    var n = linenCounts(req.items); if (!linenSum(n)) fail('laundry_empty');
    var rets = jget(x.returns, []); if (rets.some(function (r) { return !r.okAt; })) fail('laundry_return_open');
    rets.push({ at: stamp(), by: me.name, items: n, note: text(req.note, 200) });
    laundrySave(x, { returns: JSON.stringify(rets) });
    if (req.receive && isMgr(me)) return api.laundryReceive({ token: req.token, id: x.id, items: n });
    return { item: laundryView(x, me) };
  };
  /* reception / manager counted what came back: it goes to the clean store, the bill is worked out */
  api.laundryReceive = function (req) {
    var me = auth(req); needMgr(me);
    var x = laundryRow(req.id), rets = jget(x.returns, []), r = rets.filter(function (z) { return !z.okAt; })[0] || fail('laundry_no_return');
    var n = linenCounts(req.items || r.items);
    Object.keys(n).forEach(function (k) { linenMove(linenItem(k), n[k], 'laundry', 'store', 'Back from laundry ' + x.id + ' (clean)', '', me.name); });
    r.got = n; r.okBy = me.name; r.okAt = stamp(); r.exact = JSON.stringify(n) === JSON.stringify(linenCounts(r.items));
    laundrySave(x, { returns: JSON.stringify(rets) });
    return { item: laundryView(x, me) };
  };
  /* not approved yet: the list (or the open return) can be withdrawn / turned down */
  api.laundryCancel = function (req) {
    var me = auth(req), x = laundryRow(req.id);
    if (!x.outAt) {
      if (x.by !== me.name && !isMgr(me)) fail('not_allowed');
      db.set('laundry', x, { status: 'Cancelled', note: text((x.note ? x.note + ' · ' : '') + 'Cancelled by ' + me.name + ' ' + stamp(), 300) });
      return {};
    }
    var rets = jget(x.returns, []), i = -1; rets.forEach(function (z, j) { if (!z.okAt) i = j; });
    if (i < 0) fail('laundry_approved');
    if (rets[i].by !== me.name && !isMgr(me)) fail('not_allowed');
    rets.splice(i, 1);
    laundrySave(x, { returns: JSON.stringify(rets) });
    return { item: laundryView(x, me) };
  };
  /* a change after approval: Manager / Owner directly; reception sends it for approval. part: 'out' or the return number. */
  api.laundryEdit = function (req) {
    var me = auth(req); needMgr(me);
    var x = laundryRow(req.id); if (!x.outAt) fail('laundry_not_out');
    var n = linenCounts(req.items), rets = jget(x.returns, []), part = req.part === 'out' ? 'out' : Number(req.part);
    var old = part === 'out' ? jget(x.items, {}) : rets[part] && rets[part].okAt ? rets[part].got : fail('not_found');
    if (part !== 'out' && !linenSum(n)) fail('laundry_empty');
    if (part === 'out' && !linenSum(n)) fail('laundry_empty');
    var what = part === 'out' ? 'given to laundry' : 'received back (return ' + (part + 1) + ')';
    var g = gate(me, 'laundryEdit', req, 'Laundry ' + x.id + ': ' + what + ' from ' + linenText(old) + ' to ' + linenText(n));
    if (g) return g;
    var keys = {}; Object.keys(old).concat(Object.keys(n)).forEach(function (k) { keys[k] = 1; });
    var prices = jget(x.prices, {});
    Object.keys(keys).forEach(function (k) {
      var d = Number(n[k] || 0) - Number(old[k] || 0), it = linenItem(k); if (!d || !it) return;
      if (prices[k] == null) prices[k] = Number(it.price || 0);
      if (part === 'out') linenMove(it, Math.abs(d), d > 0 ? 'dirty' : 'laundry', d > 0 ? 'laundry' : 'dirty', 'Correction of laundry ' + x.id, '', who(me, req));
      else linenMove(it, Math.abs(d), d > 0 ? 'laundry' : 'store', d > 0 ? 'store' : 'laundry', 'Correction of laundry ' + x.id, '', who(me, req));
    });
    if (part === 'out') x.items = JSON.stringify(n); else rets[part].got = n;
    var log = stamp() + ' · ' + who(me, req) + ': ' + what + ' ' + linenText(old) + ' → ' + linenText(n) + (req.reason ? ' (' + text(req.reason, 120) + ')' : '');
    laundrySave(x, { items: x.items, returns: JSON.stringify(rets), prices: JSON.stringify(prices), edited: text((x.edited ? x.edited + ' | ' : '') + log, 2000) });
    return { item: laundryView(x, me) };
  };
  /* remove a whole list made by mistake (after approval): the linen counts go back as they were. Manager / Owner; reception asks. */
  api.laundryDelete = function (req) {
    var me = auth(req); needMgr(me);
    var x = laundryRow(req.id); if (!x.outAt) return api.laundryCancel(req);
    if (x.paid) fail('laundry_paid');
    if (!text(req.reason, 200)) fail('reason_required');
    var g = gate(me, 'laundryDelete', req, 'Laundry ' + x.id + ': delete the whole list (' + linenText(jget(x.items, {})) + ')');
    if (g) return g;
    var given = jget(x.items, {}), back = jget(x.back, {});
    Object.keys(back).forEach(function (k) { var it = linenItem(k); if (it) linenMove(it, back[k], 'store', 'laundry', 'Laundry ' + x.id + ' deleted', '', who(me, req)); });
    Object.keys(given).forEach(function (k) { var it = linenItem(k); if (it) linenMove(it, given[k], 'laundry', 'dirty', 'Laundry ' + x.id + ' deleted', '', who(me, req)); });
    db.set('laundry', x, { status: 'Cancelled', total: 0, edited: text((x.edited ? x.edited + ' | ' : '') + stamp() + ' · ' + who(me, req) + ': list deleted (' + text(req.reason, 120) + ')', 2000) });
    return {};
  };
  /* the laundry bill was paid: every unpaid list up to now is marked paid, and it goes in Expenses (Laundry service) */
  api.laundryPaid = function (req) {
    var me = auth(req); needApprover(me);
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40); if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    var list = db.all('laundry').filter(function (x) { return x.status !== 'Cancelled' && !x.paid && Number(x.total) > 0 && (!req.ids || req.ids.indexOf(x.id) >= 0); });
    var amt = list.reduce(function (a, x) { return a + Number(x.total || 0); }, 0); if (!(amt > 0)) fail('nothing_to_pay');
    var pieces = list.reduce(function (a, x) { return a + linenSum(jget(x.back, {})); }, 0), mark = 'Paid ' + stamp() + ' · ' + req.method + (ref ? ' ' + ref : '') + ' · ' + me.name;
    list.forEach(function (x) { db.set('laundry', x, { paid: mark }); });
    db.add('expenses', { id: id('E'), date: today(), group: 'Other', category: 'Laundry service', item: 'Laundry bill · ' + list.map(function (x) { return x.id; }).join(', '), qty: pieces, amount: amt,
      method: req.method, ref: ref, shop: 'Laundry', note: text(req.note, 300), photos: '', by: me.name, at: stamp(), removed: '', stockItem: '', stockQty: 0, edited: '' });
    return { paid: amt, lists: list.length };
  };
  /* linen setup (Manager / Owner): item, laundry price per piece, warning level; new items */
  api.linenSave = function (req) {
    var me = auth(req); needApprover(me);
    var name = text(req.item, 40); if (!name) fail('name_required');
    var old = req.original ? linenItem(req.original) : null;
    if (!old && linenItem(name)) fail('name_taken');
    var price = money(req.price); if (isNaN(price)) fail('invalid_amount');
    var p = { item: name, price: price, low: Math.max(0, Math.round(Number(req.low) || 0)), active: req.active === false ? 'No' : 'Yes' };
    if (req.group != null) p.group = DESK_LINEN_GROUPS.indexOf(req.group) >= 0 ? req.group : 'Other'; else if (!old) p.group = 'Other';
    if (req.wash != null) p.wash = req.wash === false ? 'No' : 'Yes'; else if (!old) p.wash = 'Yes';
    if (old && name !== old.item) { // renamed: open laundry lists follow the new name
      db.all('laundry').forEach(function (x) { if (x.status === 'Returned' || x.status === 'Cancelled') return; ['items', 'prices', 'short', 'back'].forEach(function (f) { var o = jget(x[f], null); if (o && o[old.item] != null) { o[name] = o[old.item]; delete o[old.item]; var q = {}; q[f] = JSON.stringify(o); db.set('laundry', x, q); } }); });
    }
    if (old) db.set('linen', old, p); else db.add('linen', Object.assign(p, { store: 0, rooms: 0, dirty: 0, laundry: 0 }));
    return {};
  };
  /* the whole room-item list in one go (Manager / Owner): rename, folder, laundry yes/no, price, warning level, remove / delete, new items */
  api.linenEditList = function (req) {
    var me = auth(req); needApprover(me);
    if (!req.items) return { items: linenAll().filter(function (i) { return i.active !== 'Deleted'; }).map(function (i) { var v = linenView(i, me); v.active = i.active !== 'No'; v.price = Number(i.price || 0); return v; }), groups: DESK_LINEN_GROUPS };
    var list = Array.isArray(req.items) ? req.items : fail('bad_request'), seen = {};
    list.forEach(function (x) { var n = text(x.item, 40); if (!n && x.active !== 'Deleted') fail('name_required'); if (n && x.active !== 'Deleted') { if (seen[n.toLowerCase()]) fail('name_taken'); seen[n.toLowerCase()] = 1; } });
    list.forEach(function (x) {
      var old = x.original ? linenItem(x.original) : null, name = text(x.item, 40);
      if (x.active === 'Deleted') {
        if (!old) return;
        if (Number(old.store || 0) + Number(old.rooms || 0) + Number(old.dirty || 0) + Number(old.laundry || 0) > 0) fail('linen_not_empty');
        db.set('linen', old, { active: 'Deleted' }); return;
      }
      var price = money(x.price); if (isNaN(price)) price = 0;
      var p = { item: name, price: price, low: Math.max(0, Math.round(Number(x.low) || 0)), active: x.active === false ? 'No' : 'Yes',
        group: DESK_LINEN_GROUPS.indexOf(x.group) >= 0 ? x.group : 'Other', wash: x.wash === false ? 'No' : 'Yes' };
      if (old) { if (name !== old.item) linenRename(old.item, name); db.set('linen', old, p); }
      else { var gone = linenItem(name); if (gone && gone.active === 'Deleted') db.set('linen', gone, p); else if (gone) fail('name_taken'); else db.add('linen', Object.assign(p, { store: 0, rooms: 0, dirty: 0, laundry: 0 })); }
    });
    return { saved: list.length };
  };
  function linenRename(from, to) { // open laundry lists follow the new name
    db.all('laundry').forEach(function (x) { if (x.status === 'Returned' || x.status === 'Cancelled') return; ['items', 'prices', 'short', 'back'].forEach(function (f) { var o = jget(x[f], null); if (o && o[from] != null) { o[to] = o[from]; delete o[from]; var q = {}; q[f] = JSON.stringify(o); db.set('laundry', x, q); } }); });
  }
  /* linen counts: bought new · thrown away / lost · counted (set the real number in one place) */
  api.linenMove = function (req) {
    var me = auth(req), it = linenItem(String(req.item || '')) || fail('no_item'), q = Math.round(Number(req.qty));
    var place = DESK_LINEN_PLACES[req.place] ? req.place : 'store', note = text(req.note, 100);
    if (req.mode === 'new') { needMgr(me); if (!(q >= 1 && q <= 5000)) fail('bad_qty'); linenMove(it, q, '', 'store', note || 'Bought new', '', me.name); }
    else if (req.mode === 'out') { needApprover(me); if (!(q >= 1 && q <= 5000)) fail('bad_qty'); linenMove(it, Math.min(q, Number(it[place] || 0)), place, '', note || 'Thrown away / lost', '', me.name); }
    else if (req.mode === 'count') {
      needApprover(me); if (!(q >= 0 && q <= 5000)) fail('bad_qty');
      var d = q - Number(it[place] || 0);
      if (d > 0) linenMove(it, d, '', place, 'Counted: ' + q + ' ' + DESK_LINEN_PLACES[place].toLowerCase() + (note ? ' · ' + note : ''), '', me.name);
      if (d < 0) linenMove(it, -d, place, '', 'Counted: ' + q + ' ' + DESK_LINEN_PLACES[place].toLowerCase() + (note ? ' · ' + note : ''), '', me.name);
    } else fail('bad_mode');
    return { linen: linenView(it, me) };
  };
  /* Google Drive: one record (PDF) per laundry list in "Laundry/<month>", made again when the list changes (timer) */
  function laundryHtml(x) {
    var v = laundryView(x, { role: 'Owner' }), keys = {};
    [v.items, v.back].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
    function e(t) { return String(t == null ? '' : t).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    var rows = Object.keys(keys).map(function (k) { var pr = Number(v.prices[k] || 0), b = Number(v.back[k] || 0);
      return '<tr><td>' + e(k) + '</td><td>' + (v.items[k] || 0) + '</td><td>' + b + '</td><td>' + (v.short[k] || '') + '</td><td>₹' + pr + '</td><td>₹' + b * pr + '</td></tr>'; }).join('');
    return '<html><body style="font-family:Arial,sans-serif;font-size:12px"><h2>Nikadi Guest House · Laundry ' + e(x.id) + '</h2>' +
      '<p><b>Status:</b> ' + e(x.status) + '<br><b>Listed:</b> ' + e(x.at) + ' by ' + e(x.by) + '<br><b>Given out (approved):</b> ' + e(x.outAt || '—') + ' by ' + e(x.outBy || '—') + '</p>' +
      '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse"><tr><th>Item</th><th>Given</th><th>Received back</th><th>Missing / still out</th><th>Price</th><th>Amount</th></tr>' + rows +
      '<tr><td colspan="5"><b>Bill</b></td><td><b>₹' + Number(x.total || 0) + '</b></td></tr></table>' +
      v.returns.map(function (r, i) { return '<p><b>Return ' + (i + 1) + ':</b> listed ' + e(r.at) + ' by ' + e(r.by) + ' (' + e(linenText(r.items)) + ')' + (r.okAt ? '<br>Checked ' + e(r.okAt) + ' by ' + e(r.okBy) + ': ' + e(linenText(r.got)) + (r.exact ? ' · exact' : ' · different from the list') : '<br>Not checked yet') + '</p>'; }).join('') +
      (x.note ? '<p><b>Note:</b> ' + e(x.note) + '</p>' : '') + (x.edited ? '<p><b>Changes after approval:</b><br>' + e(x.edited).split(' | ').join('<br>') + '</p>' : '') + (x.paid ? '<p><b>' + e(x.paid) + '</b></p>' : '') + '</body></html>';
  }
  function laundryFileRun(limit) {
    if (!hooks.laundryFile) return [];
    var done = [];
    db.all('laundry').filter(function (x) { return x.outAt && x.status !== 'Cancelled'; }).forEach(function (x) {
      if (done.length >= (limit || 4)) return;
      var key = [x.status, x.items, x.returns, x.edited, x.paid, x.total].join('|').length + ':' + x.status + ':' + String(x.returns).length + ':' + String(x.edited).length + ':' + (x.paid ? 1 : 0) + ':' + x.total;
      if (x.dkey === key) return;
      var f = hooks.laundryFile(laundryHtml(x), 'Laundry ' + x.id + ' · ' + String(x.outAt).slice(0, 10) + '.pdf', String(x.outAt).slice(0, 7), x.drive || '');
      db.set('laundry', x, { drive: f || '', dkey: key }); done.push(x.id);
    });
    return done;
  }

  api.team = function (req) {
    var me = auth(req); needOwner(me);
    return { team: db.all('staff').map(function (p) { return { name: p.name, pin: p.pin, role: p.role, active: yes(p.active) }; }) };
  };

  /* PINs that are easy to guess. The starter PINs are written in the public code, so they must never stay in use. */
  function pinWeak(pin, role) {
    pin = String(pin || '');
    if (['1111', '2222', '3333', '7777', '0000', '1234', '4321', '123456', '654321', '000000', '111111', '112233'].indexOf(pin) >= 0 || /^(\d)\1+$/.test(pin)) return 'pin_easy';
    var up = '0123456789012345', dn = '9876543210987654'; if (up.indexOf(pin) >= 0 || dn.indexOf(pin) >= 0) return 'pin_easy';
    if ((role === 'Owner' || role === 'Manager') && pin.length < 6) return 'pin_short';
    return '';
  }
  function pinWarnings(me) {
    var out = [];
    db.all('staff').forEach(function (p) { if (!yes(p.active)) return; var w = pinWeak(p.pin, p.role); if (!w) return;
      if (me.role === 'Owner' || p.name === me.name) out.push({ name: p.name, role: p.role, why: w === 'pin_short' ? 'short' : 'easy' }); });
    return out;
  }
  api.teamSave = function (req) {
    var me = auth(req); needOwner(me);
    var name = text(req.name, 40); if (!name) fail('name_required');
    var pin = String(req.pin || '').replace(/\D/g, '');
    if (!/^\d{4,6}$/.test(pin)) fail('bad_pin');
    if (ROLES.indexOf(req.role) < 0) fail('bad_role');
    var old = req.original ? find('staff', 'name', req.original) : null;
    /* a new or changed PIN must not be an easy one; Owner and Manager (money and accounts) need the full 6 digits. An unchanged PIN is left alone, and the app keeps warning about it. */
    if (!old || String(old.pin) !== pin || old.role !== req.role) { var why = pinWeak(pin, req.role); if (why) fail(why); }
    if (!old && find('staff', 'name', name)) fail('name_taken');
    if (old && name !== old.name && find('staff', 'name', name)) fail('name_taken');
    var clash = db.all('staff').filter(function (p) { return String(p.pin) === pin && p !== old && yes(p.active); })[0];
    if (clash) fail('pin_taken');
    var active = req.active === false ? 'No' : 'Yes';
    if (old && old.role === 'Owner' && (req.role !== 'Owner' || active === 'No')) {
      var owners = db.all('staff').filter(function (p) { return p.role === 'Owner' && yes(p.active); });
      if (owners.length < 2) fail('last_owner');
    }
    if (old) {
      db.set('staff', old, { name: name, pin: pin, role: req.role, active: active });
      if (name !== req.original || active === 'No' || req.role !== old.role) {
        db.all('sessions').forEach(function (s) { if (s.name === req.original) db.set('sessions', s, { expires: '2000-01-01 00:00' }); });
      }
    } else db.add('staff', { name: name, pin: pin, role: req.role, active: active });
    return api.team(req);
  };

  api.itemSave = function (req) {
    var me = auth(req); needOwner(me);
    var name = text(req.item, 40); if (!name) fail('name_required');
    var price = money(req.price); if (isNaN(price)) fail('invalid_amount');
    var low = Math.max(0, Math.round(Number(req.low || 0)));
    var old = req.original ? find('items', 'item', req.original) : null;
    if (!old && find('items', 'item', name)) fail('name_taken');
    var p = { item: name, price: price, track: req.track ? 'Yes' : 'No', low: low, active: req.active === false ? 'No' : 'Yes', sell: req.sell === false ? 'No' : 'Yes' };
    if (req.daily != null && req.daily !== '') p.daily = String(Math.max(0, Math.min(20, Math.round(Number(req.daily) || 0))));
    if (old) db.set('items', old, p); else { p.stock = 0; db.add('items', p); }
    return {};
  };

  /* ================= Bookings ================= */
  function bookingInput(req, b) {
    var p = {};
    var guest = text(req.guest != null ? req.guest : b && b.guest, 80); if (!guest) fail('name_required'); p.guest = guest;
    p.phone = phoneOk(req.phone != null ? req.phone : b && b.phone);
    if (!p.phone && !(req.comp != null ? req.comp : b && b.comp)) fail('phone_required'); // free stays: phone optional
    p.email = text(req.email != null ? req.email : b && b.email, 80);
    p.guests = Math.round(Number(req.guests != null ? req.guests : b && b.guests)); if (!(p.guests >= 1 && p.guests <= DESK_MAX_GUESTS * 11)) fail('bad_guests');
    var minRooms = Math.ceil(p.guests / DESK_MAX_GUESTS), normal = Math.ceil(p.guests / 3); // suggest 3 per room, but more can share a room
    p.roomsNeeded = Math.round(Number(req.roomsNeeded != null ? req.roomsNeeded : b ? b.roomsNeeded : normal)) || normal;
    if (p.roomsNeeded < minRooms) p.roomsNeeded = minRooms;
    if (p.roomsNeeded > 11) fail('max_guests');
    p.roomType = text(req.roomType != null ? req.roomType : b && b.roomType, 40) || 'Any';
    p.checkin = String(req.checkin != null ? req.checkin : b && b.checkin); p.checkout = String(req.checkout != null ? req.checkout : b && b.checkout);
    if (!isYmd(p.checkin) || !isYmd(p.checkout) || dayNum(p.checkout) <= dayNum(p.checkin)) fail('bad_dates');
    if (dayNum(p.checkout) - dayNum(p.checkin) > 60) fail('bad_dates');
    /* free stay (AGD Guest / Prahlad's Guest / Debarun's Guest): no money, the room is still reserved for them */
    var comp = req.comp != null ? String(req.comp || '') : b ? String(b.comp || '') : '';
    if (comp && DESK_COMP_HOSTS.indexOf(comp) < 0) fail('comp_host');
    if (comp && b && !b.comp && Number(b.advancePaid || 0) - Number(b.refunded || 0) > 0) fail('comp_has_advance');
    p.comp = comp; p.compRef = comp ? text(req.compRef != null ? req.compRef : b && b.compRef, 120) : '';
    var rate = req.rate != null && req.rate !== '' ? money(req.rate) : b ? Number(b.rate) : NaN;
    if (isNaN(rate) || rate <= 0) rate = rateNow(p.roomType, p.checkin);
    p.rate = comp ? 0 : rate;
    if (!comp && b && b.comp && !(Number(req.rate) > 0)) p.rate = rateNow(p.roomType, p.checkin); // back to a paying guest
    p.notes = text(req.notes != null ? req.notes : b && b.notes, 400);
    p.waOk = req.waOk != null ? consent(req.waOk) : b ? (b.waOk || 'No') : 'No';
    return p;
  }

  /* ---------------- WhatsApp inbox: the four lists (New enquiry · Advance paid · Checked in · Member) ----------------
     Every guest message comes in through the WhatsApp connection (backend Code.gs) and is filed here. */
  function waPhone(p) { var d = phoneNorm(p); return d || String(p || '').replace(/\D/g, ''); }
  function waOpenBooking(ph) {
    var t = today(), list = db.all('bookings').filter(function (b) { return String(b.phone) === ph && (b.status === 'Pending' || b.status === 'Confirmed') && b.checkout >= t; });
    return list.length ? list[list.length - 1] : null;
  }
  /* internal: a guest wrote to us (text, photo or file). Returns the open booking so the reply can mention it. */
  api.waIn = function (req) {
    if (!req._internal) fail('unknown_action');
    var ph = waPhone(req.phone); if (!ph) fail('phone_required');
    var txt = text(req.text, 500), at = stamp(), file = text(req.file, 120), type = text(req.type, 20) || 'text';
    db.add('wamsgs', { at: at, phone: ph, dir: 'Guest', text: txt || (file ? '[' + type + ']' : ''), file: file, type: type, wamid: text(req.wamid, 120) });
    var c = find('wachats', 'phone', ph), b = waOpenBooking(ph);
    var proof = !!file && /image|document/.test(type);
    var p = { last: at, lastIn: at, lastText: (proof ? (type === 'image' ? '📷 Photo' : '📄 File') + (txt ? ': ' : '') : '') + txt, unread: (c ? Number(c.unread) || 0 : 0) + (req.attention || (file && /image|document/.test(type)) ? 1 : 0) };
    if (req.name) p.name = text(req.name, 60);
    if (proof) { p.proof = file; p.proofType = text(req.mime, 60) || type; p.proofAt = at; p.important = b ? 'Payment screenshot for booking ' + b.id + ' · check it' : 'Photo / file received · check it'; }
    if (c) db.set('wachats', c, p); else db.add('wachats', Object.assign({ phone: ph, name: '', first: at, important: '', proof: '', proofType: '', proofAt: '', readBy: '', readAt: '' }, p));
    return { booking: b ? { id: b.id, status: b.status, checkin: b.checkin } : null, proof: proof };
  };
  /* internal: the guest wrote STOP / START */
  api.waOptOut = function (req) {
    if (!req._internal) fail('unknown_action');
    var c = waEnsureChat(req.phone, req.name); if (!c) return {};
    db.set('wachats', c, { optout: req.out ? stamp() : '' });
    if (req.out) db.all('wa').forEach(function (m) { if (m.status === 'Waiting' && waPhone(m.to) === c.phone) db.set('wa', m, { status: 'Not sent', info: 'Guest said STOP' }); });
    return { ok: true };
  };
  /* Owner / Manager: WhatsApp messages waiting to be sent by hand (while automatic sending is paused) */
  api.waToSend = function (req) {
    var me = auth(req); needApprover(me);
    return { auto: waAutoOn(), list: waHandList() };
  };
  api.waHandDone = function (req) {
    var me = auth(req); needApprover(me);
    var skip = !!req.skip;
    if (req.type === 'bill') {
      var b = find('bills', 'id', req.id) || fail('not_found');
      if (b.wa === 'Waiting') db.set('bills', b, { wa: (skip ? 'Skipped ' : 'Sent ') + stamp() + (skip ? ' by ' : ' by hand · ') + me.name });
    } else {
      var m = find('wa', 'id', req.id) || fail('not_found');
      if (m.status === 'Waiting') db.set('wa', m, { status: skip ? 'Not sent' : 'Sent', info: stamp() + ' · ' + (skip ? 'Skipped by ' : 'Sent by hand · ') + me.name });
    }
    return { list: waHandList() };
  };
  /* Front desk (owner, manager, reception): the ready messages, and marking one as sent */
  api.waKit = function (req) {
    var me = auth(req); needMgr(me);
    return waKitList();
  };
  /* A new enquiry typed at the desk (phone and dates): ready messages for it */
  api.waEnquiry = function (req) {
    var me = auth(req); needMgr(me);
    var ci = String(req.checkin || ''), nights = Math.max(0, Math.min(60, Number(req.nights) || 0)), co = isYmd(req.checkout) ? String(req.checkout) : isYmd(ci) && nights ? addDays(ci, nights) : '';
    if (ci && !isYmd(ci)) fail('bad_dates');
    if (co && (dayNum(co) <= dayNum(ci) || dayNum(co) - dayNum(ci) > 60)) fail('bad_dates');
    var ph = req.phone ? phoneOk(req.phone) : '';
    return { phone: ph, msgs: enqMsgs({ first: req.name ? salute(req.name) : '', ci: co ? ci : '', co: co, rooms: Number(req.rooms) || 1, type: req.type }).map(function (m) { m.text = waSafe(m.text); return m; }) };
  };
  /* "Done" on a guest (or a whole folder): the guest no longer counts as waiting, even if only some messages were sent. Undo brings them back. */
  api.waKitDone = function (req) {
    var me = auth(req); needMgr(me);
    var folder = { in: 'in', out: 'out', enq: 'enq' }[req.folder] || fail('bad_request');
    var refs = (Array.isArray(req.refs) ? req.refs : [req.ref]).map(function (r) { return String(r || '').slice(0, 40); }).filter(Boolean).slice(0, 100);
    if (!refs.length) fail('bad_request');
    refs.forEach(function (ref) {
      if (req.undo) db.all('wa').forEach(function (m) { if (m.ref === ref && m.kind === 'hand:done' + folder && m.status === 'Sent') db.set('wa', m, { status: 'Undone', info: m.info + ' · undone by ' + me.name }); });
      else db.add('wa', { id: id('W'), at: stamp(), sendAt: stamp(), to: '', name: '', kind: 'hand:done' + folder, ref: ref, status: 'Sent', info: stamp().slice(11, 16) + ' · ' + me.name });
    });
    return waKitList();
  };
  api.waKitSent = function (req) {
    var me = auth(req); needMgr(me);
    var kind = String(req.kind || '').replace(/[^a-z]/g, '').slice(0, 20), ref = String(req.ref || '').slice(0, 40);
    if (!kind || !ref) fail('bad_request');
    db.add('wa', { id: id('W'), at: stamp(), sendAt: stamp(), to: waPhone(req.phone || ''), name: text(req.name, 60), kind: 'hand:' + kind, ref: ref, status: 'Sent', info: stamp() + ' · ' + me.name + (req.edited ? ' (edited)' : '') });
    return waKitList();
  };
  api._waOn = function () { return { auto: waAutoOn(), bot: waBotOn() }; }
  /* Owner / Manager: automatic WhatsApp messages on or paused (Settings) */
  api.waAuto = function (req) {
    var me = auth(req); needApprover(me);
    if (req.on != null) cfgSet('waAuto', req.on ? 'on' : 'off');
    if (req.bot != null) cfgSet('waBot', req.bot ? 'on' : 'off');
    var waiting = db.all('wa').filter(function (m) { return m.status === 'Waiting'; }).length + db.all('bills').filter(function (b) { return b.wa === 'Waiting'; }).length;
    return { on: waAutoOn(), bot: waBotOn(), waiting: waiting, sentToday: waSentToday('').all, dayMax: DESK_WA_DAY_MAX };
  };
  /* internal: reception replied from the phone → the chat is seen */
  api.waSeen = function (req) {
    if (!req._internal) fail('unknown_action');
    var c = find('wachats', 'phone', waPhone(req.phone)); if (!c) return {};
    db.add('wamsgs', { at: stamp(), phone: c.phone, dir: 'Reception (phone)', text: text(req.text, 500), file: '', type: 'reply', wamid: '' });
    db.set('wachats', c, { unread: 0, readBy: 'Reply from phone', readAt: stamp(), last: stamp(), lastText: '↩ ' + (text(req.text, 120) || 'Reply sent') });
    return {};
  };
  function hoursAgo(h) { var d = new Date(ist().getTime() - h * 3600e3); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }
  /* WhatsApp lets us write freely only within 24 hours of the guest's last message */
  function waOpen(c) { var t = String(c.lastIn || ''); return !!t && t >= hoursAgo(23.5); }
  /* internal: a message we sent (assistant / automatic) — keeps the conversation complete */
  api.waOut = function (req) {
    if (!req._internal) fail('unknown_action');
    var c = find('wachats', 'phone', waPhone(req.phone)) || waEnsureChat(req.phone, req.name); if (!c) return {};
    db.add('wamsgs', { at: stamp(), phone: c.phone, dir: text(req.dir, 40) || 'Assistant', text: text(req.text, 500), file: '', type: 'out', wamid: '' });
    db.set('wachats', c, { last: stamp(), lastText: '↩ ' + text(req.text, 120) });
    return {};
  };
  /* front desk writes to the guest from the staff app (goes out from +91 75011 01137 and shows in the phone's WhatsApp too) */
  api.waSend = function (req) {
    var me = auth(req); needMgr(me);
    if (!hooks.waReply) fail('wa_not_connected');
    var c = find('wachats', 'phone', waPhone(req.phone)) || fail('not_found');
    var msg = String(req.text == null ? '' : req.text).replace(/\r/g, '').trim().slice(0, 3000), photo = req.photo ? String(req.photo) : '';
    if (!msg && !photo) fail('message_required');
    if (!waOpen(c)) fail('wa_window_closed');
    try { hooks.waReply(c.phone, msg, photo); } catch (e) { throw new Error(/^[a-z_]+$/.test(String(e && e.message)) ? e.message : 'wa_send_failed'); }
    var at = stamp();
    db.add('wamsgs', { at: at, phone: c.phone, dir: 'Reception · ' + me.name, text: msg || '📷 Photo', file: '', type: photo ? 'image-out' : 'reply', wamid: '' });
    db.set('wachats', c, { last: at, lastText: '↩ ' + (photo ? '📷 ' : '') + msg.slice(0, 110), unread: 0, readBy: me.name, readAt: at });
    return { ok: true };
  };
  function waLists(c) {
    var ph = String(c.phone), t = today(), out = [];
    var stay = db.all('stays').filter(function (x) { return String(x.phone) === ph && x.status === 'In house'; })[0];
    var bk = waOpenBooking(ph), paid = bk && bk.status === 'Confirmed' && Number(bk.advancePaid || 0) > 0;
    if (stay) out.push('in');
    else if (paid || (c.proof && bk)) out.push('paid');
    else out.push('new');
    if (memberOf(ph)) out.push('member');
    return { lists: out, stay: stay ? { id: stay.id, room: stay.room } : null, booking: bk ? { id: bk.id, status: bk.status, checkin: bk.checkin, checkout: bk.checkout, advancePaid: bk.advancePaid, advanceDue: bk.advanceDue } : null };
  }
  api.waChats = function (req) {
    var me = auth(req); needMgr(me);
    var since = addDays(today(), -60);
    var list = db.all('wachats').filter(function (c) { return String(c.last).slice(0, 10) >= since || Number(c.unread) > 0 || c.important; }).map(function (c) {
      var l = waLists(c);
      return { phone: c.phone, name: c.name, last: c.last, lastText: c.lastText, unread: Number(c.unread) || 0, important: c.important || '', proof: !!c.proof, optout: !!c.optout,
        lists: l.lists, stay: l.stay, booking: l.booking };
    }).sort(function (a, b) { return (b.important ? 1 : 0) - (a.important ? 1 : 0) || (b.unread > 0) - (a.unread > 0) || (a.last < b.last ? 1 : -1); });
    return { chats: list };
  };
  api.waChat = function (req) {
    var me = auth(req); needMgr(me);
    var c = find('wachats', 'phone', waPhone(req.phone)) || fail('not_found');
    var msgs = db.all('wamsgs').filter(function (m) { return String(m.phone) === String(c.phone); }).slice(-60).map(function (m) { return { at: m.at, dir: m.dir, text: m.text, file: m.file, type: m.type }; });
    if (Number(c.unread)) db.set('wachats', c, { unread: 0, readBy: me.name, readAt: stamp() });
    var l = waLists(c), mem = memberOf(c.phone);
    var o = { phone: c.phone, name: c.name, canReply: waOpen(c) && !!hooks.waReply, connected: !!hooks.waReply, lastIn: c.lastIn || '', important: c.important || '', lists: l.lists, stay: l.stay, booking: l.booking, msgs: msgs,
      member: mem ? { tier: mem.tier, name: mem.name } : null, proof: c.proof ? { file: c.proof, type: c.proofType, at: c.proofAt } : null };
    if (c.proof && req.photo !== false && hooks.getPhoto && /image/.test(c.proofType || 'image')) { try { o.proof.data = hooks.getPhoto(c.proof); } catch (e) {} }
    return { chat: o };
  };
  api.waPhoto = function (req) {
    var me = auth(req); needMgr(me);
    if (!hooks.getPhoto) fail('photos_unavailable');
    var f = text(req.file, 120), ok = db.all('wamsgs').some(function (m) { return m.file === f; }); if (!ok) fail('not_found');
    return { data: hooks.getPhoto(f) };
  };
  /* reception checked the screenshot / dealt with it */
  api.waDone = function (req) {
    var me = auth(req); needMgr(me);
    var c = find('wachats', 'phone', waPhone(req.phone)) || fail('not_found');
    db.set('wachats', c, { important: '', unread: 0, readBy: me.name, readAt: stamp() });
    return {};
  };
  api.waMark = function (req) { // flag a chat as important / unread again (also used by the WhatsApp assistant)
    if (!req._internal) needMgr(auth(req));
    var c = find('wachats', 'phone', waPhone(req.phone)) || fail('not_found');
    var p = {}; if (req.important) p.important = text(req.important, 120); if (req.unread) p.unread = Math.max(1, Number(c.unread) || 0);
    db.set('wachats', c, p);
    return {};
  };

  /* Internal only (WhatsApp bot): how many rooms of each type are free for every night from `checkin` to `checkout`.
     Counts in-house stays and confirmed bookings (assigned rooms, plus confirmed bookings still waiting for a room number). No guest data leaves. */
  api.availability = function (req) {
    if (!req._internal) fail('unknown_action');
    var ci = String(req.checkin), co = String(req.checkout);
    if (!isYmd(ci) || !isYmd(co) || dayNum(co) <= dayNum(ci)) fail('bad_dates');
    var types = {};
    db.all('rooms').forEach(function (r) {
      var t = r.type || 'Deluxe Double';
      if (!types[t]) types[t] = { type: t, beds: r.beds || '', total: 0, free: 0, rate: rateNow(t, ci), rates: [] };
      types[t].total++;
      if (!roomClash(r.room, ci, co)) types[t].free++;
    });
    // confirmed bookings with no room number yet still hold a room of their type
    db.all('bookings').forEach(function (b) {
      if (b.status !== 'Confirmed' || roomList(b.rooms).length || !overlaps(b.checkin, b.checkout, ci, co)) return;
      var t = types[b.roomType] ? b.roomType : null;
      var n = Math.max(1, Number(b.roomsNeeded || 1));
      if (t) types[t].free = Math.max(0, types[t].free - n);
      else Object.keys(types).forEach(function (k) { while (n > 0 && types[k].free > 0) { types[k].free--; n--; } });
    });
    Object.keys(types).forEach(function (k) {
      var t = types[k], d = ci; t.rates = [];
      for (var i = 0; i < nightsBetween(ci, co) && i < 60; i++) { t.rates.push(rateNow(k, d)); d = addDays(d, 1); }
    });
    return { checkin: ci, checkout: co, nights: nightsBetween(ci, co), types: Object.keys(types).map(function (k) { return types[k]; }) };
  };

  /* Public (website calendar, no login): for each night from today, whether each room type is
     'free', 'few' (2 or fewer rooms left) or 'full'. Only these three words leave: no counts, no guest data. */
  /* What the website calendar shows for a date, chosen by the front desk (Calendar → tap a date → "On the website").
     Kept per date and room type ('*' = every type). Values: full (Sold out), few (Almost full), busy (High demand), fill (Popular night), open (Available).
     No choice = automatic (real bookings). Past dates are dropped by themselves. */
  var SITE_SHOW = { full: 1, few: 1, busy: 1, fill: 1, open: 1 };
  function siteShowGet() { var m = {}; try { m = JSON.parse(cfgGet('siteShow') || '{}') || {}; } catch (e) { m = {}; } return m; }
  function siteShowFrom(m, from, to) { var o = {}; Object.keys(m).forEach(function (d) { if (d >= from && d < to) o[d] = m[d]; }); return o; }
  api.siteShow = function (req) {
    var me = auth(req); needMgr(me);
    var d = String(req.day || ''); if (!isYmd(d) || d < today()) fail('bad_dates');
    var types = {}; db.all('rooms').forEach(function (r) { types[r.type || 'Deluxe Double'] = 1; });
    var t = String(req.type || '*'); if (t !== '*' && !types[t]) fail('bad_room_type');
    var v = String(req.show || 'auto'); if (v !== 'auto' && !SITE_SHOW[v]) fail('bad_value');
    var m = siteShowGet(), t0 = today();
    Object.keys(m).forEach(function (k) { if (k < t0) delete m[k]; });
    var row = m[d] || {};
    if (t === '*') row = v === 'auto' ? {} : { '*': v };
    else { if (row['*']) { var all = row['*']; row = {}; Object.keys(types).forEach(function (k) { row[k] = all; }); } if (v === 'auto') delete row[t]; else row[t] = v; }
    if (Object.keys(row).length) m[d] = row; else delete m[d];
    cfgSet('siteShow', JSON.stringify(m));
    return { day: d, show: m[d] || {}, by: me.name };
  };
  /* ---- Website visitors (admin page). Nothing personal is kept: a random number for the browser, the pages, the time spent.
     No name, no phone, no IP address. Visits older than 35 days are folded into one line per day. ---- */
  var VISIT_KEEP = 35, VISIT_MAX_DAY = 6000, VISIT_EV = ['wa', 'call', 'book', 'join', 'avail'];
  function vjson(v, d) { try { var o = JSON.parse(v || ''); return o && typeof o === 'object' ? o : d; } catch (e) { return d; } }
  function vpath(p) { p = String(p || '/').split(/[?#]/)[0].toLowerCase().replace(/index\.html$/, '').replace(/\.html$/, ''); return /^\/[a-z0-9\-\/]{0,50}$/.test(p) ? p : '/'; }
  function vday(list) { // one line for a day, from its visits
    var o = { visits: list.length, visitors: 0, fresh: 0, pages: 0, secs: 0, mobile: 0, p: {}, r: {}, h: [], e: {} }, seen = {}, i;
    for (i = 0; i < 24; i++) o.h.push(0);
    list.forEach(function (v) {
      if (!seen[v.vid]) { seen[v.vid] = 1; o.visitors++; if (yes(v.isNew)) o.fresh++; }
      o.pages += Number(v.pages) || 0; o.secs += Number(v.secs) || 0; if (v.dev === 'mobile') o.mobile++;
      vjson(v.paths, []).forEach(function (x) { o.p[x] = (o.p[x] || 0) + 1; });
      var r = v.ref || 'Direct'; o.r[r] = (o.r[r] || 0) + 1;
      var hh = Number(String(v.at).slice(11, 13)); if (hh >= 0 && hh < 24) o.h[hh]++;
      var e = vjson(v.ev, {}); Object.keys(e).forEach(function (k) { o.e[k] = (o.e[k] || 0) + Number(e[k]); });
    });
    return o;
  }
  function visitRoll() {
    var t = today(); if (cfgGet('visitRoll') === t) return; cfgSet('visitRoll', t);
    if (!db.del) return;
    var cut = addDays(t, -VISIT_KEEP), old = {}, all = db.all('visits').slice();
    all.forEach(function (v) { if (String(v.day) < cut) (old[v.day] = old[v.day] || []).push(v); });
    Object.keys(old).forEach(function (d) {
      var o = vday(old[d]);
      if (!find('visitdays', 'date', d)) db.add('visitdays', { date: d, visits: o.visits, visitors: o.visitors, fresh: o.fresh, pages: o.pages, secs: o.secs, mobile: o.mobile, data: JSON.stringify({ p: o.p, r: o.r, h: o.h, e: o.e }) });
      old[d].forEach(function (v) { db.del('visits', v); });
    });
  }
  api.siteHit = function (req) {
    var sid = String(req.sid || ''), vid = String(req.vid || '');
    if (!/^[a-z0-9]{10,24}$/.test(sid) || !/^[a-z0-9]{10,24}$/.test(vid)) return {};
    var t = today(), all = db.all('visits'), v = null, n = 0, i;
    for (i = all.length - 1; i >= 0 && String(all[i].day) >= t; i--) { n++; if (all[i].id === sid) { v = all[i]; break; } }
    var path = vpath(req.path), secs = Math.max(0, Math.min(4 * 3600, Math.round(Number(req.secs) || 0))), ev = VISIT_EV.indexOf(req.ev) >= 0 ? req.ev : '';
    if (!v) {
      for (i = all.length - 1; i >= 0 && i > all.length - 400 && !v; i--) if (all[i].id === sid) v = all[i]; // a visit that runs past midnight
    }
    if (!v) {
      if (n >= VISIT_MAX_DAY) return {};
      visitRoll();
      var ref = String(req.ref || '').toLowerCase().replace(/^www\./, ''); if (!/^[a-z0-9.\-]{3,60}$/.test(ref) || /nikadiguesthouse\.com$/.test(ref)) ref = '';
      var e0 = {}; if (ev) e0[ev] = 1;
      db.add('visits', { id: sid, day: t, at: stamp(), last: stamp(), vid: vid, isNew: req.first ? 'Yes' : '', pages: 1, secs: secs, entry: path, paths: JSON.stringify([path]), ref: ref,
        dev: ['mobile', 'tablet', 'desktop'].indexOf(req.dev) >= 0 ? req.dev : 'desktop', tz: /^[A-Za-z_\/\-+0-9]{3,40}$/.test(String(req.tz || '')) ? String(req.tz) : '', lang: text(req.lang, 8).replace(/[^A-Za-z\-]/g, ''),
        member: req.member ? 'Yes' : '', ev: JSON.stringify(e0) });
      return {};
    }
    var patch = { last: stamp() };
    if (secs > Number(v.secs || 0)) patch.secs = secs;
    if (req.member && !yes(v.member)) patch.member = 'Yes';
    if (req.page) { var ps = vjson(v.paths, []); if (ps.length < 40) { ps.push(path); patch.paths = JSON.stringify(ps); } patch.pages = (Number(v.pages) || 0) + 1; }
    if (ev) { var e1 = vjson(v.ev, {}); e1[ev] = Math.min(50, (e1[ev] || 0) + 1); patch.ev = JSON.stringify(e1); }
    db.set('visits', v, patch);
    return {};
  };
  /* Admin page, history and detail screens (Owner and Manager only):
       days    every day since counting began
       day     one day: each visit with the pages it opened, in order (kept 35 days; older days have totals only)
       range   pages, sources, hours and taps added up over a period
       member  one member: points history, bookings and stays
       bookings  the bookings made in one month */
  /* ---- Accounts for the CA (GST filing): everything in a period, owner only. Reads the live records and the archive, so old months are complete too.
       The page works out the GST from each invoice exactly as the printed bill does. ---- */
  api.caReport = function (req) {
    var me = auth(req); needOwner(me);
    var from = String(req.from || ''), to = String(req.to || '');
    if (!isYmd(from) || !isYmd(to) || from > to) fail('bad_date');
    if (dayNum(to) - dayNum(from) > 1100) fail('too_long');
    var hi = addDays(to, 1);
    function inR(v) { v = String(v || '').slice(0, 10); return v >= from && v <= to; }
    function rowsOf(t, field, key) {
      var seen = {}, out = [];
      db.all(t).forEach(function (x) { if (inR(x[field])) { seen[x[key]] = 1; out.push(x); } });
      if (db.oldRows) db.oldRows(t, field, from, hi).forEach(function (x) { if (!seen[x[key]] && inR(x[field])) { seen[x[key]] = 1; out.push(x); } });
      return out.sort(function (a, b) { return String(a[field]) < String(b[field]) ? -1 : 1; });
    }
    function js(v) { try { return JSON.parse(v || '') || null; } catch (e) { return null; } }
    var stayOf = {}; db.all('stays').forEach(function (x) { stayOf[x.id] = x; });
    return { from: from, to: to, made: stamp(), by: me.name,
      bills: rowsOf('bills', 'at', 'id').map(function (b) { return { no: b.no, at: b.at, guest: b.guest, room: b.room, total: Number(b.total) || 0, d: js(b.data) }; }),
      ownBills: rowsOf('ownbills', 'at', 'id').filter(function (b) { return !yes(b.removed); }).map(function (b) { return { no: b.no, at: b.at, guest: b.guest, total: Number(b.total) || 0, d: js(b.data) }; }),
      payments: rowsOf('payments', 'at', 'id').filter(function (x) { return !yes(x.voided); }).map(function (x) { var st = stayOf[x.stay];
        return { at: x.at, amount: Number(x.amount) || 0, method: x.method || '', ref: x.ref || '', note: x.note || '', room: x.room, guest: st ? st.guest : '', booking: x.booking || '' }; }),
      expenses: rowsOf('expenses', 'date', 'id').filter(function (x) { return !yes(x.removed); }).map(function (x) { return { date: x.date, group: x.group || '', category: x.category || '', item: x.item || '', qty: x.qty, amount: Number(x.amount) || 0, method: x.method || '', ref: x.ref || '', shop: x.shop || '', note: x.note || '', hasBill: !!x.photos, id: x.id, photos: String(x.photos || '').split(',').filter(Boolean).length,
        gstin: x.gstin || '', billNo: x.billNo || '', taxable: Number(x.taxable) || 0, cgst: Number(x.cgst) || 0, sgst: Number(x.sgst) || 0, igst: Number(x.igst) || 0, gstBy: x.gstBy || '' }; }),
      commissions: rowsOf('commissions', 'date', 'id').filter(function (x) { return !yes(x.removed); }).map(function (x) { return { date: x.date, name: x.name || '', type: x.type || '', phone: x.phone || '', vehicle: x.vehicle || '', guest: x.guest || '', room: x.room || '', amount: Number(x.amount) || 0, method: x.method || '', ref: x.ref || '', note: x.note || '' }; }),
      laundry: db.all('laundry').filter(function (x) { return Number(x.total) > 0 && inR(x.outAt || x.at); }).map(function (x) { return { date: String(x.outAt || x.at).slice(0, 10), total: Number(x.total) || 0, paid: yes(x.paid), note: x.note || '' }; }),
      kept: db.all('bookings').filter(function (b) { return (b.status === 'No-show' || b.status === 'Cancelled') && Number(b.advancePaid || 0) - Number(b.refunded || 0) > 0 && inR(b.closedAt); })
        .map(function (b) { return { date: String(b.closedAt).slice(0, 10), id: b.id, guest: b.guest, status: b.status, advance: Number(b.advancePaid) || 0, refunded: Number(b.refunded) || 0, kept: Number(b.advancePaid || 0) - Number(b.refunded || 0), checkin: b.checkin }; }) };
  };

  /* Full backup for the owner: every record the system holds, as one file. Logins are left out (PINs, sessions, password hashes, keys);
     photos and PDFs are not in it either, they live in Google Drive. */
  /* the director's stamp and signature, placed on the CA files. Kept on the server and given only to the owner after login; never in the public code or the backup. */
  api.caSignGet = function (req) { var me = auth(req); needOwner(me); return { stamp: cfgGet('caSignStamp'), sign: cfgGet('caSignImage'), both: cfgGet('caSignBoth'), gh: cfgGet('caSignGh'), cin: cfgGet('caSignCin'), addr: cfgGet('caSignAddr') }; };
  api.caSignSave = function (req) {
    var me = auth(req); needOwner(me);
    var d = String(req.data || '');
    if (req.which === 'addr') { d = text(d.replace(/\s+/g, ' '), 200); cfgSet('caSignAddr', d); return { saved: true, addr: d }; }
    if (req.which === 'cin') { d = d.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (d && !/^[UL]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(d)) fail('bad_cin'); cfgSet('caSignCin', d); return { saved: true, cin: d }; }
    var which = req.which === 'stamp' ? 'caSignStamp' : req.which === 'sign' ? 'caSignImage' : req.which === 'both' ? 'caSignBoth' : req.which === 'gh' ? 'caSignGh' : ''; if (!which) fail('bad_request');
    if (d && (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(d) || d.length > 400000)) fail('bad_image');
    cfgSet(which, d);
    return { saved: true };
  };
  /* ---------- Employees (owner only) ----------
     Employee ID: NPPL-NGH-001, 002, … in order of adding. A number is never given again, even after a profile is deleted. */
  var EMP_PREFIX = 'NPPL-NGH-';
  var EMP_DOCS = { photo: ['Photo', 1], aadhaarF: ['Aadhaar card (front)', 1], aadhaarB: ['Aadhaar card (back)', 1], pan: ['PAN card', 1], voter: ['Voter card', 1],
    bank: ['Bank passbook or cheque', 1], cv: ['CV', 0], work: ['Work history papers', 0], other: ['Other document', 0] };
  var EMP_TEXT = { name: 80, job: 60, gender: 10, blood: 6, father: 80, email: 80, address: 300, emName: 80, emRel: 30, salaryNote: 120, accName: 80, bank: 80, branch: 80, upi: 60, prevWork: 2000, notes: 1000 };
  function empNext() { var n = 0; db.all('employees').forEach(function (e) { var m = /(\d+)$/.exec(String(e.id)); if (m && String(e.id).indexOf(EMP_PREFIX) === 0) n = Math.max(n, +m[1]); }); return EMP_PREFIX + String(n + 1).padStart(3, '0'); }
  function empMask(v, keep) { v = String(v || ''); return v ? (v.length > keep ? '•••• ' + v.slice(-keep) : v) : ''; }
  function empDocs(empId) { return db.all('empdocs').filter(function (d) { return d.emp === empId && !d.removed; }).map(function (d) { return { id: d.id, kind: d.kind, label: d.label, at: d.at }; }); }
  function empView(e, full) {
    var o = { id: e.id, name: e.name, job: e.job, director: yes(e.director), status: e.status || 'Active', joined: e.joined, left: e.left, phone: e.phone, salary: Number(e.salary || 0), salaryNote: e.salaryNote,
      blood: e.blood, emName: e.emName, emRel: e.emRel, emPhone: e.emPhone, docs: empDocs(e.id), photo: (db.all('empdocs').filter(function (d) { return d.emp === e.id && d.kind === 'photo' && !d.removed; })[0] || {}).id || '',
      aadhaar: empMask(e.aadhaar, 4), pan: empMask(e.pan, 4), accNo: empMask(e.accNo, 4), bank: e.bank, ifsc: e.ifsc };
    if (full) Object.keys(EMP_TEXT).concat(['dob', 'aadhaar', 'pan', 'voter', 'uan', 'esic', 'accNo', 'ifsc', 'upi', 'edited', 'added', 'by']).forEach(function (k) { o[k] = e[k] == null ? '' : e[k]; });
    return o;
  }
  function empGet(id) { var e = find('employees', 'id', id); if (!e || e.removed) fail('not_found'); return e; }
  api.employees = function (req) {
    var me = auth(req); needOwner(me);
    var list = db.all('employees').filter(function (e) { return !e.removed; }).map(function (e) { return empView(e); })
      .sort(function (a, b) { return (a.status === 'Left') - (b.status === 'Left') || (a.id < b.id ? -1 : 1); });
    return { list: list, next: empNext(), kinds: Object.keys(EMP_DOCS).map(function (k) { return { kind: k, label: EMP_DOCS[k][0], one: !!EMP_DOCS[k][1] }; }) };
  };
  api.employee = function (req) { var me = auth(req); needOwner(me); return { employee: empView(empGet(req.id), true) }; };
  api.employeeSave = function (req) {
    var me = auth(req); needOwner(me);
    var old = req.original ? empGet(req.original) : null, p = {};
    Object.keys(EMP_TEXT).forEach(function (k) { p[k] = text(req[k], EMP_TEXT[k]); });
    if (!p.name) fail('name_required');
    p.director = req.director ? 'Yes' : 'No'; p.status = req.status === 'Left' ? 'Left' : 'Active';
    ['joined', 'left', 'dob'].forEach(function (k) { p[k] = isYmd(req[k]) ? req[k] : ''; });
    if (p.status === 'Left' && !p.left) p.left = today();
    if (p.status === 'Active') p.left = '';
    p.phone = req.phone ? phoneOk(req.phone) : ''; p.emPhone = req.emPhone ? phoneOk(req.emPhone) : '';
    var sal = req.salary === '' || req.salary == null ? 0 : money(req.salary); if (isNaN(sal)) fail('invalid_amount'); p.salary = sal;
    var digits = function (v, n) { return String(v || '').replace(/\D/g, '').slice(0, n); };
    p.aadhaar = digits(req.aadhaar, 12); if (p.aadhaar && p.aadhaar.length !== 12) fail('bad_aadhaar');
    p.pan = String(req.pan || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (p.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(p.pan)) fail('bad_pan');
    p.ifsc = String(req.ifsc || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (p.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(p.ifsc)) fail('bad_ifsc');
    p.accNo = String(req.accNo || '').replace(/[^0-9A-Za-z]/g, '').slice(0, 20); if (p.accNo && p.accNo.length < 6) fail('bad_account');
    p.voter = String(req.voter || '').toUpperCase().replace(/[^A-Z0-9\/]/g, '').slice(0, 20); p.uan = digits(req.uan, 12); p.esic = digits(req.esic, 17);
    var want = String(req.id || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
    if (old) {
      if (want && want !== old.id) { /* the owner may correct an ID, for example before the cards are printed */
        if (find('employees', 'id', want)) fail('id_taken');
        db.all('empdocs').forEach(function (d) { if (d.emp === old.id) db.set('empdocs', d, { emp: want }); });
        p.id = want;
      }
      p.edited = stamp() + ' · ' + me.name; db.set('employees', old, p); return { employee: empView(old, true) };
    }
    var newId = want || empNext(); if (find('employees', 'id', newId)) fail('id_taken');
    var row = db.add('employees', Object.assign({ id: newId, added: stamp(), by: me.name, edited: '', removed: '' }, p));
    return { employee: empView(row, true) };
  };
  api.employeeRemove = function (req) {
    var me = auth(req); needOwner(me);
    var e = empGet(req.id);
    db.all('empdocs').forEach(function (d) { if (d.emp === e.id && !d.removed) { db.set('empdocs', d, { removed: stamp() + ' · ' + me.name }); if (hooks.trashFile) try { hooks.trashFile(d.file); } catch (x) {} } });
    db.set('employees', e, { removed: stamp() + ' · ' + me.name });
    return { removed: e.id };
  };
  api.empDocSave = function (req) {
    var me = auth(req); needOwner(me);
    var e = empGet(req.emp), kind = EMP_DOCS[req.kind] ? req.kind : fail('bad_kind');
    if (!hooks.savePhoto) fail('photos_unavailable');
    var data = String(req.data || '').replace(/^data:image\/\w+;base64,/, '');
    if (!/^[A-Za-z0-9+\/=]+$/.test(data) || data.length > 4000000) fail('bad_photo');
    var label = EMP_DOCS[kind][0] + (req.page ? ' page ' + Math.round(Number(req.page)) : '') + (req.label ? ' · ' + text(req.label, 60) : '');
    var file = hooks.savePhoto(data, e.id + ' · ' + label.replace(/[^\w .()·-]+/g, ' ') + '.jpg', e.id + ' ' + String(e.name).replace(/[^\w .-]+/g, ''), 'Nikadi Staff Records');
    if (EMP_DOCS[kind][1]) db.all('empdocs').forEach(function (d) { if (d.emp === e.id && d.kind === kind && !d.removed) { db.set('empdocs', d, { removed: 'Replaced ' + stamp() + ' · ' + me.name }); if (hooks.trashFile) try { hooks.trashFile(d.file); } catch (x) {} } });
    var row = db.add('empdocs', { id: id('D'), emp: e.id, kind: kind, label: label, file: file, at: stamp(), by: me.name, removed: '' });
    return { doc: { id: row.id, kind: kind, label: label, at: row.at }, docs: empDocs(e.id) };
  };
  api.empDocGet = function (req) {
    var me = auth(req); needOwner(me);
    var d = find('empdocs', 'id', req.id); if (!d || d.removed) fail('not_found');
    if (!hooks.getPhoto) fail('photos_unavailable');
    return { id: d.id, data: hooks.getPhoto(d.file) };
  };
  api.empDocRemove = function (req) {
    var me = auth(req); needOwner(me);
    var d = find('empdocs', 'id', req.id); if (!d || d.removed) fail('not_found');
    db.set('empdocs', d, { removed: stamp() + ' · ' + me.name }); if (hooks.trashFile) try { hooks.trashFile(d.file); } catch (x) {}
    return { docs: empDocs(d.emp) };
  };
  /* ---------- Salaries and payslips (owner only) ----------
     One row per person per month. Pay is worked out on the server: monthly rate × paid days ÷ days in the month, plus extra earnings,
     minus deductions. A month is "final" once the owner finalises it: payslip numbers are given then and the rows are locked. */
  function ptWB(month, gross) { /* West Bengal profession tax per month (new slabs from October 2026) */
    var g = Number(gross) || 0;
    if (month >= '2026-10') return g <= 20000 ? 0 : g <= 30000 ? 100 : g <= 50000 ? 140 : g <= 100000 ? 170 : 208;
    return g <= 10000 ? 0 : g <= 15000 ? 110 : g <= 25000 ? 130 : g <= 40000 ? 150 : 200;
  }
  function monthDays(m) { var p = m.split('-'); return new Date(+p[0], +p[1], 0).getDate(); }
  function payCalc(r, month) {
    var days = monthDays(month), lop = Math.max(0, Math.min(days, Number(r.lop) || 0)), paidDays = days - lop;
    var basic = Math.round((Number(r.rate) || 0) * paidDays / days), extra = Math.max(0, Math.round(Number(r.extra) || 0)), gross = basic + extra;
    var pt = r.ptAuto === false ? Math.max(0, Math.round(Number(r.pt) || 0)) : ptWB(month, gross);
    var d = { pt: pt, pf: Math.max(0, Math.round(Number(r.pf) || 0)), esi: Math.max(0, Math.round(Number(r.esi) || 0)), tds: Math.max(0, Math.round(Number(r.tds) || 0)), adv: Math.max(0, Math.round(Number(r.adv) || 0)), otherDed: Math.max(0, Math.round(Number(r.otherDed) || 0)) };
    var ded = d.pt + d.pf + d.esi + d.tds + d.adv + d.otherDed;
    return Object.assign({ days: days, lop: lop, paidDays: paidDays, basic: basic, extra: extra, gross: gross, ded: ded, net: gross - ded, ptAuto: r.ptAuto !== false }, d);
  }
  function payRows(month) { return db.all('payroll').filter(function (r) { return r.month === month && !r.removed; }); }
  function payView(r) { var o = {}; DESK_SCHEMA.payroll.cols.forEach(function (c) { o[c[0]] = r[c[0]] == null ? '' : r[c[0]]; }); ['rate', 'lop', 'days', 'paidDays', 'basic', 'extra', 'gross', 'pt', 'pf', 'esi', 'tds', 'adv', 'otherDed', 'ded', 'net'].forEach(function (k) { o[k] = Number(o[k]) || 0; }); o.ptAuto = o.ptAuto !== 'No'; return o; }
  api.payrollMonth = function (req) {
    var me = auth(req); needOwner(me);
    var month = /^\d{4}-\d{2}$/.test(req.month || '') ? req.month : today().slice(0, 7), first = month + '-01', last = month + '-' + String(monthDays(month)).padStart(2, '0');
    var have = {}; payRows(month).forEach(function (r) { have[r.emp] = r; });
    var rows = db.all('employees').filter(function (e) { return !e.removed && (have[e.id] || ((!e.joined || e.joined <= last) && (!e.left || e.left >= first) && (e.status !== 'Left' || (e.left && e.left >= first)))); })
      .sort(function (a, b) { return a.id < b.id ? -1 : 1; }).map(function (e) {
        if (have[e.id]) return Object.assign(payView(have[e.id]), { saved: true });
        var c = payCalc({ rate: Number(e.salary) || 0 }, month);
        return Object.assign({ id: month + '|' + e.id, month: month, emp: e.id, name: e.name, job: yes(e.director) ? 'Director' : e.job, rate: Number(e.salary) || 0, extraNote: '', otherNote: '', mode: e.accNo ? 'Bank transfer' : 'Cash', paidOn: '', ref: '', slipNo: '', status: 'Draft', saved: false }, c);
      });
    var fin = rows.length && rows.every(function (r) { return r.status === 'Final'; });
    return { month: month, rows: rows, final: !!fin, days: monthDays(month), ptNote: month >= '2026-10' ? 'West Bengal profession tax, slabs from October 2026: nil up to ₹20,000; ₹100 up to ₹30,000; ₹140 up to ₹50,000; ₹170 up to ₹1,00,000; ₹208 above.' : 'West Bengal profession tax, slabs before October 2026: nil up to ₹10,000; ₹110 up to ₹15,000; ₹130 up to ₹25,000; ₹150 up to ₹40,000; ₹200 above.' };
  };
  api.payrollSave = function (req) {
    var me = auth(req); needOwner(me);
    var month = /^\d{4}-\d{2}$/.test(req.month || '') ? req.month : fail('bad_month'), list = Array.isArray(req.rows) ? req.rows : [];
    var have = {}; payRows(month).forEach(function (r) { have[r.emp] = r; });
    var finalise = !!req.finalise, n = 0;
    payRows(month).forEach(function (r) { var m = /(\d+)$/.exec(String(r.slipNo || '')); if (m) n = Math.max(n, +m[1]); });
    list.forEach(function (x) {
      var e = find('employees', 'id', x.emp); if (!e || e.removed) return;
      var old = have[e.id]; if (old && old.status === 'Final') return; /* a finalised payslip is never changed by a save; reopen it first */
      var c = payCalc({ rate: money(x.rate), lop: x.lop, extra: x.extra, pt: x.pt, ptAuto: x.ptAuto !== false, pf: x.pf, esi: x.esi, tds: x.tds, adv: x.adv, otherDed: x.otherDed }, month);
      if (isNaN(money(x.rate))) fail('invalid_amount');
      var p = Object.assign({ id: month + '|' + e.id, month: month, emp: e.id, name: e.name, job: yes(e.director) ? 'Director' : (e.job || ''), rate: money(x.rate), extraNote: text(x.extraNote, 80), otherNote: text(x.otherNote, 80),
        mode: ['Bank transfer', 'UPI', 'Cash', 'Cheque'].indexOf(x.mode) >= 0 ? x.mode : 'Bank transfer', paidOn: isYmd(x.paidOn) ? x.paidOn : '', ref: text(x.ref, 60), edited: stamp() + ' · ' + me.name }, c);
      p.ptAuto = c.ptAuto ? 'Yes' : 'No';
      if (finalise) { p.status = 'Final'; p.slipNo = (old && old.slipNo) || ('NPPL/SAL/' + month + '/' + String(++n).padStart(3, '0')); p.finalOn = stamp(); }
      else p.status = 'Draft';
      if (old) db.set('payroll', old, p); else db.add('payroll', Object.assign({ by: me.name, at: stamp(), removed: '', slipNo: '', finalOn: '' }, p));
    });
    return api.payrollMonth({ token: req.token, month: month });
  };
  api.payrollReopen = function (req) {
    var me = auth(req); needOwner(me);
    var month = /^\d{4}-\d{2}$/.test(req.month || '') ? req.month : fail('bad_month');
    payRows(month).forEach(function (r) { if (!req.emp || r.emp === req.emp) db.set('payroll', r, { status: 'Draft', edited: stamp() + ' · ' + me.name + ' (reopened)' }); });
    return api.payrollMonth({ token: req.token, month: month });
  };
  /* everything a payslip needs about the person (full bank and ID details stay on the server; the slip shows the last 4 digits) */
  api.payslipData = function (req) {
    var me = auth(req); needOwner(me);
    var month = /^\d{4}-\d{2}$/.test(req.month || '') ? req.month : fail('bad_month');
    var rows = payRows(month).filter(function (r) { return r.status === 'Final' && (!req.emp || r.emp === req.emp); });
    if (!rows.length) fail('not_final');
    return { month: month, slips: rows.map(function (r) { var e = find('employees', 'id', r.emp) || {}, last4 = function (v) { v = String(v || ''); return v ? 'XXXX' + v.slice(-4) : ''; };
      return Object.assign(payView(r), { father: e.father || '', joined: e.joined || '', bank: e.bank || '', accNo: last4(e.accNo), ifsc: e.ifsc || '', pan: e.pan ? e.pan.slice(0, 2) + 'XXXXX' + e.pan.slice(-3) : '', uan: e.uan || '', esic: e.esic || '', gender: e.gender || '' }); }) };
  };
  api.backupAll = function (req) {
    var me = auth(req); needOwner(me);
    var skip = { sessions: 1, billpdfs: 1 }, out = {};
    Object.keys(DESK_SCHEMA).forEach(function (t) { if (skip[t]) return; var sc = DESK_SCHEMA[t], cols = sc.cols.map(function (c) { return c[0]; });
      var live = db.all(t), all = live;
      /* older records that were moved to the archive come back in, so the file is complete */
      if (db.oldRows && t !== 'config' && t !== 'staff') { var seen = {}; live.forEach(function (r) { seen[r[cols[0]]] = 1; }); var old = db.oldRows(t, cols[0], '', 'zzzzzzzz').filter(function (r) { return !seen[r[cols[0]]]; }); if (old.length) all = old.concat(live); }
      var rows = all.filter(function (r) { return t !== 'config' || !/login|key|token|secret|hash|sign/i.test(String(r[cols[0]] || '')); })
        .map(function (r) { return cols.map(function (c) { return t === 'staff' && c === 'pin' ? '(not in the backup)' : (r[c] == null ? '' : r[c]); }); });
      out[t] = { name: sc.sheet, cols: sc.cols.map(function (c) { return c[1] || c[0]; }), keys: cols, rows: rows }; });
    var m = null; if (hooks.membersAll) try { m = hooks.membersAll(); } catch (e) { m = null; }
    if (m) { out.members = { name: 'Members', cols: ['Phone', 'Name', 'City', 'Joined', 'Points', 'Lifetime points', 'Status', 'Level', 'Nights (2 years)', 'Nights (all)'], keys: ['phone', 'name', 'city', 'joined', 'points', 'lifetime', 'status', 'tier', 'nights2y', 'nightsAll'],
        rows: m.list.map(function (x) { return [x.phone, x.name, x.city, x.joined, x.points, x.lifetime, x.status, x.tier, x.nights2y, x.nightsAll]; }) };
      var tx = []; if (hooks.memberTxAll) try { tx = hooks.memberTxAll() || []; } catch (e) { tx = []; }
      out.memberPoints = { name: 'Member points history', cols: ['Date', 'Phone', 'Name', 'Type', 'Amount', 'Points', 'Balance', 'Note'], keys: ['date', 'phone', 'name', 'type', 'amount', 'points', 'balance', 'note'], rows: tx.map(function (x) { return [x.date, x.phone, x.name, x.type, x.amount, x.points, x.balance, x.note]; }) }; }
    return { made: stamp(), by: me.name, tables: out };
  };

  /* guests who walked in and were checked in straight away never had a booking made, so they are stays with no booking behind them; the admin page lists them with the bookings */
  function walkIns() {
    return db.all('stays').filter(function (x) { return !x.booking && x.status !== 'Reversed' && !x.comp; }).map(function (x) {
      return { id: x.id, walkin: true, status: x.status === 'Checked out' ? 'Checked out' : x.status || 'Checked in', source: 'Walk-in', guest: x.guest, phone: x.phone, rooms: String(x.room), roomType: '', guests: Number(x.guests) || 0,
        checkin: x.checkin, checkout: x.checkout, nights: Number(x.nights) || 0, total: Number(x.roomTotal) || 0, advancePaid: Number(x.paid) || 0, refunded: 0, created: String(x.inAt || x.checkin || ''), by: x.inBy || '' }; });
  }
  api.siteHistory = function (req) {
    var me = auth(req); if (!canApprove(me)) fail('not_allowed');
    var what = String(req.what || ''), t = today();
    function top(o, n) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n); }
    function allDays() {
      var by = {}, out = [];
      db.all('visits').forEach(function (v) { (by[v.day] = by[v.day] || []).push(v); });
      db.all('visitdays').forEach(function (r) { if (by[r.date]) return; var x = vjson(r.data, {});
        out.push({ d: String(r.date), visits: Number(r.visits), visitors: Number(r.visitors), fresh: Number(r.fresh), pages: Number(r.pages), secs: Number(r.secs), mobile: Number(r.mobile), p: x.p || {}, r: x.r || {}, h: x.h || [], e: x.e || {}, full: false }); });
      Object.keys(by).forEach(function (d) { var o = vday(by[d]); o.d = String(d); o.full = true; out.push(o); });
      return out.sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    }
    if (what === 'days') return { today: t, keep: VISIT_KEEP, days: allDays().map(function (x) { return { d: x.d, visits: x.visits, visitors: x.visitors, fresh: x.fresh, pages: x.pages, secs: x.secs, mobile: x.mobile, taps: x.e, full: x.full }; }) };
    if (what === 'day') {
      var d = String(req.day || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) fail('bad_date');
      var raw = db.all('visits').filter(function (v) { return String(v.day) === d; }), one = allDays().filter(function (x) { return x.d === d; })[0] || null;
      return { today: t, day: d, full: raw.length > 0, sum: one ? { visits: one.visits, visitors: one.visitors, fresh: one.fresh, pages: one.pages, secs: one.secs, mobile: one.mobile, taps: one.e, pages_: top(one.p, 40), refs: top(one.r, 30), hours: one.h } : null,
        visits: raw.slice().reverse().map(function (v) { return { at: v.at, last: v.last, secs: Number(v.secs) || 0, pages: Number(v.pages) || 0, paths: vjson(v.paths, []), ref: v.ref || '', dev: v.dev, tz: v.tz, lang: v.lang, isNew: yes(v.isNew), member: yes(v.member), ev: vjson(v.ev, {}) }; }) };
    }
    if (what === 'range') {
      var n = Math.max(1, Math.min(3660, Number(req.days) || 30)), from = addDays(t, -(n - 1)), o = { visits: 0, visitors: 0, fresh: 0, pages: 0, secs: 0, mobile: 0, p: {}, r: {}, e: {}, h: [] }, i, zones = {};
      for (i = 0; i < 24; i++) o.h.push(0);
      allDays().forEach(function (x) { if (x.d < from) return; ['visits', 'visitors', 'fresh', 'pages', 'secs', 'mobile'].forEach(function (f) { o[f] += x[f]; });
        ['p', 'r', 'e'].forEach(function (f) { Object.keys(x[f]).forEach(function (q) { o[f][q] = (o[f][q] || 0) + x[f][q]; }); }); (x.h || []).forEach(function (c, hh) { o.h[hh] += c || 0; }); });
      db.all('visits').forEach(function (v) { if (String(v.day) >= from) { var k = v.tz || 'Unknown'; zones[k] = (zones[k] || 0) + 1; } });
      return { today: t, days: n, from: from, visits: o.visits, visitorDays: o.visitors, fresh: o.fresh, pageViews: o.pages, secs: o.secs, mobile: o.mobile, taps: o.e, pages: top(o.p, 200), refs: top(o.r, 200), hours: o.h, zones: top(zones, 60), zonesKept: VISIT_KEEP };
    }
    function p10(x) { return String(x || '').replace(/\D/g, '').slice(-10); }
    if (what === 'member') {
      var ph = p10(req.phone); if (ph.length < 10) fail('bad_phone');
      var all = hooks.membersAll ? hooks.membersAll() : null, m = all ? all.list.filter(function (x) { return p10(x.phone) === ph; })[0] : null; if (!m) fail('not_found');
      var tx = []; if (hooks.memberHistory) try { tx = hooks.memberHistory(m.phone) || []; } catch (e) { tx = []; }
      return { today: t, member: m, tx: tx,
        bookings: db.all('bookings').filter(function (b) { return p10(b.phone) === ph; }).reverse().map(function (b) { return { id: b.id, status: b.status, source: b.source, rooms: b.rooms, roomType: b.roomType, checkin: b.checkin, checkout: b.checkout, nights: Number(b.nights) || 0, total: Number(b.total) || 0, advancePaid: Number(b.advancePaid) || 0, created: b.created }; }),
        stays: db.all('stays').filter(function (x) { return p10(x.phone) === ph; }).reverse().map(function (x) { return { id: x.id, room: x.room, checkin: x.checkin, checkout: x.checkout, nights: Number(x.nights) || 0, status: x.status, roomTotal: Number(x.roomTotal) || 0, extras: Number(x.extras) || 0, paid: Number(x.paid) || 0, bill: x.bill || '' }; }) };
    }
    if (what === 'bookings') {
      var mo = String(req.month || t.slice(0, 7)); if (!/^\d{4}-\d{2}$/.test(mo)) fail('bad_month');
      var months = {}; db.all('bookings').forEach(function (b) { var k = String(b.created).slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) months[k] = (months[k] || 0) + 1; });
      walkIns().forEach(function (w) { var k = w.created.slice(0, 7); if (/^\d{4}-\d{2}$/.test(k)) months[k] = (months[k] || 0) + 1; });
      return { today: t, month: mo, months: Object.keys(months).sort().reverse().map(function (k) { return [k, months[k]]; }),
        list: db.all('bookings').filter(function (b) { return String(b.created).slice(0, 7) === mo; }).reverse().map(function (b) { return { id: b.id, status: b.status, source: b.source || 'Other', guest: b.guest, phone: b.phone, rooms: b.rooms, roomType: b.roomType, guests: Number(b.guests) || 0, checkin: b.checkin, checkout: b.checkout, nights: Number(b.nights) || 0, total: Number(b.total) || 0, advancePaid: Number(b.advancePaid) || 0, refunded: Number(b.refunded) || 0, created: b.created, by: b.createdBy || '' }; })
          .concat(walkIns().filter(function (w) { return w.created.slice(0, 7) === mo; })).sort(function (a, b) { return String(a.created) < String(b.created) ? 1 : -1; }) };
    }
    fail('bad_request');
  };
  /* ---- Admin page login: a user name and password of its own. Only a scrambled form of the password is kept (never the password itself),
     and only the Owner can set or change it. ---- */
  function admHash(salt, pass) { var h = salt + ':' + pass, i; for (i = 0; i < 600; i++) h = hooks.hash(h + salt); return h; }
  function admGet() { try { var o = JSON.parse(cfgGet('adminLogin') || ''); return o && o.user && o.hash ? o : null; } catch (e) { return null; } }
  api.adminHasLogin = function () { return { set: !!admGet() }; };
  api.adminSetLogin = function (req) {
    var me = auth(req); if (me.role !== 'Owner') fail('not_allowed');
    if (!hooks.hash) fail('not_ready');
    var user = String(req.user || '').trim(), pass = String(req.pass || '');
    if (!/^[A-Za-z0-9._\-]{3,30}$/.test(user)) fail('bad_user');
    if (pass.length < 4 || pass.length > 64) fail('bad_pass');
    var salt = id('S') + Math.random().toString(36).slice(2);
    cfgSet('adminLogin', JSON.stringify({ user: user, salt: salt, hash: admHash(salt, pass), at: stamp() }));
    return { user: user };
  };
  api.adminLogin = function (req) {
    var fails = Number(db.kvGet('adm_fails') || 0); if (fails >= 8) fail('too_many_attempts');
    var a = admGet(); if (!a || !hooks.hash) fail('no_login');
    var user = String(req.user || '').trim(), pass = String(req.pass || '');
    if (user.toLowerCase() !== String(a.user).toLowerCase() || pass.length > 64 || admHash(a.salt, pass) !== a.hash) { db.kvSet('adm_fails', String(fails + 1), 900); fail('wrong_login'); }
    var owner = db.all('staff').filter(function (p) { return yes(p.active) && p.role === 'Owner'; })[0]; if (!owner) fail('no_owner');
    var token = id('T') + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2), d = ist(Date.now() + 7 * 864e5);
    db.add('sessions', { token: token, name: owner.name, role: 'Owner', expires: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + ' 00:00' });
    return { token: token };
  };
  /* everything the admin page shows: Owner and Manager only */
  api.siteStats = function (req) {
    var me = auth(req); if (!canApprove(me)) fail('not_allowed');
    var t = today(), now = stamp(), byDay = {}, days = [], i;
    db.all('visits').forEach(function (v) { (byDay[v.day] = byDay[v.day] || []).push(v); });
    var old = {}; db.all('visitdays').forEach(function (r) { old[r.date] = r; });
    function dayOf(d) {
      if (byDay[d]) { var o = vday(byDay[d]); o.d = d; return o; }
      var r = old[d]; if (r) { var x = vjson(r.data, {}); return { d: d, visits: Number(r.visits), visitors: Number(r.visitors), fresh: Number(r.fresh), pages: Number(r.pages), secs: Number(r.secs), mobile: Number(r.mobile), p: x.p || {}, r: x.r || {}, h: x.h || [], e: x.e || {} }; }
      return { d: d, visits: 0, visitors: 0, fresh: 0, pages: 0, secs: 0, mobile: 0, p: {}, r: {}, h: [], e: {} };
    }
    for (i = 89; i >= 0; i--) days.push(dayOf(addDays(t, -i)));
    function sum(list) {
      var o = { visits: 0, visitors: 0, fresh: 0, pages: 0, secs: 0, mobile: 0, p: {}, r: {}, h: [], e: {} }, k; for (k = 0; k < 24; k++) o.h.push(0);
      list.forEach(function (x) { ['visits', 'visitors', 'fresh', 'pages', 'secs', 'mobile'].forEach(function (f) { o[f] += x[f]; });
        ['p', 'r', 'e'].forEach(function (f) { Object.keys(x[f]).forEach(function (q) { o[f][q] = (o[f][q] || 0) + x[f][q]; }); }); (x.h || []).forEach(function (c, hh) { o.h[hh] += c || 0; }); });
      return o;
    }
    function top(o, n) { return Object.keys(o).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n); }
    function pack(o) { return { visits: o.visits, visitors: o.visitors, fresh: o.fresh, pages: o.pages, secs: o.secs, mobile: o.mobile, taps: o.e, avg: o.visits ? Math.round(o.secs / o.visits) : 0 }; }
    var d7 = sum(days.slice(-7)), d30 = sum(days.slice(-30)), p7 = sum(days.slice(-14, -7)), p30 = sum(days.slice(-60, -30));
    /* the same person on several days is one visitor for the week or month, where the single visits are still kept */
    function uniq(n) { var s = {}, c = 0, from = addDays(t, -(n - 1)); db.all('visits').forEach(function (v) { if (String(v.day) >= from && !s[v.vid]) { s[v.vid] = 1; c++; } }); return c; }
    d7.visitors = uniq(7); d30.visitors = uniq(30);
    var nowMin = dayNum(t) * 1440 + Number(now.slice(11, 13)) * 60 + Number(now.slice(14, 16));
    function ago(s) { s = String(s); return nowMin - (dayNum(s.slice(0, 10)) * 1440 + Number(s.slice(11, 13)) * 60 + Number(s.slice(14, 16))); }
    var recent = db.all('visits').slice(-60).reverse().map(function (v) { var ps = vjson(v.paths, []);
      return { at: v.at, last: v.last, secs: Number(v.secs) || 0, pages: Number(v.pages) || 0, entry: v.entry, lastPage: ps[ps.length - 1] || v.entry, ref: v.ref || '', dev: v.dev, tz: v.tz, isNew: yes(v.isNew), member: yes(v.member), ev: vjson(v.ev, {}), on: ago(v.last) <= 3 }; });
    var live = recent.filter(function (v) { return v.on; });
    var tz = {}; db.all('visits').forEach(function (v) { if (String(v.day) >= addDays(t, -29)) { var k = v.tz || 'Unknown'; tz[k] = (tz[k] || 0) + 1; } });
    var from30 = addDays(t, -29), bk = db.all('bookings').filter(function (b) { return String(b.created).slice(0, 10) >= from30; }), src = {};
    bk.forEach(function (b) { var k = b.source || 'Other'; src[k] = (src[k] || 0) + 1; });
    var wk = walkIns().filter(function (w) { return w.created.slice(0, 10) >= from30; }); if (wk.length) src['Walk-in'] = (src['Walk-in'] || 0) + wk.length;
    var members = null; if (hooks.membersAll) try { members = hooks.membersAll(); } catch (e) { members = null; }
    return { today: t, now: now, live: live.length, liveList: live.slice(0, 12),
      day: pack(days[89]), yesterday: pack(days[88]), week: pack(d7), month: pack(d30), prevWeek: pack(p7), prevMonth: pack(p30),
      days: days.map(function (x) { return { d: x.d, visits: x.visits, visitors: x.visitors, pages: x.pages, secs: x.secs }; }),
      pages: top(d30.p, 12), refs: top(d30.r, 10), hours: d30.h, zones: top(tz, 10), recent: recent.slice(0, 40),
      bookings: { total: bk.length + wk.length, bySource: top(src, 8), regs: db.all('regs').filter(function (r) { return String(r.at).slice(0, 10) >= from30; }).length },
      members: members };
  };
  api.tonightDeal = function () { return tonightDeal(); }; // internal: the member booking code asks for it
  api.siteAvailability = function (req) {
    var days = Math.min(180, Math.max(7, Math.round(Number(req.days || 120)))), d = today(), out = [], names = null, show = siteShowGet();
    for (var i = 0; i < days; i++) {
      var av = api.availability({ _internal: true, checkin: d, checkout: addDays(d, 1) }), row = { d: d, t: {} };
      if (!names) names = av.types.map(function (t) { return t.type; });
      av.types.forEach(function (t) { var o = show[d] && (show[d][t.type] || show[d]['*']); row.t[t.type] = o && SITE_SHOW[o] ? (o === 'few' ? 'fewset' : o) : t.free <= 0 ? 'full' : t.free <= 2 ? 'few' : 'free'; }); // 'fewset' = Almost full chosen by the front desk (the website always shows it); plain 'few' is counted from bookings
      out.push(row); d = addDays(d, 1);
    }
    return { from: today(), types: names || [], days: out, deal: tonightDeal() };
  };

  /* Public: the website's Advance Booking Form sends this (no login). Lands as Pending; never blocks rooms. */
  api.bookingRequest = function (req) {
    var n = Number(db.kvGet('web_bookings') || 0);
    if (n >= 30) fail('too_many_requests');
    db.kvSet('web_bookings', String(n + 1), 3600);
    var p = bookingInput({ guest: req.guest, phone: req.phone, email: req.email, guests: req.guests, roomsNeeded: req.roomsNeeded, roomType: req.roomType,
      checkin: req.checkin, checkout: req.checkout, notes: req.notes, rate: req._internal ? req.rate : null,
      waOk: req._internal && /WhatsApp/.test(String(req.source || '')) ? true : !!req.waOk }); // asked on WhatsApp = they wrote to us first; website: their own tick
    if (dayNum(p.checkin) < dayNum(today()) || dayNum(p.checkin) > dayNum(today()) + 400) fail('bad_dates');
    var dup = db.all('bookings').filter(function (b) { return b.status === 'Pending' && b.phone === p.phone && b.checkin === p.checkin && b.checkout === p.checkout; })[0];
    if (dup) return { id: dup.id, duplicate: true };
    var b = db.add('bookings', Object.assign(p, { id: id('B'), status: 'Pending', source: req._internal && req.source ? text(req.source, 30) : 'Website', rooms: '', nights: 0, total: 0, advanceDue: 0, advancePaid: 0, refunded: 0,
      created: stamp(), createdBy: req._internal && req.source ? text(req.source, 30) : 'Website form', confirmedBy: '', confirmedAt: '', closedBy: '', closedAt: '', closeNote: '' }));
    recomputeBooking(b);
    return { id: b.id };
  };

  /* Public: the website's Guest Registration Card arrives here (no login) and shows in the staff app → Registrations */
  api.guestRegister = function (req) {
    var n = Number(db.kvGet('web_regs') || 0);
    if (n >= 40) fail('too_many_requests');
    db.kvSet('web_regs', String(n + 1), 3600);
    var name = text(req.name, 80); if (!name) fail('guest_required');
    var ph = phoneOk(req.phone || ''); if (!ph) fail('phone_required');
    var ci = isYmd(req.checkin) ? req.checkin : '', co = isYmd(req.checkout) ? req.checkout : '';
    var fields = Array.isArray(req.fields) ? req.fields.slice(0, 80).map(function (f) { return [text(f && f[0], 60), text(f && f[1], 300)]; }).filter(function (f) { return f[0] && f[1]; }) : [];
    var people = Array.isArray(req.people) ? req.people.slice(0, 8).map(function (x) { return text(x, 200); }).filter(Boolean) : [];
    var bk = db.all('bookings').filter(function (b) { return (b.status === 'Pending' || b.status === 'Confirmed') && waPhone(b.phone) === waPhone(ph) && (!ci || b.checkin === ci || overlaps(b.checkin, b.checkout, ci, co || addDays(ci, 1))); })[0];
    var r = db.add('regs', { id: id('G'), at: stamp(), name: name, phone: ph, email: text(req.email, 80), checkin: ci, checkout: co, booking: bk ? bk.id : '', status: 'New', seenBy: '', data: JSON.stringify({ fields: fields, people: people }) });
    return { id: r.id, booking: r.booking };
  };
  function regView(r) { var d = {}; try { d = JSON.parse(r.data || '{}'); } catch (e) {} return { id: r.id, at: r.at, name: r.name, phone: r.phone, email: r.email, checkin: r.checkin, checkout: r.checkout, booking: r.booking, status: r.status, seenBy: r.seenBy, fields: d.fields || [], people: d.people || [] }; }
  /* "Dummy bookings": some free rooms are shown as Booked on the Rooms screen (display only: availability, website and prices are not changed) */
  function dummyGet() { var d = {}; try { d = JSON.parse(cfgGet('dummy') || '{}'); } catch (e) {} return { on: !!d.on, rooms: Array.isArray(d.rooms) ? d.rooms : [1, 5, 6] }; }
  api.dummy = function (req) {
    var me = auth(req); needMgr(me);
    var d = dummyGet();
    if (req.on != null) d.on = !!req.on;
    if (Array.isArray(req.rooms)) { var all = db.all('rooms').map(function (r) { return Number(r.room); }); d.rooms = req.rooms.map(Number).filter(function (n, i, a) { return all.indexOf(n) >= 0 && a.indexOf(n) === i; }).sort(function (a, b) { return a - b; }); }
    cfgSet('dummy', JSON.stringify({ on: d.on, rooms: d.rooms, by: me.name, at: stamp() }));
    return dummyGet();
  };
  /* Front desk: registration cards (newest first); mark one as checked */
  api.registrations = function (req) {
    var me = auth(req); needMgr(me);
    if (req.seen) { var r = find('regs', 'id', req.seen) || fail('not_found'); db.set('regs', r, { status: 'Checked', seenBy: me.name + ' · ' + stamp() }); }
    var list = db.all('regs').slice().reverse().slice(0, 60);
    if (req.phone) list = list.filter(function (r) { return waPhone(r.phone) === waPhone(req.phone); });
    return { list: list.map(regView) };
  };
  api.bookings = function (req) {
    var me = auth(req), t = today();
    var all = db.all('bookings').slice().reverse();
    var open = all.filter(function (b) { return b.status === 'Pending' || b.status === 'Confirmed'; })
      .sort(function (a, b) { return a.status === b.status ? (a.checkin < b.checkin ? -1 : 1) : a.status === 'Pending' ? -1 : 1; });
    var closed = all.filter(function (b) { return b.status !== 'Pending' && b.status !== 'Confirmed'; }).slice(0, 25);
    void t;
    return { open: open.map(function (b) { return bookingView(b, me); }), closed: closed.map(function (b) { return bookingView(b, me); }) };
  };

  api.booking = function (req) {
    var me = auth(req);
    return { booking: bookingView(find('bookings', 'id', req.id) || fail('no_booking'), me) };
  };

  api.bookingCreate = function (req) {
    var me = auth(req); needMgr(me);
    var p = bookingInput(req);
    if (dayNum(p.checkin) < dayNum(today()) - 1) fail('bad_dates');
    var src = ['Phone', 'WhatsApp', 'Walk-in', 'Website', 'Other'].indexOf(req.source) >= 0 ? req.source : 'Phone';
    var b = db.add('bookings', Object.assign(p, { id: id('B'), status: 'Pending', source: src, rooms: '', nights: 0, total: 0, advanceDue: 0, advancePaid: 0, refunded: 0,
      created: stamp(), createdBy: me.name, confirmedBy: '', confirmedAt: '', closedBy: '', closedAt: '', closeNote: '' }));
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  api.bookingUpdate = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Pending' && b.status !== 'Confirmed') fail('booking_closed');
    var p = bookingInput(req, b);
    if (b.status === 'Confirmed' && !p.comp && !b.comp && Number(p.rate) !== Number(b.rate)) {
      var g0 = gate(me, 'bookingUpdate', req, 'Booking ' + b.id + ' · ' + b.guest + ': change rate from ₹' + b.rate + ' to ₹' + p.rate + ' per room per night');
      if (g0) return g0;
    }
    if (b.status === 'Confirmed') {
      var rooms = req.rooms != null ? req.rooms.map(Number) : roomList(b.rooms);
      if (!rooms.length) fail('pick_rooms');
      rooms.forEach(function (n) { room(n); var c = roomClash(n, p.checkin, p.checkout, { booking: b.id }); if (c) clashFail(n, c); });
      p.rooms = rooms.join(', '); p.roomsNeeded = rooms.length;
      if (rooms.length * DESK_MAX_GUESTS < p.guests) fail('max_guests');
    }
    db.set('bookings', b, p);
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  /* Reception confirms ONLY after money is received: amount, method and reference are recorded with their name. */
  api.bookingConfirm = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Pending') fail('booking_closed');
    var rooms = (req.rooms || []).map(Number).filter(function (n, i, a) { return n && a.indexOf(n) === i; });
    if (!rooms.length) fail('pick_rooms');
    if (rooms.length * DESK_MAX_GUESTS < Number(b.guests)) fail('max_guests');
    if (!b.comp && req.rate != null && req.rate !== '') { var rt = money(req.rate); if (!(rt > 0)) fail('rate_required'); db.set('bookings', b, { rate: rt }); }
    rooms.forEach(function (n) { room(n); var c = roomClash(n, b.checkin, b.checkout, { booking: b.id }); if (c) clashFail(n, c); });
    if (b.comp) { // free stay: just reserve the rooms
      db.set('bookings', b, { rooms: rooms.join(', '), roomsNeeded: rooms.length, status: 'Confirmed', confirmedBy: me.name, confirmedAt: stamp() });
      recomputeBooking(b);
      return { booking: bookingView(b, me) };
    }
    var amt = money(req.amount); if (!(amt > 0)) fail('advance_required');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    db.set('bookings', b, { rooms: rooms.join(', '), roomsNeeded: rooms.length, status: 'Confirmed', confirmedBy: me.name, confirmedAt: stamp() });
    recomputeBooking(b);
    if (amt < Number(b.advanceDue)) db.set('bookings', b, { advanceSet: amt }); // the guest paid less than 50%: that is the agreed advance
    db.add('payments', { id: id('P'), at: stamp(), stay: '', room: rooms.join(', '), amount: amt, method: req.method, note: 'Booking advance', by: me.name, booking: b.id, ref: ref });
    recomputeBooking(b);
    if (b.waOk === 'Yes') waQueue('booking', b.phone, b.guest, b.id);
    var wc = find('wachats', 'phone', String(b.phone || '')); if (wc && wc.important) db.set('wachats', wc, { important: '', readBy: me.name, readAt: stamp() }); // advance checked
    return { booking: bookingView(b, me) };
  };

  /* front desk: the advance this guest has to pay (blank / 0 = the usual 50%) */
  api.bookingAdvance = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Pending' && b.status !== 'Confirmed') fail('booking_closed');
    var a = req.amount === '' || req.amount == null ? 0 : money(req.amount); if (isNaN(a) || a < 0) fail('invalid_amount');
    db.set('bookings', b, { advanceSet: a > 0 ? a : '' });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  api.bookingPay = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Confirmed') fail('booking_closed');
    if (b.comp) fail('comp_no_money');
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    db.add('payments', { id: id('P'), at: stamp(), stay: '', room: b.rooms, amount: amt, method: req.method, note: text(req.note, 120) || 'Booking payment', by: me.name, booking: b.id, ref: ref });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  /* Cancellation policy: 3+ days before check-in = full advance refunded; later, same day or no-show = nothing back.
     Only the Owner may give back a different amount (recorded with a note). */
  api.bookingCancel = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Pending' && b.status !== 'Confirmed') fail('booking_closed');
    var reason = text(req.reason, 160);
    var policyRefund = b.status === 'Confirmed' && daysBefore(b) >= DESK_POLICY.freeCancelDays ? Number(b.advancePaid || 0) - Number(b.refunded || 0) : 0;
    if (req._approvedReq && req.policyRefund != null) policyRefund = Number(req.policyRefund); // policy as on the day reception asked
    var refund = policyRefund;
    if (b.status === 'Confirmed' && me.role === 'Receptionist') {
      if (req.refund != null && req.refund !== '' && Number(req.refund) !== policyRefund) fail('not_allowed');
      req.policyRefund = policyRefund;
      var g = gate(me, 'bookingCancel', req, 'Booking ' + b.id + ' · ' + b.guest + ': cancel (' + daysBefore(b) + ' days before check-in) · ' + (policyRefund > 0 ? 'refund ₹' + policyRefund + ' by ' + req.method : 'no refund, ₹' + (Number(b.advancePaid || 0) - Number(b.refunded || 0)) + ' kept'));
      if (g) return g;
    }
    if (req.refund != null && req.refund !== '' && Number(req.refund) !== policyRefund) {
      needOwner(me);
      refund = money(req.refund); if (isNaN(refund) || refund > Number(b.advancePaid || 0)) fail('invalid_amount');
      reason = text((reason ? reason + ' · ' : '') + 'Owner changed refund from ₹' + policyRefund + ' to ₹' + refund, 200);
    }
    if (refund > 0) {
      if (METHODS.indexOf(req.method) < 0) fail('method_required');
      var ref = text(req.ref, 40);
      if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
      db.add('payments', { id: id('P'), at: stamp(), stay: '', room: b.rooms, amount: -refund, method: req.method, note: 'Refund on cancellation', by: who(me, req), booking: b.id, ref: ref, voided: '' });
    }
    var kept = Number(b.advancePaid || 0) - Number(b.refunded || 0) - refund;
    db.set('bookings', b, { status: 'Cancelled', closedBy: who(me, req), closedAt: stamp(),
      closeNote: text((reason ? reason + ' · ' : '') + (b.status === 'Confirmed' ? daysBefore(b) + ' days before check-in · refunded ₹' + refund + (kept > 0 ? ' · ₹' + kept + ' kept (policy)' : '') : 'Not confirmed'), 300) });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  api.bookingNoShow = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Confirmed') fail('booking_closed');
    if (b.checkin > today()) fail('not_arrival_day');
    db.set('bookings', b, { status: 'No-show', closedBy: me.name, closedAt: stamp(), closeNote: text('No-show · advance ₹' + b.advancePaid + ' kept (policy) ' + text(req.reason, 120), 300) });
    stmtKey(b, true);
    return { booking: bookingView(b, me) };
  };

  /* Guest arrives: one stay per room; the advance moves onto the room bills (split evenly). */
  api.bookingCheckIn = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status !== 'Confirmed') fail('booking_closed');
    if (b.checkin > today()) fail('too_early');
    var rooms = roomList(b.rooms);
    rooms.forEach(function (n) { var r = room(n); if (r.status !== 'Ready') fail(r.status === 'Occupied' ? 'room_occupied' : 'room_not_clean'); });
    var cin = b.checkin < today() ? today() : b.checkin;
    if (dayNum(b.checkout) <= dayNum(cin)) fail('bad_dates');
    var left = Number(b.advancePaid || 0) - Number(b.refunded || 0), each = Math.floor(left / rooms.length), guestsLeft = Number(b.guests);
    var made = [];
    rooms.forEach(function (n, i) {
      var g = Math.min(DESK_MAX_GUESTS, Math.max(1, Math.ceil(guestsLeft / (rooms.length - i)))); guestsLeft -= g;
      var s = db.add('stays', { id: id('S'), room: n, guest: b.guest, phone: b.phone, guests: g, checkin: cin, checkout: b.checkout, nights: nightsBetween(cin, b.checkout),
        rate: b.comp ? 0 : b.rate, rateNote: 'Booking ' + b.id + (rooms.length > 1 ? ' · ' + rooms.length + ' rooms' : ''), status: 'In house', roomTotal: 0, extras: 0, paid: 0, balance: 0,
        notes: b.notes, inBy: me.name, inAt: stamp(), outBy: '', outAt: '', booking: b.id, comp: b.comp || '', compRef: b.comp ? b.compRef || '' : '', waOk: b.waOk === 'Yes' ? 'Yes' : 'No', waOffers: 'No' });
      var share = i === 0 ? left - each * (rooms.length - 1) : each;
      if (share > 0) db.add('payments', { id: id('P'), at: stamp(), stay: s.id, room: n, amount: share, method: FROM_ADV, note: 'Advance from booking ' + b.id, by: me.name, booking: b.id, ref: '' });
      recompute(s);
      db.set('rooms', room(n), { status: 'Occupied', stay: s.id, updated: stamp(), by: me.name });
      freeWater(n, me.name, s.id);
      if (i === 0) welcomeMsgs(s);
      made.push(s.id);
    });
    db.set('bookings', b, { status: 'Checked in', closedBy: me.name, closedAt: stamp(), closeNote: 'Checked in to room ' + rooms.join(', ') });
    return { stays: made, booking: bookingView(b, me) };
  };

  /* Give back part or all of a booking advance without cancelling (e.g. fewer rooms needed, paid twice). */
  api.bookingRefund = function (req) {
    var me = auth(req); needMgr(me);
    var b = find('bookings', 'id', req.id) || fail('no_booking');
    if (b.status === 'Pending') fail('booking_closed');
    if (b.status === 'Checked in') fail('refund_from_room');
    var amt = money(req.amount); if (!(amt > 0)) fail('invalid_amount');
    if (amt > Number(b.advancePaid || 0) - Number(b.refunded || 0)) fail('refund_too_much');
    if (METHODS.indexOf(req.method) < 0) fail('method_required');
    var ref = text(req.ref, 40);
    if ((req.method === 'UPI' || req.method === 'Bank transfer') && !ref) fail('ref_required');
    if (!text(req.reason, 200)) fail('reason_required');
    var g = gate(me, 'bookingRefund', req, 'Booking ' + b.id + ' · ' + b.guest + ': refund ₹' + amt + ' of the advance by ' + req.method + (ref ? ' (' + ref + ')' : ''));
    if (g) return g;
    db.add('payments', { id: id('P'), at: stamp(), stay: '', room: b.rooms, amount: -amt, method: req.method, note: 'Refund: ' + text(req.reason, 120), by: who(me, req), booking: b.id, ref: ref, voided: '' });
    recomputeBooking(b);
    return { booking: bookingView(b, me) };
  };

  /* ================= Sales report (Owner only) ================= */
  /* Sales = room + extras of stays, counted in the month the guest checked out.
     Collected = money received (net of refunds), counted on the day it was received. */
  api.report = function (req) {
    var me = auth(req); needOwner(me);
    var year = String(req.year || today().slice(0, 4)).replace(/\D/g, '').slice(0, 4);
    var nRooms = db.all('rooms').length || 11, years = {};
    function blank(m) { return { month: m, rooms: 0, extras: 0, sales: 0, nights: 0, stays: 0, guests: 0, collected: 0, refunds: 0, byMethod: {}, occupancy: 0, adr: 0 }; }
    var months = []; for (var i = 1; i <= 12; i++) months.push(blank(i));
    var items = {};
    db.all('stays').forEach(function (st) {
      if (st.status !== 'Checked out' || !st.checkout) return;
      var y = String(st.checkout).slice(0, 4); years[y] = 1;
      if (y !== year) return;
      var mo = months[Number(String(st.checkout).slice(5, 7)) - 1];
      mo.rooms += Number(st.roomTotal || 0); mo.extras += Number(st.extras || 0); mo.nights += Number(st.nights || 0); mo.stays++; mo.guests += Number(st.guests || 0);
    });
    db.all('charges').forEach(function (c) {
      if (c.removed || String(c.at).slice(0, 4) !== year) return;
      var k = c.item; items[k] = items[k] || { item: k, qty: 0, free: 0, amount: 0 };
      if (c.free === 'Yes') items[k].free += Number(c.qty || 0); else { items[k].qty += Number(c.qty || 0); items[k].amount += Number(c.total || 0); }
    });
    db.all('payments').forEach(function (p) {
      if (p.voided || p.method === FROM_ADV || !p.at) return;
      var y = String(p.at).slice(0, 4); years[y] = 1;
      if (y !== year) return;
      var mo = months[Number(String(p.at).slice(5, 7)) - 1], a = Number(p.amount || 0);
      if (a >= 0) mo.collected += a; else mo.refunds += -a;
      mo.byMethod[p.method] = (mo.byMethod[p.method] || 0) + a;
    });
    db.all('summary').forEach(function (r) { // months whose records moved to the archive Sheet
      var y = String(r.month).slice(0, 4); years[y] = 1; if (y !== year) return;
      var mo = months[Number(String(r.month).slice(5, 7)) - 1];
      ['rooms', 'extras', 'nights', 'stays', 'guests', 'collected', 'refunds'].forEach(function (f) { mo[f] += Number(r[f] || 0); });
      var bm = jsonOr(r.byMethod, {}); Object.keys(bm).forEach(function (m) { mo.byMethod[m] = (mo.byMethod[m] || 0) + bm[m]; });
      var it = jsonOr(r.items, {}); Object.keys(it).forEach(function (k) { var t = items[k] = items[k] || { item: k, qty: 0, free: 0, amount: 0 }; t.qty += it[k].qty; t.free += it[k].free; t.amount += it[k].amount; });
    });
    var tot = blank(0); tot.byMethod = {};
    months.forEach(function (mo) {
      mo.sales = mo.rooms + mo.extras;
      var dim = new Date(Date.UTC(Number(year), mo.month, 0)).getUTCDate();
      mo.occupancy = Math.round(mo.nights / (nRooms * dim) * 1000) / 10;
      mo.adr = mo.nights ? Math.round(mo.rooms / mo.nights) : 0;
      ['rooms', 'extras', 'sales', 'nights', 'stays', 'guests', 'collected', 'refunds'].forEach(function (k) { tot[k] += mo[k]; });
      Object.keys(mo.byMethod).forEach(function (k) { tot.byMethod[k] = (tot.byMethod[k] || 0) + mo.byMethod[k]; });
    });
    var leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
    tot.occupancy = Math.round(tot.nights / (nRooms * (leap ? 366 : 365)) * 1000) / 10;
    tot.adr = tot.nights ? Math.round(tot.rooms / tot.nights) : 0;
    years[today().slice(0, 4)] = 1;
    var bk = db.all('bookings').filter(function (b) { return String(b.created).slice(0, 4) === year; });
    return { year: year, years: Object.keys(years).sort().reverse(), months: months, total: tot, rooms: nRooms,
      items: Object.keys(items).map(function (k) { return items[k]; }).sort(function (a, b) { return b.amount - a.amount; }),
      bookings: { made: bk.length, cancelled: bk.filter(function (b) { return b.status === 'Cancelled'; }).length, noShow: bk.filter(function (b) { return b.status === 'No-show'; }).length },
      partial: today().slice(0, 4) === year };
  };

  /* ================= Approvals ================= */
  var APPROVABLE = ['laundryEdit', 'laundryDelete', 'editCharge', 'refund', 'voidPayment', 'payAmount', 'updateStay', 'bookingUpdate', 'bookingCancel', 'bookingRefund', 'undoCheckout', 'undoCheckin'];
  function reqView(r) { return { id: r.id, at: r.at, by: r.by, type: r.type, summary: r.summary, reason: r.reason, status: r.status, decidedBy: r.decidedBy, decidedAt: r.decidedAt, decisionNote: r.decisionNote }; }
  api.requests = function (req) {
    var me = auth(req); needMgr(me);
    var all = db.all('requests').slice().reverse();
    if (!canApprove(me)) all = all.filter(function (r) { return r.by === me.name; });
    return { pending: all.filter(function (r) { return r.status === 'Pending'; }).map(reqView),
      done: all.filter(function (r) { return r.status !== 'Pending'; }).slice(0, 30).map(reqView), canApprove: canApprove(me) };
  };
  api.requestDecide = function (req) {
    var me = auth(req); needApprover(me);
    var r = find('requests', 'id', req.id) || fail('no_request');
    if (r.status !== 'Pending') fail('request_done');
    var note = text(req.note, 200);
    if (req.approve) {
      if (APPROVABLE.indexOf(r.type) < 0) fail('unknown_action');
      var payload = JSON.parse(r.payload || '{}');
      payload.token = req.token; payload._for = r.by; payload._approvedReq = r.id;
      api[r.type](payload); // runs as the approver; errors leave the request pending
      db.set('requests', r, { status: 'Approved', decidedBy: me.name, decidedAt: stamp(), decisionNote: note });
    } else {
      db.set('requests', r, { status: 'Rejected', decidedBy: me.name, decidedAt: stamp(), decisionNote: note || 'Not approved' });
    }
    return api.requests(req);
  };

  /* Calendar: every room, what holds it on each day from `from` for `days` days. */
  api.calendar = function (req) {
    var me = auth(req), mgr = isMgr(me);
    var from = isYmd(req.from) ? req.from : today(), days = Math.min(62, Math.max(1, Math.round(Number(req.days || 31)))), to = addDays(from, days);
    function nm(g) { return mgr ? g : String(g || '').split(/\s+/)[0]; }
    var bars = [];
    db.all('stays').forEach(function (s) {
      var end = s.status === 'In house' && s.checkout <= today() ? addDays(today(), 1) : s.checkout;
      if ((s.status === 'In house' || s.status === 'Checked out') && overlaps(s.checkin, end, from, to))
        bars.push({ room: Number(s.room), kind: s.status === 'In house' ? 'stay' : 'past', id: s.id, guest: nm(s.guest), guests: s.guests, from: s.checkin, to: end });
    });
    db.all('bookings').forEach(function (b) {
      if (b.status === 'Confirmed' && overlaps(b.checkin, b.checkout, from, to))
        roomList(b.rooms).forEach(function (n) { bars.push({ room: n, kind: 'booked', id: b.id, guest: nm(b.guest), guests: b.guests, from: b.checkin, to: b.checkout, comp: b.comp || '' }); });
    });
    var pending = db.all('bookings').filter(function (b) { return b.status === 'Pending' && overlaps(b.checkin, b.checkout, from, to); }).map(function (b) { return bookingView(b, me); });
    var rooms = db.all('rooms').map(function (r) { return { room: r.room, type: r.type, beds: r.beds, status: r.status }; }).sort(function (a, b) { return a.room - b.room; });
    return { from: from, days: days, today: today(), rooms: rooms, bars: bars, pending: pending, site: mgr ? siteShowFrom(siteShowGet(), from, to) : {} };
  };

  /* remember which action is running, so auth() can keep the laundry team to their own screen */
  Object.keys(api).forEach(function (k) {
    if (k.charAt(0) === '_') return;
    var f = api[k];
    api[k] = function (req) { var was = curAction; curAction = curAction || k; try { return f(req); } finally { curAction = was; } };
  });
  return api;
}

/* Nikadi Guest House — guest bill (GST tax invoice).
   NikadiBill.billHTML(d, opt) returns a complete, self-contained HTML page (screen, print / PDF).
   NikadiBill.billEmail(d) returns a simple table-based email body. billWhatsApp(d) returns message text.
   Prices are INCLUSIVE of GST. The room is billed at its full tariff and any discount is its own line.
   Tax is worked out backwards from the amount after discount, line by line, and summarised by HSN/SAC.
   Works in the browser and in Google Apps Script (no DOM needed). */
(function (root) {
  var HOTEL = { review: 'https://g.page/r/CfDIGanjxtFCEAE/review',
    name: 'Nikadi Guest House',
    company: 'Nikadi Projects Private Limited',
    gstin: '19AAHCN7789F1ZR',
    pan: 'AAHCN7789F',
    state: 'West Bengal', stateCode: '19',
    address: ['Bhaktisiddhanta Saraswati Marg', 'Opp. ISKCON Gate No. 4 (Namahatta Bhavan)', 'Sri Dham Mayapur, Nadia, West Bengal 741313'],
    phone: '+91 75011 01137',
    email: 'nikadiguesthouse@gmail.com',
    web: 'www.nikadiguesthouse.com',
    logo: 'https://www.nikadiguesthouse.com/img/brand/logo.png',
    sign: 'https://www.nikadiguesthouse.com/img/brand/signature.png',
    paid: 'https://www.nikadiguesthouse.com/img/brand/paid.png'
  };
  /* Government codes. Rooms: SAC 996311 "Room or unit accommodation services" (5% GST up to ₹7,500 a night). */
  var ROOM_HSN = '996311', ROOM_GST = 5;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function r2(n) { return Math.round(n * 100) / 100; }
  function grp(x) { var last = x.slice(-3), rest = x.slice(0, -3); return (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' : '') + last; }
  function num(n) { var neg = n < 0; n = Math.abs(n); var p = n.toFixed(2).split('.'); return (neg ? '−' : '') + grp(p[0]) + '.' + p[1]; }
  function inr(n) { var neg = n < 0; return (neg ? '−' : '') + '₹' + grp(String(Math.round(Math.abs(n)))); }
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(s) { if (!s) return ''; var p = String(s).slice(0, 10).split('-'); return (p[2].length < 2 ? '0' : '') + +p[2] + ' ' + MON[+p[1] - 1] + ' ' + p[0]; }
  function dayTime(s) {
    if (!s) return ''; var t = String(s).slice(11, 16);
    if (!t) return day(s);
    var h = +t.slice(0, 2), m = t.slice(3, 5);
    return day(s) + ', ' + ((h % 12) || 12) + ':' + m + (h < 12 ? ' AM' : ' PM');
  }
  function words(n) {
    n = Math.round(n);
    var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    var b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); }
    function three(x) { return (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + two(x % 100); }
    if (!n) return 'Zero';
    var out = [], cr = Math.floor(n / 1e7), lk = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1e3) % 100, rest = n % 1000;
    if (cr) out.push(three(cr) + ' Crore');
    if (lk) out.push(two(lk) + ' Lakh');
    if (th) out.push(two(th) + ' Thousand');
    if (rest) out.push(three(rest));
    return out.join(' ');
  }

  var TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'];
  function cap(w) { w = String(w || ''); return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
  function fullName(g) { return (g.title && TITLES.indexOf(g.title) >= 0 ? g.title + ' ' : '') + String(g.name || '').trim(); }
  /* "Mrs. Paul" when we know the title, otherwise the guest's full name. */
  function greetName(g) {
    var parts = String(g.name || '').trim().split(/\s+/), last = parts[parts.length - 1] || '';
    if (g.title && TITLES.indexOf(g.title) >= 0 && last && parts.length > 1) return g.title + ' ' + (last === last.toUpperCase() || last === last.toLowerCase() ? cap(last) : last);
    return parts.map(function (w) { return w === w.toLowerCase() ? cap(w) : w; }).join(' ') || 'Guest';
  }

  /* d = { no, date, id, url,
       guest:{name, phone, email, address, gstin, company},
       room:{no, type}, checkin, checkout, inAt, outAt, nights, guests, booking,
       tariff,                                    // full room price per night (incl. GST)
       discounts:[{label, note, amount}],         // positive amounts, taken off the room
       items:[{label, hsn, gst, qty, rate}],      // chargeable extras (incl. GST)
       payments:[{date, label, method, ref, amount}], refunds:[{date, method, ref, amount}],
       member:{level, earned, balance, saved}, staff } */
  function compute(d) {
    var roomGross = r2(d.tariff * d.nights);
    var disc = r2((d.discounts || []).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0));
    var lines = [{ hsn: ROOM_HSN, gst: ROOM_GST, net: r2(roomGross - disc) }];
    (d.items || []).forEach(function (x) { lines.push({ hsn: x.hsn || '', gst: x.gst == null ? ROOM_GST : Number(x.gst), net: r2(x.qty * x.rate) }); });
    var by = {}, order = [];
    lines.forEach(function (l) {
      var k = l.hsn + '|' + l.gst;
      if (!by[k]) { by[k] = { hsn: l.hsn, gst: l.gst, total: 0 }; order.push(k); }
      by[k].total = r2(by[k].total + l.net);
    });
    var tax = order.map(function (k) {
      var g = by[k], taxable = r2(g.total / (1 + g.gst / 100)), t = r2(g.total - taxable), c = r2(t / 2);
      return { hsn: g.hsn, gst: g.gst, taxable: taxable, cgst: c, sgst: r2(t - c), tax: t, total: g.total };
    });
    var total = r2(lines.reduce(function (s, l) { return s + l.net; }, 0));
    var extras = r2(total - roomGross + disc);
    var sum = function (k) { return r2(tax.reduce(function (s, x) { return s + x[k]; }, 0)); };
    var paid = r2((d.payments || []).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0));
    var refunded = r2((d.refunds || []).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0));
    return { roomGross: roomGross, disc: disc, extras: extras, total: total, tax: tax, taxable: sum('taxable'), cgst: sum('cgst'), sgst: sum('sgst'), gstTotal: sum('tax'),
      paid: paid, refunded: refunded, due: r2(total - paid + refunded) };
  }

  function kv(k, v) { return v === '' || v == null ? '' : '<tr><th>' + k + '</th><td class="colon">:</td><td>' + v + '</td></tr>'; }

  function billHTML(d, opt) {
    opt = opt || {};
    var c = compute(d), g = d.guest || {}, m = d.member, sl = 0;
    var qr = d.url && root.NikadiQR ? root.NikadiQR.svg(d.url, { cls: 'qr-svg' }) : '';
    var settled = Math.abs(c.due) < 0.5;

    var rows = '<tr><td class="c">' + (++sl) + '</td><td class="mono">' + ROOM_HSN + '</td><td><b>Room accommodation</b><small>Room ' + esc(d.room.no) + ' · ' + esc(d.room.type) +
      ' · ' + day(d.checkin) + ' to ' + day(d.checkout) + ' · ' + d.guests + (d.guests > 1 ? ' guests' : ' guest') + '</small></td>' +
      '<td class="c">' + d.nights + ' Night' + (d.nights > 1 ? 's' : '') + '</td><td class="r">' + num(d.tariff) + '</td><td class="c">' + ROOM_GST + '%</td><td class="r">' + num(c.roomGross) + '</td></tr>';
    (d.discounts || []).forEach(function (x) {
      rows += '<tr class="disc"><td></td><td class="mono">' + ROOM_HSN + '</td><td><b>Less: ' + esc(x.label) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</td><td></td><td></td><td class="c">' + ROOM_GST + '%</td><td class="r">' + num(-x.amount) + '</td></tr>';
    });
    (d.items || []).forEach(function (x) {
      rows += '<tr' + (x.fine ? ' class="fine"' : '') + '><td class="c">' + (++sl) + '</td><td class="mono">' + esc(x.hsn || '—') + '</td><td><b>' + esc(x.label) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</td>' +
        '<td class="c">' + x.qty + ' ' + esc(x.unit || 'Nos') + '</td><td class="r">' + num(x.rate) + '</td><td class="c">' + (x.gst == null ? ROOM_GST : x.gst) + '%</td><td class="r">' + num(x.qty * x.rate) + '</td></tr>';
    });

    var taxRows = c.tax.map(function (t) {
      return '<tr><td class="mono">' + esc(t.hsn || '—') + '</td><td class="r">' + num(t.taxable) + '</td><td class="c">' + t.gst / 2 + '%</td><td class="r">' + num(t.cgst) + '</td><td class="c">' + t.gst / 2 + '%</td><td class="r">' + num(t.sgst) + '</td><td class="r">' + num(t.tax) + '</td><td class="r">' + num(t.total) + '</td></tr>';
    }).join('');

    var pays = (d.payments || []).map(function (p) {
      return '<tr><td>' + day(p.date) + '</td><td>' + esc(p.label) + '</td><td>' + esc(p.method) + '</td><td class="mono">' + esc(p.ref || '—') + '</td><td class="r">' + num(p.amount) + '</td></tr>';
    }).join('') + (d.refunds || []).map(function (p) {
      return '<tr><td>' + day(p.date) + '</td><td>Refund to guest</td><td>' + esc(p.method) + '</td><td class="mono">' + esc(p.ref || '—') + '</td><td class="r">' + num(-p.amount) + '</td></tr>';
    }).join('');

    var bar = opt.toolbar ? '<div class="toolbar"><span>Bill ' + esc(d.no) + '</span><span class="tb-btns">' +
      '<button type="button" onclick="if(window.nikadiPdf){window.nikadiPdf(this)}else{window.print()}">Download PDF</button>' +
      '<button type="button" class="tb-print" onclick="window.print()">Print</button>' +
      '<button type="button" class="tb-share" onclick="if(navigator.share){navigator.share({title:document.title,url:location.href}).catch(function(){})}else{navigator.clipboard&&navigator.clipboard.writeText(location.href);this.textContent=\'Link copied\'}">Share</button></span></div>' : '';

    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex,nofollow"><title>Tax Invoice ' + esc(d.no) + ' · ' + HOTEL.name + '</title>' +
      '<style>' + CSS + (opt.pdf ? PRINT : '') + '</style></head><body' + (opt.pdf ? ' class="pdf"' : '') + '>' + bar + '<div class="sheet">' +
      '<img class="wm" src="' + esc(opt.logo || HOTEL.logo) + '" alt="" aria-hidden="true">' + // faded logo behind the bill

      '<header class="top">' +
        '<div class="brand"><img class="logo" src="' + esc(opt.logo || HOTEL.logo) + '" alt="' + HOTEL.name + '" width="150"></div>' +
        (qr ? '<div class="qr">' + qr + '<span>Scan to view this bill online</span></div>' : '<div></div>') +
        '<div class="doc"><h1>TAX INVOICE</h1><div class="orig">Original for Recipient</div><table class="kv">' +
          kv('Invoice No.', '<b class="mono">' + esc(d.no) + '</b>') + kv('Invoice Date', day(d.date)) + kv('Room No.', esc(d.room.no)) +
          kv('Arrival', dayTime(d.inAt && String(d.inAt).slice(0, 10) === d.checkin ? d.inAt : d.checkin)) + kv('Departure', dayTime(d.outAt || d.checkout)) + kv('Guests (Pax)', d.guests) +
          kv('Booking Ref.', d.booking ? '<span class="mono">' + esc(d.booking) + '</span>' : '') +
        '</table></div>' +
      '</header>' +

      '<section class="parties">' +
        '<div class="party"><div class="lbl">Billed to</div><div class="who">' + esc(g.company || fullName(g)) + '</div>' +
          (g.company ? '<div>Guest: ' + esc(fullName(g)) + '</div>' : '') + (g.address ? '<div>' + esc(g.address) + '</div>' : '') +
          (g.phone ? '<div>Mobile: ' + esc(g.phone) + '</div>' : '') + (g.email ? '<div>Email: ' + esc(g.email) + '</div>' : '') +
          '<table class="kv sm">' + kv('Customer GSTIN', g.gstin ? '<span class="mono">' + esc(g.gstin) + '</span>' : 'Unregistered') +
          kv('Place of Supply', HOTEL.stateCode + ' (' + HOTEL.state + ')') + '</table></div>' +
        '<div class="party"><div class="lbl">Supplier</div><div class="who">' + HOTEL.company + '</div><div>' + HOTEL.name + '</div>' +
          HOTEL.address.map(function (l) { return '<div>' + l + '</div>'; }).join('') +
          '<table class="kv sm">' + kv('GSTIN', '<span class="mono">' + HOTEL.gstin + '</span>') + kv('PAN', '<span class="mono">' + HOTEL.pan + '</span>') +
          kv('State', HOTEL.state + ' (Code ' + HOTEL.stateCode + ')') + '</table></div>' +
      '</section>' +

      '<div class="tbl-wrap"><table class="lines"><thead><tr><th class="c">Sl.</th><th>HSN / SAC</th><th>Description</th><th class="c">Qty / UOM</th><th class="r">Rate (₹)</th><th class="c">GST</th><th class="r">Amount (₹)</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot><tr><td colspan="6" class="r">Total (inclusive of GST)</td><td class="r">' + num(c.total) + '</td></tr></tfoot></table></div>' +
      '<p class="incl">All rates are inclusive of GST. Tax is not charged in addition to the amounts above.</p>' +

      '<section class="split">' +
        '<div class="taxbox"><div class="lbl">GST summary (included in the total)</div><div class="tbl-wrap"><table class="tax"><thead><tr><th>HSN / SAC</th><th class="r">Taxable value</th><th class="c">CGST</th><th class="r">CGST amt</th><th class="c">SGST</th><th class="r">SGST amt</th><th class="r">Total tax</th><th class="r">Amount</th></tr></thead>' +
          '<tbody>' + taxRows + '</tbody><tfoot><tr><td>Total</td><td class="r">' + num(c.taxable) + '</td><td></td><td class="r">' + num(c.cgst) + '</td><td></td><td class="r">' + num(c.sgst) + '</td><td class="r">' + num(c.gstTotal) + '</td><td class="r">' + num(c.total) + '</td></tr></tfoot></table></div>' +
          '<div class="small">IGST ₹0.00 · Cess ₹0.00 · Tax payable on reverse charge: No</div>' +
          /* the PAID stamp: only on a settled bill that has money on it, never on a free stay */
          (settled && c.total > 0.5 ? '<img class="paidimg" alt="Paid" src="' + esc(opt.paid || HOTEL.paid) + '">' : '') + '</div>' +
        '<div class="totals">' +
          '<div class="srow"><span>Room charges</span><span>' + num(c.roomGross) + '</span></div>' +
          (c.disc ? '<div class="srow"><span>Less: discount</span><span>' + num(-c.disc) + '</span></div>' : '') +
          (c.extras ? '<div class="srow"><span>Other charges</span><span>' + num(c.extras) + '</span></div>' : '') +
          '<div class="srow tot"><span>Invoice total</span><span>₹' + num(c.total) + '</span></div>' +
          '<div class="srow"><span>Amount received</span><span>' + num(-c.paid) + '</span></div>' +
          (c.refunded ? '<div class="srow"><span>Refunded</span><span>' + num(c.refunded) + '</span></div>' : '') +
          '<div class="srow bal' + (settled ? ' ok' : '') + '"><span>' + (settled ? 'Balance' : c.due > 0 ? 'Balance payable' : 'Refundable to guest') + '</span><span>₹' + num(Math.abs(c.due)) + '</span></div>' +
          '<div class="words"><b>Amount in words:</b> Indian Rupees ' + words(c.total) + ' Only</div>' +
        '</div>' +
      '</section>' +

      (pays ? '<section class="pays"><div class="lbl">Payments received</div><div class="tbl-wrap"><table class="ptab"><thead><tr><th>Date</th><th>Particulars</th><th>Mode</th><th>Transaction / Ref. No.</th><th class="r">Amount (₹)</th></tr></thead><tbody>' + pays + '</tbody></table></div></section>' : '') +

      (m ? '<section class="member"><b>Nikadi Membership · ' + esc(m.level) + '</b>' +
        (m.saved ? '<span>Saved on this stay: <b>' + inr(m.saved) + '</b></span>' : '') +
        (m.earned != null ? '<span>Points earned: <b>' + m.earned + '</b></span>' : '') +
        (m.balance != null ? '<span>Points balance: <b>' + grp(String(m.balance)) + '</b></span>' : '') + '</section>' : '') +

      '<section class="decl"><div class="lbl">Declaration</div><p>We declare that this invoice shows the actual price of the services described and that all particulars are true and correct. ' +
        'I agree that my liability for this bill is not waived and agree to be held personally liable if the indicated person, company or association fails to pay any part of it. ' +
        'Any query about this bill must be raised within five days of departure.</p></section>' +

      '<section class="sign"><div class="gsig"><div class="line"></div>Guest signature<small>&nbsp;</small></div><div class="r"><img class="sig" src="' + esc(opt.sign || (opt.logo ? String(opt.logo).replace(/logo\.png$/, 'signature.png') : HOTEL.sign)) + '" alt="Signed for ' + HOTEL.company + ', Director"><div class="line"></div>Authorised signatory' +
        (d.staff ? '<small>Checked out by ' + esc(d.staff) + '</small>' : '') + '</div></section>' +

      '<footer class="foot"><div>' + HOTEL.company + ' · ' + HOTEL.name + ', ' + HOTEL.address.join(', ') + '</div>' +
        '<div>' + HOTEL.phone + ' · ' + HOTEL.email + ' · ' + HOTEL.web + '</div>' +
        '<div class="gen">This is a computer-generated invoice. ' + (d.id ? 'Verify it by scanning the QR code or at ' + HOTEL.web + '/bill.' : '') + '</div>' +
        '<div class="thanks">Thank you for staying with us. Hare Krishna.</div></footer>' +
      '</div></body></html>';
  }

  var PRINT = ['.paidimg{width:66px;height:66px;margin-top:4px}.wm{top:150px;width:72%}body{background:#fff;font-size:9.5px;line-height:1.3}.incl{margin-top:3px}.parties .kv.sm{margin-top:3px}.small{margin-top:3px}.decl p{font-size:9px}.foot{font-size:9px;line-height:1.45}.foot .thanks{font-size:10.5px;margin-top:3px}.words{margin-top:5px}.stamp{margin-top:5px}.top{gap:14px;padding-bottom:10px}.logo{width:120px}.qr-svg{width:96px;height:96px}.doc h1{font-size:18px}.parties{padding:10px 0;gap:18px}.who{font-size:11.5px}.lines{margin-top:10px}.lines td{padding:5px 6px}.lines th{padding:6px}.split{margin-top:10px}.tax td,.tax th,.ptab td,.ptab th{padding:3px 5px}.pays,.member,.decl{margin-top:10px}.sign{margin-top:8px}.sign .line{margin-top:2px}.sign .sig{width:185px}.foot>div:first-child{display:none}.stamp{display:none}.srow.tot{margin:3px 0}.srow.bal{margin-top:3px;padding:4px 6px}.lines tfoot td{padding:5px 6px}.kv th,.kv td,.kv td.colon{padding-top:0;padding-bottom:0}.party{line-height:1.35}.tax td,.tax th{padding:2px 5px}.ptab td,.ptab th{padding:2px 5px}.srow{padding:1px 0}.lines td{padding:4px 6px}.qr span{font-size:8px}.decl p{line-height:1.35}.split{gap:14px}.foot{margin-top:12px;padding-top:8px}.member{padding:6px 10px}.totals{padding:6px 10px}.srow{padding:2px 0}.srow.tot{font-size:13px;padding:5px 0}section,.totals,.taxbox,table{break-inside:avoid}.toolbar{display:none}.sheet{box-shadow:none;margin:0;max-width:none;padding:0;border-top-width:4px}',
    '.top{grid-template-columns:1fr auto 1.25fr}.parties{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr 250px}',
    '.lines th,.srow.bal,.lines tfoot td,.tax th,.ptab th,.member{-webkit-print-color-adjust:exact;print-color-adjust:exact}'].join('');

  var CSS = [
    '*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}',
    'body{margin:0;background:#e9ecee;color:#1d2326;font:12.5px/1.45 "Helvetica Neue",Helvetica,Arial,sans-serif}',
    '.sheet{max-width:860px;margin:24px auto;background:#fff;padding:34px 38px 26px;border-top:5px solid #156b82;box-shadow:0 1px 18px rgba(20,40,50,.10);position:relative}',
    '.wm{position:absolute;left:0;right:0;top:290px;margin:0 auto;width:66%;max-width:560px;height:auto;opacity:.07;pointer-events:none;z-index:5;user-select:none}',
    '.mono{font-family:"SFMono-Regular",Menlo,Consolas,monospace;font-size:.95em}',
    '.lbl{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#156b82;font-weight:700;margin-bottom:6px}',
    'table{border-collapse:collapse;width:100%}.c{text-align:center}.r{text-align:right}',
    '.tbl-wrap{overflow-x:auto}.top>*,.parties>*,.split>*{min-width:0}',
    '.top{display:grid;grid-template-columns:1fr auto 1.25fr;gap:22px;align-items:start;padding-bottom:18px;border-bottom:2px solid #1d2326}',
    '.logo{width:150px;height:auto;display:block}',
    '.qr{display:flex;flex-direction:column;align-items:center;gap:4px}.qr-svg{width:118px;height:118px;display:block}.qr span{font-size:9.5px;color:#5c676c;letter-spacing:.02em}',
    '.doc h1{margin:0;font-size:22px;letter-spacing:.04em;font-weight:800}.orig{font-weight:700;font-size:12.5px;margin:2px 0 8px;color:#3d474b}',
    '.kv th{text-align:left;font-weight:600;color:#3d474b;padding:1.5px 10px 1.5px 0;white-space:nowrap;vertical-align:top;width:1%}',
    '.kv td{padding:1.5px 0}.kv td.colon{padding:1.5px 8px 1.5px 0;color:#8a9499;width:1%}',
    '.kv.sm{margin-top:6px}',
    '.parties{display:grid;grid-template-columns:1fr 1fr;gap:26px;padding:16px 0;border-bottom:1px solid #cfd6d9}',
    '.party{color:#3d474b;line-height:1.55}.who{font-weight:700;color:#1d2326;font-size:13.5px}',
    '.lines{margin-top:16px;border:1px solid #1d2326}',
    '.lines th{background:#1d2326;color:#fff;font-weight:600;font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;padding:8px 8px;text-align:left}',
    '.lines th.c{text-align:center}.lines th.r{text-align:right}',
    '.lines td{padding:8px;border-bottom:1px solid #dde3e5;border-right:1px solid #eef1f2;vertical-align:top}',
    '.lines td b{font-weight:600}.lines small{display:block;color:#66737a;font-size:11px;margin-top:2px}',
    '.lines tr.fine td,.lines tr.fine small{color:#c0262d;font-weight:600}.lines tr.fine td{background:#fdf0f0;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.lines tr.disc td{color:#1e6b46}.lines tfoot td{font-weight:700;background:#f2f5f6;border-top:1px solid #1d2326;padding:9px 8px}',
    '.incl{margin:6px 0 0;font-size:11px;color:#66737a}',
    '.split{display:grid;grid-template-columns:1fr 270px;gap:22px;margin-top:18px;align-items:start}',
    '.tax{border:1px solid #cfd6d9}.tax th{background:#f2f5f6;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#3d474b;padding:6px;text-align:left;border-bottom:1px solid #cfd6d9}',
    '.tax th.r{text-align:right}.tax th.c{text-align:center}.tax td{padding:6px;border-bottom:1px solid #eef1f2;white-space:nowrap}.tax tfoot td{font-weight:700;border-top:1px solid #cfd6d9}',
    '.small{font-size:10.5px;color:#66737a;margin-top:6px}',
    '.totals{border:1px solid #cfd6d9;padding:10px 14px}',
    '.srow{display:flex;justify-content:space-between;gap:10px;padding:4px 0;color:#3d474b}',
    '.srow.tot{border-top:1.5px solid #1d2326;border-bottom:1.5px solid #1d2326;margin:6px 0;padding:8px 0;font-size:15px;font-weight:800;color:#1d2326}',
    '.srow.bal{font-weight:700;color:#1d2326;background:#f2f5f6;margin:6px -6px 0;padding:7px 6px}.srow.bal.ok{background:#e8f3ee;color:#1e6b46}',
    '.paidimg{display:block;width:84px;height:84px;margin:8px 14px 0 auto;transform:rotate(-7deg);opacity:.9}',
    '.stamp{margin:10px 0 0 auto;width:max-content;border:2px solid #1e6b46;color:#1e6b46;padding:2px 16px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;font-size:12px;transform:rotate(-4deg);border-radius:3px}',
    '.words{font-size:11px;color:#3d474b;margin-top:10px;line-height:1.4}',
    '.pays{margin-top:18px}.ptab th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.03em;color:#3d474b;background:#f2f5f6;padding:6px;border-bottom:1px solid #cfd6d9}',
    '.ptab th.r{text-align:right}.ptab td{padding:6px;border-bottom:1px solid #eef1f2}',
    '.member{margin-top:16px;display:flex;flex-wrap:wrap;gap:6px 22px;padding:9px 14px;border-left:3px solid #156b82;background:#f0f6f8;color:#3d474b}.member>b{color:#156b82}',
    '.decl{margin-top:16px}.decl p{margin:0;font-size:10.5px;color:#52606a;line-height:1.5}',
    '.sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:22px;font-size:11px;color:#3d474b}',
    '.sign{align-items:end}.sign .line{border-top:1px solid #1d2326;margin:4px 0 5px;height:0}.sign .r{text-align:right}.sign .sig{display:block;width:230px;max-width:100%;height:auto;margin:0 0 0 auto}.sign small{display:block;color:#8a9499;margin-top:2px}',
    '.foot{margin-top:24px;padding-top:12px;border-top:1px solid #cfd6d9;text-align:center;font-size:10.5px;color:#66737a;line-height:1.6}',
    '.foot .gen{color:#8a9499}.foot .thanks{margin-top:6px;font-size:12.5px;color:#156b82;font-weight:600}',
    '.toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px max(16px,env(safe-area-inset-left,0px));background:#1d2326;color:#fff;font-weight:600}',
    '.toolbar button{font:inherit;font-size:13px;border:0;border-radius:6px;padding:8px 14px;background:#156b82;color:#fff;cursor:pointer;margin-left:6px}.toolbar .tb-share,.toolbar .tb-print{background:#3d474b}',
    '@media (max-width:700px){.sheet{margin:0;padding:20px 16px;box-shadow:none}.top{grid-template-columns:1fr auto}.doc{grid-column:1/-1}.parties,.split{grid-template-columns:1fr}',
    '.qr-svg{width:96px;height:96px}.lines{font-size:11.5px}.lines th:nth-child(1),.lines td:nth-child(1),.lines th:nth-child(6),.lines td:nth-child(6){display:none}.sign{gap:18px}}',
    '@media print{' + PRINT + '@page{size:A4;margin:9mm 10mm}}'
  ].join('');

  /* ---- Booking statement for a no-show ----
     One page for the guest: what the booking was, the advance we received, the balance that would have been paid at check-in,
     and that the advance is kept under the cancellation policy. It is a statement and a receipt for the advance, not a tax invoice.
     d: { no, date, closed, guest:{name,phone,email}, checkin, checkout, nights, rooms:[..], roomType, guests, rate, total,
          payments:[{date,method,ref,amount}], paid, refunded, policy } */
  function noShowHTML(d, opt) {
    opt = opt || {};
    var g = d.guest || {}, paid = Number(d.paid || 0), back = Number(d.refunded || 0), kept = Math.max(0, paid - back), total = Number(d.total || 0), bal = Math.max(0, total - paid);
    var nr = (d.rooms || []).length || 1; if (!d.roomType || /^any$/i.test(d.roomType)) d.roomType = 'Room';
    var pays = (d.payments || []).map(function (p) {
      return '<tr><td>' + day(p.date) + '</td><td>' + (Number(p.amount) < 0 ? 'Refund to guest' : 'Advance received') + '</td><td>' + esc(p.method || '') + '</td><td class="mono">' + esc(p.ref || '—') + '</td><td class="r">' + num(Number(p.amount)) + '</td></tr>';
    }).join('');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="noindex,nofollow"><title>Booking statement ' + esc(d.no) + ' · ' + HOTEL.name + '</title>' +
      '<style>' + CSS + (opt.pdf ? PRINT : '') + '.top{grid-template-columns:1fr 1.25fr!important}.ns{margin-top:16px;border:1.5px solid #c0262d;background:#fdf0f0;padding:12px 14px;color:#3d474b;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}.ns b{color:#c0262d}.ns .big{font-size:14px;font-weight:800;color:#c0262d;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}.srow.kept{font-weight:800;color:#c0262d}</style></head><body' + (opt.pdf ? ' class="pdf"' : '') + '>' +
      (opt.toolbar ? '<div class="toolbar"><span>Booking statement ' + esc(d.no) + '</span><span class="tb-btns"><button type="button" onclick="if(window.nikadiPdf){window.nikadiPdf(this)}else{window.print()}">Download PDF</button><button type="button" class="tb-print" onclick="window.print()">Print</button></span></div>' : '') + '<div class="sheet">' +
      '<img class="wm" src="' + esc(opt.logo || HOTEL.logo) + '" alt="" aria-hidden="true">' +
      '<header class="top"><div class="brand"><img class="logo" src="' + esc(opt.logo || HOTEL.logo) + '" alt="' + HOTEL.name + '" width="150"></div>' +
        '<div class="doc"><h1>BOOKING STATEMENT</h1><div class="orig">No-show · advance receipt</div><table class="kv">' +
          kv('Booking No.', '<b class="mono">' + esc(d.no) + '</b>') + kv('Statement Date', day(d.date)) + kv('Booked Arrival', day(d.checkin)) + kv('Booked Departure', day(d.checkout)) +
          kv('Rooms', esc(nr + ' × ' + (d.roomType || 'room') + ((d.rooms || []).length ? ' (No. ' + d.rooms.join(', ') + ')' : ''))) + kv('Guests (Pax)', d.guests) +
        '</table></div></header>' +
      '<section class="parties"><div class="party"><div class="lbl">Booked by</div><div class="who">' + esc(g.name || '') + '</div>' +
          (g.phone ? '<div>Mobile: ' + esc(g.phone) + '</div>' : '') + (g.email ? '<div>Email: ' + esc(g.email) + '</div>' : '') + '</div>' +
        '<div class="party"><div class="lbl">Guest house</div><div class="who">' + HOTEL.company + '</div><div>' + HOTEL.name + '</div>' +
          HOTEL.address.map(function (l) { return '<div>' + l + '</div>'; }).join('') + '<div>' + HOTEL.phone + ' · ' + HOTEL.email + '</div>' +
          '<table class="kv sm">' + kv('GSTIN', '<span class="mono">' + HOTEL.gstin + '</span>') + '</table></div></section>' +
      '<div class="tbl-wrap"><table class="lines"><thead><tr><th>Booking</th><th class="c">Nights</th><th class="c">Rooms</th><th class="r">Rate per night (₹)</th><th class="r">Amount (₹)</th></tr></thead><tbody>' +
        '<tr><td><b>Room accommodation, as booked</b><small>' + esc(d.roomType || '') + ' · ' + day(d.checkin) + ' to ' + day(d.checkout) + '</small></td><td class="c">' + d.nights + '</td><td class="c">' + nr + '</td><td class="r">' + num(Number(d.rate || 0)) + '</td><td class="r">' + num(total) + '</td></tr>' +
        '</tbody><tfoot><tr><td colspan="4">Booking total (inclusive of GST)</td><td class="r">' + num(total) + '</td></tr></tfoot></table></div>' +
      '<div class="split"><div>' +
        (pays ? '<div class="lbl">Payments on this booking</div><table class="ptab"><thead><tr><th>Date</th><th>Details</th><th>Method</th><th>Reference</th><th class="r">Amount (₹)</th></tr></thead><tbody>' + pays + '</tbody></table>' : '') +
        '<div class="ns"><div class="big">No-show</div>The guest did not arrive on the booked check-in date' + (d.closed ? ' and the booking was closed on <b>' + day(d.closed) + '</b>' : '') + '. ' +
          'As per the cancellation policy of ' + HOTEL.name + ', the advance of <b>' + inr(kept) + '</b> is <b>not refundable</b>. ' +
          'The balance of ' + inr(bal) + ' that would have been paid at check-in is no longer payable.' +
          (d.policy ? '<div style="margin-top:6px;font-size:11px">Policy: ' + esc(d.policy) + '</div>' : '') + '</div>' +
      '</div><div class="totals">' +
        '<div class="srow"><span>Booking total</span><span>' + inr(total) + '</span></div>' +
        '<div class="srow"><span>Advance received</span><span>' + inr(paid) + '</span></div>' +
        (back > 0 ? '<div class="srow"><span>Refunded to guest</span><span>' + inr(-back) + '</span></div>' : '') +
        '<div class="srow tot"><span>Balance at check-in</span><span>' + inr(bal) + '</span></div>' +
        '<div class="srow"><span>Balance now payable</span><span>' + inr(0) + '</span></div>' +
        '<div class="srow bal kept"><span>Advance kept (not refundable)</span><span>' + inr(kept) + '</span></div>' +
        '<div class="words">Advance kept: Rupees ' + words(Math.round(kept)) + ' only</div>' +
      '</div></div>' +
      '<div class="decl"><p>This is a statement of the booking and a receipt for the advance received. It is not a tax invoice. For any question, please call or WhatsApp ' + HOTEL.phone + '.</p></div>' +
      '<div class="foot">' + HOTEL.name + ' · a unit of ' + HOTEL.company + ' · ' + HOTEL.address.join(', ') + '<br>' + HOTEL.phone + ' · ' + HOTEL.email + ' · ' + HOTEL.web +
        '<div class="thanks">We hope to welcome you in Sri Dham Mayapur another time.</div></div>' +
      '</div></body></html>';
  }

  /* Email body: plain tables + inline styles so it looks right in Gmail and Outlook. The PDF bill is attached. */
  function billEmail(d) {
    var c = compute(d), g = d.guest || {}, m = d.member, paid = Math.abs(c.due) < .5;
    function p(t, st) { return '<tr><td style="padding:0 30px 14px;font-size:15px;color:#263034;line-height:1.65' + (st || '') + '">' + t + '</td></tr>'; }
    function row(a, b, strong) { return '<tr><td style="padding:7px 0;color:#4a5458;font-size:14px' + (strong ? ';font-weight:700;color:#1d2326' : '') + '">' + a + '</td><td align="right" style="padding:7px 0;font-size:14px;color:#1d2326' + (strong ? ';font-weight:700' : '') + '">' + b + '</td></tr>'; }
    return '<div style="background:#eef1f2;padding:28px 12px;font-family:Helvetica,Arial,sans-serif">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-top:4px solid #156b82">' +
      '<tr><td style="padding:28px 30px 18px"><img src="' + HOTEL.logo + '" width="130" alt="' + HOTEL.name + '" style="display:block;border:0"></td></tr>' +
      p('Dear ' + esc(greetName(g)) + ',') +
      p('Hare Krishna! 🙏') +
      p('Thank you so much for choosing Nikadi Guest House for your stay in Sri Dham Mayapur. It was a real pleasure to have you with us, and we hope your days in the Dham were peaceful and full of blessings.') +
      p('Your bill is attached to this email as a PDF.') +
      '<tr><td style="padding:4px 30px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #dfe6e8;border-bottom:1px solid #dfe6e8">' +
        row('Tax invoice', '<span style="font-family:Menlo,Consolas,monospace">' + esc(d.no) + '</span>') +
        row('Stay', 'Room ' + esc(d.room.no) + ' · ' + day(d.checkin) + ' – ' + day(d.checkout)) +
        (c.disc ? row('You saved', inr(c.disc)) : '') +
        row('Total (incl. GST)', inr(c.total), true) +
        row(paid ? 'Payment' : c.due > 0 ? 'Balance due' : 'To be refunded to you', paid ? 'Paid in full ✓' : inr(Math.abs(c.due)), true) +
      '</table></td></tr>' +
      (m && m.earned ? p('As our ' + esc(m.level) + ' member, you earned <b>' + m.earned + ' points</b> on this stay' + (m.balance != null ? ' and now have <b>' + grp(String(m.balance)) + ' points</b>' : '') + '. Thank you for being part of the Nikadi family.') : '') +
      p('Whenever the Dham calls you back, we will be happy to welcome you again.') +
      '<tr><td style="padding:4px 30px 18px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#156b82;border-radius:6px"><a href="' + HOTEL.review + '" style="display:inline-block;padding:11px 20px;color:#ffffff;font-weight:bold;text-decoration:none;font-size:14px">⭐ Share your stay on Google</a></td></tr></table><div style="font-size:13px;color:#66737a;padding-top:8px">A few words from you help other devotees find us. It takes less than a minute.</div></td></tr>' +
      p('With warm regards,<br><b>Team Nikadi Guest House</b><br>' + HOTEL.phone, ';padding-bottom:22px') +
      (d.url ? '<tr><td style="padding:0 30px 24px;font-size:13px;color:#66737a">You can also <a href="' + esc(d.url) + '" style="color:#156b82">view your bill online</a>.</td></tr>' : '') +
      '<tr><td style="padding:16px 30px 24px;border-top:1px solid #eef1f2;font-size:11.5px;color:#7d8a8e;line-height:1.6">' + HOTEL.company + ' · GSTIN ' + HOTEL.gstin + '<br>' + HOTEL.address.join(', ') + '<br>' + HOTEL.web + '</td></tr>' +
      '</table></div>';
  }
  function billEmailSubject(d) { return 'Thank you for staying with us · Your bill ' + d.no + ' · Nikadi Guest House'; }

  /* WhatsApp message sent together with the PDF bill. opt.link adds the online link (when the PDF can't be attached). */
  function billWhatsApp(d, opt) {
    opt = opt || {};
    var c = compute(d), g = d.guest || {}, m = d.member, paid = Math.abs(c.due) < .5;
    return 'Dear ' + greetName(g) + ',\n\n' +
      'Hare Krishna! 🙏\n\n' +
      'Thank you so much for staying with us at *Nikadi Guest House*. It was a real pleasure to have you, and we hope your time in Sri Dham Mayapur was peaceful and full of blessings.\n\n' +
      (opt.link ? 'Here is your bill:\n' : 'Your bill is attached as a PDF:\n') +
      '*Tax Invoice ' + d.no + '*\n' +
      'Total ' + inr(c.total) + ' (incl. GST) · ' + (paid ? 'Paid in full ✅' : c.due > 0 ? 'Balance due ' + inr(c.due) : 'To be refunded ' + inr(-c.due)) + '\n' +
      (opt.link && d.url ? d.url + '\n' : '') +
      (m && m.earned ? '\n⭐ As our ' + m.level + ' member, you earned ' + m.earned + ' points on this stay' + (m.balance != null ? '. Your balance is now ' + grp(String(m.balance)) + ' points' : '') + '.\n' : '') +
      '\n⭐ If you enjoyed your stay, a short Google review helps other devotees find us: ' + HOTEL.review + '\n' +
      '\nWhenever the Dham calls you back, we will be happy to welcome you again.\n\n' +
      'With warm regards,\nTeam Nikadi Guest House\n' + HOTEL.phone;
  }

  root.NikadiBill = { noShowHTML: noShowHTML, billHTML: billHTML, billEmail: billEmail, billEmailSubject: billEmailSubject, greetName: greetName, TITLES: TITLES, billWhatsApp: billWhatsApp, compute: compute, words: words, inr: inr, HOTEL: HOTEL, ROOM_HSN: ROOM_HSN, ROOM_GST: ROOM_GST };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.NikadiBill;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);

/* ------------------------------------------------------------------ */
/* Google Sheet storage for the staff app                              */
/* ------------------------------------------------------------------ */

function deskDb_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), cache = {};
  var checked = {}, rowOk = {};
  function sh(t) {
    var def = DESK_SCHEMA[t], s = ss.getSheetByName(def.sheet);
    if (!s) {
      if (t !== 'bills' && t !== 'billpdfs' && !def.lazy) throw new Error('not_setup');
      s = ss.insertSheet(def.sheet); s.appendRow(def.cols.map(function (c) { return c[1]; }));
      s.getRange(1, 1, 1, def.cols.length).setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a'); s.setFrozenRows(1);
      def.cols.forEach(function (c, j) { if (c[2] === 's') s.getRange(1, j + 1, s.getMaxRows(), 1).setNumberFormat('@'); });
      if (def.hidden) s.hideSheet();
    }
    if (!checked[t]) { // add headings for columns added in newer versions
      checked[t] = true;
      var have = s.getLastColumn();
      if (have < def.cols.length) {
        s.getRange(1, have + 1, 1, def.cols.length - have).setValues([def.cols.slice(have).map(function (c) { return c[1]; })])
          .setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a');
        def.cols.forEach(function (c, j) { if (j >= have && c[2] === 's') s.getRange(1, j + 1, s.getMaxRows(), 1).setNumberFormat('@'); });
      }
    }
    return s;
  }
  function read(v, type) {
    if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kolkata', type === 'd' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm');
    if (type === 'n') return v === '' || v == null ? 0 : Number(v);
    return v == null ? '' : String(v);
  }
  function colIndex(t, key) {
    var c = DESK_SCHEMA[t].cols;
    for (var j = 0; j < c.length; j++) if (c[j][0] === key) return j;
    return -1;
  }
  return {
    all: function (t) {
      if (cache[t]) return cache[t];
      var hit = deskTblGet_(t); if (hit) return (cache[t] = hit);
      var ver = deskTblVer_(t);
      var s = sh(t), c = DESK_SCHEMA[t].cols, n = s.getLastRow(), out = [];
      if (n > 1) s.getRange(2, 1, n - 1, c.length).getValues().forEach(function (r, i) {
        var o = { _r: i + 2 };
        c.forEach(function (col, j) { o[col[0]] = read(r[j], col[2]); });
        out.push(o);
      });
      cache[t] = out;
      deskTblPut_(t, ver, out);
      return out;
    },
    add: function (t, o) {
      var s = sh(t), c = DESK_SCHEMA[t].cols;
      this.all(t);
      s.appendRow(c.map(function (col) { var v = o[col[0]]; return v === undefined ? '' : v; }));
      o._r = s.getLastRow();
      SpreadsheetApp.flush(); deskTblBump_(t); // new version only once the Sheet really has the row
      cache[t].push(o);
      return o;
    },
    set: function (t, o, patch) {
      if (o._old) throw new Error('old_record'); // records in the archive Sheet are read-only
      var s = sh(t);
      if (!rowOk[t + o._r]) { // rows can move if someone deletes a row in the Sheet: check the row still holds this record
        var k0 = DESK_SCHEMA[t].cols[0], got = read(s.getRange(o._r, 1).getValue(), k0[2]);
        if (String(got) !== String(o[k0[0]])) {
          var col = s.getRange(2, 1, Math.max(1, s.getLastRow() - 1), 1).getValues(), at = -1;
          for (var i = 0; i < col.length; i++) if (String(read(col[i][0], k0[2])) === String(o[k0[0]])) { at = i + 2; break; }
          if (at < 0) throw new Error('busy_retry');
          o._r = at;
        }
        rowOk[t + o._r] = true;
      }
      Object.keys(patch).forEach(function (k) {
        var j = colIndex(t, k); if (j < 0) return;
        o[k] = patch[k];
        s.getRange(o._r, j + 1).setValue(patch[k]);
      });
      SpreadsheetApp.flush(); deskTblBump_(t);
    },
    /* move old records to the archive Sheet (checked row by row first; then removed from this Sheet) */
    moveOut: function (t, rows) {
      if (!rows || !rows.length) return 0;
      var s = sh(t), c = DESK_SCHEMA[t].cols, n = s.getLastRow();
      var now = n > 1 ? s.getRange(2, 1, n - 1, c.length).getValues() : [];
      var ok = rows.every(function (o) {
        var r = now[o._r - 2]; if (!r) return false;
        return c.every(function (col, j) { return String(read(r[j], col[2])) === String(o[col[0]] == null ? '' : o[col[0]]); });
      });
      if (!ok) { deskTblBump_(t); cache[t] = null; return 0; } // the Sheet changed under us: try again next night
      var arch = deskArchiveTab_(t);
      arch.getRange(arch.getLastRow() + 1, 1, rows.length, c.length).setValues(rows.map(function (o) { return c.map(function (col) { var v = o[col[0]]; return v == null ? '' : v; }); }));
      SpreadsheetApp.flush();
      var nums = rows.map(function (o) { return o._r; }).sort(function (a, b) { return b - a; });
      for (var i = 0; i < nums.length;) { // delete runs of rows from the bottom up
        var end = nums[i], start = end; i++;
        while (i < nums.length && nums[i] === start - 1) { start = nums[i]; i++; }
        s.deleteRows(start, end - start + 1);
      }
      SpreadsheetApp.flush(); deskTblBump_(t); cache[t] = null;
      return rows.length;
    },
    /* look up one record in the archive Sheet by its first column (e.g. an old bill opened from its QR code) */
    findOld: function (t, key, field) {
      var id = PropertiesService.getScriptProperties().getProperty('ARCHIVE_SS'); if (!id || !key) return null;
      try {
        var tab = SpreadsheetApp.openById(id).getSheetByName(DESK_SCHEMA[t].sheet); if (!tab) return null;
        var j0 = field ? colIndex(t, field) : 0; if (j0 < 0) return null;
        var hits = tab.getRange(1, j0 + 1, tab.getLastRow(), 1).createTextFinder(String(key)).matchEntireCell(true).findAll(); if (!hits.length) return null;
        var hit = hits[hits.length - 1];
        var c = DESK_SCHEMA[t].cols, r = tab.getRange(hit.getRow(), 1, 1, c.length).getValues()[0], o = {};
        c.forEach(function (col, j) { o[col[0]] = read(r[j], col[2]); });
        o._old = true;
        return o;
      } catch (e) { return null; }
    },
    kvGet: function (k) { return CacheService.getScriptCache().get('desk_' + k); },
    kvSet: function (k, v, sec) { CacheService.getScriptCache().put('desk_' + k, String(v), sec || 600); }
  };
}

/* ---- fast reads: each table is kept in the script cache (in pieces) and re-read from the Sheet only after a change ----
   Every write gives the table a new version, so a stale copy is never used. Edits made by hand in the Sheet clear it (onEdit),
   and "Nikadi → Refresh staff app data" clears everything. */
var DESK_NOCACHE_ = { billpdfs: 1 };
function deskTblVer_(t) {
  var c = CacheService.getScriptCache(), v = c.get('dv_' + t);
  if (!v) { v = String(Date.now()) + Math.floor(Math.random() * 1e6); c.put('dv_' + t, v, 21600); }
  return v;
}
function deskTblBump_(t) { try { CacheService.getScriptCache().put('dv_' + t, String(Date.now()) + Math.floor(Math.random() * 1e6), 21600); } catch (e) {} }
function deskTblKey_(t, v) { return 'dt_' + t + '_' + DESK_SCHEMA[t].cols.length + '_' + v; }
function deskTblGet_(t) {
  if (DESK_NOCACHE_[t]) return null;
  try {
    var c = CacheService.getScriptCache(), v = c.get('dv_' + t); if (!v) return null;
    var k = deskTblKey_(t, v), head = c.get(k); if (!head) return null;
    var n = Number(head), keys = []; for (var i = 0; i < n; i++) keys.push(k + '_' + i);
    var got = n ? c.getAll(keys) : {}, txt = '';
    for (var j = 0; j < n; j++) { if (got[keys[j]] == null) return null; txt += got[keys[j]]; }
    return n ? JSON.parse(txt) : [];
  } catch (e) { return null; }
}
function deskTblPut_(t, v, rows) {
  if (DESK_NOCACHE_[t]) return;
  try {
    var txt = JSON.stringify(rows), size = 90000, parts = {}, k = deskTblKey_(t, v), n = Math.ceil(txt.length / size);
    if (txt.length > 2400000) return;
    for (var i = 0; i < n; i++) parts[k + '_' + i] = txt.slice(i * size, (i + 1) * size);
    var c = CacheService.getScriptCache();
    if (n) c.putAll(parts, 21600);
    c.put(k, String(n), 21600);
  } catch (e) {}
}
/* a hand edit in the Sheet: forget the cached copy of that tab */
function deskSheetEdited_(sheetName) {
  Object.keys(DESK_SCHEMA).forEach(function (t) { if (!sheetName || DESK_SCHEMA[t].sheet === sheetName) deskTblBump_(t); });
}
function deskRefreshData() { deskSheetEdited_(''); SpreadsheetApp.getActive().toast('Staff app will read the Sheet fresh now.'); }

/* The archive Sheet: "Nikadi Records Archive" in the Nikadi Guest House Records folder, same tab names as this Sheet. */
function deskArchiveSS_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('ARCHIVE_SS'), ss = null;
  if (id) try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  if (!ss) {
    ss = SpreadsheetApp.create('Nikadi Records Archive');
    try { DriveApp.getFileById(ss.getId()).moveTo(deskArchiveRoot_()); } catch (e) {}
    p.setProperty('ARCHIVE_SS', ss.getId());
  }
  return ss;
}
function deskArchiveTab_(t) {
  var ss = deskArchiveSS_(), def = DESK_SCHEMA[t], tab = ss.getSheetByName(def.sheet);
  if (!tab) {
    tab = ss.insertSheet(def.sheet); tab.getRange(1, 1, 1, def.cols.length).setValues([def.cols.map(function (c) { return c[1]; })]).setFontWeight('bold'); tab.setFrozenRows(1);
    def.cols.forEach(function (c, j) { if (c[2] === 's') tab.getRange(1, j + 1, tab.getMaxRows(), 1).setNumberFormat('@'); });
    var first = ss.getSheetByName('Sheet1'); if (first && ss.getSheets().length > 1) ss.deleteSheet(first);
  }
  return tab;
}
/** Sheet menu "Nikadi → Move old records to the archive now" (also runs by itself every night). */
function deskArchiveNow() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var r = deskTimerCore_()._archiveOld({ force: true }), m = r.moved || {}, n = Object.keys(m).reduce(function (a, k) { return a + m[k]; }, 0);
    try { SpreadsheetApp.getActive().toast(n ? n + ' old records moved to "Nikadi Records Archive".' : 'Nothing old enough to move yet (kept: the last ' + 13 + ' months).'); } catch (e) {}
    return r;
  } finally { lock.releaseLock(); }
}

/** Called by doPost in Code.gs for every action that starts with "desk". */
function deskHandle_(req) {
  var name = String(req.action).slice(4);
  name = name.charAt(0).toLowerCase() + name.slice(1);
  var clean = {};
  Object.keys(req).forEach(function (k) { if (k.charAt(0) !== '_') clean[k] = req[k]; }); // private flags only from inside the script
  var api = deskCore(deskDb_(), { onCheckout: typeof memberStayPoints_ === 'function' ? memberStayPoints_ : null,
    memberInfo: typeof memberDesk_ === 'function' ? memberDesk_ : null,
    membersAll: typeof membersAdmin_ === 'function' ? membersAdmin_ : null,
    hash: typeof hash_ === 'function' ? hash_ : null,
    memberHistory: typeof history_ === 'function' ? function (ph) { return history_(String(ph), 300); } : null,
    memberTxAll: typeof history_ === 'function' ? function () { return history_(null, 200000); } : null,
    onStayChange: typeof memberStayAdjust_ === 'function' ? memberStayAdjust_ : null,
    onCheckoutUndo: typeof memberCheckoutUndo_ === 'function' ? memberCheckoutUndo_ : null,
    newId: function () { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); },
    waReady: deskWaReady_, waInfo: deskWaInfo_, waSave: deskWaSave_, waSend: deskWaSend_, claim: typeof nkClaim_ === 'function' ? nkClaim_ : null,
    savePhoto: deskSavePhoto_, getPhoto: deskGetPhoto_, stayFolder: deskStayFolder_, trashFile: deskTrash_,
    changeLog: typeof nkChangeLog_ === 'function' && typeof CTX !== 'undefined' && CTX ? nkChangeLog_ : null,
    sendBill: deskSendBill_, ownBillFile: deskOwnBillFile_, laundryFile: deskLaundryFile_, alert: typeof nkAlert_ === 'function' ? nkAlert_ : null, waReply: typeof waStaffReply_ === 'function' && typeof ycReady_ === 'function' && ycReady_() ? waStaffReply_ : null });
  if (name.charAt(0) === '_' || !api.hasOwnProperty(name)) throw new Error('unknown_action');
  var out = api[name](clean);
  if (typeof DESK_NO_LOCK_ !== 'undefined' && DESK_NO_LOCK_) return out; // read-only call without the lock: leave the bill timer to locked calls
  try { // send bills that are due (at most every 10 minutes), so emails go out even without the timer
    var c = CacheService.getScriptCache();
    var now1 = /^(checkIn|bookingConfirm|bookingCheckIn)$/.test(name); // check-in / booking confirmed: the WhatsApp welcome goes out right away
    if (now1 || !c.get('desk_due_check')) { c.put('desk_due_check', '1', 120); api._sendDue({ waOnly: true }); } // only quick WhatsApp messages here; bills go by the 15-minute timer
  } catch (e) {}
  return out;
}

/** Timer: emails bills 12 hours after check-out. Set in Apps Script → Triggers → sendDueBills → Time-driven → every 15 minutes. */
function sendDueBills() {
  if (PropertiesService.getScriptProperties().getProperty('NK_LIVE') === '1') { // the new server does the bills now: only the weekly backup here
    var h0 = +Utilities.formatDate(new Date(), 'Asia/Kolkata', 'H'), d0 = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'u');
    if (h0 >= 3 && h0 < 5 && d0 === '7') try { deskWeeklyBackup_(); } catch (e) { deskAlert_('Weekly backup failed', e); }
    return;
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    var core = deskTimerCore_();
    try { core._sendDue({ archive: true, limit: 8 }); } catch (e) { deskAlert_('Bills / WhatsApp timer failed', e); }
    var h = +Utilities.formatDate(new Date(), 'Asia/Kolkata', 'H'), dow = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'u');
    if (h >= 2 && h < 5) try { core._archiveOld(); } catch (e) { deskAlert_('Night archive of old records failed', e); } // once a night: move old records out so the app stays fast
    if (h >= 3 && h < 5 && dow === '7') try { deskWeeklyBackup_(); } catch (e) { deskAlert_('Weekly backup failed', e); } // Sunday night
  } finally { lock.releaseLock(); }
}

function deskAlert_(subject, e) { console.error(subject, e); if (typeof nkAlert_ === 'function') nkAlert_(subject, typeof nkErr_ === 'function' ? nkErr_(e) : String(e)); }
/** Weekly backup (Sunday night, or menu "Nikadi → Back up now"): a full copy of this Sheet in
    Drive "Nikadi Guest House Records / Backups", named with the date. The last 8 copies are kept. */
function deskWeeklyBackup_(force) {
  var p = PropertiesService.getScriptProperties(), day = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  if (!force && p.getProperty('LAST_BACKUP') === day) return '';
  var folder = deskCachedFolder_('ARCH_BACKUPS', function () { return deskChild_(deskArchiveRoot_(), 'Backups'); });
  var ss = SpreadsheetApp.getActiveSpreadsheet(), copy = DriveApp.getFileById(ss.getId()).makeCopy('Nikadi backup ' + day + ' · ' + ss.getName(), folder);
  p.setProperty('LAST_BACKUP', day);
  var all = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); if (/^Nikadi backup /.test(f.getName())) all.push(f); }
  all.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  all.slice(8).forEach(function (f) { try { f.setTrashed(true); } catch (e) {} });
  return copy.getUrl();
}
function deskBackupNow() {
  var url = deskWeeklyBackup_(true);
  try { SpreadsheetApp.getActive().toast('Backup saved in Drive → Nikadi Guest House Records → Backups.'); } catch (e) {}
  return url;
}
function deskTimerCore_() {
  return deskCore(deskDb_(), { sendBill: deskSendBill_, waReady: deskWaReady_, waSend: deskWaSend_, claim: typeof nkClaim_ === 'function' ? nkClaim_ : null, alert: typeof nkAlert_ === 'function' ? nkAlert_ : null,
    memberInfo: typeof memberDesk_ === 'function' ? memberDesk_ : null,
    membersAll: typeof membersAdmin_ === 'function' ? membersAdmin_ : null,
    hash: typeof hash_ === 'function' ? hash_ : null,
    memberHistory: typeof history_ === 'function' ? function (ph) { return history_(String(ph), 300); } : null,
    memberTxAll: typeof history_ === 'function' ? function () { return history_(null, 200000); } : null,
    archive: deskArchive_, stayFolder: deskStayFolder_, trashFile: deskTrash_, laundryFile: deskLaundryFile_ });
}

/* ---------------- WhatsApp (Meta WhatsApp Cloud API) ----------------
   The owner saves the Phone number ID and a permanent access token in the staff app (Settings → WhatsApp).
   They are kept in this script's private Script Properties, not in the sheet. */
var WA_API = 'https://graph.facebook.com/v21.0/';
function deskWaProps_() { var p = PropertiesService.getScriptProperties(); return { phoneId: p.getProperty('WA_PHONE_ID') || '', token: p.getProperty('WA_TOKEN') || '' }; }
function deskWaReady_() { if (typeof ycReady_ === 'function' && ycReady_()) return true; var w = deskWaProps_(); return !!(w.phoneId && w.token); }
function deskWaInfo_() { var w = deskWaProps_(); return { phoneId: w.phoneId, hasToken: !!w.token }; }
function deskWaSave_(o) {
  var p = PropertiesService.getScriptProperties();
  if (o.clear) { p.deleteProperty('WA_PHONE_ID'); p.deleteProperty('WA_TOKEN'); return; }
  if (o.phoneId) { if (!/^\d{6,30}$/.test(o.phoneId)) throw new Error('bad_phone_id'); p.setProperty('WA_PHONE_ID', o.phoneId); }
  if (o.token) { if (o.token.length < 40) throw new Error('bad_token'); p.setProperty('WA_TOKEN', o.token); }
}
function deskWaCall_(path, opts) {
  var w = deskWaProps_();
  opts = opts || {}; opts.headers = { Authorization: 'Bearer ' + w.token }; opts.muteHttpExceptions = true;
  var r = UrlFetchApp.fetch(WA_API + path, opts), j = {};
  try { j = JSON.parse(r.getContentText()); } catch (e) {}
  if (r.getResponseCode() >= 300 || j.error) throw new Error('WhatsApp: ' + (j.error ? (j.error.error_user_msg || j.error.message || '') + (j.error.code ? ' (' + j.error.code + ')' : '') : 'HTTP ' + r.getResponseCode()));
  return j;
}
/** Sends an approved template. params fill {{1}}, {{2}}… in the body; pdf (base64) goes as the document header. */
function deskWaSend_(template, to10, params, pdf, fileName, url, lang) {
  if (typeof ycReady_ === 'function' && ycReady_()) return ycDeskSend_(template, to10, params, pdf, fileName, url, lang); // YCloud (same number as the phone app)
  var w = deskWaProps_(); if (!w.phoneId || !w.token) throw new Error('wa_not_connected');
  var comps = [];
  if (pdf) {
    var blob = Utilities.newBlob(Utilities.base64Decode(pdf), 'application/pdf', fileName || 'bill.pdf');
    var media = deskWaCall_(w.phoneId + '/media', { method: 'post', payload: { file: blob, type: 'application/pdf', messaging_product: 'whatsapp' } });
    comps.push({ type: 'header', parameters: [{ type: 'document', document: { id: media.id, filename: fileName || 'bill.pdf' } }] });
  } else if (template === 'nikadi_bill') throw new Error('no_pdf');
  if (params && params.length) comps.push({ type: 'body', parameters: params.map(function (t) { return { type: 'text', text: String(t) }; }) });
  var body = { messaging_product: 'whatsapp', to: phoneIntl_(to10).slice(1), type: 'template',
    template: { name: template, language: { code: lang || 'en' }, components: comps } };
  var j = deskWaCall_(w.phoneId + '/messages', { method: 'post', contentType: 'application/json', payload: JSON.stringify(body) });
  return j.messages && j.messages[0] ? j.messages[0].id : '';
}

/* ---------------- Expense bill photos: kept in Google Drive, folder "Nikadi Expense Bills" / month ---------------- */
function deskPhotoFolder_(month, rootName) {
  rootName = rootName || 'Nikadi Expense Bills';
  var root, it = DriveApp.getFoldersByName(rootName);
  root = it.hasNext() ? it.next() : DriveApp.createFolder(rootName);
  var m = root.getFoldersByName(month);
  return m.hasNext() ? m.next() : root.createFolder(month);
}
function deskSavePhoto_(b64, name, month, rootName, folderId) {
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', name);
  var folder = folderId ? DriveApp.getFolderById(folderId) : deskPhotoFolder_(month, rootName);
  return folder.createFile(blob).getId(); // files stay private to the owner's Drive
}
function deskGetPhoto_(fileId) {
  var f = DriveApp.getFileById(fileId);
  return 'data:' + (f.getMimeType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(f.getBlob().getBytes());
}
/* ---------------- Permanent stay records in Google Drive ----------------
   Nikadi Guest House Records / 2026 / 11 November / 17 Nov 2026 / Room 3 · Guest · 5 nights
     Stay details – Room 3.pdf · Bill NGH-26-27-0001.pdf · ID · Person 1 front · Guest.jpg …
   18, 19, 20, 21 Nov get a shortcut: "Room 3 · Guest · night 2 of 5 → … saved in 17 Nov 2026".
   Every day of a month gets its folder when the month is first used. */
var DESK_ARCHIVE_ROOT = 'Nikadi Guest House Records';
var DESK_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function deskLive_(id) { try { var f = DriveApp.getFolderById(id); return f.isTrashed() ? null : f; } catch (e) { return null; } }
function deskChild_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function deskCachedFolder_(key, make) {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty(key), f = id ? deskLive_(id) : null;
  if (!f) { f = make(); p.setProperty(key, f.getId()); }
  return f;
}
function deskArchiveRoot_() {
  return deskCachedFolder_('ARCH_ROOT', function () { var it = DriveApp.getFoldersByName(DESK_ARCHIVE_ROOT); return it.hasNext() ? it.next() : DriveApp.createFolder(DESK_ARCHIVE_ROOT); });
}
function deskDayFolder_(ymd) {
  var y = ymd.slice(0, 4), m = +ymd.slice(5, 7), d = +ymd.slice(8, 10);
  var month = deskCachedFolder_('ARCH_M_' + ymd.slice(0, 7), function () {
    var mf = deskChild_(deskCachedFolder_('ARCH_Y_' + y, function () { return deskChild_(deskArchiveRoot_(), y); }), (m < 10 ? '0' : '') + m + ' ' + DESK_MONTHS[m - 1]);
    var days = new Date(+y, m, 0).getDate(), have = {}, it = mf.getFolders();
    while (it.hasNext()) have[it.next().getName()] = 1;
    for (var i = 1; i <= days; i++) { var n = deskDayName_(y, m, i); if (!have[n]) mf.createFolder(n); } // 01 Nov 2026 … 30 Nov 2026
    return mf;
  });
  return deskCachedFolder_('ARCH_D_' + ymd, function () { return deskChild_(month, deskDayName_(y, m, d)); });
}
function deskDayName_(y, m, d) { return (d < 10 ? '0' : '') + d + ' ' + DESK_MONTHS[m - 1].slice(0, 3) + ' ' + y; }
function deskTrash_(id) { if (id) try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
/** The stay's own folder, filed under its check-in day (moved if the check-in date changed, renamed if the name changed). */
function deskStayFolder_(rec, oldId) {
  var day = deskDayFolder_(rec.checkin), f = oldId ? deskLive_(oldId) : null;
  if (!f) return day.createFolder(rec.folderName).getId();
  var parents = f.getParents(), inDay = false;
  while (parents.hasNext()) if (parents.next().getId() === day.getId()) inDay = true;
  if (!inDay) f.moveTo(day);
  if (f.getName() !== rec.folderName) f.setName(rec.folderName);
  return f.getId();
}
/** Saves / refreshes one stay in Drive. Returns the file ids so the next run only changes what changed. */
function deskArchive_(rec, was) {
  var folderId = deskStayFolder_(rec, was.folder), folder = DriveApp.getFolderById(folderId), out = { folder: folderId, details: was.details, bill: was.bill, notes: {} };
  if (!was.details || was.key !== rec.key || folderId !== was.folder) { // stay details as a PDF
    var pdf = Utilities.newBlob(rec.html, 'text/html', 'details.html').getAs('application/pdf').setName('Stay details – Room ' + rec.room + '.pdf');
    deskTrash_(was.details);
    out.details = folder.createFile(pdf).getId();
  }
  if (rec.billPdf) {
    deskTrash_(was.bill);
    out.bill = folder.createFile(Utilities.newBlob(Utilities.base64Decode(rec.billPdf), 'application/pdf', rec.billName)).getId();
  }
  (rec.ids || []).forEach(function (x) { if (x.folder !== folderId) try { DriveApp.getFileById(x.file).moveTo(folder); } catch (e) {} });
  /* the other nights: one short link per day, back to the check-in day's folder */
  var want = {}; rec.notes.forEach(function (n) { want[n.date] = n.name; });
  Object.keys(was.notes || {}).forEach(function (date) {
    var o = was.notes[date];
    if (want[date] === o.name && o.target === folderId) { try { if (!DriveApp.getFileById(o.id).isTrashed()) { out.notes[date] = o; return; } } catch (e) {} }
    deskTrash_(o.id);
  });
  rec.notes.forEach(function (n) {
    if (out.notes[n.date]) return;
    var day = deskDayFolder_(n.date), fid;
    try { var sc = day.createShortcut(folderId); sc.setName(n.name); fid = sc.getId(); }
    catch (e) { fid = day.createFile(n.name + '.txt', n.name + '\nFolder: https://drive.google.com/drive/folders/' + folderId + '\n', MimeType.PLAIN_TEXT).getId(); }
    out.notes[n.date] = { id: fid, name: n.name, target: folderId };
  });
  return out;
}
/** Owner's own bills as PDFs: Nikadi Guest House Records / Owner bills / 2026-11 November */
function deskOwnBillFile_(b64, name, ym) {
  var root = deskCachedFolder_('ARCH_OWNBILLS', function () { return deskChild_(deskArchiveRoot_(), 'Owner bills'); });
  var m = +String(ym).slice(5, 7), folder = deskChild_(root, String(ym).slice(0, 4) + '-' + String(ym).slice(5, 7) + ' ' + (DESK_MONTHS[m - 1] || ''));
  return folder.createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'application/pdf', name)).getId();
}
/** One laundry list as a PDF in Drive "Nikadi Guest House Records/Laundry/<yyyy-mm Month>" (the old copy is replaced). */
function deskLaundryFile_(html, name, ym, oldId) {
  var root = deskCachedFolder_('ARCH_LAUNDRY', function () { return deskChild_(deskArchiveRoot_(), 'Laundry'); });
  var m = +String(ym).slice(5, 7), folder = deskChild_(root, String(ym).slice(0, 4) + '-' + String(ym).slice(5, 7) + ' ' + (DESK_MONTHS[m - 1] || ''));
  deskTrash_(oldId);
  return folder.createFile(Utilities.newBlob(html, 'text/html', 'laundry.html').getAs('application/pdf').setName(name)).getId();
}
/** Run once from the editor to file every stay now (otherwise the 15-minute timer does 8 stays at a time). */
function archiveAllStays() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
  var core = deskTimerCore_();
  for (var i = 0; i < 20; i++) { var r = core._sendDue({ archive: true, limit: 10 }); if (!r.archived.length) break; }
  } finally { lock.releaseLock(); }
}

/** Run once from the editor so Google asks for Drive permission (for expense bill photos). */
function authorizeDrive() { var it = DriveApp.getFoldersByName('Nikadi Expense Bills'); return it.hasNext() ? it.next().getName() : DriveApp.createFolder('Nikadi Expense Bills').getName(); }

/** Emails a guest their bill: a warm message, with the PDF bill attached (made by the staff app). */
function deskSendBill_(d, to, pdf) {
  var msg = { to: to, name: 'Nikadi Guest House', replyTo: 'nikadiguesthouse@gmail.com',
    subject: NikadiBill.billEmailSubject(d),
    htmlBody: NikadiBill.billEmail(d),
    body: NikadiBill.billWhatsApp(d, { link: !pdf }).replace(/\*/g, '') };
  if (pdf) msg.attachments = [Utilities.newBlob(Utilities.base64Decode(pdf), 'application/pdf', 'Nikadi-Bill-' + String(d.no).replace(/[^A-Za-z0-9-]+/g, '-') + '.pdf')];
  MailApp.sendEmail(msg);
}

/** Creates the staff app tabs. Called from setup() in Code.gs; safe to run again. */
function deskSetup_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');
  Object.keys(DESK_SCHEMA).forEach(function (t) {
    var def = DESK_SCHEMA[t], s = ss.getSheetByName(def.sheet) || ss.insertSheet(def.sheet);
    if (s.getLastRow() === 0) {
      s.appendRow(def.cols.map(function (c) { return c[1]; }));
      s.getRange(1, 1, 1, def.cols.length).setFontWeight('bold').setBackground('#1b1714').setFontColor('#e0be7a');
      s.setFrozenRows(1);
      def.cols.forEach(function (c, j) { if (c[2] === 's') s.getRange(1, j + 1, s.getMaxRows(), 1).setNumberFormat('@'); });
      var rows = DESK_DEFAULTS[t];
      if (rows) rows.forEach(function (o) { s.appendRow(def.cols.map(function (c) { var v = o[c[0]]; return v === undefined ? '' : v; })); });
      s.autoResizeColumns(1, def.cols.length);
    }
    if (def.hidden) s.hideSheet();
  });
  return 'Staff app tabs ready';
}
