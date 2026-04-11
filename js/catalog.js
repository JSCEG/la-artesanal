export const products = [
    // Favoritos
    { id: 1, name: "Vino Tinto", category: "Favoritos", description: "Clásico y elegante, nuestro sabor insignia.", priceMinorista: 40, priceMayorista: 30, unit: "pieza/vaso" },
    { id: 2, name: "Oreo", category: "Favoritos", description: "Trocitos de galleta en deliciosa crema.", priceMinorista: 35, priceMayorista: 25, unit: "pieza/vaso" },
    { id: 3, name: "Queso con Zarzamora", category: "Favoritos", description: "Base de queso con destellos frutales.", priceMinorista: 40, priceMayorista: 30, unit: "pieza/vaso" },
    { id: 4, name: "Beso de Ángel", category: "Favoritos", description: "Dulce crema rosada con trocitos sorpresa.", priceMinorista: 35, priceMayorista: 25, unit: "pieza/vaso" },

    // Sabores de Agua
    { id: 5, name: "Mango", category: "Sabores de Agua", description: "Natural, refrescante y tropical.", priceMinorista: 25, priceMayorista: 18, unit: "pieza/vaso" },
    { id: 6, name: "Maracuyá", category: "Sabores de Agua", description: "Cítrico y vibrante directo de la costa.", priceMinorista: 25, priceMayorista: 18, unit: "pieza/vaso" },
    { id: 7, name: "Limón", category: "Sabores de Agua", description: "El clásico para el calor.", priceMinorista: 25, priceMayorista: 18, unit: "pieza/vaso" },
    { id: 8, name: "Guanábana", category: "Sabores de Agua", description: "Suave, fresca y 100% fruta.", priceMinorista: 25, priceMayorista: 18, unit: "pieza/vaso" },

    // Helados de Crema
    { id: 9, name: "Leche", category: "Helados de Crema", description: "Nuestra clásica base cremosa en su estado más puro.", priceMinorista: 30, priceMayorista: 22, unit: "pieza/vaso" },
    { id: 10, name: "Mazapán", category: "Helados de Crema", description: "Increíble sabor a cacahuate hecho crema.", priceMinorista: 35, priceMayorista: 25, unit: "pieza/vaso" },
    { id: 11, name: "Cajeta", category: "Helados de Crema", description: "Dulce de leche tradicional muy rico.", priceMinorista: 35, priceMayorista: 25, unit: "pieza/vaso" },
    { id: 12, name: "Mamey", category: "Helados de Crema", description: "Fresco sabor característico de mamey entero.", priceMinorista: 35, priceMayorista: 25, unit: "pieza/vaso" },
    { id: 13, name: "Coco", category: "Helados de Crema", description: "Leche y crema con virutas de coco real.", priceMinorista: 35, priceMayorista: 25, unit: "pieza/vaso" },
    { id: 14, name: "Chocolate", category: "Helados de Crema", description: "Cacao intenso y dulce para paladares exigentes.", priceMinorista: 35, priceMayorista: 25, unit: "pieza/vaso" },
    { id: 15, name: "Pistache", category: "Helados de Crema", description: "Sabor refinado para los más clásicos.", priceMinorista: 40, priceMayorista: 30, unit: "pieza/vaso" },

    // Licor
    { id: 16, name: "Coco Piña Ron", category: "Licor", description: "Una piña colada hecha postre helado.", priceMinorista: 45, priceMayorista: 35, unit: "pieza/vaso" },
    { id: 17, name: "Vino Tinto con Frutos Rojos", category: "Licor", description: "Astringencia deliciosa y frutos rojos dulces.", priceMinorista: 45, priceMayorista: 35, unit: "pieza/vaso" }
];

export const dashboardData = {
    metrics: [
        { label: "Pedidos por surtir", value: 12, note: "6 mayoristas y 6 retail" },
        { label: "Cobranza pendiente", value: "$18,420", note: "4 clientes con saldo" },
        { label: "Stock critico", value: 8, note: "sabores por reabastecer" },
        { label: "Ventas semana", value: "$52,900", note: "minorista + mayorista" },
    ],
    pendingOrders: [
        { customer: "Restaurante El Portal", time: "10:00", status: "Confirmado", total: "$2,960" },
        { customer: "Cafe Plaza Mayor", time: "11:30", status: "En surtido", total: "$1,480" },
        { customer: "Hotel Santa Maria", time: "13:15", status: "Nuevo", total: "$3,220" },
        { customer: "Punto de Venta Mercado", time: "16:00", status: "Pendiente de cobro", total: "$1,050" },
    ],
    chartLabels: ["Paletas", "Nieves", "Litros", "Cafe"],
    chartValues: [14800, 17200, 9600, 11300],
    mapPoints: [
        { name: "Sucursal Centro", lat: 19.4326, lng: -99.1332, type: "propia" },
        { name: "Restaurante El Portal", lat: 19.4272, lng: -99.1276, type: "cliente" },
        { name: "Cafe Plaza Mayor", lat: 19.4381, lng: -99.1412, type: "cliente" },
        { name: "Hotel Santa Maria", lat: 19.4229, lng: -99.1461, type: "cliente" },
    ],
};
