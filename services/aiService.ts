
export const generateLetterDraft = async (instruction: string): Promise<string> => {
  try {
    const systemPrompt = `
Anda adalah sekretaris profesional di Pondok Pesantren. 
Tugas anda adalah membuat draf isi surat resmi berdasarkan instruksi pengguna.

Aturan Penting:
1. Gunakan Bahasa Indonesia yang baku, sopan, formal, dan islami.
2. Format output WAJIB HTML sederhana (gunakan tag <p>, <br>, <b>, <i>, <ul>, <li> saja). Jangan gunakan Markdown.
3. JANGAN sertakan Kop Surat, Tempat/Tanggal, atau Tanda Tangan (bagian ini sudah diatur otomatis oleh sistem lain).
4. Fokus hanya pada: Salam Pembuka, Isi Surat, dan Salam Penutup.
5. Gunakan placeholder berikut jika relevan: {NAMA_SANTRI}, {NIS}, {KELAS}, {ROMBEL}, {NAMA_WALI}.

Contoh Output yang diharapkan:
<p><b>Assalamu'alaikum Warahmatullahi Wabarakatuh,</b></p><p>Dengan hormat, kami sampaikan...</p><ul><li>Poin 1</li><li>Poin 2</li></ul><p>Demikian...</p><p><b>Wassalamu'alaikum Warahmatullahi Wabarakatuh.</b></p>
    `;
    
    // Combine system prompt and instruction
    const fullPrompt = `${systemPrompt}\n\nInstruksi Pengguna: ${instruction}`;
    
    // Use Pollinations.ai Text API
    // Using GET request with encoded prompt
    const url = `https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Cache-Control': 'no-cache'
        }
    });

    if (!response.ok) {
        throw new Error(`Pollinations AI Error: ${response.statusText}`);
    }
    
    let text = await response.text();
    
    // Clean up if AI returns markdown code blocks despite instructions
    text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    
    return text;
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};
