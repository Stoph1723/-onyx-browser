# Onyx Privacy Browser - Development Guide

## Quick Start

### Prerequisites
- **Rust** 1.75+ (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- **Node.js** 18+ (LTS recommended)
- **Tauri CLI** (`cargo install tauri-cli`)

### Development
```bash
# Install frontend dependencies
cd privacy-browser
npm install

# Run development server
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Project Structure

```
privacy-browser/
├── src/                          # Vue 3 Frontend
│   ├── components/               # Vue components
│   │   ├── ui/                   # Base UI components (Button, Input, Select, etc.)
│   │   ├── browser/              # Browser-specific components
│   │   │   ├── TabBar.vue
│   │   │   ├── AddressBar.vue
│   │   │   ├── WebView.vue
│   │   │   ├── Sidebar.vue
│   │   │   ├── SidePanel.vue
│   │   │   ├── Toolbar.vue
│   │   │   ├── ReaderMode.vue
│   │   │   ├── CommandPalette.vue
│   │   │   ├── Onboarding.vue
│   │   │   └── SettingsPanel.vue
│   │   └── ui/                   # Base UI primitives
│   ├── composables/              # Vue composables (state/logic)
│   │   ├── useTabs.ts
│   │   ├── usePrivacy.ts
│   │   ├── useAdBlock.ts
│   │   ├── useDownloads.ts
│   │   ├── useHistory.ts
│   │   ├── useBookmarks.ts
│   │   ├── useSettings.ts
│   │   ├── useAI.ts
│   │   ├── useReaderMode.ts
│   │   ├── useFindInPage.ts
│   │   ├── useZoom.ts
│   │   ├── useSplitView.ts
│   │   └── useSidePanel.ts
│   ├── styles/
│   │   └── design-tokens.css
│   ├── types/
│   │   └── index.ts
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── adblock_engine.rs     # Brave's adblock-rust engine
│   │   ├── privacy.rs            # Fingerprinting, DoH, ECH
│   │   ├── tabs.rs               # Tab management
│   │   ├── bookmarks.rs
│   │   ├── history.rs
│   │   ├── downloads.rs
│   │   ├── settings.rs
│   │   └── scriptlet_engine.rs   # Scriptlet injection engine
│   ├── Cargo.toml
│   └── tauri.conf.json
├── icons/                        # App icons
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Key Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Vue 3 + TypeScript + Vite | Reactive UI, fast HMR |
| **State** | Pinia | Type-safe state management |
| **Routing** | Vue Router 4 | SPA navigation |
| **Styling** | CSS Custom Properties | Design tokens, dark/light themes |
| **Icons** | Lucide Vue Next | Consistent icon system |
| **Search** | Fuse.js | Fuzzy search for command palette |
| **Backend** | Rust + Tauri 2 | Native performance, small binary |
| **Ad Blocking** | Brave adblock-rust | Same engine as Brave Browser |
| **AI** | Ollama (local) | Private, offline AI |
| **Storage** | SQLite + IndexedDB | Local-first, E2E encrypted sync |
| **Sync** | Custom E2E encrypted | Self-hosted, your keys |

## Privacy Features Implemented

### Anti-Fingerprinting (15+ vectors)
| Vector | Protection |
|--------|------------|
| Canvas | Noise injection + consistent noise |
| WebGL | Vendor/renderer spoofing |
| AudioContext | Noise injection |
| Font Enumeration | Blocking + noise |
| Client Rects | Noise injection |
| Battery API | Fake 100%/charging |
| Hardware Concurrency | Fixed at 4 |
| Device Memory | Fixed at 8GB |
| Screen Resolution | Rounded to common values |
| Timezone | UTC spoofing |
| Language | en-US spoofing |
| Platform | Win32 spoofing |
| Plugins | Empty array |
| WebGL Vendor/Renderer | Generic spoofing |
| AudioContext | Noise injection |
| Media Devices | Fake device list |

### Network Privacy
| Feature | Implementation |
|---------|----------------|
| DNS over HTTPS | Cloudflare/Google/Quad9/NextDNS/Custom |
| Encrypted Client Hello (ECH) | TLS 1.3 + ECH |
| Oblivious DoH (ODoH) | Cloudflare/Google relays |
| CNAME Cloaking | CNAME resolution + blocking |
| Redirect Tracking | Bounce tracking detection |
| Link Tracking | utm_, fbclid, gclid stripping |
| AMP De-AMP | Redirect to canonical HTML |
| Prefetch/Prerender Block | Disabled by default |

### Storage Isolation
- First-Party Isolation (eTLD+1)
- State Partitioning (cache/cookies/storage by top-frame)
- Container Tabs (isolated contexts)
- Ephemeral Profiles (RAM-only, auto-destroy)
- Cookie Auto-Delete on exit

### Ad Blocking
- **Engine**: Brave's adblock-rust (same as Brave Browser)
- **Lists**: EasyList, EasyPrivacy, EasyList Cookie, Peter Lowe, OISD
- **Custom Rules**: User-defined rules
- **Element Zapper**: Right-click → Block Element
- **Stats Dashboard**: Real-time blocked count

## Getting Started

### Prerequisites
```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tauri CLI
cargo install tauri-cli

# Node.js 18+ (LTS recommended)
# Use nvm or fnm for version management
```

### Development
```bash
cd privacy-browser
npm install
npm run tauri:dev
```

### Build
```bash
npm run tauri:build
```

Output locations:
- Windows: `src-tauri/target/release/bundle/msi/` (`.msi` + `.exe`)
- macOS: `src-tauri/target/release/bundle/dmg/` (`.dmg` + `.app`)
- Linux: `src-tauri/target/release/bundle/appimage/` (`.AppImage`), `.deb`, `.rpm`

## Architecture

### Frontend (Vue 3 + TypeScript + Vite)
- **Components**: 25+ Vue components (Button, Input, Select, TabBar, AddressBar, WebView, Sidebar, etc.)
- **Composables**: 20+ composables (useTabs, usePrivacy, useAdBlock, etc.)
- **State**: Pinia stores with TypeScript
- **Styling**: CSS Custom Properties design system

### Backend (Rust + Tauri 2)
- **Adblock Engine**: Brave's adblock-rust (same as Brave Browser)
- **Privacy Manager**: Fingerprinting, DoH, ECH, HTTPS-only
- **Tab Manager**: Multi-window, multi-tab, containers
- **Sync Engine**: E2E encrypted, self-hosted capable
- **Scriptlet Engine**: Custom scriptlet injection

### Ad Blocking
- Brave's `adblock-rust` engine (same as Brave Browser)
- EasyList, EasyPrivacy, EasyList Cookie, Peter Lowe, OISD
- Custom rules support
- Element zapper (right-click → Block Element)
- Blocking statistics

## Privacy Features Summary

| Category | Features |
|----------|----------|
| **Anti-Fingerprinting** | Canvas, WebGL, Audio, Font, ClientRects, Battery, Hardware, Screen, Timezone, Language, Platform, Plugins, WebGL Vendor/Renderer |
| **Network** | DoH/DoT/DoQ/ODoH, ECH, CNAME uncloaking, Link tracking strip, HTTPS-only, Referrer policy |
| **Tracking** | CNAME uncloaking, Redirect/bounce tracking, Link param strip, AMP→HTML, Prefetch block |
| **Storage** | FPI, State partitioning, Container tabs, Ephemeral profiles, Cookie auto-delete |
| **Ad Block** | Brave engine, 8 filter lists, Custom rules, Element zapper, Stats |
| **Crypto** | Argon2id master key, AES-256-GCM, E2E sync, Reproducible builds |

## Building

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Install deps
npm install

# Dev
npm run tauri:dev

# Build
npm run tauri:build
```

## License
MIT License