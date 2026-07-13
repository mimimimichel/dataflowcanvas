/**
 * @fileOverview A flow to generate a functional specification for a data pipeline.
 */

export interface GenerateSpecInput {
  nodes: any[];
  connectors: any[];
}

export interface GenerateSpecOutput {
  specification: string;
}

async function callGenerateSpec(input: GenerateSpecInput, mode?: 'functional' | 'product-spec'): Promise<GenerateSpecOutput> {
  const response = await fetch('/api/generate-spec', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nodes: input.nodes, connectors: input.connectors, mode }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

/** Human-readable Markdown functional specification. */
export async function generatePipelineSpec(input: GenerateSpecInput): Promise<GenerateSpecOutput> {
  return callGenerateSpec(input, 'functional');
}

/** Unified ODPS/DPDS/BITOL data product spec, in YAML, derived from the canvas. */
export async function generateDataProductSpec(input: GenerateSpecInput): Promise<GenerateSpecOutput> {
  return callGenerateSpec(input, 'product-spec');
}
