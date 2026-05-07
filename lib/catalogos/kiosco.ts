// Catálogo de productos típicos de kiosco argentino — usado en onboarding
// para precargar stock inicial. ~100 SKUs distribuidos en 6 categorías visuales.
// Precios: pesos argentinos, mayo 2026 (estimaciones razonables, editables por el comerciante).

export type CategoriaKiosco =
  | "Bebidas"
  | "Cigarrillos"
  | "Alfajores"
  | "Golosinas"
  | "Snacks"
  | "Otros"

export interface ProductoCatalogo {
  producto: string
  marca: string
  ean: string
  categoria: CategoriaKiosco
  precio_costo: number
  precio_venta: number
  cantidad_inicial: number
}

export const CATEGORIAS_KIOSCO: CategoriaKiosco[] = [
  "Bebidas",
  "Cigarrillos",
  "Alfajores",
  "Golosinas",
  "Snacks",
  "Otros",
]

export const CATALOGO_KIOSCO: ProductoCatalogo[] = [
  // ─── BEBIDAS ───
  { producto: "Coca Cola 500ml",         marca: "Coca-Cola",        ean: "7790895000119", categoria: "Bebidas",     precio_costo: 900,  precio_venta: 1500, cantidad_inicial: 12 },
  { producto: "Coca Cola 1L",            marca: "Coca-Cola",        ean: "7790895000782", categoria: "Bebidas",     precio_costo: 1500, precio_venta: 2500, cantidad_inicial: 12 },
  { producto: "Coca Cola 1.5L",          marca: "Coca-Cola",        ean: "7790895000409", categoria: "Bebidas",     precio_costo: 2200, precio_venta: 3600, cantidad_inicial: 8  },
  { producto: "Coca Cola 2.25L",         marca: "Coca-Cola",        ean: "7790895002441", categoria: "Bebidas",     precio_costo: 2800, precio_venta: 4500, cantidad_inicial: 6  },
  { producto: "Coca Cola Zero 500ml",    marca: "Coca-Cola",        ean: "7790895007835", categoria: "Bebidas",     precio_costo: 900,  precio_venta: 1500, cantidad_inicial: 8  },
  { producto: "Coca Cola Zero 2.25L",    marca: "Coca-Cola",        ean: "7790895007057", categoria: "Bebidas",     precio_costo: 2800, precio_venta: 4500, cantidad_inicial: 6  },
  { producto: "Sprite 500ml",            marca: "Sprite",           ean: "7790895000270", categoria: "Bebidas",     precio_costo: 850,  precio_venta: 1400, cantidad_inicial: 8  },
  { producto: "Sprite 2.25L",            marca: "Sprite",           ean: "7790895000508", categoria: "Bebidas",     precio_costo: 2700, precio_venta: 4400, cantidad_inicial: 6  },
  { producto: "Fanta Naranja 500ml",     marca: "Fanta",            ean: "7790895000300", categoria: "Bebidas",     precio_costo: 850,  precio_venta: 1400, cantidad_inicial: 8  },
  { producto: "Fanta Naranja 2.25L",     marca: "Fanta",            ean: "7790895000539", categoria: "Bebidas",     precio_costo: 2700, precio_venta: 4400, cantidad_inicial: 6  },
  { producto: "Pepsi 500ml",             marca: "Pepsi",            ean: "7792798003015", categoria: "Bebidas",     precio_costo: 750,  precio_venta: 1300, cantidad_inicial: 8  },
  { producto: "Pepsi 2.25L",             marca: "Pepsi",            ean: "7792798004555", categoria: "Bebidas",     precio_costo: 2400, precio_venta: 4000, cantidad_inicial: 6  },
  { producto: "7up 500ml",               marca: "7up",              ean: "7792798003213", categoria: "Bebidas",     precio_costo: 750,  precio_venta: 1300, cantidad_inicial: 6  },
  { producto: "Paso de los Toros Pomelo 1.5L", marca: "Paso de los Toros", ean: "7792798002476", categoria: "Bebidas", precio_costo: 1900, precio_venta: 3200, cantidad_inicial: 6 },
  { producto: "Manaos Cola 2.25L",       marca: "Manaos",           ean: "7792554000018", categoria: "Bebidas",     precio_costo: 1500, precio_venta: 2500, cantidad_inicial: 8  },
  { producto: "Villa del Sur 500ml",     marca: "Villa del Sur",    ean: "7790895054563", categoria: "Bebidas",     precio_costo: 600,  precio_venta: 1100, cantidad_inicial: 12 },
  { producto: "Villa del Sur 1.5L",      marca: "Villa del Sur",    ean: "7790895054594", categoria: "Bebidas",     precio_costo: 1100, precio_venta: 1900, cantidad_inicial: 8  },
  { producto: "Eco de los Andes 500ml",  marca: "Eco de los Andes", ean: "7790895420016", categoria: "Bebidas",     precio_costo: 700,  precio_venta: 1300, cantidad_inicial: 8  },
  { producto: "Levité Pomelo 1.5L",      marca: "Levité",           ean: "7790895422010", categoria: "Bebidas",     precio_costo: 1300, precio_venta: 2200, cantidad_inicial: 8  },
  { producto: "Levité Manzana 1.5L",     marca: "Levité",           ean: "7790895422089", categoria: "Bebidas",     precio_costo: 1300, precio_venta: 2200, cantidad_inicial: 8  },
  { producto: "Levité Naranja 500ml",    marca: "Levité",           ean: "7790895422515", categoria: "Bebidas",     precio_costo: 750,  precio_venta: 1400, cantidad_inicial: 8  },
  { producto: "Speed Unlimited 250ml",   marca: "Speed",            ean: "7790895051050", categoria: "Bebidas",     precio_costo: 1200, precio_venta: 2200, cantidad_inicial: 12 },
  { producto: "Speed XL 500ml",          marca: "Speed",            ean: "7790895051081", categoria: "Bebidas",     precio_costo: 1900, precio_venta: 3300, cantidad_inicial: 12 },
  { producto: "Monster Energy 473ml",    marca: "Monster",          ean: "0070847811169", categoria: "Bebidas",     precio_costo: 2400, precio_venta: 4000, cantidad_inicial: 12 },
  { producto: "Red Bull 250ml",          marca: "Red Bull",         ean: "9002490100070", categoria: "Bebidas",     precio_costo: 2800, precio_venta: 4800, cantidad_inicial: 8  },
  { producto: "Quilmes Cristal 1L",      marca: "Quilmes",          ean: "7792798011812", categoria: "Bebidas",     precio_costo: 2500, precio_venta: 4000, cantidad_inicial: 12 },
  { producto: "Quilmes Cristal lata 473ml", marca: "Quilmes",       ean: "7792798005514", categoria: "Bebidas",     precio_costo: 1500, precio_venta: 2500, cantidad_inicial: 12 },
  { producto: "Brahma 1L",               marca: "Brahma",           ean: "7792798011751", categoria: "Bebidas",     precio_costo: 2550, precio_venta: 4100, cantidad_inicial: 12 },
  { producto: "Stella Artois 1L",        marca: "Stella Artois",    ean: "7792798015254", categoria: "Bebidas",     precio_costo: 3700, precio_venta: 5800, cantidad_inicial: 8  },
  { producto: "Heineken lata 473ml",     marca: "Heineken",         ean: "7792798020258", categoria: "Bebidas",     precio_costo: 2200, precio_venta: 3600, cantidad_inicial: 12 },
  { producto: "Imperial Lager 1L",       marca: "Imperial",         ean: "7792798014011", categoria: "Bebidas",     precio_costo: 3200, precio_venta: 5000, cantidad_inicial: 8  },
  { producto: "Patagonia Amber 740ml",   marca: "Patagonia",        ean: "7792798020517", categoria: "Bebidas",     precio_costo: 3800, precio_venta: 6000, cantidad_inicial: 6  },

  // ─── CIGARRILLOS ───
  { producto: "Marlboro Box 20",         marca: "Marlboro",         ean: "7790070001016", categoria: "Cigarrillos", precio_costo: 4500, precio_venta: 5600, cantidad_inicial: 10 },
  { producto: "Marlboro Gold Box 20",    marca: "Marlboro",         ean: "7790070001047", categoria: "Cigarrillos", precio_costo: 4500, precio_venta: 5600, cantidad_inicial: 10 },
  { producto: "Marlboro Crafted Red 20", marca: "Marlboro",         ean: "7790070002013", categoria: "Cigarrillos", precio_costo: 2700, precio_venta: 3350, cantidad_inicial: 10 },
  { producto: "Philip Morris Red 20",    marca: "Philip Morris",    ean: "7790070003010", categoria: "Cigarrillos", precio_costo: 1600, precio_venta: 2000, cantidad_inicial: 10 },
  { producto: "Philip Morris Blue 20",   marca: "Philip Morris",    ean: "7790070003041", categoria: "Cigarrillos", precio_costo: 1600, precio_venta: 2000, cantidad_inicial: 10 },
  { producto: "Lucky Strike Click 20",   marca: "Lucky Strike",     ean: "7790070090058", categoria: "Cigarrillos", precio_costo: 4200, precio_venta: 5200, cantidad_inicial: 10 },
  { producto: "Lucky Strike Origen 20",  marca: "Lucky Strike",     ean: "7790070090010", categoria: "Cigarrillos", precio_costo: 3200, precio_venta: 4000, cantidad_inicial: 10 },
  { producto: "Camel Filters Box 20",    marca: "Camel",            ean: "7790070080011", categoria: "Cigarrillos", precio_costo: 4000, precio_venta: 5000, cantidad_inicial: 8  },
  { producto: "Parisiennes Box 20",      marca: "Parisiennes",      ean: "7790070040013", categoria: "Cigarrillos", precio_costo: 1500, precio_venta: 1900, cantidad_inicial: 10 },
  { producto: "Chesterfield Box 20",     marca: "Chesterfield",     ean: "7790070060011", categoria: "Cigarrillos", precio_costo: 2400, precio_venta: 3000, cantidad_inicial: 10 },

  // ─── ALFAJORES ───
  { producto: "Jorgito Negro",           marca: "Jorgito",          ean: "7790387002013", categoria: "Alfajores",   precio_costo: 500,  precio_venta: 850,  cantidad_inicial: 24 },
  { producto: "Jorgito Blanco",          marca: "Jorgito",          ean: "7790387002020", categoria: "Alfajores",   precio_costo: 500,  precio_venta: 850,  cantidad_inicial: 24 },
  { producto: "Guaymallén Negro",        marca: "Guaymallén",       ean: "7793930000019", categoria: "Alfajores",   precio_costo: 250,  precio_venta: 450,  cantidad_inicial: 36 },
  { producto: "Guaymallén Blanco",       marca: "Guaymallén",       ean: "7793930000026", categoria: "Alfajores",   precio_costo: 250,  precio_venta: 450,  cantidad_inicial: 36 },
  { producto: "Block Negro",             marca: "Terrabusi",        ean: "7622300833220", categoria: "Alfajores",   precio_costo: 700,  precio_venta: 1200, cantidad_inicial: 24 },
  { producto: "Cachafaz Chocolate",      marca: "Cachafaz",         ean: "7791675000114", categoria: "Alfajores",   precio_costo: 1800, precio_venta: 3000, cantidad_inicial: 18 },
  { producto: "Águila Triple",           marca: "Águila",           ean: "7790580127015", categoria: "Alfajores",   precio_costo: 1100, precio_venta: 1900, cantidad_inicial: 18 },
  { producto: "Milka Clásico",           marca: "Milka",            ean: "7622210701145", categoria: "Alfajores",   precio_costo: 950,  precio_venta: 1600, cantidad_inicial: 24 },
  { producto: "Tatín",                   marca: "Georgalos",        ean: "7790070411013", categoria: "Alfajores",   precio_costo: 600,  precio_venta: 1000, cantidad_inicial: 24 },
  { producto: "Fantoche Triple",         marca: "Fantoche",         ean: "7794520120017", categoria: "Alfajores",   precio_costo: 600,  precio_venta: 1000, cantidad_inicial: 24 },
  { producto: "Capitán del Espacio",     marca: "Capitán",          ean: "",              categoria: "Alfajores",   precio_costo: 700,  precio_venta: 1200, cantidad_inicial: 18 },

  // ─── GOLOSINAS (galletitas, chocolates, caramelos, chicles, helados) ───
  { producto: "Oreo Original 118g",      marca: "Oreo",             ean: "7622300336967", categoria: "Golosinas",   precio_costo: 1100, precio_venta: 1900, cantidad_inicial: 12 },
  { producto: "Pepitos Chocolate 110g",  marca: "Pepitos",          ean: "7622300861001", categoria: "Golosinas",   precio_costo: 950,  precio_venta: 1600, cantidad_inicial: 12 },
  { producto: "Chocolinas 170g",         marca: "Chocolinas",       ean: "7622300336370", categoria: "Golosinas",   precio_costo: 1300, precio_venta: 2200, cantidad_inicial: 10 },
  { producto: "Sonrisas Frutilla 95g",   marca: "Bagley",           ean: "7790580121013", categoria: "Golosinas",   precio_costo: 800,  precio_venta: 1400, cantidad_inicial: 12 },
  { producto: "Rumba 155g",              marca: "Bagley",           ean: "7790580120115", categoria: "Golosinas",   precio_costo: 900,  precio_venta: 1500, cantidad_inicial: 12 },
  { producto: "Sirope 100g",             marca: "Bagley",           ean: "",              categoria: "Golosinas",   precio_costo: 850,  precio_venta: 1400, cantidad_inicial: 12 },
  { producto: "Toddy 150g",              marca: "Toddy",            ean: "7790580126018", categoria: "Golosinas",   precio_costo: 1000, precio_venta: 1700, cantidad_inicial: 12 },
  { producto: "Rhodesia 27g",            marca: "Terrabusi",        ean: "7622300833213", categoria: "Golosinas",   precio_costo: 500,  precio_venta: 850,  cantidad_inicial: 24 },
  { producto: "Águila tableta 100g",     marca: "Águila",           ean: "7790580152017", categoria: "Golosinas",   precio_costo: 1800, precio_venta: 3000, cantidad_inicial: 12 },
  { producto: "Milka Leger 100g",        marca: "Milka",            ean: "7622300336424", categoria: "Golosinas",   precio_costo: 2200, precio_venta: 3700, cantidad_inicial: 12 },
  { producto: "Bon o Bon individual",    marca: "Arcor",            ean: "7790580310011", categoria: "Golosinas",   precio_costo: 250,  precio_venta: 450,  cantidad_inicial: 48 },
  { producto: "Bon o Bon caja x6",       marca: "Arcor",            ean: "7790580310035", categoria: "Golosinas",   precio_costo: 1500, precio_venta: 2600, cantidad_inicial: 12 },
  { producto: "Tofi 24g",                marca: "Arcor",            ean: "7790580310912", categoria: "Golosinas",   precio_costo: 350,  precio_venta: 600,  cantidad_inicial: 36 },
  { producto: "Cofler Bombón 27g",       marca: "Arcor",            ean: "7790580306014", categoria: "Golosinas",   precio_costo: 500,  precio_venta: 850,  cantidad_inicial: 36 },
  { producto: "Aero 27g",                marca: "Nestlé",           ean: "7790070027016", categoria: "Golosinas",   precio_costo: 600,  precio_venta: 1000, cantidad_inicial: 24 },
  { producto: "Block 25g",               marca: "Felfort",          ean: "7790080000167", categoria: "Golosinas",   precio_costo: 350,  precio_venta: 600,  cantidad_inicial: 36 },
  { producto: "Marroc 14g",              marca: "Georgalos",        ean: "7790070401014", categoria: "Golosinas",   precio_costo: 200,  precio_venta: 350,  cantidad_inicial: 48 },
  { producto: "Mantecol 28g",            marca: "Georgalos",        ean: "7790070405012", categoria: "Golosinas",   precio_costo: 450,  precio_venta: 800,  cantidad_inicial: 24 },
  { producto: "Mentitas Arcor",          marca: "Arcor",            ean: "7790580232016", categoria: "Golosinas",   precio_costo: 350,  precio_venta: 600,  cantidad_inicial: 36 },
  { producto: "Halls Mentol",            marca: "Halls",            ean: "7622300824433", categoria: "Golosinas",   precio_costo: 450,  precio_venta: 800,  cantidad_inicial: 36 },
  { producto: "Sugus tira surtido",      marca: "Sugus",            ean: "7622300336202", categoria: "Golosinas",   precio_costo: 400,  precio_venta: 700,  cantidad_inicial: 36 },
  { producto: "Flynn Paff",              marca: "Arcor",            ean: "7790580230012", categoria: "Golosinas",   precio_costo: 80,   precio_venta: 150,  cantidad_inicial: 100 },
  { producto: "Beldent Menta",           marca: "Beldent",          ean: "7622300824426", categoria: "Golosinas",   precio_costo: 500,  precio_venta: 850,  cantidad_inicial: 36 },
  { producto: "Bubbaloo Tutti Frutti",   marca: "Bubbaloo",         ean: "7790070420015", categoria: "Golosinas",   precio_costo: 200,  precio_venta: 350,  cantidad_inicial: 60 },
  { producto: "Topline Menta",           marca: "Topline",          ean: "7790070082015", categoria: "Golosinas",   precio_costo: 450,  precio_venta: 800,  cantidad_inicial: 36 },
  { producto: "Frigor Maxibon",          marca: "Frigor",           ean: "7791290002012", categoria: "Golosinas",   precio_costo: 1800, precio_venta: 3000, cantidad_inicial: 12 },
  { producto: "Frigor Bombón Escocés",   marca: "Frigor",           ean: "7791290001015", categoria: "Golosinas",   precio_costo: 1000, precio_venta: 1700, cantidad_inicial: 18 },
  { producto: "Frigor Mr Pop",           marca: "Frigor",           ean: "7791290003019", categoria: "Golosinas",   precio_costo: 700,  precio_venta: 1200, cantidad_inicial: 18 },
  { producto: "Frigor Palito Bombón",    marca: "Frigor",           ean: "7791290004016", categoria: "Golosinas",   precio_costo: 950,  precio_venta: 1600, cantidad_inicial: 18 },

  // ─── SNACKS ───
  { producto: "Criollitas 100g",         marca: "Bagley",           ean: "7790580128012", categoria: "Snacks",      precio_costo: 700,  precio_venta: 1200, cantidad_inicial: 12 },
  { producto: "Express 110g",            marca: "Bagley",           ean: "7790580126315", categoria: "Snacks",      precio_costo: 750,  precio_venta: 1300, cantidad_inicial: 12 },
  { producto: "9 de Oro 200g",           marca: "9 de Oro",         ean: "7790580120016", categoria: "Snacks",      precio_costo: 1100, precio_venta: 1800, cantidad_inicial: 10 },
  { producto: "Cerealitas Clásicas 200g", marca: "Cerealitas",      ean: "7622300336318", categoria: "Snacks",      precio_costo: 1400, precio_venta: 2300, cantidad_inicial: 10 },
  { producto: "Saladix Pizza 100g",      marca: "Saladix",          ean: "7622300861285", categoria: "Snacks",      precio_costo: 800,  precio_venta: 1400, cantidad_inicial: 12 },
  { producto: "Lays Clásicas 65g",       marca: "Lays",             ean: "7794000080018", categoria: "Snacks",      precio_costo: 1100, precio_venta: 1850, cantidad_inicial: 12 },
  { producto: "Lays Clásicas 130g",      marca: "Lays",             ean: "7794000080117", categoria: "Snacks",      precio_costo: 1900, precio_venta: 3200, cantidad_inicial: 10 },
  { producto: "Pringles Original 124g",  marca: "Pringles",         ean: "7794230009016", categoria: "Snacks",      precio_costo: 2400, precio_venta: 4000, cantidad_inicial: 8  },
  { producto: "Pehuamar Saladas 65g",    marca: "Pehuamar",         ean: "7791720000027", categoria: "Snacks",      precio_costo: 900,  precio_venta: 1500, cantidad_inicial: 12 },
  { producto: "3D Queso 70g",            marca: "Pehuamar",         ean: "7791720001017", categoria: "Snacks",      precio_costo: 850,  precio_venta: 1400, cantidad_inicial: 12 },
  { producto: "Doritos Queso 75g",       marca: "Doritos",          ean: "7794000050011", categoria: "Snacks",      precio_costo: 1200, precio_venta: 2000, cantidad_inicial: 12 },
  { producto: "Cheetos Queso 65g",       marca: "Cheetos",          ean: "7794000040012", categoria: "Snacks",      precio_costo: 950,  precio_venta: 1600, cantidad_inicial: 12 },
  { producto: "Twistos Originales 62g",  marca: "Twistos",          ean: "7794000060010", categoria: "Snacks",      precio_costo: 1000, precio_venta: 1700, cantidad_inicial: 10 },

  // ─── OTROS (yerba, varios) ───
  { producto: "Rosamonte 500g",          marca: "Rosamonte",        ean: "7790388000056", categoria: "Otros",       precio_costo: 2200, precio_venta: 3500, cantidad_inicial: 6  },
  { producto: "Rosamonte 1kg",           marca: "Rosamonte",        ean: "7790388000018", categoria: "Otros",       precio_costo: 4000, precio_venta: 6500, cantidad_inicial: 6  },
  { producto: "Taragüí 1kg",             marca: "Taragüí",          ean: "7792180000017", categoria: "Otros",       precio_costo: 4500, precio_venta: 7200, cantidad_inicial: 6  },
  { producto: "La Virginia 500g",        marca: "La Virginia",      ean: "",              categoria: "Otros",       precio_costo: 2300, precio_venta: 3700, cantidad_inicial: 6  },
  { producto: "Pilas BIC AA x2",         marca: "BIC",              ean: "3086123537156", categoria: "Otros",       precio_costo: 1200, precio_venta: 2200, cantidad_inicial: 12 },
  { producto: "Pilas BIC AAA x2",        marca: "BIC",              ean: "3086123537163", categoria: "Otros",       precio_costo: 1200, precio_venta: 2200, cantidad_inicial: 12 },
  { producto: "Encendedor BIC J6 Maxi",  marca: "BIC",              ean: "3086122401007", categoria: "Otros",       precio_costo: 1500, precio_venta: 2800, cantidad_inicial: 24 },
  { producto: "Preservativo Prime x3",   marca: "Prime",            ean: "7791520007155", categoria: "Otros",       precio_costo: 2200, precio_venta: 3800, cantidad_inicial: 12 },
  { producto: "Curitas Hansaplast x10",  marca: "Hansaplast",       ean: "4005800013898", categoria: "Otros",       precio_costo: 1100, precio_venta: 1900, cantidad_inicial: 12 },
  { producto: "Pañuelos Elite x10",      marca: "Elite",            ean: "7806500301165", categoria: "Otros",       precio_costo: 350,  precio_venta: 700,  cantidad_inicial: 24 },
]

// ─── Helpers ───────────────────────────────────────────────────────────────

const indiceCategorias = new Map<string, CategoriaKiosco>(
  CATALOGO_KIOSCO.map((p) => [p.producto.toLowerCase(), p.categoria]),
)

export function getCategoriaPorProducto(nombre: string): CategoriaKiosco {
  return indiceCategorias.get(nombre.toLowerCase()) ?? "Otros"
}
