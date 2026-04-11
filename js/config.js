export const APP_CONFIG = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    siteUrl: window.location.origin,
    contact: {
        brandName: "La Artesanal",
        phone: "771 193 9522",
        email: "contacto@laartesanal.mx",
        address: "Huasca de Ocampo, La Loma, enfrente del OXXO, al lado de La Patrona",
        whatsappUrl: "https://wa.me/527711939522",
        hours: [
            { days: "Lunes – Viernes", time: "10:00 AM – 8:00 PM" },
            { days: "Sábado",          time: "9:00 AM – 9:00 PM" },
            { days: "Domingo",         time: "10:00 AM – 7:00 PM" },
        ],
    },
    branding: {
        qrUrl: `${window.location.origin}/qr.html`,
    },
};
