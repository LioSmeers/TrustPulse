import type { Store } from '../types';
import { getSupabase } from '../supabase/client';
import { camelize, workspaceChanges, publicStore } from '../supabase/data';

function failure(error: { code?: string; message: string }) {
  if (error.code === 'PGRST202' || error.code === '42P01')
    return new Error(
      'De database moet nog worden ingericht. Voer supabase/schema.sql uit in de Supabase SQL Editor.',
    );
  return new Error(
    'Supabase kon de gegevens niet laden of opslaan. Controleer je verbinding en probeer opnieuw.',
  );
}

export async function loadWorkspace(): Promise<Store> {
  const { data, error } = await getSupabase().rpc('load_workspace');
  if (error) throw failure(error);
  return camelize(data) as Store;
}

export async function saveWorkspace(before: Store, after: Store) {
  const { error } = await getSupabase().rpc('save_workspace', {
    p_changes: workspaceChanges(before, after),
  });
  if (error) throw failure(error);
}

export async function publicInvitation(
  token: string,
  action = 'load',
  stars?: number,
  message?: string,
  contact?: boolean,
) {
  const { data, error } = await getSupabase().rpc('public_invitation', {
    p_token: token,
    p_action: action,
    p_stars: stars ?? null,
    p_message: message ?? null,
    p_contact: contact ?? false,
  });
  if (error) throw failure(error);
  return publicStore(data);
}
