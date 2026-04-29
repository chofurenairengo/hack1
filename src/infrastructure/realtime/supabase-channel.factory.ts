import type { RealtimeChannel } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/infrastructure/supabase/client-browser';

export type ChannelOptions = {
  /** Presence を有効化する */
  presence?: boolean;
  /** Presence の一意 key。未指定時はチャンネル名を使う。 */
  presenceKey?: string;
};

class SupabaseChannelFactory {
  private readonly channels = new Map<string, RealtimeChannel>();
  private _client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

  private get client() {
    if (!this._client) {
      this._client = createSupabaseBrowserClient();
    }
    return this._client;
  }

  /**
   * チャンネルを取得または新規作成する。
   * 同一名のチャンネルが既に存在する場合はキャッシュを返す。
   */
  get(name: string, options: ChannelOptions = {}): RealtimeChannel {
    const cached = this.channels.get(name);
    if (cached) return cached;

    const channel = options.presence
      ? this.client.channel(name, { config: { presence: { key: options.presenceKey ?? name } } })
      : this.client.channel(name);

    this.channels.set(name, channel);
    return channel;
  }

  /** チャンネルの購読を解除してキャッシュから削除する */
  async remove(name: string): Promise<void> {
    const channel = this.channels.get(name);
    if (!channel) return;

    await this.client.removeChannel(channel);
    this.channels.delete(name);
  }

  /** 全チャンネルを一括解除する (ページ離脱時に呼ぶ) */
  async removeAll(): Promise<void> {
    await Promise.all([...this.channels.keys()].map((name) => this.remove(name)));
  }

  has(name: string): boolean {
    return this.channels.has(name);
  }
}

export const channelFactory = new SupabaseChannelFactory();
