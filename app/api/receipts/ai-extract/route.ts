import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, invoiceNumber } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Use Ollama AI to extract line items
    const prompt = `You are extracting line items from an invoice. Look for the itemized services or products with their prices.

IMPORTANT:
- Ignore headers like "Description", "Quantity", "Amount", "Unit Price"
- Ignore totals like "Subtotal", "VAT", "TOTAL", "Balance Due"
- Only extract actual line items with their individual prices
- Combine multi-line descriptions if they're part of one item
- Return ONLY valid JSON array, no other text

Invoice text:
${text}

Return this exact JSON format:
[
  {"description": "Service or product name", "amount": 50.00},
  {"description": "Another service", "amount": 25.00}
]

JSON array:`;

    const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma2:27b',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for more accurate extraction
          num_predict: 1000
        }
      })
    });

    if (!ollamaResponse.ok) {
      throw new Error('Ollama API failed');
    }

    const ollamaData = await ollamaResponse.json();
    let aiResponse = ollamaData.response;

    console.log('AI Response:', aiResponse);

    // Try to parse JSON from the response
    let lineItems = [];
    
    try {
      // Remove markdown code blocks if present
      aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON array in the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        lineItems = JSON.parse(jsonMatch[0]);
      } else {
        lineItems = JSON.parse(aiResponse);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', aiResponse);
      
      // Fallback: try to extract manually from text response
      const itemMatches = aiResponse.matchAll(/"description":\s*"([^"]+)",\s*"amount":\s*(\d+\.?\d*)/g);
      for (const match of itemMatches) {
        lineItems.push({
          description: match[1],
          amount: parseFloat(match[2])
        });
      }
    }

    return NextResponse.json({
      success: true,
      lineItems,
      invoiceNumber
    });
  } catch (error) {
    console.error('Error in AI extraction:', error);
    return NextResponse.json(
      { error: 'Failed to extract with AI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

