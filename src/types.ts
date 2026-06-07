export interface Plant {
  id: string;
  name: string;
  nickname?: string;
  startDate: string;
  description?: string;
  imageUrl: string;
  ownerId: string;
  ownerName: string;
  createdAt: any; // Can be Firebase Timestamp or standard string
  updatedAt?: any;
  category?: 'seme' | 'talea' | string;
}

export interface ProgressLog {
  id: string;
  date: string;
  imageUrl: string;
  notes: string;
  status: 'seme' | 'germoglio' | 'in_crescita' | 'fioritura' | 'maturo' | 'sofferente';
  createdAt: any;
  updatedAt?: any;
}

export const PLANT_STATUSES = [
  { value: 'seme', label: ' 🌱 Seme / Talea', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'germoglio', label: ' 🌿 Germoglio', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { value: 'in_crescita', label: ' 🪴 In Crescita', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { value: 'fioritura', label: ' 🌸 Fioritura', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { value: 'maturo', label: ' 🌳 Maturo / Sano', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'sofferente', label: ' 🍂 Sofferente / Aiuto', color: 'bg-amber-100 text-amber-800 border-amber-200' },
] as const;
