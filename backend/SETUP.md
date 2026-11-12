# Nikadi — Google Sheet setup (membership + staff app)

One Google Sheet on your own Google account runs both:
- the **member app** (www.nikadiguesthouse.com/app) and its points panel (www.nikadiguesthouse.com/app/staff.html)
- the **staff app** (www.nikadiguesthouse.com/staff): rooms, check-in, bills, payments, stock and cleaning.

This one-time setup takes about 15 minutes. It is easiest on a computer.

## 1. Create the database sheet
1. Open https://sheets.new while signed in to the Google account that should own the data
   (for example nikadiguesthouse@gmail.com).
2. Name the sheet **Nikadi Guest House**.

## 2. Add the script
1. In the sheet, open **Extensions → Apps Script**.
2. Delete everything in the `Code.gs` editor.
3. Copy all of `backend/Code.gs` from this repository and paste it in.
4. Click **Save** (disk icon).
5. Click **+** next to *Files* → **Script**, name it `Staff` (it becomes `Staff.gs`).
6. Delete what is in it, copy all of `backend/Staff.gs` from this repository and paste it in. Click **Save**.

## 3. Run setup once
1. In the function menu at the top, choose **setup**, then click **Run**.
2. Google asks for permission: **Review permissions → choose your account → Advanced → Go to project (unsafe) → Allow**.
   (Google shows this for every new private script. The script only uses your own sheet and email.)
3. Back in the sheet you will now see the tabs **Members, Transactions, Settings** and, for the staff app,
   **Rooms, Stays, Room charges, Payments, Items, Stock log, Staff**.

## 4. Change the PINs
**Staff app:** the setup creates two logins: **Owner, PIN 1111** and **Reception, PIN 2222**.
Log in to www.nikadiguesthouse.com/staff with 1111, open **Today → Team & PINs**, change both PINs at once,
and add each staff member with their own PIN (Owner / Manager / Staff).

**Membership panel:**
In the **Settings** tab, change `STAFF_PIN` from 2468 to your own 4–8 digit PIN.
Optionally put your email in `OWNER_EMAIL` to get a notice when someone joins.

## 5. Publish the script as a web app
1. In Apps Script, click **Deploy → New deployment**.
2. Click the gear icon → **Web app**.
3. Description: `Nikadi API`. Execute as: **Me**. Who has access: **Anyone**.
4. Click **Deploy** and copy the **Web app URL** (it ends with `/exec`).
5. Send that URL to Claude. Claude puts it into `app/core.js` and the website is connected.

## Later: switching OTPs to SMS
Until SMS is approved, login codes and balance updates go by **email**, so members need an email address.
When your DLT registration and SMS account are ready, fill in the SMS rows in **Settings**
(`SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID`, `SMS_TEMPLATE_OTP`, `SMS_TEMPLATE_BALANCE`)
and set `OTP_CHANNEL` to `sms`. Claude can help you write the DLT templates.

## Changing the program
Points rules live in **Settings** (`POINTS_PER_100`, `WELCOME_POINTS`, `DISCOUNT_POINTS`, `DISCOUNT_VALUE`,
`FREE_NIGHT_POINTS`). Changes apply within a minute. Update the website text too, so it matches.

## If you edit Code.gs later
Use **Deploy → Manage deployments → edit (pencil) → Version: New version → Deploy**, so the URL stays the same.

## Staff app: what is where in the sheet
- **Rooms**: the 11 rooms, their type and usual rate, and live status (Ready / Occupied / Needs cleaning).
- **Stays**: every check-in: guest, dates, agreed rate and note, nights, room total, extras, paid, balance, who checked in/out.
- **Room charges**: every item added to a room (who, when, price, free or charged). Removed items stay listed with "Removed by …".
- **Payments**: every payment (Cash / UPI / Card) and who took it.
- **Items**: prices, and stock counts for counted items (water bottles, dental kits).
- **Stock log**: every stock movement.
- **Staff**: names, PINs and roles. Owner = everything; Manager = reception, sees bills; Staff = rooms, add items, cleaning, no money.
Please change things through the app rather than typing in these tabs, so the totals stay correct.
