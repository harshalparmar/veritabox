# VeritaBox Event Assets

Static HTML/CSS/JS templates for offline event collateral. Open any `.html` in a browser or use them as PDF/print sources (Puppeteer / wkhtmltopdf / react-pdf).

```
src/designs/
├── id-cards/        Squadron / participant ID badges (printable, 54 x 86 mm-ish)
│   ├── hackathon.html     Neon terminal — squadron of up to 4
│   ├── competition.html   Arena gold — squadron of up to 4
│   └── workshop.html      Blueprint blue — individual badge
├── certificates/    A4 landscape participation certificates
│   ├── hackathon.html
│   ├── competition.html
│   └── workshop.html
└── emails/          Email-client-safe HTML (tables, inline styles)
    ├── hackathon.html     Sent with hackathon ID + cert
    ├── competition.html
    └── workshop.html
```

## Tokens (all templates)
Replace these placeholders before mailing:

| Token | Meaning |
|---|---|
| `{{participantName}}` | Full name (cert + workshop ID) |
| `{{squadronName}}` | Team name (hackathon + competition ID) |
| `{{members}}` | JSON array `[{name, role, college}]` |
| `{{college}}` | Institution name |
| `{{eventName}}` | e.g. `Stacked National Hackathon '26` |
| `{{eventDate}}` | e.g. `Aug 12 – 14, 2026` |
| `{{venue}}` | City, venue |
| `{{credentialId}}` | `STK-HCK-26-0001` etc. — used as QR payload |
| `{{verifyUrl}}` | `https://veritabox.com/verify/{{credentialId}}` |

## Verification
Every card and certificate ships a QR + short link to `verifyUrl`. The verify page resolves the credential ID against the database and shows event/owner details.

## Theming
- **Hackathon** — black bg, neon cyan/green, JetBrains Mono, terminal frame.
- **Competition** — deep maroon + gold foil, serif (Cormorant), trophy emblem.
- **Workshop** — off-white blueprint, navy + orange accent, technical grid.

All three share the same VeritaBox wordmark + hex-Σ glyph for brand consistency.
