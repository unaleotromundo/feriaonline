const demoUsers = [
    {
        id: 1,
        name: "Juan Pérez",
        phone: "+54 11 1234-5678",
        email: "juan.perez@gmail.com",
        shopName: "Puesto del Mate",
        shopDescription: "Mates artesanales hechos a mano con materiales de calidad.",
        shopLogo: "https://img.icons8.com/dotty/50/mate.png",
        profilePicture: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Mate artesanal", price: 2500, description: "Mate de calabaza con detalles en cuero.", image: "https://picsum.photos/200?random=1&category=market" },
            { name: "Dulce de leche casero", price: 1500, description: "Dulce artesanal, cremoso, 500g.", image: "https://picsum.photos/200?random=2&category=food" },
            { name: "Alfajores de maicena", price: 1200, description: "Pack de 6 alfajores con dulce de leche.", image: "https://picsum.photos/200?random=3&category=food" },
            { name: "Cuchillo criollo", price: 4500, description: "Cuchillo de acero con mango de madera.", image: "https://picsum.photos/200?random=4&category=craft" }
        ]
    },
    {
        id: 2,
        name: "María González",
        phone: "+54 11 2345-6789",
        email: "maria.gonzalez@hotmail.com",
        shopName: "Tejidos San Telmo",
        shopDescription: "Bufandas, ponchos y más, tejidos a mano con amor.",
        shopLogo: "https://img.icons8.com/dotty/50/knitting.png",
        profilePicture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Poncho tejido", price: 3500, description: "Poncho de lana suave, ideal para invierno.", image: "https://picsum.photos/200?random=5&category=craft" },
            { name: "Mermelada de frutilla", price: 1000, description: "Frasco de 300g, casera y natural.", image: "https://picsum.photos/200?random=6&category=food" },
            { name: "Cuadro pintado", price: 5000, description: "Cuadro artesanal de 40x40 cm.", image: "https://picsum.photos/200?random=7&category=art" },
            { name: "Sombrero de lana", price: 2800, description: "Sombrero tejido, talle único.", image: "https://picsum.photos/200?random=8&category=craft" }
        ]
    },
    {
        id: 3,
        name: "Lucas Fernández",
        phone: "+54 11 3456-7890",
        email: "lucas.fernandez@yahoo.com",
        shopName: "Sabores de La Plata",
        shopDescription: "Comida casera y artesanías locales.",
        shopLogo: "https://img.icons8.com/dotty/50/food.png",
        profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Billetera de cuero", price: 3000, description: "Billetera artesanal de cuero genuino.", image: "https://picsum.photos/200?random=9&category=craft" },
            { name: "Choripán artesanal", price: 800, description: "Chorizo casero con pan fresco.", image: "https://picsum.photos/200?random=10&category=food" },
            { name: "Mate grabado", price: 2700, description: "Mate con diseño personalizado.", image: "https://picsum.photos/200?random=11&category=market" },
            { name: "Té artesanal", price: 900, description: "Blend de hierbas, 100g.", image: "https://picsum.photos/200?random=12&category=food" }
        ]
    },
    {
        id: 4,
        name: "Ana López",
        phone: "+54 11 4567-8901",
        email: "ana.lopez@gmail.com",
        shopName: "Joyas de Recoleta",
        shopDescription: "Joyas artesanales y comida casera.",
        shopLogo: "https://img.icons8.com/dotty/50/jewelry.png",
        profilePicture: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Aros de plata", price: 2000, description: "Aros hechos a mano, diseño único.", image: "https://picsum.photos/200?random=13&category=jewelry" },
            { name: "Salsa picante", price: 1100, description: "Frasco de 200ml, sabor intenso.", image: "https://picsum.photos/200?random=14&category=food" },
            { name: "Bufanda tejida", price: 2500, description: "Bufanda de lana, colores variados.", image: "https://picsum.photos/200?random=15&category=craft" },
            { name: "Mate pintado", price: 3000, description: "Mate con diseño colorido.", image: "https://picsum.photos/200?random=16&category=market" }
        ]
    },
    {
        id: 5,
        name: "Carlos Ramírez",
        phone: "+54 11 5678-9012",
        email: "carlos.ramirez@outlook.com",
        shopName: "Artesanías Belgrano",
        shopDescription: "Productos de cuero y comida artesanal.",
        shopLogo: "https://img.icons8.com/dotty/50/leather.png",
        profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Cinturón de cuero", price: 3200, description: "Cinturón de cuero genuino, talle ajustable.", image: "https://picsum.photos/200?random=17&category=craft" },
            { name: "Empanadas caseras", price: 1200, description: "Pack de 6 empanadas de carne.", image: "https://picsum.photos/200?random=18&category=food" },
            { name: "Vela aromática", price: 900, description: "Vela de cera natural, aroma lavanda.", image: "https://picsum.photos/200?random=19&category=craft" },
            { name: "Mate de madera", price: 2800, description: "Mate tallado a mano.", image: "https://picsum.photos/200?random=20&category=market" }
        ]
    },
    {
        id: 6,
        name: "Sofía Torres",
        phone: "+54 11 6789-0123",
        email: "sofia.torres@gmail.com",
        shopName: "Chacarita Hecho a Mano",
        shopDescription: "Productos tejidos y alimentos naturales.",
        shopLogo: "https://img.icons8.com/dotty/50/handmade.png",
        profilePicture: "https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Pulsera tejida", price: 1500, description: "Pulsera de hilo, colores variados.", image: "https://picsum.photos/200?random=21&category=jewelry" },
            { name: "Miel orgánica", price: 1300, description: "Frasco de 500g, miel pura.", image: "https://picsum.photos/200?random=22&category=food" },
            { name: "Cuadro bordado", price: 4000, description: "Cuadro de 30x30 cm, diseño floral.", image: "https://picsum.photos/200?random=23&category=art" },
            { name: "Taza pintada", price: 1800, description: "Taza de cerámica, diseño único.", image: "https://picsum.photos/200?random=24&category=craft" }
        ]
    },
    {
        id: 7,
        name: "Diego Martínez",
        phone: "+54 11 7890-1234",
        email: "diego.martinez@gmail.com",
        shopName: "Puesto Villa Crespo",
        shopDescription: "Artesanías y comida casera de calidad.",
        shopLogo: "https://img.icons8.com/dotty/50/craft.png",
        profilePicture: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Cuchillo artesanal", price: 5000, description: "Cuchillo de acero con mango tallado.", image: "https://picsum.photos/200?random=25&category=craft" },
            { name: "Pan casero", price: 1000, description: "Pan de masa madre, 500g.", image: "https://picsum.photos/200?random=26&category=food" },
            { name: "Collar de madera", price: 2200, description: "Collar con cuentas de madera.", image: "https://picsum.photos/200?random=27&category=jewelry" },
            { name: "Mate de calabaza", price: 2600, description: "Mate tradicional con cuero.", image: "https://picsum.photos/200?random=28&category=market" }
        ]
    },
    {
        id: 8,
        name: "Laura Sánchez",
        phone: "+54 11 8901-2345",
        email: "laura.sanchez@hotmail.com",
        shopName: "Almagro Sabores",
        shopDescription: "Dulces y artesanías con toque local.",
        shopLogo: "https://img.icons8.com/dotty/50/sweets.png",
        profilePicture: "https://images.unsplash.com/photo-1498551172505-8ee7ad69f235?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Aros tejidos", price: 1800, description: "Aros de hilo, diseño boho.", image: "https://picsum.photos/200?random=29&category=jewelry" },
            { name: "Dulce de batata", price: 1100, description: "Frasco de 400g, artesanal.", image: "https://picsum.photos/200?random=30&category=food" },
            { name: "Almohadón bordado", price: 3500, description: "Almohadón de 40x40 cm.", image: "https://picsum.photos/200?random=31&category=craft" },
            { name: "Mate personalizado", price: 2900, description: "Mate con diseño a elección.", image: "https://picsum.photos/200?random=32&category=market" }
        ]
    },
    {
        id: 9,
        name: "Matías Gómez",
        phone: "+54 11 9012-3456",
        email: "matias.gomez@gmail.com",
        shopName: "Puesto Caballito",
        shopDescription: "Cuero y comida tradicional.",
        shopLogo: "https://img.icons8.com/dotty/50/leather.png",
        profilePicture: "https://images.unsplash.com/photo-1503443207922-d8c8a9f8f748?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Cartera de cuero", price: 4000, description: "Cartera artesanal, cuero genuino.", image: "https://picsum.photos/200?random=33&category=craft" },
            { name: "Salsa de tomate", price: 1000, description: "Frasco de 300ml, casera.", image: "https://picsum.photos/200?random=34&category=food" },
            { name: "Pulsera de cuero", price: 1500, description: "Pulsera ajustable, cuero marrón.", image: "https://picsum.photos/200?random=35&category=jewelry" },
            { name: "Mate de cerámica", price: 2700, description: "Mate con diseño moderno.", image: "https://picsum.photos/200?random=36&category=market" }
        ]
    },
    {
        id: 10,
        name: "Clara Díaz",
        phone: "+54 11 0123-4567",
        email: "clara.diaz@outlook.com",
        shopName: "Flores Artesanales",
        shopDescription: "Productos únicos y comida casera.",
        shopLogo: "https://img.icons8.com/dotty/50/flower.png",
        profilePicture: "https://images.unsplash.com/photo-1517365830460-955ce3f5b1f7?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Bufanda de lana", price: 2800, description: "Bufanda tejida, colores cálidos.", image: "https://picsum.photos/200?random=37&category=craft" },
            { name: "Mermelada de durazno", price: 1200, description: "Frasco de 300g, sin conservantes.", image: "https://picsum.photos/200?random=38&category=food" },
            { name: "Cuadro de flores", price: 4500, description: "Cuadro pintado, 50x50 cm.", image: "https://picsum.photos/200?random=39&category=art" },
            { name: "Mate de vidrio", price: 2600, description: "Mate transparente, diseño elegante.", image: "https://picsum.photos/200?random=40&category=market" }
        ]
    },
    {
        id: 11,
        name: "Tomás Ruiz",
        phone: "+54 11 1234-5678",
        email: "tomas.ruiz@gmail.com",
        shopName: "Puesto Boedo",
        shopDescription: "Artesanías y comida casera de Boedo.",
        shopLogo: "https://img.icons8.com/dotty/50/craft.png",
        profilePicture: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Cinturón tejido", price: 3000, description: "Cinturón de cuero y tela, ajustable.", image: "https://picsum.photos/200?random=41&category=craft" },
            { name: "Empanadas de carne", price: 1300, description: "Pack de 6 empanadas caseras.", image: "https://picsum.photos/200?random=42&category=food" },
            { name: "Collar de plata", price: 2500, description: "Collar con dije de plata.", image: "https://picsum.photos/200?random=43&category=jewelry" },
            { name: "Mate de acero", price: 3200, description: "Mate resistente, diseño moderno.", image: "https://picsum.photos/200?random=44&category=market" }
        ]
    },
    {
        id: 12,
        name: "Florencia Morales",
        phone: "+54 11 2345-6789",
        email: "florencia.morales@yahoo.com",
        shopName: "Colegiales Sabores",
        shopDescription: "Comida y artesanías con toque local.",
        shopLogo: "https://img.icons8.com/dotty/50/food.png",
        profilePicture: "https://images.unsplash.com/photo-1516321310762-4794371e6a6f?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Aros de madera", price: 2000, description: "Aros tallados a mano, diseño rústico.", image: "https://picsum.photos/200?random=45&category=jewelry" },
            { name: "Miel de lavanda", price: 1400, description: "Frasco de 400g, miel pura.", image: "https://picsum.photos/200?random=46&category=food" },
            { name: "Almohadón tejido", price: 3600, description: "Almohadón de 50x50 cm, tejido.", image: "https://picsum.photos/200?random=47&category=craft" },
            { name: "Mate artesanal", price: 2800, description: "Mate con detalles en cuero.", image: "https://picsum.photos/200?random=48&category=market" }
        ]
    },
    {
        id: 13,
        name: "Santiago Castro",
        phone: "+54 11 3456-7890",
        email: "santiago.castro@gmail.com",
        shopName: "Urquiza Hecho a Mano",
        shopDescription: "Artesanías únicas y comida casera.",
        shopLogo: "https://img.icons8.com/dotty/50/handmade.png",
        profilePicture: "https://images.unsplash.com/photo-1503416997304-7f8bf166c101?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Cuchillo de campo", price: 4800, description: "Cuchillo de acero, mango de madera.", image: "https://picsum.photos/200?random=49&category=craft" },
            { name: "Pan de masa madre", price: 1100, description: "Pan artesanal, 500g.", image: "https://picsum.photos/200?random=50&category=food" },
            { name: "Pulsera de plata", price: 2200, description: "Pulsera con diseño minimalista.", image: "https://picsum.photos/200?random=51&category=jewelry" },
            { name: "Mate grabado", price: 3000, description: "Mate con diseño personalizado.", image: "https://picsum.photos/200?random=52&category=market" }
        ]
    },
    {
        id: 14,
        name: "Valentina Ortiz",
        phone: "+54 11 4567-8901",
        email: "valentina.ortiz@outlook.com",
        shopName: "Saavedra Sabores",
        shopDescription: "Comida artesanal y artesanías locales.",
        shopLogo: "https://img.icons8.com/dotty/50/food.png",
        profilePicture: "https://images.unsplash.com/photo-1510227272981-87123e259b17?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Cartera tejida", price: 3800, description: "Cartera de tela y cuero, diseño único.", image: "https://picsum.photos/200?random=53&category=craft" },
            { name: "Dulce de membrillo", price: 1200, description: "Frasco de 400g, casero.", image: "https://picsum.photos/200?random=54&category=food" },
            { name: "Taza de cerámica", price: 2000, description: "Taza pintada a mano, 300ml.", image: "https://picsum.photos/200?random=55&category=craft" },
            { name: "Mate pintado", price: 2900, description: "Mate con diseño colorido.", image: "https://picsum.photos/200?random=56&category=market" }
        ]
    },
    {
        id: 15,
        name: "Martín Vargas",
        phone: "+54 11 5678-9012",
        email: "martin.vargas@gmail.com",
        shopName: "Puesto Nuñez",
        shopDescription: "Artesanías y comida tradicional de Nuñez.",
        shopLogo: "https://img.icons8.com/dotty/50/craft.png",
        profilePicture: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&crop=faces&w=50&h=50",
        products: [
            { name: "Cinturón de cuero", price: 3500, description: "Cinturón de cuero genuino, talle ajustable.", image: "https://picsum.photos/200?random=57&category=craft" },
            { name: "Empanadas de queso", price: 1300, description: "Pack de 6 empanadas caseras.", image: "https://picsum.photos/200?random=58&category=food" },
            { name: "Collar artesanal", price: 2400, description: "Collar con cuentas de madera.", image: "https://picsum.photos/200?random=59&category=jewelry" },
            { name: "Mate de calabaza", price: 2800, description: "Mate tradicional con cuero.", image: "https://picsum.photos/200?random=60&category=market" }
        ]
    }
];