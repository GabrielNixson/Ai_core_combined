# iiotassistant

Remote Module Federation application for the Unified Automation Portal.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5003`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📦 Module Federation

This app exposes the following modules:

- `./App` - Main application component

### Integration with Host App

The remote entry point is available at:
```
http://localhost:5003/assets/remoteEntry.js
```

## 🏗️ Project Structure

```
iiotassistant/
├── src/
│   ├── assets/         # Images, icons, fonts
│   │
│   ├── components/     # Reusable UI components
│   │   ├── common/     # Generic (Button, Input, Card)
│   │   └── features/   # Domain-specific (UserCard, ProductList)
│   │
│   ├── layouts/        # Layout wrappers
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── store/          # State management
│   ├── types/          # TypeScript interfaces and types
│   ├── utils/          # Helper functions
│   │
│   ├── styles/         # Global styles (7-1 simplified)
│   │   ├── abstracts/  # Variables, mixins, functions
│   │   ├── base/       # Reset, typography, base styles
│   │   └── main.scss   # Main entry point
│   │
│   ├── App.tsx         # Federation exposed component
│   ├── App.module.scss
│   ├── main.tsx        # Standalone dev entry
│   └── vite-env.d.ts
│
├── public/
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 🎨 Styling

This project uses SCSS with a modular architecture and CSS Bundling for Module Federation.

## 📝 Notes

- Port: 5003
- Module Name: iiotassistant
- Exposed Components: ./App
