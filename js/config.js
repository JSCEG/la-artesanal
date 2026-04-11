export const CDN = "https://pub-74e211e7329944698d66a7be2d5a8eca.r2.dev/la-artesanal/img/";

export const IMGS = {
    logo:         CDN + "logo.png",
    paletaFresa:  CDN + "paleta_fresa.png",
    paletaMango:  CDN + "paleta_mango.png",
    boliNieve:    CDN + "bolita_nieve.png",
    carritoEvento:CDN + "carrito_evento.png",
    pajaroL:      CDN + "pajaritol.png",
    pajaroR:      CDN + "pajarito-r.png",
};

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
