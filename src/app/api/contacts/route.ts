import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("leads")
    .select(`
      *,
      campaigns!inner(id, name, angle_selected, user_id)
    `)
    .eq("unlocked", true)
    .eq("campaigns.user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("[contacts] query error:", error)
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 })
  }

  return NextResponse.json({ contacts: data ?? [] })
}
