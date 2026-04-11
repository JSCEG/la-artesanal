const CDN_IMG  = "https://cdn.sassoapps.com/la-artesanal/img/";
const CDN_VID  = "https://cdn.sassoapps.com/la-artesanal/video/";

export const IMGS = {
    logo:         CDN_IMG + "logo.png",
    aro:          CDN_IMG + "aro.png",
    paletaFresa:  CDN_IMG + "paleta_fresa.png",
    paletaMango:  CDN_IMG + "paleta_mango.png",
    boliNieve:    CDN_IMG + "bolita_nieve.png",
    carritoEvento:CDN_IMG + "carrito_evento.png",
    pajaroL:      CDN_IMG + "pajaritol.png",
    pajaroR:      CDN_IMG + "pajarito-r.png",
};

export const VIDEOS = {
    promo: CDN_VID + "video.mp4",
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
