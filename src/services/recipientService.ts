// (only showing key additions)

export async function toggleRecipientFavorite(id: string, current: boolean) {
  const { error } = await supabase
    .from("recipients")
    .update({ is_favorite: !current, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.warn("Failed to toggle favourite", error.message);
  }
}

// modify loadSavedRecipients return mapping
// add:
// isFavorite: row.is_favorite ?? false

// also change ordering:
// .order("is_favorite", { ascending: false })
// .order("last_used_at", { ascending: false })
