'use server';

import { z } from 'zod';
import { envTurn } from '@/shared/config/env.server';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import type { ActionResult } from '@/shared/types/action-result';

const schema = z.object({
  eventId: z.string().uuid(),
  pairId: z.string().uuid(),
});

export type IceConfigData = {
  iceServers: RTCIceServer[];
};

/**
 * プレゼン枠に参加するための ICE 設定を返す Server Action。
 * TURN サーバーは環境変数で設定する (未設定時は STUN のみ)。
 */
export async function joinPresenterRoomAction(
  input: unknown,
): Promise<ActionResult<IceConfigData>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, code: 'unauthenticated', message: '認証が必要です' };
  }

  const { error: entryError } = await supabase
    .from('entries')
    .select('id')
    .eq('event_id', parsed.data.eventId)
    .eq('user_id', user.id)
    .single();

  if (entryError) {
    return { ok: false, code: 'forbidden', message: 'このイベントに参加していません' };
  }

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (envTurn.TURN_URL && envTurn.TURN_USERNAME && envTurn.TURN_CREDENTIAL) {
    iceServers.push({
      urls: envTurn.TURN_URL,
      username: envTurn.TURN_USERNAME,
      credential: envTurn.TURN_CREDENTIAL,
    });
  }

  return { ok: true, data: { iceServers } };
}
