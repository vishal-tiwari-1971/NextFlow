import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ffmpegPath from 'ffmpeg-static';
import ffprobePath from 'ffprobe-static';
import {
  createTransloaditParams,
  extractUploadedUrl,
  signTransloaditParams,
} from './transloadit';

const execFileAsync = promisify(execFile);

type TimestampMode = 'seconds' | 'percentage';

type ExtractFrameOptions = {
  videoUrl: string;
  timestamp: number;
  timestampMode: TimestampMode;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const isWindows = process.platform === 'win32';

const quoteStripped = (value: string) => value.replace(/^"|"$/g, '').trim();

const fileExists = async (filePath: string | null | undefined) => {
  if (!filePath) {
    return false;
  }

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveFromNodeModules = (packageName: string, executableName: string) =>
  path.join(
    process.cwd(),
    'node_modules',
    packageName,
    'bin',
    process.platform,
    process.arch,
    executableName,
  );

const resolveFfmpegFromNodeModules = (executableName: string) =>
  path.join(process.cwd(), 'node_modules', 'ffmpeg-static', executableName);

let cachedFfmpegBin: string | null = null;
let cachedFfprobeBin: string | null = null;

const resolveFfprobeBin = async () => {
  if (cachedFfprobeBin) {
    return cachedFfprobeBin;
  }

  const importedPath = (ffprobePath as any).path || ffprobePath;

  const candidates = [
    process.env.FFPROBE_PATH,
    importedPath,
    resolveFromNodeModules('ffprobe-static', isWindows ? 'ffprobe.exe' : 'ffprobe'),
  ]
    .filter(Boolean)
    .map((candidate) => quoteStripped(candidate as string));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      cachedFfprobeBin = candidate;
      return candidate;
    }
  }

  throw new Error(
    `ffprobe executable not found. Checked: ${candidates.join(', ') || 'none'}. ` +
      'Set FFPROBE_PATH to a valid binary path.',
  );
};

const resolveFfmpegBin = async () => {
  if (cachedFfmpegBin) {
    return cachedFfmpegBin;
  }

  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegPath,
    resolveFfmpegFromNodeModules(isWindows ? 'ffmpeg.exe' : 'ffmpeg'),
  ]
    .filter(Boolean)
    .map((candidate) => quoteStripped(candidate as string));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      cachedFfmpegBin = candidate;
      return candidate;
    }
  }

  throw new Error(
    `ffmpeg executable not found. Checked: ${candidates.join(', ') || 'none'}. ` +
      'Set FFMPEG_PATH to a valid binary path.',
  );
};

const ensureExecutablePath = (value: string | null | undefined, label: string) => {
  if (!value) {
    throw new Error(`${label} executable is not available.`);
  }

  return value;
};

const getVideoDurationSeconds = async (videoPath: string): Promise<number> => {
  const probeBin = ensureExecutablePath(await resolveFfprobeBin(), 'ffprobe');

  const { stdout } = await execFileAsync(probeBin, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ]);

  const duration = Number.parseFloat(stdout.trim());

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Unable to detect video duration with ffprobe.');
  }

  return duration;
};

const resolveTimestampSeconds = async (
  videoPath: string,
  timestamp: number,
  timestampMode: TimestampMode,
) => {
  const safeTimestamp = Number.isFinite(timestamp) ? timestamp : 0;

  if (timestampMode === 'seconds') {
    return clamp(safeTimestamp, 0, Number.MAX_SAFE_INTEGER);
  }

  const durationSeconds = await getVideoDurationSeconds(videoPath);
  const percent = clamp(safeTimestamp, 0, 100);

  return clamp((percent / 100) * durationSeconds, 0, durationSeconds);
};

const extractFrameToFile = async (
  videoPath: string,
  outputPath: string,
  timestampSeconds: number,
) => {
  const ffmpegBin = ensureExecutablePath(await resolveFfmpegBin(), 'ffmpeg');
  const timeArg = Number.isFinite(timestampSeconds) ? timestampSeconds.toFixed(3) : '0.000';

  await execFileAsync(ffmpegBin, [
    '-y',
    '-ss',
    timeArg,
    '-i',
    videoPath,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    outputPath,
  ]);
};

const uploadImageFileToTransloadit = async (imagePath: string): Promise<string> => {
  const key = process.env.TRANSLOADIT_KEY;
  const secret = process.env.TRANSLOADIT_SECRET;

  if (!key || !secret) {
    throw new Error('Missing TRANSLOADIT_KEY or TRANSLOADIT_SECRET environment variable.');
  }

  const fileBuffer = await fs.readFile(imagePath);
  const fileName = path.basename(imagePath);
  const paramsObject = createTransloaditParams(key);
  const { params, signature } = signTransloaditParams(paramsObject, secret);

  const formData = new FormData();
  formData.append('files', new Blob([fileBuffer], { type: 'image/jpeg' }), fileName);
  formData.append('params', params);
  formData.append('signature', signature);

  const response = await fetch('https://api2.transloadit.com/assemblies', {
    method: 'POST',
    body: formData,
  });

  const payloadText = await response.text();
  const payload = (() => {
    try {
      return JSON.parse(payloadText) as unknown;
    } catch {
      return payloadText;
    }
  })();

  if (!response.ok) {
    throw new Error(
      `Failed to upload extracted frame to Transloadit (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  const directUrl = extractUploadedUrl(payload);
  if (directUrl) {
    return directUrl;
  }

  const assemblyUrl =
    (typeof payload === 'object' && payload && 'assembly_ssl_url' in payload
      ? (payload as { assembly_ssl_url?: string }).assembly_ssl_url
      : null) ||
    (typeof payload === 'object' && payload && 'assembly_url' in payload
      ? (payload as { assembly_url?: string }).assembly_url
      : null);

  if (!assemblyUrl) {
    throw new Error('Transloadit did not return an assembly status URL for extracted frame upload.');
  }

  const timeoutMs = 30_000;
  const startedAt = Date.now();

  for (;;) {
    const statusResponse = await fetch(assemblyUrl);
    if (!statusResponse.ok) {
      const statusText = await statusResponse.text();
      throw new Error(
        `Failed to fetch Transloadit assembly status (${statusResponse.status}): ${statusText}`,
      );
    }

    const statusPayload = (await statusResponse.json()) as unknown;
    const url = extractUploadedUrl(statusPayload);
    if (url) {
      return url;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for Transloadit to finish extracted frame upload.');
    }

    await sleep(1000);
  }
};

const downloadVideoToFile = async (videoUrl: string, outputPath: string) => {
  const response = await fetch(videoUrl, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to download video (${response.status}) from ${videoUrl}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
};

export const extractFrameFromVideoUrl = async ({
  videoUrl,
  timestamp,
  timestampMode,
}: ExtractFrameOptions): Promise<{ frameImageUrl: string; timestampSeconds: number }> => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nextflow-frame-'));
  const id = crypto.randomUUID();
  const tempVideoPath = path.join(tempDir, `${id}.mp4`);
  const tempFramePath = path.join(tempDir, `${id}.jpg`);

  try {
    await downloadVideoToFile(videoUrl, tempVideoPath);
    const timestampSeconds = await resolveTimestampSeconds(tempVideoPath, timestamp, timestampMode);
    await extractFrameToFile(tempVideoPath, tempFramePath, timestampSeconds);
    const frameImageUrl = await uploadImageFileToTransloadit(tempFramePath);

    return {
      frameImageUrl,
      timestampSeconds,
    };
  } finally {
    await Promise.allSettled([
      fs.rm(tempVideoPath, { force: true }),
      fs.rm(tempFramePath, { force: true }),
      fs.rm(tempDir, { force: true, recursive: true }),
    ]);
  }
};
