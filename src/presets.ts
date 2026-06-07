export interface PlantPreset {
  name: string;
  scientificName: string;
  description: string;
  imageUrl: string;
}

export const PLANT_PRESETS: PlantPreset[] = [
  {
    name: "Monstera Deliciosa",
    scientificName: "Monstera deliciosa",
    description: "Una delle piante d'appartamento più amate, celebre per le sue iconiche foglie frastagliate e il fusto rampicante vigoroso.",
    imageUrl: "https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&q=80&w=600"
  },
  {
    name: "Succulenta Echeveria",
    scientificName: "Echeveria elegans",
    description: "Una succulenta compatta a forma di rosetta con foglie carnose e sfumature azzurro-verdi, facilissima da curare e propagare.",
    imageUrl: "https://images.unsplash.com/photo-1517576044811-297ff78e553e?auto=format&fit=crop&q=80&w=600"
  },
  {
    name: "Basilico Italiano",
    scientificName: "Ocimum basilicum",
    description: "Erba aromatica per eccellenza dell'estate italiana, deliziosa e a crescita rapida, ideale per osservare i progressi giorno dopo giorno.",
    imageUrl: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600"
  },
  {
    name: "Germoglio di Rovere",
    scientificName: "Quercus robur",
    description: "La straordinaria evoluzione di una ghianda raccolta nel bosco che si trasforma in una possente piantina da rinvasare.",
    imageUrl: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=600"
  },
  {
    name: "Orchidea Phalaenopsis",
    scientificName: "Phalaenopsis amabilis",
    description: "Elegante orchidea da interni con fiori spettacolari e boccioli delicati la cui evoluzione e fioritura regala immense soddisfazioni.",
    imageUrl: "https://images.unsplash.com/photo-1525310072745-f49212b5ac6d?auto=format&fit=crop&q=80&w=600"
  }
];

export const MOCK_STARTER_PLANTS = [
  {
    id: "ficus_example_1",
    name: "Ficus Elastica",
    nickname: "Ruby",
    startDate: "2026-04-10",
    description: "Ho iniziato questa talea in acqua ad aprile. Ora ha sviluppato radici forti e l'ho appena interrata in un vaso di terracotta con terriccio drenato!",
    imageUrl: "https://images.unsplash.com/photo-1597055181300-e3633a207518?auto=format&fit=crop&q=80&w=600",
    ownerId: "demo_owner",
    ownerName: "Sofia (Caretaker)",
    createdAt: "2026-04-10T12:00:00Z"
  },
  {
    id: "avocado_example_2",
    name: "Avocado da Seme",
    nickname: "Avocady",
    startDate: "2026-05-01",
    description: "Il classico esperimento del seme di avocado sospeso con gli stuzzicandenti in un bicchiere d'acqua. Sta crescendo a vista d'occhio!",
    imageUrl: "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&q=80&w=600",
    ownerId: "demo_owner",
    ownerName: "Sofia (Caretaker)",
    createdAt: "2026-05-01T10:00:00Z"
  }
];

export const MOCK_STARTER_LOGS: Record<string, any[]> = {
  "ficus_example_1": [
    {
      id: "log_ficus_1",
      date: "2026-05-15",
      imageUrl: "https://images.unsplash.com/photo-1597055181300-e3633a207518?auto=format&fit=crop&q=80&w=600",
      notes: "Primo rinvaso con successo! Ha sviluppato ben tre radici secondarie robuste in idrocoltura prima del trapianto nell'argilla.",
      status: "in_crescita",
      createdAt: "2026-05-15T15:00:00Z"
    },
    {
      id: "log_ficus_2",
      date: "2026-04-10",
      imageUrl: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&q=80&w=600",
      notes: "Giorno d'inizio: ho prelevato questa bellissima talea apicale da una pianta madre matura e l'ho immersa in acqua fresca.",
      status: "seme",
      createdAt: "2026-04-10T12:01:00Z"
    }
  ],
  "avocado_example_2": [
    {
      id: "log_avo_1",
      date: "2026-05-28",
      imageUrl: "https://images.unsplash.com/photo-1587334206586-eb2913e8f77d?auto=format&fit=crop&q=80&w=600",
      notes: "È spuntato il primo piccolo germoglio verde scintillante dal centro dell'avocado spaccato! È un'emozione incredibile.",
      status: "germoglio",
      createdAt: "2026-05-28T18:00:00Z"
    },
    {
      id: "log_avo_2",
      date: "2026-05-01",
      imageUrl: "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?auto=format&fit=crop&q=80&w=600",
      notes: "Seme ripulito dalle membrane esterne e messo sospeso con cura in acqua. Ora tocca solo avere tanta pazienza.",
      status: "seme",
      createdAt: "2026-05-01T10:01:00Z"
    }
  ]
};
