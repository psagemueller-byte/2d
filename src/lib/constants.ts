import type { RoomStyle, RoomType } from '@/types';

export const PRICE_PER_RENDER = 299; // $2.99 in cents
export const CURRENCY = 'usd';

export const ROOM_STYLES: RoomStyle[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Klare Linien, neutrale Farben, elegante Materialien',
    promptModifier:
      'Modern contemporary style with clean lines, neutral color palette (white, gray, black), sleek furniture with metal and glass accents, minimalist decor, large windows with natural light, polished concrete or hardwood floors, geometric shapes, and high-end finishes.',
  },
  {
    id: 'scandinavian',
    name: 'Skandinavisch',
    description: 'Hell, natürlich, gemütlich mit hellen Hölzern',
    promptModifier:
      'Scandinavian style with light wood (birch, pine), white walls, soft natural textiles (wool, linen), cozy atmosphere (hygge), minimal clutter, functional furniture, warm lighting, pastel accents, indoor plants, and sheepskin throws.',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Backsteine, Metall, offene Rohre und Loft-Feeling',
    promptModifier:
      'Industrial loft style with exposed brick walls, metal pipes and ductwork, concrete floors, reclaimed wood furniture, Edison bulb lighting, large factory-style windows, leather seating, metal shelving, dark color palette with warm wood accents.',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Weniger ist mehr — reduziert und ruhig',
    promptModifier:
      'Minimalist style with very few carefully selected furniture pieces, monochromatic white and off-white color scheme, hidden storage, no visible clutter, smooth surfaces, subtle textures, zen-like tranquility, architectural lighting, and negative space as a design element.',
  },
  {
    id: 'bohemian',
    name: 'Bohemian',
    description: 'Bunt, gemustert, eklektisch und weltoffen',
    promptModifier:
      'Bohemian eclectic style with layered textiles (Moroccan rugs, kilim pillows), macramé wall hangings, abundant indoor plants, rattan and wicker furniture, warm jewel tones (terracotta, deep purple, emerald), vintage finds, global-inspired patterns, string lights, and a relaxed lived-in atmosphere.',
  },
  {
    id: 'classic',
    name: 'Klassisch',
    description: 'Zeitlose Eleganz mit edlen Materialien',
    promptModifier:
      'Classic traditional style with elegant molding and wainscoting, rich wood furniture (mahogany, walnut), damask or toile fabrics, symmetrical arrangements, chandelier lighting, oil paintings in gilt frames, marble accents, muted sophisticated colors (navy, burgundy, cream, gold), Persian rugs, and timeless sophistication.',
  },
  {
    id: 'japanese',
    name: 'Japanisch',
    description: 'Wabi-Sabi, Zen-Ästhetik, natürliche Harmonie',
    promptModifier:
      'Japanese-inspired style (Japandi) with tatami-like flooring, shoji screen dividers, low-profile furniture, natural materials (bamboo, paper, stone), zen garden elements, ikebana flower arrangements, neutral earth tones, clean lines, natural light filtering, wabi-sabi imperfection, and a sense of calm harmony.',
  },
  {
    id: 'mediterranean',
    name: 'Mediterran',
    description: 'Warme Farben, Terrakotta, rustikaler Charme',
    promptModifier:
      'Mediterranean style with terracotta tile floors, stucco or plastered walls, wrought iron details, arched doorways, warm color palette (ochre, terracotta, azure blue, olive green), rustic wooden beams, hand-painted ceramic tiles, lush indoor plants, woven baskets, and sun-drenched ambiance.',
  },
];

export const ROOM_TYPES: RoomType[] = [
  { id: 'living-room', name: 'Wohnzimmer', icon: 'Sofa' },
  { id: 'bedroom', name: 'Schlafzimmer', icon: 'Bed' },
  { id: 'kitchen', name: 'Küche', icon: 'CookingPot' },
  { id: 'bathroom', name: 'Badezimmer', icon: 'Bath' },
  { id: 'office', name: 'Büro', icon: 'Monitor' },
];
