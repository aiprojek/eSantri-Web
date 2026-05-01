
import { db } from '../db';
import { AiConfig } from '../types';

// Menggunakan layanan Text Generation gratis dari Pollinations.ai
// Tidak memerlukan API Key.

const isProviderNotice = (text: string): boolean => {
  const normalized = (text || '').toLowerCase();
  return (
    normalized.includes('important notice') ||
    normalized.includes('pollinations legacy text api') ||
    normalized.includes('being deprecated') ||
    normalized.includes('migrate to our new service') ||
    normalized.includes('enter.pollinations.ai')
  );
};

const normalizeAiText = (text: string): string => {
  return (text || '')
    .replace(/```html/g, '')
    .replace(/```/g, '')
    .trim();
};

const ensureUsableAiResponse = (rawText: string, fallbackMessage: string): string => {
  const cleaned = normalizeAiText(rawText);
  if (!cleaned || isProviderNotice(cleaned)) {
    throw new Error(fallbackMessage);
  }
  return cleaned;
};

const getAiConfig = async (): Promise<AiConfig> => {
  try {
    const settingsList = await db.settings.toArray();
    const config = settingsList[0]?.aiConfig;
    return {
      provider: config?.provider || 'pollinations',
      preferByok: config?.preferByok || false,
      openaiApiKey: config?.openaiApiKey || '',
      openaiModel: config?.openaiModel || 'gpt-4.1-mini',
      openaiImageModel: config?.openaiImageModel || 'gpt-image-1',
      geminiApiKey: config?.geminiApiKey || '',
      geminiModel: config?.geminiModel || 'gemini-2.5-flash',
      openrouterApiKey: config?.openrouterApiKey || '',
      openrouterModel: config?.openrouterModel || 'openai/gpt-4.1-mini',
      openrouterAutoFreeFallback: config?.openrouterAutoFreeFallback ?? true,
      openrouterFreeModelPool: config?.openrouterFreeModelPool || [],
      enablePosterImageGeneration: config?.enablePosterImageGeneration ?? true,
      openaiLastTestAt: config?.openaiLastTestAt || '',
      openaiLastTestOk: config?.openaiLastTestOk,
      geminiLastTestAt: config?.geminiLastTestAt || '',
      geminiLastTestOk: config?.geminiLastTestOk,
      openrouterLastTestAt: config?.openrouterLastTestAt || '',
      openrouterLastTestOk: config?.openrouterLastTestOk
    };
  } catch {
    return {
      provider: 'pollinations',
      preferByok: false,
      openaiApiKey: '',
      openaiModel: 'gpt-4.1-mini',
      openaiImageModel: 'gpt-image-1',
      geminiApiKey: '',
      geminiModel: 'gemini-2.5-flash',
      openrouterApiKey: '',
      openrouterModel: 'openai/gpt-4.1-mini',
      openrouterAutoFreeFallback: true,
      openrouterFreeModelPool: [],
      enablePosterImageGeneration: true,
      openaiLastTestAt: '',
      openaiLastTestOk: undefined,
      geminiLastTestAt: '',
      geminiLastTestOk: undefined,
      openrouterLastTestAt: '',
      openrouterLastTestOk: undefined
    };
  }
};

const callOpenAIText = async (prompt: string, model: string, apiKey: string): Promise<string> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'You are a precise assistant. Follow user instructions exactly.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error (${response.status})`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return ensureUsableAiResponse(text, 'OpenAI tidak mengembalikan teks yang valid.');
};

const callGeminiText = async (prompt: string, model: string, apiKey: string): Promise<string> => {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error (${response.status})`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: any) => p?.text || '').join('\n').trim();
  return ensureUsableAiResponse(text, 'Gemini tidak mengembalikan teks yang valid.');
};

const callOpenRouterText = async (prompt: string, model: string, apiKey: string): Promise<string> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'You are a precise assistant. Follow user instructions exactly.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error (${response.status})`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return ensureUsableAiResponse(text, 'OpenRouter tidak mengembalikan teks yang valid.');
};

const callPollinationsText = async (prompt: string, providerErrorMessage: string): Promise<string> => {
  const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
  if (!response.ok) {
    throw new Error(providerErrorMessage);
  }
  const text = await response.text();
  return ensureUsableAiResponse(text, providerErrorMessage);
};

const generateTextWithConfiguredProvider = async (
  prompt: string,
  pollinationsErrorMessage: string
): Promise<string> => {
  const cfg = await getAiConfig();

  const tryOpenAI = async () => {
    if (!cfg.openaiApiKey) throw new Error('OpenAI API key belum diisi.');
    return callOpenAIText(prompt, cfg.openaiModel || 'gpt-4.1-mini', cfg.openaiApiKey);
  };

  const tryGemini = async () => {
    if (!cfg.geminiApiKey) throw new Error('Gemini API key belum diisi.');
    return callGeminiText(prompt, cfg.geminiModel || 'gemini-2.5-flash', cfg.geminiApiKey);
  };

  const tryOpenRouter = async () => {
    if (!cfg.openrouterApiKey) throw new Error('OpenRouter API key belum diisi.');
    const primaryModel = cfg.openrouterModel || 'openai/gpt-4.1-mini';
    const modelPool = [
      primaryModel,
      ...((cfg.openrouterFreeModelPool || []).filter((m) => m && m !== primaryModel))
    ];

    let lastError: Error | null = null;
    for (const model of modelPool) {
      try {
        return await callOpenRouterText(prompt, model, cfg.openrouterApiKey);
      } catch (error) {
        lastError = error as Error;
        if (!cfg.openrouterAutoFreeFallback) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('OpenRouter request gagal.');
  };

  // Prioritas BYOK
  if (cfg.preferByok) {
    try {
      if (cfg.provider === 'openai') return await tryOpenAI();
      if (cfg.provider === 'gemini') return await tryGemini();
      if (cfg.provider === 'openrouter') return await tryOpenRouter();
    } catch (error) {
      console.warn('BYOK provider failed, fallback to Pollinations:', error);
    }
  } else {
    // Provider dipilih langsung
    try {
      if (cfg.provider === 'openai') return await tryOpenAI();
      if (cfg.provider === 'gemini') return await tryGemini();
      if (cfg.provider === 'openrouter') return await tryOpenRouter();
    } catch (error) {
      console.warn('Selected provider failed, fallback to Pollinations:', error);
    }
  }

  return callPollinationsText(prompt, pollinationsErrorMessage);
};

export const generateLetterDraft = async (instruction: string): Promise<string> => {
  try {
    const prompt = `
      Anda adalah sekretaris profesional di Pondok Pesantren.
      Buatkan draf isi surat resmi (HTML format, tanpa kop/tanda tangan) berdasarkan instruksi: "${instruction}".
      
      Aturan:
      1. Gunakan Bahasa Indonesia formal dan sopan.
      2. Format output WAJIB HTML tag standar (<p>, <b>, <ul>, <li>, <br>).
      3. JANGAN gunakan Markdown (NO \`\`\`html). Langsung return string HTML.
      4. Fokus hanya pada: Salam Pembuka, Isi Surat, dan Salam Penutup.
      5. Gunakan placeholder: {NAMA_SANTRI}, {NIS}, {KELAS} jika perlu.
    `;

    return await generateTextWithConfiguredProvider(
      prompt,
      'Layanan AI draft surat sedang bermasalah. Coba lagi beberapa saat.'
    );
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};

export const generatePosterPrompt = async (
    style: string, 
    ratio: string, 
    details: string,
    info: string
): Promise<string> => {
  try {
    const prompt = `
      Act as an expert Prompt Engineer for Midjourney v6 or DALL-E 3.
      Create a detailed image prompt for a "New Student Admission" (Penerimaan Santri Baru) poster for an Islamic Boarding School.
      
      Parameters:
      - Design Style: ${style}
      - Target Dimension/Ratio: ${ratio}
      - Key Text/Layout Context: "${info}" (Design the negative space to accommodate this text).
      - Specific Visual Details: "${details}"
      
      Output Rules:
      1. Provide ONLY the prompt text in English.
      2. No introductions, no explanations.
      3. Describe lighting, color palette, composition, and mood based on the style.
      4. If the ratio is standard (1:1, 16:9, 9:16), append --ar [ratio]. If it is a paper size (A4, F4, A3), append --ar 210:297 or similar appropriate aspect ratio.
    `;

    return await generateTextWithConfiguredProvider(
      prompt,
      'Layanan AI prompt poster sedang bermasalah. Coba lagi nanti.'
    );
  } catch (error) {
    console.error("AI Poster Prompt Error:", error);
    throw error;
  }
};

export const generateDashboardInsight = async (data: any): Promise<string> => {
    try {
        const prompt = `
            Anda adalah konsultan manajemen Pondok Pesantren yang cerdas.
            Berdasarkan data berikut, berikan 2-3 kalimat wawasan (insight) yang sangat singkat, padat, dan analitis.
            
            Data:
            - Kesehatan (Keluhan Terbanyak): ${JSON.stringify(data.healthTrends)}
            - Arus Kas (6 Bulan): ${JSON.stringify(data.cashflow)}
            - Aktivitas Tahfizh: ${JSON.stringify(data.tahfizhProgress)}
            - Status Santri: ${JSON.stringify(data.santriStats)}
            
            Aturan:
            1. Jika data kosong (count 0), katakan data masih minim untuk analitik mendalam.
            2. Gunakan Bahasa Indonesia profesional.
            3. Maksimal 300 karakter.
            4. Jangan gunakan pembukaan "Berdasarkan data...". Langsung poin intinya.
        `;

        const text = await generateTextWithConfiguredProvider(
          prompt,
          'Sistem siap menganalisis data Anda segera setelah aktivitas operasional tercatat.'
        );
        return normalizeAiText(text);
    } catch (error) {
        return "Gunakan aplikasi secara rutin untuk mendapatkan visualisasi tren dan wawasan cerdas.";
    }
};

export const generatePosterImage = async (
  prompt: string,
  ratio: string = '9:16'
): Promise<{ imageUrl: string; source: 'openai' | 'pollinations' }> => {
  const cfg = await getAiConfig();
  const [width, height] =
    ratio === '1:1'
      ? [1024, 1024]
      : ratio === '16:9'
        ? [1536, 896]
        : [896, 1536];

  if (cfg.enablePosterImageGeneration !== false && cfg.openaiApiKey && cfg.provider === 'openai') {
    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.openaiApiKey}`
        },
        body: JSON.stringify({
          model: cfg.openaiImageModel || 'gpt-image-1',
          prompt,
          size: width === height ? '1024x1024' : width > height ? '1536x1024' : '1024x1536'
        })
      });
      if (response.ok) {
        const data = await response.json();
        const b64 = data?.data?.[0]?.b64_json;
        if (b64) {
          return { imageUrl: `data:image/png;base64,${b64}`, source: 'openai' };
        }
      }
    } catch (error) {
      console.warn('OpenAI image generation failed, fallback to pollinations:', error);
    }
  }

  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;
  return { imageUrl, source: 'pollinations' };
};
