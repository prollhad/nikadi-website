"""Builds backend/Staff.gs from staff/logic.js + staff/backend-adapter.gs.txt.
Run after any change to the staff app logic:  python3 tools/build-staff.py"""
import os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
logic = open(os.path.join(R, 'staff/logic.js')).read()
adapter = open(os.path.join(R, 'staff/backend-adapter.gs.txt')).read()
bill = open(os.path.join(R, 'staff/bill.js')).read()
head = ('/**\n * Nikadi Guest House — Staff app backend (rooms, bills, stock, cleaning)\n'
        ' * GENERATED from staff/logic.js + staff/bill.js + staff/backend-adapter.gs.txt by tools/build-staff.py. Do not edit by hand.\n'
        ' * Add this as a second file (Staff.gs) next to Code.gs in the same Apps Script project.\n */\n\n')
open(os.path.join(R, 'backend/Staff.gs'), 'w').write(head + logic + '\n' + bill + '\n' + adapter)
print('backend/Staff.gs written')
