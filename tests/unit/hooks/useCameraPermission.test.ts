import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ------- navigator.permissions mock -------
type MockPermissionStatus = {
  state: PermissionState;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

let mockPermStatus: MockPermissionStatus;
const mockPermissionsQuery = vi.fn();

vi.stubGlobal('navigator', {
  permissions: { query: mockPermissionsQuery },
  mediaDevices: { getUserMedia: vi.fn() },
});

// Dynamic import after stubbing globals
import { useCameraPermission } from '@/hooks/useCameraPermission';

function makeMockPermStatus(state: PermissionState): MockPermissionStatus {
  return {
    state,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPermStatus = makeMockPermStatus('prompt');
  mockPermissionsQuery.mockResolvedValue(mockPermStatus);
  (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
  });
});

describe('useCameraPermission', () => {
  it('初期状態は checking', () => {
    const { result } = renderHook(() => useCameraPermission());
    expect(result.current.permissionState).toBe('checking');
  });

  it('navigator.permissions 未サポートなら unsupported', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      permissions: undefined,
    });
    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('unsupported'));
    // restore
    vi.stubGlobal('navigator', {
      permissions: { query: mockPermissionsQuery },
      mediaDevices: { getUserMedia: vi.fn() },
    });
  });

  it('query() が granted を返す → granted', async () => {
    mockPermStatus = makeMockPermStatus('granted');
    mockPermissionsQuery.mockResolvedValue(mockPermStatus);
    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('granted'));
  });

  it('query() が prompt を返す → prompt', async () => {
    mockPermStatus = makeMockPermStatus('prompt');
    mockPermissionsQuery.mockResolvedValue(mockPermStatus);
    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('prompt'));
  });

  it('query() が denied を返す → denied', async () => {
    mockPermStatus = makeMockPermStatus('denied');
    mockPermissionsQuery.mockResolvedValue(mockPermStatus);
    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('denied'));
  });

  it('query() reject → unsupported', async () => {
    mockPermissionsQuery.mockRejectedValue(new Error('unsupported'));
    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('unsupported'));
  });

  it('permissionchange イベントで状態が更新される', async () => {
    mockPermStatus = makeMockPermStatus('prompt');
    mockPermissionsQuery.mockResolvedValue(mockPermStatus);

    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('prompt'));

    // changeイベント時に state が granted に変わっていることをシミュレート
    const changeHandler = mockPermStatus.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === 'change',
    )?.[1] as (() => void) | undefined;

    act(() => {
      mockPermStatus.state = 'granted';
      changeHandler?.();
    });

    await waitFor(() => expect(result.current.permissionState).toBe('granted'));
  });

  it('requestPermission() 成功 → granted、tracks が stop される', async () => {
    mockPermStatus = makeMockPermStatus('prompt');
    mockPermissionsQuery.mockResolvedValue(mockPermStatus);

    const stopMock = vi.fn();
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValue({
      getTracks: () => [{ stop: stopMock }, { stop: stopMock }],
    });

    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('prompt'));

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: true,
      audio: false,
    });
    expect(stopMock).toHaveBeenCalledTimes(2);
    expect(result.current.permissionState).toBe('granted');
  });

  it('requestPermission() 失敗 → denied', async () => {
    mockPermStatus = makeMockPermStatus('prompt');
    mockPermissionsQuery.mockResolvedValue(mockPermStatus);
    (navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error('NotAllowedError'), { name: 'NotAllowedError' }),
    );

    const { result } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(result.current.permissionState).toBe('prompt'));

    await act(async () => {
      await result.current.requestPermission();
    });

    expect(result.current.permissionState).toBe('denied');
  });

  it('アンマウント後に setState が呼ばれない (active フラグ)', async () => {
    // query が resolve される前にアンマウントする
    let resolveQuery!: (value: MockPermissionStatus) => void;
    mockPermissionsQuery.mockReturnValue(new Promise((r) => (resolveQuery = r)));

    const { result, unmount } = renderHook(() => useCameraPermission());
    expect(result.current.permissionState).toBe('checking');
    unmount();

    // アンマウント後に resolve しても state 変化なし (React warning が出ないこと)
    act(() => {
      resolveQuery(makeMockPermStatus('granted'));
    });
    // still checking (state not updated after unmount)
    expect(result.current.permissionState).toBe('checking');
  });

  it('クリーンアップで removeEventListener が呼ばれる', async () => {
    mockPermStatus = makeMockPermStatus('prompt');
    mockPermissionsQuery.mockResolvedValue(mockPermStatus);

    const { unmount } = renderHook(() => useCameraPermission());
    await waitFor(() => expect(mockPermStatus.addEventListener).toHaveBeenCalled());

    unmount();

    expect(mockPermStatus.removeEventListener).toHaveBeenCalled();
  });
});
