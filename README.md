# 🌳 GenTree - Modern Family Tree Visualizer

![GenTree Banner](file:///C:/Users/krogu/.gemini/antigravity/brain/d1efdae8-1845-48a5-9439-2dd58a9e5015/gentree_banner_1775484860519.png)

GenTree is a polished, high-performance Single Page Application (SPA) designed for creating and visualizing family trees. Built with **React 19** and a focus on **UX/UI Excellence**, it offers a seamless, interactive experience for genealogical research.

## ✨ Key Features

- **🚀 Interactive Canvas**: Smooth zoom-to-cursor and pan functionality for handling large family trees.
- **🧬 Relationship Logic**: Intuitively managed parent-child and partner relationships with dynamic SVG connection lines.
- **👤 Profile Management**: Detailed person profiles with avatar support, bio, and vital statistics.
- **💾 Auto-Save & Atomic Writes**: Robust backend communication with debounced auto-save and atomic file operations to prevent data loss.
- **🛡️ Error Resilience**: Implementation of React Error Boundaries and schema validation for data integrity.
- **🌓 Modern Aesthetics**: Premium dark-mode interface with glassmorphism effects and smooth micro-animations.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Lucide React (Icons), Vanilla CSS (Custom Design System).
- **Backend**: Node.js, Express 5.
- **State Management**: React Context API with optimized renders.
- **Testing**: 
  - **Unit/Integration**: Vitest & React Testing Library.
  - **End-to-End**: Playwright.
- **Utilities**: UUID, Date-fns, Concurrently.

## 🏗️ Engineering Excellence

This project demonstrates several advanced engineering patterns:
- **Canvas Math**: Custom implementation of zoom-to-anchor point transformations.
- **Concurrency Control**: Debounced API calls to minimize server load.
- **Data Integrity**: Atomic file writes to ensure `db.json` consistency during crashes.
- **UX Patterns**: Accessible custom modals replacing native browser dialogs.

## 🚦 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Krogullec789/gentree.git
   cd gentree
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment & data**
   ```bash
   cp .env.example .env
   cp db.json.example db.json
   ```

4. **Run development mode**
   ```bash
   npm run dev
   ```

## 🧪 Testing

I maintain high code quality through a comprehensive testing suite:

- **Run Unit Tests**: `npm run test`
- **Run E2E Tests**: `npm run test:e2e`
- **View E2E Report**: `npx playwright show-report`

---

*Developed with ❤️ as a showcase of modern web engineering.*
