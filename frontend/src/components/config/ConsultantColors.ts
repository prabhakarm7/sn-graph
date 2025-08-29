// config/ConsultantColors.ts
// Carefully curated consultant colors that avoid status color conflicts

// 🚫 AVOIDED COLORS (to prevent confusion with status indicators):
// - Red shades (used for "Negative" ratings, "At Risk" status)
// - Orange shades (used for "Conversion in Progress", warnings)
// - Green shades (used for "Positive" ratings, "Active" status)
// - Yellow shades (used for influence levels, warnings)

// ✅ SAFE CONSULTANT COLORS - No conflict with status indicators
export const CONSULTANT_COLOR_PALETTE = [
  {
    name: 'Deep Purple',
    primary: '#7c3aed',
    secondary: '#6d28d9',
    light: 'rgba(124, 58, 237, 0.12)',
    description: 'Rich, sophisticated purple'
  },
  {
    name: 'Violet',
    primary: '#9333ea',
    secondary: '#7c3aed',
    light: 'rgba(147, 51, 234, 0.12)',
    description: 'Modern, distinctive violet'
  },
  {
    name: 'Teal',
    primary: '#0d9488',
    secondary: '#0f766e',
    light: 'rgba(13, 148, 136, 0.12)',
    description: 'Calm, balanced teal'
  },
  {
    name: 'Cyan',
    primary: '#0891b2',
    secondary: '#0e7490',
    light: 'rgba(8, 145, 178, 0.12)',
    description: 'Cool, professional cyan'
  },
  {
    name: 'Sky Blue',
    primary: '#0284c7',
    secondary: '#0369a1',
    light: 'rgba(2, 132, 199, 0.12)',
    description: 'Bright, clear sky blue'
  },
  {
    name: 'Rose Pink',
    primary: '#be185d',
    secondary: '#a21caf',
    light: 'rgba(190, 24, 93, 0.12)',
    description: 'Elegant, distinctive pink'
  },
  {
    name: 'Plum',
    primary: '#a855f7',
    secondary: '#9333ea',
    light: 'rgba(168, 85, 247, 0.12)',
    description: 'Rich, royal plum'
  },
  {
    name: 'Sapphire',
    primary: '#1d4ed8',
    secondary: '#2563eb',
    light: 'rgba(29, 78, 216, 0.12)',
    description: 'Brilliant sapphire blue'
  },
  {
    name: 'Magenta',
    primary: '#c026d3',
    secondary: '#a21caf',
    light: 'rgba(192, 38, 211, 0.12)',
    description: 'Bold, creative magenta'
  },
  {
    name: 'Indigo',
    primary: '#4338ca',
    secondary: '#3730a3',
    light: 'rgba(67, 56, 202, 0.12)',
    description: 'Deep, professional indigo'
  },
  {
    name: 'Royal Purple',
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    light: 'rgba(139, 92, 246, 0.12)',
    description: 'Majestic royal purple'
  },
  {
    name: 'Fuchsia',
    primary: '#d946ef',
    secondary: '#c026d3',
    light: 'rgba(217, 70, 239, 0.12)',
    description: 'Vibrant, artistic fuchsia'
  },
  {
    name: 'Steel Blue',
    primary: '#0369a1',
    secondary: '#0284c7',
    light: 'rgba(3, 105, 161, 0.12)',
    description: 'Strong, reliable steel blue'
  },
  {
    name: 'Turquoise',
    primary: '#0891b2',
    secondary: '#0e7490',
    light: 'rgba(8, 145, 178, 0.12)',
    description: 'Refreshing turquoise'
  },
  {
    name: 'Lavender',
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    light: 'rgba(139, 92, 246, 0.12)',
    description: 'Calming lavender'
  },
  {
    name: 'Burgundy',
    primary: '#be123c',
    secondary: '#9f1239',
    light: 'rgba(190, 18, 60, 0.12)',
    description: 'Classic burgundy wine'
  },
  {
    name: 'Navy',
    primary: '#1e3a8a',
    secondary: '#1e40af',
    light: 'rgba(30, 58, 138, 0.12)',
    description: 'Authoritative navy'
  },
  {
    name: 'Crimson',
    primary: '#dc2626',
    secondary: '#b91c1c',
    light: 'rgba(220, 38, 38, 0.12)',
    description: 'Bold crimson'
  },
  {
    name: 'Coral',
    primary: '#f97316',
    secondary: '#ea580c',
    light: 'rgba(249, 115, 22, 0.12)',
    description: 'Warm coral'
  },
  {
    name: 'Mint',
    primary: '#059669',
    secondary: '#047857',
    light: 'rgba(5, 150, 105, 0.12)',
    description: 'Fresh mint'
  },
  {
    name: 'Periwinkle',
    primary: '#6366f1',
    secondary: '#4f46e5',
    light: 'rgba(99, 102, 241, 0.12)',
    description: 'Gentle periwinkle'
  },
  {
    name: 'Orchid',
    primary: '#d946ef',
    secondary: '#c026d3',
    light: 'rgba(217, 70, 239, 0.12)',
    description: 'Exotic orchid'
  },
  {
    name: 'Slate Blue',
    primary: '#475569',
    secondary: '#334155',
    light: 'rgba(71, 85, 105, 0.12)',
    description: 'Professional slate blue'
  },
  {
    name: 'Forest',
    primary: '#166534',
    secondary: '#14532d',
    light: 'rgba(22, 101, 52, 0.12)',
    description: 'Deep forest'
  }
];

// 🎨 APP THEME COLORS (for UI elements only)
export const APP_THEME_COLORS = {
  primary: '#6366f1',      // App's main indigo color
  secondary: '#4f46e5',    // App's secondary indigo
  success: '#10b981',      // App's success green
  warning: '#f59e0b',      // App's warning orange
  error: '#ef4444',        // App's error red
  info: '#3b82f6',         // App's info blue
  surface: 'rgba(15, 23, 42, 0.95)',
  surfaceLight: 'rgba(255, 255, 255, 0.1)'
};

// 🏢 FIXED ENTITY COLORS (separate from consultants)
export const ENTITY_COLORS = {
  company: {
    name: 'Corporate Green',
    primary: '#059669',      // Emerald green for companies
    secondary: '#047857',
    light: 'rgba(5, 150, 105, 0.12)',
    description: 'Professional corporate green'
  },
  product: {
    name: 'Product Blue',
    primary: '#0ea5e9',      // Sky blue for products  
    secondary: '#0284c7',
    light: 'rgba(14, 165, 233, 0.12)',
    description: 'Clear product identification blue'
  }
};

// 🚦 STATUS COLORS (used for ratings, mandate status, etc.)
export const STATUS_COLORS = {
  positive: '#16a34a',      // Green for positive ratings
  negative: '#dc2626',      // Red for negative ratings
  neutral: '#6b7280',       // Gray for neutral/introduced
  warning: '#f59e0b',       // Orange for warnings/at risk
  active: '#10b981',        // Bright green for active status
  atRisk: '#ef4444',        // Red for at risk status
  inProgress: '#f59e0b',    // Orange for conversion in progress
  high: '#16a34a',          // Green for high influence
  medium: '#f59e0b',        // Orange for medium influence  
  low: '#ef4444',           // Red for low influence
  unknown: '#6b7280'        // Gray for unknown
};

// 🔧 UTILITY FUNCTIONS
export const getConsultantColorByIndex = (index: number) => {
  return CONSULTANT_COLOR_PALETTE[index % CONSULTANT_COLOR_PALETTE.length];
};

export const getConsultantColorById = (consultantId: string) => {
  if (!consultantId) return CONSULTANT_COLOR_PALETTE[0];
  
  // Create a simple hash from the consultant ID
  let hash = 0;
  for (let i = 0; i < consultantId.length; i++) {
    const char = consultantId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % CONSULTANT_COLOR_PALETTE.length;
  return CONSULTANT_COLOR_PALETTE[index];
};

// 📊 COLOR PALETTE INFO
export const getColorPaletteInfo = () => {
  return {
    totalConsultantColors: CONSULTANT_COLOR_PALETTE.length,
    consultantColors: CONSULTANT_COLOR_PALETTE.map(color => ({
      name: color.name,
      primary: color.primary,
      description: color.description
    })),
    entityColors: {
      company: ENTITY_COLORS.company,
      product: ENTITY_COLORS.product
    },
    statusColors: STATUS_COLORS,
    appTheme: APP_THEME_COLORS
  };
};

// 🎨 EXPORT INDIVIDUAL COLOR ARRAYS FOR EASY ACCESS
export const CONSULTANT_COLORS = CONSULTANT_COLOR_PALETTE.map(color => ({
  primary: color.primary,
  secondary: color.secondary,
  light: color.light
}));

// Debug function to log all colors (for development)
export const logColorPalette = () => {
  console.log('🎨 CONSULTANT COLOR PALETTE:');
  CONSULTANT_COLOR_PALETTE.forEach((color, index) => {
    console.log(`${index + 1}. ${color.name} (${color.primary}) - ${color.description}`);
  });
  
  console.log('\n🏢 ENTITY COLORS:');
  console.log(`Company: ${ENTITY_COLORS.company.name} (${ENTITY_COLORS.company.primary})`);
  console.log(`Product: ${ENTITY_COLORS.product.name} (${ENTITY_COLORS.product.primary})`);
  
  console.log('\n🚦 STATUS COLORS:');
  console.log('Positive:', STATUS_COLORS.positive);
  console.log('Negative:', STATUS_COLORS.negative);
  console.log('Warning:', STATUS_COLORS.warning);
  console.log('Active:', STATUS_COLORS.active);
  console.log('At Risk:', STATUS_COLORS.atRisk);
};