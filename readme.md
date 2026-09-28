# QuickPad 🥷 (v3.8 Cyberpunk Power Suite)

QuickPad is a hyper-fast, serverless, real-time scratchpad built for absolute privacy and productivity. Designed to eliminate the friction of modern note-taking: **no logins, no paywalls, and no data harvesting**. You just open the link, type, sketch, and collaborate.

Because QuickPad uses **Zero-Knowledge Architecture**, your notes, files, drawings, and direct messages are encrypted locally on your device using **AES-256** before they ever reach the relay server. Even the database administrator cannot read your data.

### 🌐 Live Demo: https://hatsquickpad.netlify.app/

---

## ✨ Next-Gen Features

### 🔐 Zero-Knowledge Security & Privacy
- 🔒 **Zero-Knowledge URLs:** AES-256 encryption keys live exclusively in the URL hash (`#`). Hashes are never transmitted across HTTP requests, meaning the database only ever stores and syncs scrambled ciphertext.
- 💬 **Encrypted Peer-to-Peer DMs:** **RSA-OAEP 2048-bit** encrypted direct messaging with ephemeral AES hybrid session keys. Click any collaborator's avatar to open an end-to-end encrypted private chat.
- 🖼️ **Ghost Image Steganography:** Conceal AES-256 encrypted or plaintext notes inside ordinary PNG images using Least Significant Bit (LSB) pixel encoding. Drag and drop any Ghost PNG to extract hidden notes instantly.
- ⚡ **WebRTC P2P "AirDrop" Wormhole:** Direct browser-to-browser encrypted file transfers of unlimited size with 0% server storage, WebRTC data channels, and live transfer progress gauges.
- 🕶️ **Panic Boss Key & Duress Decoy Vault:** Instant stealth camouflage (`Alt+P` or double-tap `Esc`) swaps the screen to an authentic Q3 corporate status report. Set a secret Duress PIN to open a convincing benign decoy vault under coercion.
- 🔥 **Burn Notes & Self-Destruct Timers:** Create one-time burn links that wipe from the database the moment they are opened, or configure expiring workspaces with real-time countdown badges.
- 🔐 **Self-Decrypting HTML Vault Exporter:** Export complete multi-tab workspaces into zero-dependency standalone `.html` files that decrypt offline in any web browser with your passphrase.

### 🎨 Encrypted Whiteboard & Rich Media
- 🎨 **Encrypted Neon Whiteboard Canvas (`.draw` Tabs):** Create `.draw` tabs to sketch architecture diagrams, wireframes, and handwritten notes on an HTML5 canvas with neon glow brushes, eraser, and undo. Whiteboard sketches are encrypted as PNG data URLs and persist seamlessly across tab switches, page reloads, and multi-device sync.
- 🖼️ **Zero-Knowledge Encrypted Image Paste & Upload:** Paste clipboard screenshots (`Ctrl+V` / `⌘V`), drag and drop image files, or upload directly from camera/disk; automatically compressed and encrypted with AES-256.
- 📐 **Live Mermaid.js Diagrams & KaTeX Math:** Render vector architecture diagrams, flowcharts, sequence graphs (` ```mermaid `), and mathematical formulas (`$E=mc^2$`, `$$\int...$$`) directly in the live preview.
- 📊 **Live Markdown Interactive Polls:** Create voting cards using `[poll: Question | Opt A | Opt B]`. Collaborators vote with real-time percentage bars synced across devices via Firestore.

### ⚡ Live Collaboration & Real-Time Presence
- ⚡ **Instant Multi-Device Sync:** Share your workspace URL to collaborate in real-time with remote cursors, active tab badges, and customized user profiles.
- 🔦 **Collaborator Laser Pointer (`Alt+L`) & Presenter Spotlight (`Alt+O`):** Leave glowing, decaying neon laser trails across everyone's screens in real time, or focus audience attention with an interactive spotlight that dims surrounding text.
- 🎙️ **Encrypted P2P Voice Walkie-Talkie:** Low-latency WebRTC push-to-talk audio channel directly between active collaborators with animated speaking visualizer rings.
- 🎉 **Live Cursor Emoji Flares (`Ctrl+1..5`):** Send rising reaction particles (`🔥 💡 🚀 🔒 👏`) that float upwards directly from your cursor position for your collaborators to see in real-time.
- 📷 **Custom Avatar Photo Upload:** Upload personal avatar photos directly from your computer or phone camera/library—auto-cropped to square and optimized for instant peer sync.
- 🔗 **Dedicated Quick Share:** One-touch modal with instant workspace URL copying, live QR Code generator for lightning-fast mobile scanning, and read-only mode toggles.

### 💻 Developer & Writing Power Suite
- ▶️ **Live Sandboxed Code Runner (`⌘Enter`):** Execute JavaScript in a secure sandbox with intercepted console logs (`console.log`, `warn`, `error`) and render HTML/SVG previews live in an interactive console drawer.
- ⚡ **Inline Slash Command Snippet Expander (`/`):** Type `/` on any line to trigger a floating palette for rapid insertion of tables, polls, meeting notes, code blocks, diagrams, and timestamps.
- 📜 **Typewriter Scroll (`Alt+T`) & Focus Dimming (`Alt+H`):** Keep your active typing line locked in the vertical center of the screen, with optional focus dimming that softly fades surrounding text.
- 🔊 **Synthesized Mechanical Switch Audio:** Procedural Web Audio API sound engine with zero audio files! Choose between *Thock (Lubed Linear)*, *Click (Blue Switch)*, *Model M (Buckling Spring)*, or *Cyber 8-Bit*.
- ⚡ **Cipher Matrix Glitch & WPM Streak:** Hollywood-style decryption animation on load/tab switch, plus a real-time WPM typing momentum meter with blazing cyan flame glow at 80+ WPM.
- 🔍 **Find & Replace (`⌘F` / `Ctrl+F`):** Rapid in-document search with match count, match navigation, single replace, and bulk replace all.
- ⌨️ **Command Palette (`⌘K` / `Ctrl+K`):** Instant keyboard command center to trigger any action, format, download, or switch tabs effortlessly.
- ☑️ **Interactive Markdown Task Meter:** Real-time HUD counter detects `- [ ]` markdown checkboxes and displays active completion percentages (`☑️ 3/5 (60%)`).
- 📁 **File Export & Import:** Download notes as Markdown (`.md`), plain text (`.txt`), encrypted HTML (`.html`), or export complete multi-tab workspace backups (`.json`). Seamlessly drag and drop files onto the editor.

### 📱 Responsive PWA & Mobile Experience
- 📲 **Fluid Horizontal Drag & Touch Navigation:** Both the top header menu/tabs and bottom Live HUD (users, voice, WPM gauge, timer) feature smooth drag-and-swipe horizontal scrolling with hidden scrollbars, optimized for smartphones, tablets, and desktops alike.
- 📴 **Progressive Web App (PWA v38):** Full offline caching with Service Worker v38, background sync resilience, and installability to home screens on iOS, Android, macOS, and Windows.
- 🌗 **Split View & Markdown:** Side-by-side live Markdown preview with automated syntax highlighting via Highlight.js and interactive task list checkboxes.
- 🔤 **Typography Controls:** Switch between Monospace (`Fira Code`), Sans-Serif (`Inter`), and Serif (`Lora`) typography with instant font size scaling (`A-` / `A+`).
- 🎨 **Custom Themes & Screensaver:** 6 cyber neon themes, custom hex background picker, and customizable idle Matrix screensaver.
- 🔗 **Read-Only Links:** Share a special `?view=` link that allows observers to watch live without write permissions.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `⌘F` / `Ctrl+F` | Open Find & Replace |
| `⌘Enter` / `Ctrl+Enter` | Run Live Code in Sandbox Console |
| `/` (at start of line) | Open Inline Snippet & Template Expander |
| `Alt+T` | Toggle Typewriter Scroll (Centers active line) |
| `Alt+H` | Toggle Focus Dimming (Fades background text) |
| `Alt+O` | Toggle Presenter Spotlight |
| `Alt+L` | Toggle Collaborator Laser Pointer |
| `Ctrl+1..5` | Trigger Live Cursor Emoji Flare (`🔥 💡 🚀 🔒 👏`) |
| `Alt+P` or Double `Esc` | Stealth Panic Camouflage Mode (Boss Key) |
| `Space` (Held, outside editor) | Push-to-Talk (When Voice Walkie-Talkie is Active) |
| `Alt+M` | Toggle Markdown Preview |
| `Alt+S` | Toggle Split View |
| `Alt+Z` | Toggle Zen Mode |
| `Esc` | Dismiss any open modal, Drawer, Zen, Spotlight, or Laser |

---

## 🛡️ Security Architecture & Privacy

QuickPad is engineered for **zero trust and total anonymity**. It uses a serverless architecture where cloud storage functions purely as an encrypted relay.

*   **Zero-Knowledge URLs:** Decryption keys never leave the client device; the server cannot access or decrypt payload content.
*   **IP Masking:** Your IP address is never routed to other users.
*   **Military-Grade Cryptography:** Notes and whiteboard canvases are encrypted locally with **AES-256 (CBC)**. Direct messages are encrypted using **RSA-OAEP 2048-bit with SHA-256** and hybrid session keys.
*   **Zero-Trace Ephemeral Storage:** Once a tab or a burn note is deleted or reaches expiration, ciphertext is completely wiped from the database.

### Firestore Security Rules
To prevent web scrapers from mass-downloading ciphertext, the database explicitly bans listing documents. A user can only access a workspace if they know the exact cryptographically random Token ID.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /workspaces/{workspaceId} {
      allow get, create, update, delete: if true;
      allow list: if false; // CRITICAL: Blocks scraping
    }
    match /burn_notes/{burnId} {
      allow get, create, update, delete: if true;
      allow list: if false; 
    }
  }
}
```

---

## 🛠️ How to Host It Yourself

QuickPad is a static PWA (Progressive Web App). There is no Node.js build step or backend required!

1. Clone or download this repository.
2. Create a [Firebase](https://firebase.google.com/) account and initialize a Firestore Database.
3. Replace the `firebaseConfig` object in `app.js` with your own Firebase project credentials.
4. Apply the Firestore Security Rules shown above in your Firebase Console.
5. Deploy the folder directly to Netlify, Vercel, GitHub Pages, Firebase Hosting, or any static host.

---

## 🤝 Contributing
Information should be free. Build tools that respect user freedom and privacy. Pull requests and feature suggestions are always welcome!
