# QuickPad 🥷 (v3.0 Cyberpunk Power Suite)

QuickPad is a hyper-fast, serverless, real-time scratchpad built for absolute privacy and productivity. Designed to eliminate the friction of modern note-taking: **no logins, no paywalls, and no data harvesting**. You just open the link, type, and share.

Because QuickPad uses **Zero-Knowledge Architecture**, your data is encrypted locally on your device using **AES-256** before it ever reaches the server. Even the database administrator cannot read your notes.

### 🌐 Live Demo: https://hatsquickpad.netlify.app/
---

## ✨ Next-Gen Features

- 🔒 **Zero-Knowledge URLs:** The AES-256 decryption keys are built directly into the URL hash (`#`). They are never sent to the server. The database only stores scrambled ciphertext.
- ⚡ **Instant Real-Time Sync:** Share your unique URL to collaborate and watch remote cursors, keystrokes, and custom avatars move in real-time.
- 🖼️ **Ghost Image Steganography:** Conceal AES-256 encrypted or plaintext notes inside ordinary PNG images using Least Significant Bit (LSB) pixel encoding. Drag and drop any Ghost PNG to extract hidden notes instantly.
- ⚡ **WebRTC P2P "AirDrop" Wormhole:** Direct browser-to-browser encrypted file transfer with unlimited file size, 0% server storage, and live speed & progress meters.
- 🔦 **Collaborator Laser Pointer (`Alt+L`) & Presenter Spotlight (`Alt+O`):** Leave glowing, decaying neon laser trails across everyone's screens in real time, or focus audience attention with an interactive spotlight that dims surrounding text.
- 📊 **Live Markdown Interactive Polls:** Create voting cards using `[poll: Question | Opt A | Opt B]`. Collaborators vote with real-time percentage bars synced across devices via Firestore.
- ▶️ **Live Sandboxed Code Runner (`⌘Enter`):** Execute JavaScript in a secure sandbox with intercepted console logs (`console.log`, `warn`, `error`) and render HTML/SVG previews live in an interactive console drawer.
- 📐 **Live Mermaid.js Diagrams & KaTeX Math:** Render vector architecture diagrams, flowcharts, sequence graphs (` ```mermaid `), and mathematical formulas (`$E=mc^2$`, `$$\int...$$`) directly in the live preview.
- 📜 **Typewriter Scroll (`Alt+T`) & Focus Dimming (`Alt+H`):** Keep your active typing line locked in the vertical center of the screen, with optional focus dimming that softly fades surrounding text.
- ⚡ **Inline Slash Command Snippet Expander (`/`):** Type `/` on any line to trigger a floating palette for rapid insertion of tables, polls, meeting notes, code blocks, diagrams, and timestamps.
- 🎙️ **Encrypted P2P Voice Walkie-Talkie:** Low-latency WebRTC push-to-talk audio channel directly between active collaborators with animated speaking visualizer rings.
- 🎉 **Live Cursor Emoji Flares (`Ctrl+1..5`):** Send rising reaction particles (`🔥 💡 🚀 🔒 👏`) that float upwards directly from your cursor position for your collaborators to see in real-time.
- 🎨 **Encrypted Neon Whiteboard Canvas (`.draw`):** Create `.draw` tabs to sketch architecture diagrams, flowcharts, or handwritten notes with neon glow brushes, eraser, and undo support—saved seamlessly alongside encrypted text.
- 🔊 **Synthesized Mechanical Switch Audio:** Procedural Web Audio API sound engine with zero audio files! Choose between *Thock (Lubed Linear)*, *Click (Blue Switch)*, *Model M (Buckling Spring)*, or *Cyber 8-Bit*.
- ⚡ **Cipher Matrix Glitch & WPM Streak:** Hollywood-style decryption animation on load/tab switch, plus a real-time WPM typing momentum meter with blazing cyan flame glow at 80+ WPM.
- 🕶️ **Panic Boss Key & Duress Decoy Vault:** Instant stealth camouflage (`Alt+P` or double-tap `Esc`) swaps the screen to an authentic Q3 corporate status report. Set a secret Duress PIN to open a convincing benign decoy vault under coercion.
- 📷 **Custom Avatar Photo Upload:** Upload personal avatar photos directly from your computer or phone camera/library—auto-cropped to square and optimized for instant peer sync.
- 🖼️ **Zero-Knowledge Encrypted Images:** Paste clipboard screenshots (`Ctrl+V` / `⌘V`), drag and drop images, or use **File > Insert Image from Device**; automatically compressed and encrypted with AES-256.
- 🔐 **Self-Decrypting HTML Vault Exporter:** Export complete multi-tab workspaces into zero-dependency encrypted standalone `.html` files that decrypt in any browser offline using your passphrase.
- ☑️ **Interactive Markdown Task Meter:** Real-time HUD counter detects `- [ ]` markdown checkboxes and displays active completion percentages (`☑️ 3/5 (60%)`).
- 🔍 **Find & Replace (`⌘F` / `Ctrl+F`):** Rapid in-document search with match count, match navigation, single replace, and bulk replace all.
- ⌨️ **Command Palette (`⌘K` / `Ctrl+K`):** Instant keyboard command center to trigger any action, format, download, or switch tabs effortlessly.
- 📁 **File Export & Import:** Download notes as Markdown (`.md`), plain text (`.txt`), encrypted HTML (`.html`), or export complete multi-tab workspace backups (`.json`). Seamlessly drag and drop files onto the editor.
- 🌗 **Split View & Markdown:** Side-by-side live Markdown preview with automated syntax highlighting via Highlight.js and interactive task list checkboxes.
- 🔤 **Typography Controls:** Switch between Monospace (`Fira Code`), Sans-Serif (`Inter`), and Serif (`Lora`) typography with instant font size scaling (`A-` / `A+`).
- 💬 **Secure Encrypted DMs:** Peer-to-peer **RSA-OAEP 2048-bit** encrypted direct messaging. Click an active user's presence badge to chat privately.
- 🔥 **Burn Notes & Self-Destruct Timers:** Create self-destructing links that erase themselves from the database forever the moment they are opened, or set workspace countdown timers.
- 🧘 **Zen Mode:** Distraction-free full-screen writing environment.
- 🎨 **Custom Themes & Screensaver:** 6 cyber neon themes, custom hex background picker, and customizable idle Matrix screensaver.
- 📴 **True Offline Mode:** Progressive Web App (PWA) with offline buffer and conflict merge resolution upon reconnecting.
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
| `Space` (Held, outside editor) | Push-to-Talk (When Voice is Active) |
| `Alt+M` | Toggle Markdown Preview |
| `Alt+S` | Toggle Split View |
| `Alt+Z` | Toggle Zen Mode |
| `Esc` | Dismiss any open modal, Drawer, Zen, Spotlight, or Laser |

---

## 🛡️ Security Architecture & Privacy

QuickPad is engineered for **total anonymity**. It uses a serverless architecture acting purely as an encrypted relay.

*   **IP Masking:** Your IP address is never routed to other users.
*   **Military-Grade Cryptography:** Notes are encrypted locally with **AES-256 (CBC)**. Direct messages are encrypted using **RSA-OAEP 2048-bit with SHA-256** and hybrid session keys before leaving your device.
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

QuickPad is a static PWA (Progressive Web App). There is no Node.js backend required!

1. Clone this repository.
2. Create a [Firebase](https://firebase.google.com/) account and initialize a Firestore Database.
3. Replace the `firebaseConfig` object in `app.js` with your own Firebase project credentials.
4. Apply the Firestore Security Rules shown above in your Firebase Console.
5. Deploy the folder to any static hosting provider (e.g., Netlify, Vercel, GitHub Pages, Firebase Hosting).

## 🤝 Contributing
Information should be free. Build things that help people. Pull requests are always welcome!
