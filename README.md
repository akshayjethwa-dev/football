# ArenaPulse: High-Density Live Sports Marketing & Fan Engagement Engine

ArenaPulse is a full-stack, real-time sports marketing platform that allows multi-location retail chains, sports bars, breweries, and sports networks ("Clients") to launch dynamic predictive campaigns during live football matches and arena events. Fans participate in real-time matchups or predictor questions, opt into WhatsApp promotional channels, climb live client-branded leaderboards, and redeem customized reward coupons triggered automatically via Facebook Graph WhatsApp Cloud APIs.

---

## 🚀 Business Workflow Architecture

ArenaPulse maps client interactions directly to business-critical fan engagement pipelines. Data cascades seamlessly from executive clients down to single rewards and mobile coupons:

```
[Clients (Multi-location corporate brands)]
      │
      └──► [Campaigns (e.g., "Premier League Super Weekend")]
                │
                ├──► [Events (Matchups, Live Predictions & Quiz trivia questions)]
                │         ▼
                │    Fans predict outcomes on mobile `/c/:campaignId` (QR/Web)
                │         ▼
                │    [Participants (Registered fans with SMS/WhatsApp Opt-In)]
                │         ▼
                │    Match result recorded → auto-scoring trigger calculator
                │         ▼
                │    [Leaderboard Standings (Live ranked participants)]
                │         ▼
                │    [Coupons & Rewards (Assigned codes sent via WhatsApp)]
```

### 1. Corporate Client Setup
SuperAdmins provision executive clients (e.g., "Fuller's Pubs", "Molson Coors Partners") with brand styling, contact coordinates, and isolated workspace portals. 

### 2. Campaign Ideation
Clients structure campaigns mapped to major sporting seasons, match days, or local tournament brackets. Each campaign supports offline QR code generation to bridge physical seats/counters to digital interactive screens.

### 3. Matchups & Trivia Events
Administrators configure real-time prediction milestones (e.g., *"Man City vs Real Madrid"*, *"First Team to Score"*, *"Golden Boot Winner"*). These events support single-choice option selectors or free-form custom answers.

### 4. Interactive Fan Landing Pages (`/c/:campaignId`)
Fans scan a QR code at their table to join. A highly-polished, responsive mobile interface handles account credential-free registration via a high-converting phone number input, capturing WhatsApp promotional marketing consent in one tap.

### 5. Prediction Collection & Scoring
As matchups resolve, managers submit official scores/results. A backend scoring hook calculates correct outcomes, updates player records, and increments leaderboard points (XP) in real-time.

### 6. WhatsApp Promotions and Coupon Fulfillment
Administrators generate unique reward coupon codes (e.g., *"Free Pint Upgrade"*, *"20% Off Match Wings"*). Using the automated Leaderboard matrix, supervisors assign rewards to top scorers, triggering an instant, beautiful congratulatory WhatsApp Cloud message.

---

## 🛠️ Technology Stack

* **Frontend Framework**: React 19 + TypeScript + Vite v6
* **State Management & Server Queries**: React Query (`@tanstack/react-query`) for low-latency caching
* **Styling & Layout**: Tailwind CSS v4 featuring professional typography and cosmic dark accent design elements
* **Interactivity & Micro-Animations**: Framer Motion (`motion/react`)
* **Backend Server**: Node.js Express framework, bundled via `esbuild` for production resilience
* **Real-time Database**: Google Cloud Firestore (Firebase SDK v12)
* **Identity Management**: Firebase Authentication (Session guards & secure logins)

---

## 📁 Database Schema Blueprint

ArenaPulse utilizes a deeply-nested, logically isolated Firestore collection schema:

```
/clients [Collection]
  ├── [clientId] [Document]
        ├── name: string
        ├── email: string
        ├── phone: string
        ├── brandSettings: { primaryColor, secondaryColor, logoUrl }
        │
        ├── /campaigns [Sub-collection]
              ├── [campaignId] [Document]
                    ├── name: string
                    ├── description: string
                    ├── startDate: string
                    ├── endDate: string
                    ├── status: 'draft' | 'active' | 'completed'
                    ├── customTheme: { darkAccent, heroBannerUrl }
                    │
                    ├── /events [Sub-collection]
                    │     ├── [eventId] [Document]
                    │           ├── type: 'matchup' | 'trivia' | 'binary'
                    │           ├── label: string
                    │           ├── options: string[]
                    │           ├── pointsSpread: number
                    │           ├── correctAnswer: string | null
                    │           ├── resolved: boolean
                    │           ├── createdAt: number
                    │
                    ├── /participants [Sub-collection]
                    │     ├── [participantId] [Document]
                    │           ├── name: string
                    │           ├── phone: string
                    │           ├── email: string | null
                    │           ├── whatsappOptIn: boolean
                    │           ├── source: 'qr' | 'landing_page' | 'manual_import'
                    │           ├── totalPoints: number
                    │           ├── createdAt: number
                    │
                    ├── /responses [Sub-collection]
                    │     ├── [responseId] [Document]
                    │           ├── eventId: string
                    │           ├── participantId: string
                    │           ├── answer: string
                    │           ├── correct: boolean | null
                    │           ├── pointsEarned: number
                    │           ├── submittedAt: number
                    │
                    └── /coupons [Sub-collection]
                          ├── [couponId] [Document]
                                ├── code: string
                                ├── status: 'unused' | 'used' | 'expired'
                                ├── participantId: string | null
                                ├── metadata: { description, validFrom, validTo }
                                ├── createdAt: number
```

---

## ⚙️ Setup & Configuration Instructions

### 1. Local Environment Variables
Create a `.env` file in the project root containing your secret variables:

```env
# Server Ingress Configuration
PORT=3000
NODE_ENV=development

# Firebase Client Web Config
VITE_FIREBASE_API_KEY=AIzaSyA1...
VITE_FIREBASE_AUTH_DOMAIN=arenapulse.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=arenapulse-dev
VITE_FIREBASE_STORAGE_BUCKET=arenapulse.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=2159...
VITE_FIREBASE_APP_ID=1:2159:web:...

# WhatsApp Cloud Provider Configuration (Facebook Graph API)
WHATSAPP_API_TOKEN=EAAG...
WHATSAPP_PHONE_NUMBER_ID=1095...
WHATSAPP_BUSINESS_ACCOUNT_ID=8492...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=arenapulse_secure_secret_token
```

### 2. Firebase Database Setup
1. **Provision Firebase Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. **Enable Firestore**: Initialize Cloud Firestore database in Native mode, selecting your target physical hosting region.
3. **Enable Authentication**: Turn on the email/password sign-in provider.
4. **Deploy Security Rules**: Apply the following configuration to `firestore.rules` or equivalent panel:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // SuperAdmin and general authenticated guards
    match /clients/{client} {
      allow read, write: if request.auth != null;
      
      match /campaigns/{campaign} {
        allow read, write: if request.auth != null;
        
        // Public rules for match participants submitting inputs
        match /events/{event} {
          allow read: if true;
          allow write: if request.auth != null;
        }
        match /participants/{participant} {
          allow read: if true;
          allow create: if true;
          allow update, delete: if request.auth != null;
        }
        match /responses/{response} {
          allow read: if true;
          allow create: if true;
          allow update, delete: if request.auth != null;
        }
        match /coupons/{coupon} {
          allow read: if true;
          allow create, update, delete: if request.auth != null;
        }
      }
    }
  }
}
```

### 3. Local Development Start
Execute the following standard commands to install base modules and ignite your Node development runtime environment:

```bash
# Install core packages
npm install

# Start Express server & Vite client middleware simultaneously
npm run dev
```
Open your browser to `http://localhost:3000` to access the Admin hub.

### 4. Build & Production Deployment
This project is fully container-ready, compiling dynamic Typescript server components to robust CommonJS.

```bash
# Compile client assets and build stand-alone dist/server.cjs
npm run build

# Start production server process
npm run start
```

---

## 📈 Analytics & CSV Data Extracts

ArenaPulse supports continuous metrics gathering and analysis on Client campaign workspaces:

* **Conversion Analytics**: Track exact opt-in percentages relating to WhatsApp promotional marketing consent.
* **Match Density Charts**: Review visual graph indicators showing which prediction events generated the highest crowds.
* **Extraction Utility**: Extract clean worksheets instantly for on-site Point-Of-Sale (POS) uploads:
  * **Participants**: `exportParticipantsCSV()` downloads verified names, phone numbers, and capture channels.
  * **Standings**: `exportLeaderboardCSV()` structures current rankings and compiled scores (XP).
  * **Rewards**: `exportCouponsCSV()` produces codes list mapping rewards to assigned winners for checkouts reconciliation.

*Enjoy launching responsive, high-impact interactive arenas!*
