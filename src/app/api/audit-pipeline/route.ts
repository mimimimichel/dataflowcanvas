import { NextRequest, NextResponse } from 'next/server';
import { computeComplianceAudit } from '@/lib/compliance-audit';
import type { PipelineNode, Connector } from '@/lib/pipeline-data';

export async function POST(req: NextRequest) {
  try {
    const { nodes, connectors } = (await req.json()) as { nodes: PipelineNode[]; connectors: Connector[] };
    const result = computeComplianceAudit(nodes || [], connectors || []);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error auditing pipeline:', error);
    return NextResponse.json({ error: 'Failed to audit pipeline' }, { status: 500 });
  }
}
