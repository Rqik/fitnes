/// <reference lib="webworker" />

import type { AppleHealthMeasurement } from '../domain/appleHealth';
import { readAppleHealthFile } from './readAppleHealthFile';

export type AppleHealthWorkerResult =
  | { kind: 'ready'; measurements: AppleHealthMeasurement[] }
  | { kind: 'error'; message: string };

const worker = self as unknown as DedicatedWorkerGlobalScope;
worker.onmessage = async ({ data: file }: MessageEvent<File>) => {
  let result: AppleHealthWorkerResult;
  try {
    result = { kind: 'ready', measurements: await readAppleHealthFile(file) };
  } catch (error) {
    result = { kind: 'error', message: error instanceof Error ? error.message : 'Не удалось прочитать файл Apple Health.' };
  }
  worker.postMessage(result);
};
