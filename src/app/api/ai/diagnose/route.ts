import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { issueType, description, workCenterCode } = await request.json();

    // Simulated Industrial AI Knowledge Base
    const knowledgeBase: Record<string, string[]> = {
      'MATERIAL': [
        'Check inventory balance in Warehouse A-1.',
        'Trigger emergency procurement for missing components.',
        'Review supplier lead time performance for this SKU.'
      ],
      'QUALITY': [
        'Inspect incoming material batch for dimension deviation.',
        'Recalibrate assembly jig J-102.',
        'Perform 100% visual inspection on the next 10 units.'
      ],
      'EQUIPMENT': [
        'Check pneumatic pressure on Station {wc}.',
        'Inspect motor heat levels and lubrication state.',
        'Schedule maintenance task if noise persists.'
      ],
      'PROCESS': [
        'Verify SOP revision version on current workstation.',
        'Adjust standard time parameters if bottleneck occurs.',
        'Provide immediate operator training on specific step.'
      ],
      'OTHER': [
        'Escalate to production supervisor for on-site review.',
        'Record as environmental factor if applicable.',
        'Check power stability in the current workshop zone.'
      ]
    };

    const recommendations = knowledgeBase[issueType] || knowledgeBase['OTHER'];
    
    // Simulate AI reasoning delay
    await new Promise(res => setTimeout(res, 1500));

    return NextResponse.json({
      diagnosis: `AI analysis of ${issueType} anomaly: Based on historical patterns, this is likely caused by ${description.toLowerCase().includes('shortage') ? 'supply chain delay' : 'operational inconsistency'}.`,
      recommendations: recommendations.map(r => r.replace('{wc}', workCenterCode || 'CURRENT')),
      confidence: 0.89 + Math.random() * 0.1
    });
  } catch (error) {
    return NextResponse.json({ error: 'DIAGNOSIS_FAILED' }, { status: 500 });
  }
}
