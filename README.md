# Aura & Co. online store

A standalone online shop for decor and gifting, built mainly for business (trade) customers.

**What it does**
- Product catalogue in 8 categories, search, product pages, cart and checkout
- Customer accounts: register, sign in, order history, one-click reorder, saved address
- Trade accounts: apply at sign-up, you approve them, then they get trade pricing and can pay on account
- Quote requests and general enquiries, stored for you to follow up
- Delivery priced by province (standard and express), free standard delivery over a threshold, optional gift wrap and gift message
- Payment by bank transfer (EFT), pay on account (approved trade only) and, once you add your PayFast details, card and instant EFT
- An admin area to see orders, change their status, approve trade customers and read enquiries
- Prices are always calculated on the server, so they cannot be changed from the browser

## Run it on your own computer
You need Node.js 20 or newer.

```
npm install
cp .env.example .env      # then edit .env (at least ADMIN_EMAIL and ADMIN_PASSWORD)
npm start
```
If `npm install` complains about `better-sqlite3`, check your internet connection and use a current Node.js version (on Windows, install the free "Build Tools for Visual Studio" if prompted).

Open http://localhost:3000. Sign in with your admin email and password, then open the **Admin area** from My account.

## Change products, prices and delivery rates
Everything lives in `core.js`: products, prices (retail, VAT included), colours, delivery zones and rates. After editing, restart with `npm start`. Rules like the trade discount, free-delivery threshold, bank details and contact details are set in `.env`.

## Add your own photos
Put image files in `public/images/`. The site picks them up automatically (see `public/images/README.txt` for the file names). Until a photo exists, the site shows a coloured illustration instead.
Photo sources that are safe to use: images supplied by your suppliers, stock libraries with a commercial licence (for example Unsplash or Pexels), or your own photography. Do not copy photos from other shops' websites.

## How trade accounts work
1. A business registers and chooses **Business**. Their application shows as *pending*. They can shop at normal prices straight away.
2. In **Admin > Customers**, set their trade status to **approved**.
3. From then on they see trade prices, and **Pay on account** appears at checkout. Pay-on-account orders arrive as "Awaiting invoice" for you to invoice.

## Orders
New orders appear in **Admin > Orders**. Change the status as you go (Paid, Processing, Dispatched, Delivered). Customers see the status in their account. Bank-transfer orders stay "Awaiting payment" until you mark them Paid.

## Card and instant EFT (PayFast)
1. Create a PayFast merchant account and a PayFast sandbox account.
2. Put the merchant id, key and passphrase in `.env`, keep `PAYFAST_SANDBOX=true`, restart.
3. Place a test order, pay with the sandbox, and confirm the order flips to **Paid** by itself.
4. Only when that works, set `PAYFAST_SANDBOX=false` with your live details.
PayFast needs to reach `BASE_URL/api/payfast/notify`, so test on a real hosted address, not localhost. **This payment code has not been tested against PayFast's servers**, so complete step 3 before taking real money.

## Put it on the internet
The shop needs a server that can keep a small database file. Good options:
- **A small VPS** (Hetzner, DigitalOcean, Afrihost, etc.): install Node, upload this folder, run `npm install` and keep it running with a tool like `pm2`, and put Caddy or nginx in front for free HTTPS.
- **Railway or Render**: make sure you attach a **persistent disk or volume** and set `DB_PATH` to it. Without one, the database (accounts and orders) is wiped on every restart.
Set `NODE_ENV=production`, `BASE_URL` to your https address, and back up `data/aura.db` regularly (daily is sensible).

## Before you open for business
- Replace the placeholder products, prices and descriptions with your real stock.
- Replace the contact details and bank details (in `.env`).
- Replace the "Spaces we're made for" scenarios on the home page with real client stories once you have permission to use them (search for `stories()` in `src/app.js`).
- Have the delivery and returns text and the privacy policy reviewed (POPIA, Consumer Protection Act, ECTA).
- Set `VAT_REGISTERED=false` if you are not VAT registered.

## Not included yet
Forgot-password emails, order emails and new-enquiry email alerts (check Admin regularly for now), stock levels, discount codes, and automatic courier booking. These can be added next.

## Project layout
- `core.js` products, prices, delivery rules (shared by server and browser)
- `server.js` accounts, orders, enquiries, admin, PayFast
- `src/` the site's design and screens; `npm run build` combines them into `public/index.html`
- `public/images/` your photos
- `data/` the database (created automatically)
