import crypto from 'crypto';

type TransloaditAssemblyParams = {
  auth: {
    key: string;
    expires: string;
    nonce: string;
  };
  steps: {
    ':original': {
      robot: '/upload/handle';
    };
  };
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );

    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

export const createTransloaditParams = (key: string): TransloaditAssemblyParams => ({
  auth: {
    key,
    expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    nonce: crypto.randomUUID(),
  },
  steps: {
    ':original': {
      robot: '/upload/handle',
    },
  },
});

export const signTransloaditParams = (params: TransloaditAssemblyParams, secret: string) => {
  const serializedParams = stableStringify(params);
  const signature = crypto
    .createHmac('sha384', secret)
    .update(serializedParams)
    .digest('hex');

  return {
    params: serializedParams,
    signature: `sha384:${signature}`,
  };
};

export const extractUploadedUrl = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  type TransloaditFile = {
    ssl_url?: string;
    url?: string;
  };

  const pickFirstUrl = (files?: TransloaditFile[]) => files?.[0]?.ssl_url ?? files?.[0]?.url ?? null;

  const data = payload as {
    uploads?: TransloaditFile[];
    results?: Record<string, TransloaditFile[] | undefined>;
    assembly?: {
      uploads?: TransloaditFile[];
      results?: Record<string, TransloaditFile[] | undefined>;
    };
  };

  const topLevelResults = data.results ?? {};
  const nestedResults = data.assembly?.results ?? {};
  const topLevelResultKeys = Object.keys(topLevelResults);
  const nestedResultKeys = Object.keys(nestedResults);

  return (
    pickFirstUrl(data.uploads) ??
    pickFirstUrl(data.assembly?.uploads) ??
    pickFirstUrl(topLevelResults[':original']) ??
    pickFirstUrl(topLevelResultKeys.length > 0 ? topLevelResults[topLevelResultKeys[0]] : undefined) ??
    pickFirstUrl(nestedResults[':original']) ??
    pickFirstUrl(nestedResultKeys.length > 0 ? nestedResults[nestedResultKeys[0]] : undefined) ??
    null
  );
};