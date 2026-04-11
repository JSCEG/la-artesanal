import { APP_CONFIG } from "./config.js";

const hasSupabaseConfig = Boolean(APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseAnonKey);

export const supabaseEnabled = hasSupabaseConfig;

export const supabase = hasSupabaseConfig
    ? window.supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })
    : null;

export async function signInWithPassword(email, password) {
    if (!supabase) return { error: new Error("Supabase no configurado.") };
    return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email, password, metadata) {
    if (!supabase) return { error: new Error("Supabase no configurado.") };
    return supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata,
        },
    });
}

export async function signInWithGoogle() {
    if (!supabase) return { error: new Error("Supabase no configurado.") };
    return supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: APP_CONFIG.siteUrl,
        },
    });
}

export async function getSession() {
    if (!supabase) return { data: { session: null } };
    return supabase.auth.getSession();
}

export async function getProfile(userId) {
    if (!supabase) return { data: null };
    return supabase
        .from("profiles")
        .select("id, full_name, role, commercial_profile")
        .eq("id", userId)
        .single();
}

export async function saveLead(payload) {
    if (!supabase) return { error: null, data: payload };
    return supabase.from("contact_messages").insert(payload).select().single();
}

export async function saveOrder(payload) {
    if (!supabase) return { error: null, data: payload };
    return supabase.from("wholesale_orders").insert(payload).select().single();
}
