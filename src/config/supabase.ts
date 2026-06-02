import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const isPlaceholder = (val: string) => {
	return !val || val.includes("your-supabase-project") || val === "your-anon-key" || val === "your-service-role-key";
};

export const supabase = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey)
	? createClient(supabaseUrl, supabaseAnonKey)
	: null as any;

export const getSupabaseAdmin = () => {
	if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseServiceKey)) {
		return null;
	}
	return createClient(supabaseUrl, supabaseServiceKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
};

