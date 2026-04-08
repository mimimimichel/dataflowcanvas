import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const { nodes, connectors } = await req.json();

    const prompt = `You are an expert Data Architect and Technical Writer. 
Your task is to write a professional Functional Specification for a data pipeline designed in a visual tool.

Below is the JSON representation of the pipeline:
Nodes: ${JSON.stringify(nodes, null, 2)}
Connectors: ${JSON.stringify(connectors, null, 2)}

Please structure the specification as follows:
1. **Executive Summary**: A brief overview of what this pipeline accomplishes.
2. **Data Sources**: List all source nodes, their systems, and locations.
3. **Logic & Transformations**: Detailed step-by-step description of the transformations (filters, joins, aggregations, etc.). Explain the business logic clearly.
4. **Data Destinations**: Where the data ends up.
5. **Schema Evolution**: Note how the fields change through the pipeline.

Use professional, clear, and concise technical English. Return the result in clean Markdown.`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'DataflowCanvas Spec Generator',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', errorData);
      return NextResponse.json(
        { error: `OpenRouter API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const specification = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({ specification });
  } catch (error) {
    console.error('Error generating spec:', error);
    return NextResponse.json(
      { error: 'Failed to generate specification' },
      { status: 500 }
    );
  }
}
