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

    const { requirement } = await req.json();

    const prompt = `You are an expert Data Architect for Palantir Foundry.
The user will provide a business requirement for a data pipeline.
Your task is to propose a high-level visual scaffold of nodes (Sources, Transformations, Destinations) to meet this requirement.

Requirement: ${requirement}

Please provide:
1. A logical set of source datasets.
2. The transformation steps (joins, filters, aggregations).
3. The final target destination.

Position the nodes on a 2D canvas (X from 0 to 1000, Y from 0 to 600) to create a clean, left-to-right flow.

Return ONLY a valid JSON object with the following structure (no markdown, no code fences, just the JSON):
{
  "nodes": [
    {
      "name": "Source Name",
      "type": "source",
      "description": "Description of the source",
      "operationType": "",
      "x": 100,
      "y": 200
    },
    {
      "name": "Transform Name",
      "type": "transformation",
      "description": "Description of the transform",
      "operationType": "filter",
      "x": 400,
      "y": 200
    },
    {
      "name": "Output Name",
      "type": "destination",
      "description": "Description of the destination",
      "operationType": "",
      "x": 700,
      "y": 200
    }
  ],
  "connectors": [
    { "fromIndex": 0, "toIndex": 1 },
    { "fromIndex": 1, "toIndex": 2 }
  ]
}

Node types must be one of: "source", "transformation", "destination", "dataset".`;

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'DataflowCanvas Scaffold Generator',
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
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse the JSON from the response
    let parsedOutput;
    try {
      // Handle cases where the response might have markdown code fences
      const cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsedOutput = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse scaffold JSON:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse scaffold output from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json(parsedOutput);
  } catch (error) {
    console.error('Error generating scaffold:', error);
    return NextResponse.json(
      { error: 'Failed to generate scaffold' },
      { status: 500 }
    );
  }
}
