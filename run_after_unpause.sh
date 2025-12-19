#!/bin/bash

# ============================================================================
# RUN AFTER UNPAUSING SUPABASE PROJECT
# ============================================================================

echo "🔗 Linking to Supabase project..."
supabase link --project-ref cpuzsyoowvegvmicttgi

echo ""
echo "🔐 Running RLS verification..."
supabase db shell --execute "$(cat quick_rls_check.sql)"

echo ""
echo "✅ Verification complete!"
