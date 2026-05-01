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
  // 同一名チャンネルへの consumer 数を追跡する。
  // get() で +1、remove() で -1、0 で実際に supabase.removeChannel() を呼ぶ。
  private readonly refCounts = new Map<string, number>();
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
   * 呼び出すたびに参照カウントをインクリメントするため、必ず `remove()` と 1:1 で対にすること。
   */
  get(name: string, options: ChannelOptions = {}): RealtimeChannel {
    const cached = this.channels.get(name);
    if (cached) {
      this.refCounts.set(name, (this.refCounts.get(name) ?? 0) + 1);
      return cached;
    }

    const channel = options.presence
      ? this.client.channel(name, { config: { presence: { key: options.presenceKey ?? name } } })
      : this.client.channel(name);

    this.channels.set(name, channel);
    this.refCounts.set(name, 1);
    return channel;
  }

  /**
   * 参照カウントをデクリメントする。
   * 0 になったときだけ実際に `supabase.removeChannel()` を呼んでキャッシュから削除する。
   */
  async remove(name: string): Promise<void> {
    const channel = this.channels.get(name);
    if (!channel) return;

    const next = (this.refCounts.get(name) ?? 0) - 1;
    if (next > 0) {
      this.refCounts.set(name, next);
      return;
    }

    this.refCounts.delete(name);
    this.channels.delete(name);
    await this.client.removeChannel(channel);
  }

  /** 全チャンネルを参照カウントを無視して一括解除する (ページ離脱時に呼ぶ) */
  async removeAll(): Promise<void> {
    const entries = [...this.channels.values()];
    this.channels.clear();
    this.refCounts.clear();
    await Promise.all(entries.map((channel) => this.client.removeChannel(channel)));
  }

  has(name: string): boolean {
    return this.channels.has(name);
  }

  /** テスト/デバッグ用。本番ロジックでの参照は避けること。 */
  refCount(name: string): number {
    return this.refCounts.get(name) ?? 0;
  }
}

export const channelFactory = new SupabaseChannelFactory();
