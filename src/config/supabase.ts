import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

const isPlaceholder = (val: string) => {
	return !val || val.includes("your-supabase-project") || val === "your-anon-key";
};

export const supabase = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)
	? createClient(supabaseUrl, supabaseAnonKey)
	: null as any;
