# LoomDesk Liquid Glass Design System

This document outlines the core colors, components, and conventions of the Liquid Glass Design System used in LoomDesk. The design system is implemented with Tailwind CSS, custom CSS variables, and Shadcn UI base components extended with our own styles.

## 1. Theme Colors & Tokens
All colors are managed via CSS variables in `app/globals.css`. We use an HSL format for the variables so they can be extended using Tailwind's opacity modifiers.

### 1.1 Brand Palette
* **Primary**: `hsl(262 83% 58%)` / `--primary` - Core brand color.
* **Primary Light**: `hsl(262 84% 66%)` / `--primary-light` - Used for gradients and hover states.
* **Secondary**: Light: `hsl(214 49% 94%)` Dark: `hsl(228 21% 18%)` / `--secondary` - Used for muted backgrounds.
* **Accent**: Light: `hsl(214 57% 94%)` Dark: `hsl(228 19% 15%)` / `--accent` - Highlighted elements.
* **Background**: Light: `hsl(220 37% 97%)` Dark: `hsl(228 28% 8%)` / `--background`.
* **Foreground**: Light: `hsl(228 29% 12%)` Dark: `hsl(0 0% 98%)` / `--foreground`.

### 1.2 Semantic Status Colors
* **Success**: Light: `hsl(142 71% 45%)` Dark: `hsl(142 71% 50%)` / `--success` (solved tickets, positive trends)
* **Warning**: Light: `hsl(38 92% 50%)` Dark: `hsl(38 92% 55%)` / `--warning` (pending items, mild alerts)
* **Destructive**: `hsl(0 84.2% 60.2%)` / `--destructive` (score deductions, delete actions)
* **Info**: Light: `hsl(199 89% 48%)` Dark: `hsl(199 89% 55%)` / `--info` (neutral states, ticket tags)

### 1.3 The "Liquid Glass" Aesthetic
The theme relies heavily on glassmorphism and subtle lighting effects:
* **Background Shimmer**: The `body` has a radial gradient background that creates a subtle, static glow (`--ambient-1`, `--ambient-2`).
* **Glass Cards**: Achieved through linear gradients, `backdrop-filter: blur()`, and precise drop shadows.
* **Light/Dark Mode**: The design system natively supports dark mode. The dark mode uses deeper backgrounds with stronger highlights on component borders to simulate light hitting glass.

## 2. Shared & UI Components

### 2.1 Buttons (`components/ui/button.tsx`)
We have extended the base button variants to match the Liquid Glass style:
* **`default`**: `btn-primary`, solid background with a white gradient outline and shadow.
* **`gradient`**: Primary gradient background (`from-primary via-primary-light to-info`).
* **`outline` / `ghost`**: Uses `.glass-pill` for a frosted glass hover effect.
* **`secondary`**: Solid secondary color (`.btn-secondary`), typically used for cancel actions.
* **Status Variants**: `success`, `warning`, `destructive`, `info` (all mapped to the `.glass-pill` base).

### 2.2 Badges (`components/ui/badge.tsx`)
Badges use `backdrop-blur` and border-white opacity to appear as small glass pills.
* **Variants**: `default`, `secondary`, `destructive`, `outline`, `ghost`.
* Used extensively for tagging status and types (e.g. "SOLVED", "TICKET").

### 2.3 Cards & Panels (`components/shared/GlassCard.tsx`)
The `GlassCard` is the fundamental container for all content blocks in the dashboard.
* **`default`**: `glass-card rounded-2xl` - Standard content block.
* **`elevated`**: Added `card-elevation-lg` for prominent floating elements.
* **`minimal`**: Added `card-elevation-sm` for tighter layouts.
* **`panel`**: Added `.glass-panel` for sidebars and secondary content spaces.
* **`nav`**: Added `.glass-nav` specifically designed for top or side navigation bars.

### 2.4 Stat Cards (`components/shared/StatCard.tsx`)
A specialized dashboard component combining `GlassCard` aesthetics with metrics.
* Displays a title, value, percentage change trend, and an icon.
* Features internal gradients (`cardGradientMap`) that map to the underlying semantic color passed to it (`primary`, `success`, `warning`, `accent`).

### 2.5 Progress Bars (`components/ui/progress.tsx`)
Used for performance scores and completion metrics.
* **Track**: `.bg-muted`
* **Indicator**: `.bg-primary` with transition animations.

### 2.6 Tabs (`components/ui/tabs.tsx`)
Tabs are used to switch between views (e.g., "Overview" vs "Details"). They feature custom indicator outlines and seamless dark mode support.

## 3. Global CSS Utilities
We expose several custom utilities in `app/globals.css`:
* **`.heading`**: A linear gradient text effect used for page headers.
* **`.form-input`**: Standardized, responsive input fields.
* **`.form-label`**: Standardized label styling.
* **`.btn-ripple`**: A CSS ripple effect for interactive feedback.
* **`.fade-in` / `.slide-in`**: Reusable entrance animations for modals, dropdowns, and newly rendered DOM nodes.

## 4. Typography
* **Sans Font**: `Manrope` (CSS Var: `--font-sans`) - Used for body text, inputs, and UI elements.
* **Heading Font**: `Space Grotesk` (CSS Var: `--font-heading`) - Used for page headers, card titles, and emphasized numbers.

*Note: Always use semantic HTML tags (`h1`, `h2`, `p`) as they inherit base Tailwind typography rules mapped to these variable fonts.*

## 5. UI & UX Principles
To ensure a consistent, premium, and usable experience, all designs using the Liquid Glass theme must adhere to the following principles:

### 5.1 Visual Hierarchy & Clarity
* **Depth through Elevation**: Use the `elevated` or `default` GlassCard variants to bring primary content forward. Background elements should use the `panel` variant.
* **Typographic Contrast**: Use `Space Grotesk` (bold/semibold) for key metrics and headers. Use `Manrope` with the `text-muted-foreground` class for secondary information to prevent visual clutter.

### 5.2 Interactive Feedback
* **Micro-Interactions**: All interactive elements (buttons, cards, rows) must provide immediate visual feedback. Ensure `hover:`, `active:`, and `.btn-ripple` effects are present to make the UI feel alive.
* **State Visibility**: Ensure form inputs highlight clearly on focus (`focus-visible:ring-primary/50`). Destructive actions must always be clearly marked with the `--destructive` color scheme.

### 5.3 Accessibility (a11y)
* **Contrast Ratios**: The Liquid Glass text colors (`--foreground`, `--muted-foreground`) are tuned for readability against the glass backgrounds. Do not manually override text colors unless testing for a minimum 4.5:1 contrast ratio.
* **Keyboard Navigation**: Ensure custom components maintain focus states using the `focus-visible` utility. The `.skip-link` class should be used to allow keyboard users to bypass navigation.
* **Touch Targets**: All clickable elements (buttons, links, icon buttons) must have a minimum interactive area of `44x44px` on mobile devices.

### 5.4 Consistent Spacing
* Utilize the standardized spacing tokens (e.g., `gap-4`, `p-6`) for predictable rhythm.
* **Breathing Room**: Liquid Glass relies on whitespace to prevent the blur effects from feeling heavy. Always prefer slightly larger padding (`padding="lg"`) for primary content blocks.
