
// Menggunakan layanan Text Generation gratis dari Pollinations.ai
// Tidak memerlukan API Key.

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

    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
    
    if (!response.ok) {
        throw new Error("Layanan AI sedang sibuk, coba lagi nanti.");
    }

    let text = await response.text();
    // Bersihkan markdown jika AI bandel
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    
    return text;
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

    const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);

    if (!response.ok) {
        throw new Error("Layanan AI sedang sibuk.");
    }

    return await response.text();
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

        const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
        
        if (!response.ok) return "Sistem siap menganalisis data Anda segera setelah aktivitas operasional tercatat.";
        
        return await response.text();
    } catch (error) {
        return "Gunakan aplikasi secara rutin untuk mendapatkan visualisasi tren dan wawasan cerdas.";
    }
};
