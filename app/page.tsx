/**
 * Copyright (c) 2026 Lucas Resende (lucasresendev)
 * https://github.com/lucasresendev/portal-tao-chan-mandarim
 *
 * Licensed under the PolyForm Noncommercial License 1.0.0. See LICENSE and ATTRIBUTION.md in the project root.
 */

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}