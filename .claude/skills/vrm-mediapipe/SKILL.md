---
name: vrm-mediapipe
description: VRM アバター (@pixiv/three-vrm) + MediaPipe 表情追従の実装ガイド。スマホ PoC チェックリスト、blendshape retarget、Realtime 連携、アクセシビリティ。メンバー B レーン参照用。
tags: ["vrm", "mediapipe", "avatar", "three.js", "tomokoi"]
---

# Skill: VRM アバター + MediaPipe

## 起動タイミング

- `src/infrastructure/avatar/` / `src/components/features/avatar/` の実装・変更時
- Phase 1 のスマホ PoC 設計時
- 表情追従のチューニング時
- パフォーマンス問題の診断時

## 技術スタック

- `three` + `@react-three/fiber` + `@react-three/drei`
- `@pixiv/three-vrm` (VRM 1.0 対応)
- `@mediapipe/tasks-vision` (FaceLandmarker)
- 音声は別レーン (メンバー C の WebRTC P2P)

## Phase 1 スマホ PoC チェックリスト (最優先)

**VRM 4 体同時描画 + MediaPipe が iPhone / Android ミドルレンジで動作するか**を Phase 1 (4/16-4/19) までに検証。

### 測定環境

- iPhone 12 / 13 / 14
- Pixel 6 / 7
- Android ミドルレンジ (Snapdragon 7 Gen 系)

### 測定項目

| 指標 | 閾値 |
|---|---|
| FPS (VRM 4 体同時) | 30 FPS 以上 |
| GPU メモリ使用量 | 端末 RAM の 30% 以下 |
| MediaPipe CPU 使用率 | 50% 以下 (主要スレッド) |
| 熱暴走 (5 分連続) | スロットリングが発生しない |

### 結果に応じた分岐

- **Go**: 本実装 (VRM 4 体 + MediaPipe フル)
- **Fallback-1**: VRM 2 体 (登壇ペアのみ)、他は 2D アバター
- **Fallback-2**: MediaPipe はデスクトップ限定、スマホは静止ポーズ
- **Fallback-3**: VRM 諦め、全員 2D アバター

## アーキテクチャ

```
src/infrastructure/avatar/
├── vrm-loader.ts         # VRM ロード + キャッシュ
├── mediapipe.ts          # FaceLandmarker 初期化 + 推論ループ
├── retarget.ts           # blendshape → VRM Expression マッピング
├── throttle.ts           # 30Hz throttle
└── types.ts              # AvatarState, BlendShape 等

src/components/features/avatar/
├── AvatarCanvas.tsx      # R3F シーン ("use client")
├── AvatarTile.tsx        # 1 体分の薄い wrapper
└── CameraPermission.tsx  # カメラ許可 UI
```

## VRM ロード

```ts
import { VRMLoaderPlugin } from "@pixiv/three-vrm"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"

const loader = new GLTFLoader()
loader.setDRACOLoader(new DRACOLoader().setDecoderPath("/draco/"))
loader.setMeshoptDecoder(MeshoptDecoder)
loader.register((parser) => new VRMLoaderPlugin(parser))

const gltf = await loader.loadAsync(url)
const vrm = gltf.userData.vrm
```

- DRACO / meshopt 圧縮された VRM ファイルを使う (サイズ 1/5 程度)
- テクスチャは `ktx2` / `basis` 推奨

## MediaPipe FaceLandmarker

```ts
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm")
const landmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task" },
  outputFaceBlendshapes: true,
  runningMode: "VIDEO",
  numFaces: 1,
})

// 推論ループ
const result = landmarker.detectForVideo(videoElement, performance.now())
const blendshapes = result.faceBlendshapes?.[0]?.categories ?? []
```

- 解像度は **192×192 以下** に抑えて FPS 優先
- WASM ファイルは `public/mediapipe/` に配置 (または CDN)

## blendshape → VRM Expression

```ts
const MAP: Record<string, string> = {
  mouthSmileLeft: "happy",
  mouthSmileRight: "happy",
  eyeBlinkLeft: "blinkLeft",
  eyeBlinkRight: "blinkRight",
  mouthOpen: "aa",
  // ...
}

export function applyRetarget(vrm: VRM, blendshapes: BlendShape[]) {
  for (const bs of blendshapes) {
    const expression = MAP[bs.categoryName]
    if (expression) vrm.expressionManager?.setValue(expression, bs.score)
  }
  vrm.expressionManager?.update()
}
```

## Realtime 連携 (メンバー C の API 経由)

```ts
const { emit, others } = useAvatarSync(eventId)

// 30Hz で自分の状態を送信
useFrame(() => {
  if (shouldEmit()) {
    emit({
      userId: me.id,
      blendshapes: compressBlendshapes(current), // 重要な 10 種類程度に圧縮
      headRotation: { x, y, z },
      mouthOpen: 0.0-1.0,
    })
  }
})

// 他の人の状態を VRM に反映
for (const [userId, state] of Object.entries(others)) {
  applyRetarget(vrmMap[userId], state.blendshapes)
}
```

**重要**: 直接 `supabase.channel(...)` を呼ばない。必ず C が提供する `useAvatarSync` 経由。

## アクセシビリティ

```ts
const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
if (prefersReducedMotion) {
  // 微細モーションを止める、まばたきのみ
  vrm.expressionManager?.setValue("happy", 0)
}
```

- カメラ許可は明示的に (`navigator.permissions.query({ name: "camera" })`)
- 拒否時は静止ポーズ + 音声のみ参加

## パフォーマンス最適化

- `frameloop="demand"` を基本、変化時のみ再描画
- VRM の材質を `MeshBasicMaterial` に切り替える (シャドウ不要時)
- LOD: 4 体中 2 体は低解像度テクスチャ
- `instancing` で同じアバターを複数描画 (可能なら)

## テスト

- VRM ロード成功 / 失敗のテスト (モック GLTF)
- MediaPipe モックでの retarget 正確性 (blendshape → Expression マッピング)
- `AvatarCanvas` のレンダリングテスト (vitest-browser)
- 30Hz throttle の動作

## 禁止事項

- 実機 PoC 前に本実装を進めない
- VRM 4 体同時描画が**必須前提**の UI 設計をしない (2 体フォールバックを想定)
- MediaPipe の生ランドマーク配列をそのまま Realtime に送らない (帯域爆発)
- カメラ許可を得ずに `getUserMedia` を呼ばない
- 音声を勝手に取得しない (音声は C の WebRTC)

## 関連

- [.claude/rules/vrm-avatar.md](../../rules/vrm-avatar.md)
- [.claude/rules/realtime-webrtc.md](../../rules/realtime-webrtc.md)
- [.claude/commands/member-b-avatar.md](../../commands/member-b-avatar.md)
- `docs/tech_spec/03_b_avator.md`
