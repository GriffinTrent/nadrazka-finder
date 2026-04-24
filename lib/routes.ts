export interface Route {
  id: string;
  name: string;
  color: string;
  waypoints: [number, number][]; // [lat, lng]
}

export const ROUTES: Route[] = [
  {
    id: 'c1',
    name: 'Praha – Brno',
    color: '#1565C0',
    waypoints: [
      [50.0833, 14.4344], // Praha hl.n.
      [50.0289, 15.1972], // Kolín
      [50.0044, 15.7705], // Pardubice
      [49.9004, 16.4435], // Česká Třebová
      [49.1905, 16.6137], // Brno hl.n.
    ],
  },
  {
    id: 'c2',
    name: 'Praha – Plzeň – Cheb',
    color: '#0277BD',
    waypoints: [
      [50.0833, 14.4344], // Praha hl.n.
      [49.9607, 14.0733], // Beroun
      [49.7420, 13.5932], // Rokycany
      [49.7460, 13.3795], // Plzeň hl.n.
      [50.0733, 12.3730], // Cheb
    ],
  },
  {
    id: 'c3',
    name: 'Praha – Děčín',
    color: '#01579B',
    waypoints: [
      [50.0833, 14.4344], // Praha hl.n.
      [50.2480, 14.3120], // Kralupy nad Vltavou
      [50.6614, 14.0458], // Ústí nad Labem
      [50.7755, 14.2033], // Děčín
    ],
  },
  {
    id: 'c4',
    name: 'Praha – Liberec',
    color: '#1976D2',
    waypoints: [
      [50.0833, 14.4344], // Praha hl.n.
      [50.2025, 14.8361], // Lysá nad Labem
      [50.4126, 14.9052], // Mladá Boleslav
      [50.5857, 15.1581], // Turnov
      [50.7693, 15.0584], // Liberec
    ],
  },
  {
    id: 'c5',
    name: 'Praha – České Budějovice',
    color: '#039BE5',
    waypoints: [
      [50.0833, 14.4344], // Praha hl.n.
      [49.7820, 14.6856], // Benešov u Prahy
      [49.4748, 14.6593], // Tábor
      [49.1893, 14.6918], // Veselí nad Lužnicí
      [48.9753, 14.4742], // České Budějovice
    ],
  },
  {
    id: 'c6',
    name: 'Brno – Přerov – Ostrava',
    color: '#2196F3',
    waypoints: [
      [49.1905, 16.6137], // Brno hl.n.
      [49.2764, 17.0073], // Vyškov na Moravě
      [49.4553, 17.4503], // Přerov
      [49.5484, 17.7372], // Hranice na Moravě
      [49.8213, 18.2629], // Ostrava hl.n.
    ],
  },
  {
    id: 'c7',
    name: 'Praha – Hradec Králové',
    color: '#42A5F5',
    waypoints: [
      [50.0833, 14.4344], // Praha hl.n.
      [50.1874, 15.0466], // Nymburk
      [50.2083, 15.8327], // Hradec Králové hl.n.
    ],
  },
  {
    id: 'c8',
    name: 'Olomouc – Šumperk',
    color: '#64B5F6',
    waypoints: [
      [49.5861, 17.2577], // Olomouc hl.n.
      [49.8823, 16.8703], // Zábřeh na Moravě
      [49.9655, 16.9695], // Šumperk
    ],
  },
  {
    id: 'c9',
    name: 'Plzeň – Domažlice',
    color: '#29B6F6',
    waypoints: [
      [49.7460, 13.3795], // Plzeň hl.n.
      [49.5934, 13.1706], // Stříbro (approx)
      [49.4408, 12.9245], // Domažlice
    ],
  },
];
