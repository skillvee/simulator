#!/usr/bin/env npx tsx

/**
 * Test script to verify Spanish translations on the results page
 */

async function testSpanishResults() {
  const baseUrl = 'http://localhost:3006';

  console.log('🧪 Testing Spanish translations on results page...\n');

  // Test if the Spanish locale returns Spanish content
  try {
    // First, let's check if we can get the page (even if redirected)
    const response = await fetch(`${baseUrl}/es/assessments/test-assessment-chat/results`, {
      headers: {
        'Cookie': 'next-auth.session-token=user@test.com'
      },
      redirect: 'follow'
    });

    const html = await response.text();

    // Check for key Spanish translations
    const spanishPhrases = [
      'Volver a Mis Evaluaciones',
      'Resultados de la Evaluación',
      'Fortalezas y Áreas de Desarrollo',
      'Tus Fortalezas',
      'Áreas para Desarrollar',
      'Desglose de Habilidades',
      'Estilo de Trabajo',
      'Comunicación',
      'Resolución de Problemas',
      'Conocimiento Técnico',
      'Colaboración',
      'Adaptabilidad',
      'Liderazgo',
      'Creatividad',
      'Gestión del Tiempo',
      'Excepcional',
      'Fuerte',
      'Cumple las expectativas',
      'Por debajo de las expectativas'
    ];

    const foundPhrases: string[] = [];
    const missingPhrases: string[] = [];

    for (const phrase of spanishPhrases) {
      if (html.includes(phrase)) {
        foundPhrases.push(phrase);
      } else {
        missingPhrases.push(phrase);
      }
    }

    // Check for English phrases that shouldn't be there
    const englishPhrases = [
      'Back to My Assessments',
      'Assessment Results',
      'Strengths & Areas to Develop',
      'Your Strengths',
      'Areas to Develop',
      'Skill Breakdown',
      'Work Style',
      'Communication',
      'Problem Solving',
      'Technical Knowledge',
      'Collaboration',
      'Adaptability',
      'Leadership',
      'Creativity',
      'Time Management',
      'Exceptional',
      'Strong',
      'Meets expectations',
      'Below expectations'
    ];

    const leakedEnglish: string[] = [];

    for (const phrase of englishPhrases) {
      if (html.includes(phrase)) {
        leakedEnglish.push(phrase);
      }
    }

    // Report results
    console.log(`✅ Found ${foundPhrases.length}/${spanishPhrases.length} Spanish phrases`);

    if (foundPhrases.length > 0) {
      console.log('\nSpanish phrases found:');
      foundPhrases.forEach(phrase => console.log(`  • ${phrase}`));
    }

    if (missingPhrases.length > 0) {
      console.log('\n⚠️  Missing Spanish phrases:');
      missingPhrases.forEach(phrase => console.log(`  • ${phrase}`));
    }

    if (leakedEnglish.length > 0) {
      console.log('\n❌ English phrases detected (should be Spanish):');
      leakedEnglish.forEach(phrase => console.log(`  • ${phrase}`));
    } else {
      console.log('\n✅ No English leaks detected');
    }

    // Check if page appears to be in Spanish
    const isSpanish = foundPhrases.length > 0 && leakedEnglish.length === 0;

    if (isSpanish) {
      console.log('\n✅ Results page is properly translated to Spanish!');
    } else {
      console.log('\n⚠️  Results page may have translation issues');
    }

  } catch (error) {
    console.error('❌ Error testing Spanish results:', error);
  }
}

// Run the test
testSpanishResults();