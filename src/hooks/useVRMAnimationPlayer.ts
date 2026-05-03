import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { AnimationMixer, LoopRepeat, LoopOnce } from 'three';
import type { AnimationAction } from 'three';
import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';
import type { VRM } from '@pixiv/three-vrm';
import { vrmaLoader } from '@/infrastructure/vrm/vrma-loader';

const IDLE_URL = '/vrma/idle.vrma';
const TALKING_URLS = ['/vrma/talking01.vrma', '/vrma/talking02.vrma', '/vrma/talking03.vrma'];
const CROSSFADE_S = 0.3;
const TALK_ONSET_MS = 100;
const TALK_RELEASE_MS = 300;
const TALK_THRESHOLD = 0.05;

interface Options {
  vrm: VRM | null;
  talkingWeight: number;
  reducedMotion: boolean;
}

interface AnimRefs {
  readonly idleAction: MutableRefObject<AnimationAction | null>;
  readonly talkingActions: MutableRefObject<AnimationAction[]>;
  readonly currentTalkAction: MutableRefObject<AnimationAction | null>;
  readonly state: MutableRefObject<'idle' | 'talking'>;
  readonly weightHighAcc: MutableRefObject<number>;
  readonly weightLowAcc: MutableRefObject<number>;
}

function makeTransitionToIdle(refs: AnimRefs): () => void {
  return function (): void {
    refs.state.current = 'idle';
    refs.weightHighAcc.current = 0;
    refs.weightLowAcc.current = 0;
    const talkAction = refs.currentTalkAction.current;
    refs.currentTalkAction.current = null;
    const idleAction = refs.idleAction.current;
    if (!idleAction) return;
    if (talkAction) talkAction.crossFadeTo(idleAction, CROSSFADE_S, true);
    idleAction.play();
  };
}

function makeTransitionToTalking(refs: AnimRefs): (index: number) => void {
  return function (index: number): void {
    const idleAction = refs.idleAction.current;
    const talkingActions = refs.talkingActions.current;
    if (!idleAction || talkingActions.length === 0) return;
    const talkAction = talkingActions[index % talkingActions.length];
    if (!talkAction) return;
    refs.currentTalkAction.current = talkAction;
    refs.state.current = 'talking';
    refs.weightHighAcc.current = 0;
    refs.weightLowAcc.current = 0;
    talkAction.reset();
    talkAction.weight = 1;
    idleAction.crossFadeTo(talkAction, CROSSFADE_S, true);
    talkAction.play();
  };
}

function loadAnimationActions(
  vrm: VRM,
  mixer: AnimationMixer,
  refs: AnimRefs,
  onTalkFinished: () => void,
  isCancelled: () => boolean,
): void {
  Promise.all([IDLE_URL, ...TALKING_URLS].map((url) => vrmaLoader.load(url))).then((results) => {
    if (isCancelled()) return;
    const [idleResult, ...talkingResults] = results;
    if (!idleResult?.ok) return;

    const idleAction = mixer.clipAction(createVRMAnimationClip(idleResult.value, vrm));
    idleAction.setLoop(LoopRepeat, Infinity);
    idleAction.play();
    refs.idleAction.current = idleAction;

    const talkingActions: AnimationAction[] = [];
    for (const result of talkingResults) {
      if (!result?.ok) continue;
      const action = mixer.clipAction(createVRMAnimationClip(result.value, vrm));
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.weight = 0;
      talkingActions.push(action);
    }
    refs.talkingActions.current = talkingActions;

    mixer.addEventListener('finished', (e) => {
      if (e.action === refs.currentTalkAction.current) onTalkFinished();
    });
  });
}

export function useVRMAnimationPlayer({ vrm, talkingWeight, reducedMotion }: Options): void {
  const mixerRef = useRef<AnimationMixer | null>(null);
  const idleActionRef = useRef<AnimationAction | null>(null);
  const talkingActionsRef = useRef<AnimationAction[]>([]);
  const currentTalkActionRef = useRef<AnimationAction | null>(null);
  const stateRef = useRef<'idle' | 'talking'>('idle');
  const weightHighAccRef = useRef(0);
  const weightLowAccRef = useRef(0);
  const reducedMotionRef = useRef(reducedMotion);
  const talkingWeightRef = useRef(talkingWeight);
  const transitionToTalkingRef = useRef<((index: number) => void) | null>(null);
  const transitionToIdleRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  });
  useEffect(() => {
    talkingWeightRef.current = talkingWeight;
  });

  useEffect(() => {
    if (!vrm) return;

    const mixer = new AnimationMixer(vrm.scene);
    mixerRef.current = mixer;
    stateRef.current = 'idle';
    weightHighAccRef.current = 0;
    weightLowAccRef.current = 0;
    currentTalkActionRef.current = null;
    let cancelled = false;

    const refs: AnimRefs = {
      idleAction: idleActionRef,
      talkingActions: talkingActionsRef,
      currentTalkAction: currentTalkActionRef,
      state: stateRef,
      weightHighAcc: weightHighAccRef,
      weightLowAcc: weightLowAccRef,
    };
    const transitionToIdle = makeTransitionToIdle(refs);
    const transitionToTalking = makeTransitionToTalking(refs);
    transitionToIdleRef.current = transitionToIdle;
    transitionToTalkingRef.current = transitionToTalking;

    loadAnimationActions(vrm, mixer, refs, transitionToIdle, () => cancelled);

    return () => {
      cancelled = true;
      transitionToIdleRef.current = null;
      transitionToTalkingRef.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(vrm.scene);
      mixerRef.current = null;
      idleActionRef.current = null;
      talkingActionsRef.current = [];
      currentTalkActionRef.current = null;
      stateRef.current = 'idle';
    };
  }, [vrm]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    if (!mixer) return;

    mixer.update(delta);

    const weight = talkingWeightRef.current;
    const state = stateRef.current;

    if (reducedMotionRef.current) {
      if (state === 'talking') transitionToIdleRef.current?.();
      return;
    }

    const deltaMs = delta * 1000;

    if (state === 'idle') {
      if (weight >= TALK_THRESHOLD) {
        weightHighAccRef.current += deltaMs;
        if (weightHighAccRef.current >= TALK_ONSET_MS && talkingActionsRef.current.length > 0) {
          const index = Math.floor(Math.random() * talkingActionsRef.current.length);
          transitionToTalkingRef.current?.(index);
        }
      } else {
        weightHighAccRef.current = 0;
      }
    } else {
      if (weight < TALK_THRESHOLD) {
        weightLowAccRef.current += deltaMs;
        if (weightLowAccRef.current >= TALK_RELEASE_MS) {
          transitionToIdleRef.current?.();
        }
      } else {
        weightLowAccRef.current = 0;
      }
    }
  });
}
