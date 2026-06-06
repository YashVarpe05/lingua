import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const isPlaceholder = (value: string) =>
	!value ||
	value.includes("your-supabase-project") ||
	value === "your-service-role-key";

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
