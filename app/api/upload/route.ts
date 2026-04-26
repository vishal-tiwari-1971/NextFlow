import { NextResponse } from 'next/server';
import { createTransloaditParams, extractUploadedUrl, signTransloaditParams } from '../../../lib/transloadit';

export const runtime = 'nodejs';

type AssemblyStatus = {
  assembly_id?: string;
  assembly_ssl_url?: string;
  ok?: string;
  message?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getAssemblyStatus = async (assemblyUrl: string): Promise<AssemblyStatus> => {
  const response = await fetch(assemblyUrl);

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Failed to fetch assembly status (${response.status}): ${responseText}`);
  }

  return (await response.json()) as AssemblyStatus;
};

const waitForUploadedUrl = async (assemblyUrl: string) => {
  const timeoutMs = 30_000;
  const startedAt = Date.now();

  for (;;) {
    const status = await getAssemblyStatus(assemblyUrl);
    const url = extractUploadedUrl(status);

    if (url) {
      return url;
    }

    if (status.ok && status.ok !== 'ASSEMBLY_EXECUTING' && status.ok !== 'ASSEMBLY_UPLOADING') {
      throw new Error(status.message || `Transloadit assembly finished with status ${status.ok}.`);
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for Transloadit to finish processing the upload.');
    }

    await sleep(1000);
  }
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Missing file field.' }, { status: 400 });
    }

    const key = process.env.TRANSLOADIT_KEY;
    const secret = process.env.TRANSLOADIT_SECRET;

    if (!key || !secret) {
      return NextResponse.json(
        { message: 'Missing TRANSLOADIT_KEY or TRANSLOADIT_SECRET environment variable.' },
        { status: 500 },
      );
    }

    const paramsObject = createTransloaditParams(key);
    const { params, signature } = signTransloaditParams(paramsObject, secret);

    const transloaditFormData = new FormData();
    transloaditFormData.append('files', file);
    transloaditFormData.append('params', params);
    transloaditFormData.append('signature', signature);

    const transloaditResponse = await fetch('https://api2.transloadit.com/assemblies', {
      method: 'POST',
      body: transloaditFormData,
    });

    const payloadText = await transloaditResponse.text();
    const payload = (() => {
      try {
        return JSON.parse(payloadText) as unknown;
      } catch {
        return payloadText;
      }
    })();

    if (!transloaditResponse.ok) {
      return NextResponse.json(
        {
          message: 'Transloadit upload failed.',
          details: payload,
        },
        { status: transloaditResponse.status },
      );
    }

    const url = extractUploadedUrl(payload);

    if (url) {
      return NextResponse.json({ url });
    }

    const assemblyUrl =
      (typeof payload === 'object' && payload && 'assembly_ssl_url' in payload
        ? (payload as { assembly_ssl_url?: string }).assembly_ssl_url
        : null) ||
      (typeof payload === 'object' && payload && 'assembly_url' in payload
        ? (payload as { assembly_url?: string }).assembly_url
        : null);

    if (!assemblyUrl) {
      return NextResponse.json(
        {
          message: 'Transloadit did not return an assembly status URL.',
          details: payload,
        },
        { status: 502 },
      );
    }

    const finalUrl = await waitForUploadedUrl(assemblyUrl);

    return NextResponse.json({ url: finalUrl });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Upload failed.',
      },
      { status: 500 },
    );
  }
}