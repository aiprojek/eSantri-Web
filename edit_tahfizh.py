#!/usr/bin/env python3
import sys

with open(sys.argv[1], 'r') as f:
    content = f.read()

old = (
    'export const TahfizhProgressTemplate: React.FC<{ settings: PondokSettings; santuarioList: Santri[]; tahfizhList: TahfizhRecord[] }> = ({ settings, santuarioList, tahfizhList }) => {\n'
    '    const rows = santuarioList.map(s => {\n'
    '        const rec = tahfizhList.filter(t => t.santriId === s.id);\n'
    '        const ziyadah = rec.filter(t => t.tipe === \'Ziyadah\').length;\n'
    '        const ujian = rec.filter(t => t.tipe === \'Ujian Hafalan\').length;\n'
    '        const murojaah = rec.filter(t => t.tipe === \'Murojaah\').length;\n'
    '        const tasmi = rec.filter(t => t.tipe === "Tasmi\'").length;\n'
    '        const lancar = rec.filter(t => t.predikat === \'Sangat Lancar\' || t.predikat === \'Lancar\').length;\n'
    '        const persen = rec.length > 0 ? Math.round((lancar / rec.length) * 100) : 0;\n'
    '        return { santuario: s, total: rec.length, ziyadah, murojaah, tasmi, ujian, persen };\n'
    '    }).sort((a, b) => b.total - a.total);'
)

new = (
    'export const TahfizhProgressTemplate: React.FC<{\n'
    '    settings: PondokSettings;\n'
    '    santuarioList: Santri[];\n'
    '    tahfizhList: TahfizhRecord[];\n'
    '    startDate?: string;\n'
    '    endDate?: string;\n'
    '    tipeFilter?: string[];\n'
    '}> = ({ settings, santuarioList, tahfizhList, startDate, endDate, tipeFilter }) => {\n'
    '    const filteredList = tahfizhList.filter(t => {\n'
    '        if (!startDate && !endDate) return true;\n'
    '        const date = new Date(t.tanggal);\n'
    '        if (startDate && date < new Date(startDate)) return false;\n'
    '        if (endDate && date > new Date(endDate + \'T23:59:59\')) return false;\n'
    '        return true;\n'
    '    });\n'
    '\n'
    '    const rows = santuarioList.map(s => {\n'
    '        const rec = filteredList.filter(t => t.santriId === s.id);\n'
    '        const hasZiyadah = !tipeFilter || tipeFilter.includes(\'Ziyadah\');\n'
    '        const hasUjian = !tipeFilter || tipeFilter.includes(\'Ujian Hafalan\');\n'
    '        const hasMurojaah = !tipeFilter || tipeFilter.includes(\'Murojaah\');\n'
    '        const hasTasmi = !tipeFilter || tipeFilter.includes("Tasmi\'");\n'
    '        const ziyadah = hasZiyadah ? rec.filter(t => t.tipe === \'Ziyadah\').length : 0;\n'
    '        const ujian = hasUjian ? rec.filter(t => t.tipe === \'Ujian Hafalan\').length : 0;\n'
    '        const murojaah = hasMurojaah ? rec.filter(t => t.tipe === \'Murojaah\').length : 0;\n'
    '        const tasmi = hasTasmi ? rec.filter(t => t.tipe === "Tasmi\'").length : 0;\n'
    '        const lancar = rec.filter(t => t.predikat === \'Sangat Lancar\' || t.predikat === \'Lancar\').length;\n'
    '        const persen = rec.length > 0 ? Math.round((lancar / rec.length) * 100) : 0;\n'
    '        return { santuario: s, total: rec.length, ziyadah, murojaah, tasmi, ujian, persen, hasZiyadah, hasUjian, hasMurojaah, hasTasmi };\n'
    '    }).filter(r => r.total > 0).sort((a, b) => b.total - a.total);'
)

if old in content:
    content = content.replace(old, new, 1)
    with open(sys.argv[1], 'w') as f:
        f.write(content)
    print("SUCCESS")
else:
    print("OLD STRING NOT FOUND")
    # Debug: show what's in file vs what we're looking for
    idx = content.find('export const TahfizhProgressTemplate')
    if idx >= 0:
        end = content.find('}).sort((a, b) => b.total - a.total);', idx)
        if end >= 0:
            end += len('}).sort((a, b) => b.total - a.total);')
            actual = content[idx:end]
            print("File uses 'santuri' or 'santri'? Looking for: santuario")
            print("ACTUAL repr:", repr(actual[:100]))