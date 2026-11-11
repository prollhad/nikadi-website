# Nikadi Membership — setup guide

The member app (www.nikadiguesthouse.com/app) and the staff panel (www.nikadiguesthouse.com/app/staff.html)
store points in a Google Sheet on your own Google account. This one-time setup takes about 10 minutes.
It is easiest on a computer.

## 1. Create the database sheet
1. Open https://sheets.new while signed in to the Google account that should own the data
   (for example nikadiguesthouse@gmail.com).
2. Name the sheet **Nikadi Membership**.

## 2. Add the script
1. In the sheet, open **Extensions → Apps Script**.
2. Delete everything in the `Code.gs` editor.
3. Copy all of `backend/Code.gs` from this repository and paste it in.
4. Click **Save** (disk icon).

## 3. Run setup once
1. In the function menu at the top, choose **setup**, then click **Run**.
2. Google asks for permission: **Review permissions → choose your account → Advanced → Go to project (unsafe) → Allow**.
   (Google shows this for every new private script. The script only uses your own sheet and email.)
3. Back in the sheet you will now see the tabs **Members, Transactions, Settings**.

## 4. Change the staff PIN
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
