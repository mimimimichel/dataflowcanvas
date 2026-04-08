/**
 * @fileOverview A flow to architect a pipeline scaffold from a business requirement.
 */

export interface ArchitectInput {
  requirement: string;
}

export interface ArchitectNode {
  name: string;
  type: 'source' | 'transformation' | 'destination' | 'dataset';
  description: string;
  operationType?: string;
  x: number;
  y: number;
}

export interface ArchitectConnector {
  fromIndex: number;
  toIndex: number;
}

export interface ArchitectOutput {
  nodes: ArchitectNode[];
  connectors: ArchitectConnector[];
}

export async function architectPipeline(input: ArchitectInput): Promise<ArchitectOutput> {
  const response = await fetch('/api/generate-scaffold', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requirement: input.requirement }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}
